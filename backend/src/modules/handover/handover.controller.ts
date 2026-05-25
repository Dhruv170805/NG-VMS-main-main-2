import { Response, RequestHandler } from 'express';
import { AuthRequest } from '../../types/requests';
import { HandoverService } from './handover.service';

export const getShiftStats: RequestHandler = async (req, res) => {
  const { query, user, tenantId } = req as AuthRequest;
  const { gateId, shiftStart } = query;

  try {
    const stats = await HandoverService.getShiftStats(
      gateId as string, 
      shiftStart as string, 
      user!.id, 
      tenantId!
    );
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createHandover: RequestHandler = async (req, res) => {
  const { body, user, tenantId } = req as AuthRequest;
  try {
    const handover = await HandoverService.createHandover(
      body, 
      { id: user!.id, name: user!.name }, 
      tenantId!
    );
    res.json({ success: true, handover });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
