import mongoose from 'mongoose';
import crypto from 'crypto';
import Visitor, { IVisitor } from '../../models/Visitor';
import VisitorLog from '../../models/VisitorLog';
import Employee from '../../models/Employee';
import { optimizeImage } from '../../utils/imageOptimizer';
import { imageQueue } from '../../queues/queueSetup';
import { encrypt, decrypt } from '../../utils/encryption';
import { notifyHostRegistration, notifyVisitorApproval, notifyHostArrival, notifyVisitorRejection, notifySecurityOverstay } from '../../utils/notificationService';
import { PolicyEngine, ActionType } from '../../utils/policyEngine';

export class VisitorService {
  static async register(data: any, tenantId: mongoose.Types.ObjectId) {
    const { 
      name, email, phone, company, purpose, hostName, hostId, 
      startDate, photoUrl, idProofType, idProofNumber, 
      idProofPhotoUrl, requestedDuration, consentGiven
    } = data;

    // Offload image optimization to background worker, set initial values to transparent placeholder
    const placeholder = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const initialPhoto = photoUrl ? placeholder : '';
    const initialIdPhoto = idProofPhotoUrl ? placeholder : '';

    let idNumberHash = '';
    if (idProofNumber) {
      idNumberHash = crypto.createHash('sha256').update(idProofNumber.trim()).digest('hex');
    }

    const visitorData: any = {
      name: name?.trim(),
      email: email?.trim()?.toLowerCase(),
      phone: phone?.trim(),
      company: company?.trim(),
      purpose, 
      hostName: hostName || 'General Reception',
      photoUrl: initialPhoto, 
      idProofType, 
      idProofNumber: idProofNumber?.trim(), 
      idProofPhotoUrl: initialIdPhoto, 
      idNumberHash,
      requestedDuration: requestedDuration || '1H',
      status: 'PENDING_GUARD',
      tenantId,
      consentGiven: !!consentGiven,
      consentTimestamp: consentGiven ? new Date() : undefined
    };

    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) visitorData.startDate = d;
    }
    
    if (hostId && mongoose.Types.ObjectId.isValid(hostId)) {
      visitorData.hostId = hostId;
    }

    const visitor = new Visitor(visitorData);
    
    // Automatically generate Visitor Signature when visitor submits form
    const signedAt = new Date();
    const hash = crypto.createHmac('sha256', process.env.LICENSE_SECRET!)
      .update(`${visitor._id}:${visitor.name}:${signedAt.toISOString()}:REGISTERED`)
      .digest('hex');
    
    visitor.visitorSignature = {
      signed: true,
      signedBy: visitor.name,
      signedAt,
      signatureHash: hash
    };

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await visitor.save({ session });

      await VisitorLog.create([{
        visitorId: visitor._id,
        tenantId,
        event: 'Registered',
        details: 'Awaiting Guard review at Central Hub.'
      }], { session });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    if (photoUrl || idProofPhotoUrl) {
      await imageQueue.add('optimize-visitor-images', {
        visitorId: visitor._id,
        photoUrl: photoUrl || '',
        idProofPhotoUrl: idProofPhotoUrl || '',
      }).catch(err => {
        console.error('Failed to enqueue image optimization job:', err);
      });
    }

    return visitor;
  }

  static async updateStatus(id: string, updateData: any, tenantId: mongoose.Types.ObjectId, actor: { id: string, name: string, role: string }) {
    const { 
      status, remark, aadhaarVerified, maskedAadhaar, 
      aadhaarImageUrl, idProofNumber, idProofPhotoUrl 
    } = updateData;

    const visitor = await Visitor.findOne({ _id: id, tenantId }).populate('hostId');
    if (!visitor) throw new Error('Visitor not found');

    let finalStatus = status || visitor.status;

    // Resolve blacklist invariant state
    let isBlacklisted = false;
    if (visitor.idNumberHash) {
      const Blacklist = mongoose.model('Blacklist');
      const blocked = await Blacklist.findOne({ idNumberHash: visitor.idNumberHash, active: true, tenantId });
      if (blocked) {
        isBlacklisted = true;
      }
    }

    // AETHER Sovereign Proof (RBAC + Invariants)
    if (status && status !== visitor.status) {
      const visitorObj = visitor.toObject() as any;
      visitorObj.isBlacklisted = isBlacklisted;
      
      const proof = PolicyEngine.prove(status as ActionType, visitorObj, { id: actor.id, role: actor.role });
      if (!proof.allowed) {
        throw new Error(proof.reason);
      }
    }

    const dbUpdate: any = {};
    if (status === 'APPROVED') {
      dbUpdate.$addToSet = { approvedBy: actor.id };
    }

    if (aadhaarVerified !== undefined) dbUpdate.aadhaarVerified = aadhaarVerified;
    if (maskedAadhaar) dbUpdate.maskedAadhaar = maskedAadhaar;
    if (aadhaarImageUrl) {
      dbUpdate.aadhaarImageUrl = await optimizeImage(aadhaarImageUrl);
    }
    if (idProofNumber) dbUpdate.idProofNumber = idProofNumber;
    if (idProofPhotoUrl) {
      dbUpdate.idProofPhotoUrl = await optimizeImage(idProofPhotoUrl);
    }

    const durationMap: any = { "1H": 1, "2H": 2, "3H": 3, "5H": 5, "FULL_DAY": 8 };

    if (status === 'APPROVED') {
      const hours = durationMap[visitor.requestedDuration || "1H"];
      dbUpdate.approvedAt = new Date();
      dbUpdate.expectedCheckout = new Date(dbUpdate.approvedAt.getTime() + hours * 60 * 60 * 1000);
      finalStatus = 'APPROVED';

      const hostName = visitor.hostName || actor.name;
      const signedAt = new Date();
      const hash = crypto.createHmac('sha256', process.env.LICENSE_SECRET!)
        .update(`${id}:${hostName}:${signedAt.toISOString()}:APPROVED`)
        .digest('hex');
      dbUpdate.hostSignature = {
        signed: true,
        signedBy: hostName,
        signedAt,
        signatureHash: hash
      };
    }
    
    if (remark && status === 'APPROVED') {
      dbUpdate.hostRemark = remark;
    }

    if (actor.role === 'GUARD') {
      dbUpdate.processedBy = actor.name;
    }

    dbUpdate.status = finalStatus;

    if (finalStatus === 'GATE_IN') {
      dbUpdate.checkInTime = new Date();
      const signedAt = new Date();
      const hash = crypto.createHmac('sha256', process.env.LICENSE_SECRET!)
        .update(`${id}:${actor.name}:${signedAt.toISOString()}:GATE_IN`)
        .digest('hex');
      dbUpdate.guardSignature = {
        signed: true,
        signedBy: actor.name,
        signedAt,
        signatureHash: hash
      };
    }
    if (finalStatus === 'MEET_IN') dbUpdate.meetInTime = new Date();
    if (finalStatus === 'MEET_OUT') dbUpdate.meetOutTime = new Date();
    if (finalStatus === 'GATE_OUT') dbUpdate.checkOutTime = new Date();

    const updatedVisitor = await Visitor.findOneAndUpdate(
      { _id: id, status: visitor.status, tenantId }, 
      dbUpdate, 
      { new: true }
    ).populate('hostId');

    if (!updatedVisitor) {
      throw new Error('Conflict: Visitor state was changed by another request.');
    }

    // Timeline Logging
    let eventStr = status || 'Updated';
    let detailStr = '';

    if (aadhaarVerified && !status) {
      eventStr = 'Identity Verified';
      detailStr = 'Visitor Identity (Aadhaar) has been verified by Guard.';
    }

    if (status === 'SENT_FOR_APPROVAL') {
      eventStr = 'FORWARDED';
      detailStr = `Guard ${actor.name} forwarded request to host.`;
    } else if (status === 'APPROVED') {
      eventStr = 'Approved';
      detailStr = `Approved by Employee. Expected exit: ${updatedVisitor?.expectedCheckout?.toLocaleTimeString()}`;
    } else if (status === 'MEET_IN') {
      eventStr = 'Meet In';
      detailStr = 'Visitor has entered the meeting.';
    } else if (status === 'MEET_OUT') {
      eventStr = 'Meet Out';
      detailStr = 'Meeting session completed. Visitor moving to exit.';
    } else if (status === 'GATE_OUT') {
      eventStr = 'Gate Out';
      detailStr = 'Visitor Gate out by Guard.';
    } else if (status === 'CANCEL_MEET') {
      eventStr = 'Cancel Meet';
      detailStr = 'Visitor marked as No-Show / Meeting Cancelled.';
    }

    await VisitorLog.create({
      visitorId: visitor._id,
      tenantId,
      event: eventStr,
      actor: actor.id,
      actorName: actor.name,
      details: detailStr || `Status updated to ${status}`
    });

    return updatedVisitor;
  }

  static async getVisitors(params: any, tenantId: mongoose.Types.ObjectId) {
    const { hostId, status, page = 1, limit = 100, search, startDate, endDate } = params;
    const query: any = { tenantId };

    const requestedLimit = Number(limit) || 100;
    const safeLimit = Math.min(requestedLimit, 500);

    if (hostId) query.hostId = hostId;
    if (status) {
      query.status = Array.isArray(status) ? { $in: status } : status;
    }

    if (search) {
      const cleanSearch = search.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
      query.$or = [
        { name: { $regex: '^' + cleanSearch, $options: 'i' } },
        { company: { $regex: '^' + cleanSearch, $options: 'i' } },
        { phone: { $regex: '^' + cleanSearch, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate as string);
        if (!isNaN(start.getTime())) query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate as string);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          query.createdAt.$lte = end;
        }
      }
    }

    const skip = (Number(page) - 1) * safeLimit;
    const data = await Visitor.find(query)
      .populate('hostId', 'name email department')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(safeLimit);

    const total = await Visitor.countDocuments(query);

    return {
      data,
      pagination: {
        total,
        page: Number(page),
        limit: safeLimit,
        pages: Math.ceil(total / safeLimit)
      }
    };
  }

  static async getById(id: string, tenantId: mongoose.Types.ObjectId) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      const visitor = await Visitor.findOne({ _id: id, tenantId }).populate('hostId', 'name email department');
      if (visitor) return visitor;
    }

    return await Visitor.findOne({
      tenantId,
      $or: [
        { phone: id },
        { idProofNumber: id },
        { idProofNumber: { $regex: new RegExp(id + '$', 'i') } },
        { idNumberHash: id }
      ]
    }).populate('hostId', 'name email department').sort({ createdAt: -1 });
  }

  static async updateIdProofPreview(id: string, image: string, tenantId: mongoose.Types.ObjectId) {
    const optimizedImage = await optimizeImage(image);
    const encryptedImage = encrypt(optimizedImage);
    return await Visitor.findOneAndUpdate(
      { _id: id, tenantId },
      { encryptedIdProofPreview: encryptedImage },
      { new: true }
    );
  }

  static async getIdProofPreview(id: string, tenantId: mongoose.Types.ObjectId) {
    const visitor = await Visitor.findOne({ _id: id, tenantId });
    if (!visitor || !visitor.encryptedIdProofPreview) return null;
    return decrypt(visitor.encryptedIdProofPreview);
  }

  static async sendSecurityAlert(id: string, type: string, tenantId: mongoose.Types.ObjectId, actorName: string) {
    const visitor = await Visitor.findOne({ _id: id, tenantId }).populate('hostId');
    if (!visitor) throw new Error('Visitor not found');

    await VisitorLog.create({
      visitorId: visitor._id,
      tenantId,
      event: 'SECURITY_ALERT',
      actorName,
      details: `Security alert sent: ${type === 'OVERSTAY' ? 'Stay duration exceeded' : 'Visitor still inside after meeting ended'}`
    });

    return { visitor, type };
  }

  static generateSignatureHash(visitorId: string, actor: string, timestamp: Date, status: string): string {
    const secret = process.env.LICENSE_SECRET || 'default-secret-key-123';
    const payload = `${visitorId}:${actor}:${timestamp.toISOString()}:${status}`;
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  static async verifyVisitorSignatures(id: string, tenantId: mongoose.Types.ObjectId) {
    const visitor = await Visitor.findOne({ _id: id, tenantId });
    if (!visitor) throw new Error('Visitor not found');

    const result = {
      visitor: { valid: false, details: null as any },
      guard: { valid: false, details: null as any },
      host: { valid: false, details: null as any },
      tampered: false
    };

    if (visitor.visitorSignature && visitor.visitorSignature.signed) {
      const sig = visitor.visitorSignature;
      const expectedHash = this.generateSignatureHash(visitor._id.toString(), sig.signedBy || '', sig.signedAt!, 'REGISTERED');
      result.visitor.valid = (sig.signatureHash === expectedHash);
      result.visitor.details = sig;
      if (!result.visitor.valid) result.tampered = true;
    }

    if (visitor.guardSignature && visitor.guardSignature.signed) {
      const sig = visitor.guardSignature;
      const expectedHash = this.generateSignatureHash(visitor._id.toString(), sig.signedBy || '', sig.signedAt!, 'GATE_IN');
      result.guard.valid = (sig.signatureHash === expectedHash);
      result.guard.details = sig;
      if (!result.guard.valid) result.tampered = true;
    }

    if (visitor.hostSignature && visitor.hostSignature.signed) {
      const sig = visitor.hostSignature;
      const sigBy = sig.signedBy || '';
      const hashApproved = this.generateSignatureHash(visitor._id.toString(), sigBy, sig.signedAt!, 'APPROVED');
      const hashMeetIn = this.generateSignatureHash(visitor._id.toString(), sigBy, sig.signedAt!, 'MEET_IN');
      result.host.valid = (sig.signatureHash === hashApproved || sig.signatureHash === hashMeetIn);
      result.host.details = sig;
      if (!result.host.valid) result.tampered = true;
    }

    return result;
  }
}
