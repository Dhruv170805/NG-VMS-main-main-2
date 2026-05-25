import { Response, RequestHandler } from 'express';
import { Server } from 'socket.io';
import * as XLSX from '@e965/xlsx';
import Visitor from '../../models/Visitor';
import VisitorLog from '../../models/VisitorLog';
import Employee from '../../models/Employee';
import { notifyHostRegistration, notifyVisitorApproval, notifyHostArrival, notifyVisitorRejection, notifySecurityOverstay } from '../../utils/notificationService';
import { TenantRequest, AuthRequest } from '../../types/requests';
import { VisitorService } from './visitor.service';

export const exportVisitors: RequestHandler = async (req, res) => {
  const { tenantId } = req as TenantRequest;
  try {
    const visitors = await Visitor.find({ tenantId: tenantId! }).populate('hostId', 'name email department');
    
    const data = visitors.map(v => ({
      'Visitor Name': v.name,
      'Email': v.email,
      'Phone': v.phone,
      'Company': v.company || 'N/A',
      'Purpose': v.purpose,
      'Host Name': v.hostName,
      'Status': v.status,
      'Processed By (Guard)': v.processedBy || 'N/A',
      'Gate-In': v.checkInTime ? new Date(v.checkInTime).toLocaleString() : 'N/A',
      'Meet-In': v.meetInTime ? new Date(v.meetInTime).toLocaleString() : 'N/A',
      'Meet-Out': v.meetOutTime ? new Date(v.meetOutTime).toLocaleString() : 'N/A',
      'Gate-Out': v.checkOutTime ? new Date(v.checkOutTime).toLocaleString() : 'N/A',
      'Created At': new Date(v.createdAt).toLocaleString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Visitors');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=visitor_audit.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const registerVisitor: RequestHandler = async (req, res) => {
  const { body, tenantId } = req as TenantRequest;
  try {
    const visitor = await VisitorService.register(body, tenantId!);

    const io: Server = req.app.get('socketio');
    const tenantRoom = `tenant_${tenantId}`;
    io.to(tenantRoom).emit('visitor:new', visitor);
    io.to(tenantRoom).emit('stats:update', { type: 'new_visitor' });

    res.status(202).json({ success: true, visitor });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateVisitorStatus: RequestHandler = async (req, res) => {
  const { params, body, tenantId, user } = req as AuthRequest;
  try {
    const updatedVisitor = await VisitorService.updateStatus(
      params.id as string, 
      body, 
      tenantId!, 
      user!
    );

    const io: Server = req.app.get('socketio');
    const hostRoomId = updatedVisitor?.hostId?._id?.toString() || updatedVisitor?.hostId?.toString();

    io.to(`tenant_${tenantId}_visitor_${updatedVisitor._id}`).emit('status:update', { status: updatedVisitor.status, visitor: updatedVisitor });

    if (body.status === 'SENT_FOR_APPROVAL' && hostRoomId) {
       io.to(`tenant_${tenantId}_host_${hostRoomId}`).emit('visitor:forwarded', updatedVisitor);
       const host = await Employee.findOne({ _id: hostRoomId, tenantId: tenantId! });
       if (host) await notifyHostRegistration(host._id.toString(), host.email, updatedVisitor.name, tenantId!);
    }

    io.to(`tenant_${tenantId}`).emit('visitor:update', updatedVisitor);

    if (body.status === 'APPROVED') {
      await notifyVisitorApproval(updatedVisitor.phone, updatedVisitor.name, updatedVisitor._id.toString(), tenantId!);
    } else if (body.status === 'REJECTED') {
      await notifyVisitorRejection(updatedVisitor.phone, updatedVisitor.name, tenantId!);
    }

    if (updatedVisitor.status === 'GATE_IN' && updatedVisitor?.hostId) {
      const host = await Employee.findOne({ _id: updatedVisitor.hostId, tenantId: tenantId! });
      if (host && host.email) {
        await notifyHostArrival(host._id.toString(), host.email, updatedVisitor.name, tenantId!);
      }
    }

    res.json({ success: true, visitor: updatedVisitor });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const sendSecurityAlert: RequestHandler = async (req, res) => {
  const { params, body, tenantId, user } = req as AuthRequest;
  try {
    const { visitor, type } = await VisitorService.sendSecurityAlert(
      params.id as string, 
      body.type, 
      tenantId!, 
      user!.name
    );

    const io: Server = req.app.get('socketio');
    io.to(`tenant_${tenantId}_visitor_${visitor._id}`).emit('security:alert', { message: 'Your scheduled time has ended. Please proceed to the exit.' });
    
    if (visitor.hostId) {
       io.to(`tenant_${tenantId}_host_${visitor.hostId._id.toString()}`).emit('security:alert', { visitorName: visitor.name, type });
       if (type === 'OVERSTAY') {
          const host = await Employee.findOne({ _id: visitor.hostId, tenantId: tenantId! });
          if (host && host.email) {
            await notifySecurityOverstay(visitor.name, host.email, host._id.toString(), tenantId!);
          }
       }
    }

    res.json({ success: true, message: 'Alerts dispatched successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getVisitorTimeline: RequestHandler = async (req, res) => {
  const { params, tenantId } = req as TenantRequest;
  try {
    const logs = await VisitorLog.find({ visitorId: params.id as string, tenantId: tenantId! }).sort({ createdAt: 1 });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getVisitors: RequestHandler = async (req, res) => {
  const { query, tenantId } = req as TenantRequest;
  try {
    const result = await VisitorService.getVisitors(query, tenantId!);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getVisitorById: RequestHandler = async (req, res) => {
  const { params, tenantId } = req as TenantRequest;
  try {
    const visitor = await VisitorService.getById(params.id as string, tenantId!);
    if (visitor) return res.json(visitor);
    res.status(404).json({ success: false, message: 'Visitor not found' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const lookupVisitor: RequestHandler = async (req, res) => {
  const { params, tenantId } = req as TenantRequest;
  try {
    const visitor = await Visitor.findOne({ phone: (params.phone as string).trim(), tenantId: tenantId! }).sort({ createdAt: -1 });
    if (visitor) {
      res.json({
        success: true,
        visitor: {
          _id: visitor._id,
          name: visitor.name,
          email: visitor.email,
          company: visitor.company || '',
          idProofType: visitor.idProofType || ''
        }
      });
    } else {
      res.json({ success: false, message: 'Not found' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateIdProofPreview: RequestHandler = async (req, res) => {
  const { params, body, tenantId } = req as AuthRequest;
  try {
    await VisitorService.updateIdProofPreview(params.id as string, body.image, tenantId!);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getIdProofPreview: RequestHandler = async (req, res) => {
  const { params, tenantId } = req as AuthRequest;
  try {
    const image = await VisitorService.getIdProofPreview(params.id as string, tenantId!);
    if (!image) return res.status(404).json({ message: 'Preview not found' });
    res.json({ image });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyVisitorSignatures: RequestHandler = async (req, res) => {
  const { params, tenantId } = req as TenantRequest;
  try {
    const verification = await VisitorService.verifyVisitorSignatures(params.id as string, tenantId!);
    res.json({ success: true, verification });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** Public pass view — minimal fields only, safe for unauthenticated QR scan */
export const getVisitorPass: RequestHandler = async (req, res) => {
  const { params, tenantId } = req as TenantRequest;
  try {
    const visitor = await VisitorService.getById(params.id as string, tenantId!);
    if (!visitor) return res.status(404).json({ success: false, message: 'Pass not found' });
    res.json({
      _id: visitor._id,
      name: visitor.name,
      status: visitor.status,
      hostName: visitor.hostName,
      purpose: visitor.purpose,
      visitTime: visitor.visitTime,
      qrCode: visitor.qrCode,
      checkInTime: visitor.checkInTime,
      checkOutTime: visitor.checkOutTime,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
