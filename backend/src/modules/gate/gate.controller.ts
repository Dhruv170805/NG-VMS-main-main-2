import { Response, RequestHandler } from 'express';
import { Server } from 'socket.io';
import { AuthRequest } from '../../types/requests';
import { GateService } from './gate.service';

export const gateCheckIn: RequestHandler = async (req, res) => {
  const { body, tenantId, user } = req as AuthRequest;
  const { visitorId, gateId } = body;

  try {
    const result = await GateService.checkIn(
      visitorId, 
      gateId, 
      tenantId!, 
      { id: user!.id, name: user!.name }
    );

    if (result.blacklisted) {
      const io: Server = req.app.get('socketio');
      const tenantRoom = `tenant_${tenantId}`;
      io.to(tenantRoom).emit('visitor:update', result.visitor);
      io.to(tenantRoom).emit('visitor:denied', { visitorId, reason: result.reason, gateId });
      return res.status(403).json({ success: false, message: 'Blacklisted', reason: result.reason });
    }

    if (result.alreadyInside) {
      return res.json({ success: true, visitor: result.visitor, message: 'Already inside' });
    }

    const io: Server = req.app.get('socketio');
    const tenantRoom = `tenant_${tenantId}`;
    io.to(tenantRoom).emit('visitor:update', result.visitor);
    io.to(`tenant_${tenantId}_visitor_${result.visitor._id}`).emit('status:update', { status: 'GATE_IN', visitor: result.visitor });

    res.json({ success: true, visitor: result.visitor });
  } catch (error: any) {
    res.status(error.message === 'Visitor not found' ? 404 : 403).json({ success: false, message: error.message });
  }
};

export const gateCheckOut: RequestHandler = async (req, res) => {
  const { body, tenantId, user } = req as AuthRequest;
  const { visitorId, gateId } = body;

  try {
    const result = await GateService.checkOut(
      visitorId, 
      gateId, 
      tenantId!, 
      { id: user!.id, name: user!.name }
    );

    if (result.alreadyExited) {
      return res.json({ success: true, visitor: result.visitor, message: 'Already exited' });
    }

    const io: Server = req.app.get('socketio');
    const tenantRoom = `tenant_${tenantId}`;
    io.to(tenantRoom).emit('visitor:update', result.visitor);
    io.to(`tenant_${tenantId}_visitor_${result.visitor._id}`).emit('status:update', { status: 'GATE_OUT', visitor: result.visitor });

    res.json({ success: true, visitor: result.visitor });
  } catch (error: any) {
    res.status(error.message === 'Visitor not found' ? 404 : 403).json({ success: false, message: error.message });
  }
};
