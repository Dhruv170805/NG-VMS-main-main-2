import { Response, RequestHandler } from 'express';
import { AuthRequest } from '../../types/requests';
import { BlacklistService } from './blacklist.service';

export const getBlacklist: RequestHandler = async (req, res) => {
  const { query, tenantId } = req as AuthRequest;
  try {
    const list = await BlacklistService.getBlacklist(query.search, tenantId!);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleBlacklistStatus: RequestHandler = async (req, res) => {
  const { params, tenantId } = req as AuthRequest;
  try {
    const item = await BlacklistService.toggleStatus(params.id as string, tenantId!);
    res.json(item);
  } catch (error: any) {
    res.status(error.message === 'Not found' ? 404 : 500).json({ success: false, message: error.message });
  }
};

export const addToBlacklist: RequestHandler = async (req, res) => {
  const { body, tenantId } = req as AuthRequest;
  try {
    const item = await BlacklistService.addToBlacklist(body, tenantId!);
    res.status(201).json(item);
  } catch (error: any) {
    res.status(error.message === 'Missing fields' ? 400 : 500).json({ success: false, message: error.message });
  }
};

export const removeFromBlacklist: RequestHandler = async (req, res) => {
  const { params, tenantId } = req as AuthRequest;
  try {
    await BlacklistService.removeFromBlacklist(params.id as string, tenantId!);
    res.json({ success: true, message: 'Removed from blacklist' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
