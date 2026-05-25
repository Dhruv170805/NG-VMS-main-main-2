import { Response, Request, RequestHandler } from 'express';
import Employee from '../../models/Employee';
import { TenantRequest, AuthRequest } from '../../types/requests';
import { AuthService } from './auth.service';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import redisConnection from '../../config/redis';
import logger from '../../utils/logger';

export const registerEmployee: RequestHandler = async (req, res): Promise<void> => {
  const { body, tenantId } = req as TenantRequest;
  try {
    const { employee, accessToken, refreshToken } = await AuthService.registerEmployee(body, tenantId!);
    
    // Set Access Token Cookie (15 mins)
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    });

    // Set Refresh Token Cookie (30 days)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      _id: employee._id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      requiresPasswordChange: employee.requiresPasswordChange,
      token: accessToken,
      refreshToken
    });
  } catch (error: any) {
    logger.error({ err: error.message }, 'Employee registration failed');
    res.status(400).json({ message: error.message });
  }
};

export const loginEmployee: RequestHandler = async (req, res): Promise<void> => {
  const { body, tenantId } = req as TenantRequest;
  try {
    const { employee, accessToken, refreshToken } = await AuthService.loginEmployee(body, tenantId!);

    // Set Access Token Cookie (15 mins)
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    });

    // Set Refresh Token Cookie (30 days)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({
      _id: employee._id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      requiresPasswordChange: employee.requiresPasswordChange,
      token: accessToken,
      refreshToken
    });
  } catch (error: any) {
    logger.error({ err: error.message, email: body.email }, 'Employee login failed');
    res.status(401).json({ message: error.message });
  }
};

export const logoutEmployee: RequestHandler = async (req, res): Promise<void> => {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('JWT_SECRET is not configured');
      const decoded = jwt.verify(refreshToken, secret) as any;
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await redisConnection.del(`refresh_token:${decoded.id}:${tokenHash}`);
    } catch (e) {
      // ignore token verification error during logout
    }
  }

  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0)
  });
  res.cookie('refreshToken', '', {
    httpOnly: true,
    expires: new Date(0)
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const refreshAccessToken: RequestHandler = async (req, res): Promise<void> => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!refreshToken) {
    res.status(401).json({ message: 'Refresh token missing' });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('FATAL ERROR: JWT_SECRET must be defined');
    }

    const decoded = jwt.verify(refreshToken, secret) as { id: string, name: string, role: string, tenantId: string, type?: string };
    
    if (decoded.type !== 'refresh') {
       res.status(401).json({ message: 'Invalid token type' });
       return;
    }

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const redisKey = `refresh_token:${decoded.id}:${tokenHash}`;
    const exists = await redisConnection.get(redisKey);

    if (!exists) {
      // Reuse attack detected! Revoke all tokens for this user
      logger.warn({ userId: decoded.id }, 'Potential refresh token reuse attack detected! Revoking all sessions.');
      await AuthService.revokeAllUserTokens(decoded.id);
      
      res.cookie('token', '', { httpOnly: true, expires: new Date(0) });
      res.cookie('refreshToken', '', { httpOnly: true, expires: new Date(0) });
      res.status(403).json({ message: 'Session revoked due to reuse detection' });
      return;
    }

    // Token is valid. Rotate it: Delete old refresh token from allowlist
    await redisConnection.del(redisKey);

    // Generate new tokens
    const tokens = await AuthService.generateTokens(decoded.id, decoded.name, decoded.role, decoded.tenantId);

    // Set new cookies
    res.cookie('token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error: any) {
    logger.error({ err: error.message }, 'Refresh token verification failed');
    res.status(401).json({ message: 'Unauthorized, refresh token invalid or expired' });
  }
};

export const updatePassword: RequestHandler = async (req, res): Promise<void> => {
  const { user, tenantId, body } = req as AuthRequest;
  try {
    await AuthService.updatePassword(user!.id, tenantId!, body);
    
    // Clear cookies since session is revoked
    res.cookie('token', '', { httpOnly: true, expires: new Date(0) });
    res.cookie('refreshToken', '', { httpOnly: true, expires: new Date(0) });
    
    res.json({ success: true, message: 'Password updated successfully. Please log in again.' });
  } catch (error: any) {
    res.status(error.message === 'Employee not found' ? 404 : 401).json({ message: error.message });
  }
};

export const forgotPassword: RequestHandler = async (req, res): Promise<void> => {
  const { body, tenantId, protocol } = req as TenantRequest;
  try {
    const resetUrl = await AuthService.forgotPassword(
      body.email, 
      tenantId!, 
      protocol, 
      req.get('host') as string
    );
    
    res.json({ 
      success: true, 
      message: 'Reset token generated and sent to email', 
      resetUrl: process.env.NODE_ENV === 'production' ? undefined : resetUrl 
    });
  } catch (error: any) {
    res.status(error.message === 'No employee with that email' ? 404 : 500).json({ message: error.message });
  }
};

export const resetPassword: RequestHandler = async (req, res): Promise<void> => {
  const { params, body, tenantId } = req as TenantRequest;
  try {
    await AuthService.resetPassword(params.resetToken as string, body.password, tenantId!);
    res.json({ success: true, message: 'Password reset successful' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getMe: RequestHandler = async (req, res): Promise<void> => {
  const { user, tenantId } = req as AuthRequest;
  try {
    const employee = await Employee.findOne({ _id: user!.id, tenantId: tenantId! }).select('-password');
    if (!employee) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(employee);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};
