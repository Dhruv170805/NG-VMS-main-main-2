import mongoose from 'mongoose';
import Visitor from '../../models/Visitor';
import Blacklist from '../../models/Blacklist';
import VisitorLog from '../../models/VisitorLog';
import { PolicyEngine } from '../../utils/policyEngine';

export class GateService {
  static async checkIn(visitorId: string, gateId: string, tenantId: mongoose.Types.ObjectId, actor: { id: string, name: string }) {
    if (!mongoose.Types.ObjectId.isValid(visitorId)) {
      throw new Error('Invalid Visitor ID format');
    }

    const visitor = await Visitor.findOne({ _id: visitorId, tenantId });
    if (!visitor) throw new Error('Visitor not found');

    if (visitor.status === 'GATE_IN') return { alreadyInside: true, visitor };

    // Blacklist check
    if (visitor.idNumberHash) {
      const blocked = await Blacklist.findOne({ idNumberHash: visitor.idNumberHash, active: true, tenantId });
      if (blocked) {
        await VisitorLog.create({
          visitorId: visitor._id,
          tenantId,
          event: 'DENIED_BLACKLIST',
          actor: actor.id,
          actorName: actor.name,
          gateId,
          details: `Access denied: ${blocked.reason}`
        });
        
        const updatedVisitor = await Visitor.findOneAndUpdate(
          { _id: visitor._id, status: visitor.status, tenantId },
          { $set: { status: 'DENIED_BLACKLIST' } },
          { new: true }
        );

        return { blacklisted: true, visitor: updatedVisitor || visitor, reason: blocked.reason };
      }
    }

    // AETHER Sovereign Proof
    const proof = PolicyEngine.prove('GATE_IN', visitor);
    if (!proof.allowed) {
      
      await VisitorLog.create({
        visitorId: visitor._id,
        tenantId,
        event: 'ERROR',
        actor: actor.id,
        actorName: actor.name,
        gateId,
        details: proof.reason
      });
      throw new Error(proof.reason);
    }

    // Optimistic Concurrency Control
    const updatedVisitor = await Visitor.findOneAndUpdate(
      { _id: visitor._id, status: 'APPROVED', tenantId },
      { 
        $set: { 
          status: 'GATE_IN', 
          checkInTime: new Date(), 
          processedBy: actor.name 
        } 
      },
      { new: true }
    );

    if (!updatedVisitor) {
      const current = await Visitor.findById(visitor._id);
      if (current?.status === 'GATE_IN') {
        return { alreadyInside: true, visitor: current };
      }
      throw new Error('Conflict: Visitor state changed by another request.');
    }

    await VisitorLog.create({
      visitorId: updatedVisitor._id,
      tenantId,
      event: 'GATE_IN',
      actor: actor.id,
      actorName: actor.name,
      gateId
    });

    return { visitor: updatedVisitor };
  }

  static async checkOut(visitorId: string, gateId: string, tenantId: mongoose.Types.ObjectId, actor: { id: string, name: string }) {
    const visitor = await Visitor.findOne({ _id: visitorId, tenantId });
    if (!visitor) throw new Error('Visitor not found');

    const proof = PolicyEngine.prove('GATE_OUT', visitor);
    if (!proof.allowed) {
      if (visitor.status === 'GATE_OUT') return { alreadyExited: true, visitor };
      throw new Error(proof.reason);
    }

    const updatedVisitor = await Visitor.findOneAndUpdate(
      { _id: visitor._id, status: visitor.status, tenantId },
      { 
        $set: { 
          status: 'GATE_OUT', 
          checkOutTime: new Date(), 
          processedBy: actor.name 
        } 
      },
      { new: true }
    );

    if (!updatedVisitor) {
      const current = await Visitor.findById(visitor._id);
      if (current?.status === 'GATE_OUT') {
        return { alreadyExited: true, visitor: current };
      }
      throw new Error('Conflict: Visitor state changed by another request.');
    }

    await VisitorLog.create({
      visitorId: updatedVisitor._id,
      tenantId,
      event: 'GATE_OUT',
      actor: actor.id,
      actorName: actor.name,
      gateId
    });

    return { visitor: updatedVisitor };
  }
}
