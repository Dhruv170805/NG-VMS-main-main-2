import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Employee from '../../models/Employee';
import { sendNotification } from '../../utils/notificationService';
import redisConnection from '../../config/redis';

export class AuthService {
  static async generateTokens(id: string, name: string, role: string, tenantId: string) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('FATAL ERROR: JWT_SECRET must be defined');
    }
    
    // Access Token: Short-lived (15 minutes)
    const accessToken = jwt.sign({ id, name, role, tenantId }, secret, {
      expiresIn: '15m',
    });

    // Refresh Token: Long-lived (30 days)
    const refreshToken = jwt.sign({ id, name, role, tenantId, type: 'refresh' }, secret, {
      expiresIn: '30d',
    });

    // Hash token for secure storage in Redis
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const redisKey = `refresh_token:${id}:${tokenHash}`;
    
    // Store in Redis with a 30-day expiration (in seconds)
    await redisConnection.set(redisKey, 'true', 'EX', 30 * 24 * 60 * 60);

    return { accessToken, refreshToken };
  }

  static async revokeAllUserTokens(id: string) {
    const keys = await redisConnection.keys(`refresh_token:${id}:*`);
    if (keys.length > 0) {
      await redisConnection.del(...keys);
    }
  }

  static async registerEmployee(data: any, tenantId: mongoose.Types.ObjectId) {
    const { name, email, password, department, role } = data;

    const employeeExists = await Employee.findOne({ email, tenantId });
    if (employeeExists) {
      throw new Error('Employee already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const employee = await Employee.create({
      name,
      email,
      password: hashedPassword,
      department,
      role: role || 'STAFF',
      tenantId,
      requiresPasswordChange: true
    });

    const { accessToken, refreshToken } = await this.generateTokens(
      employee._id.toString(),
      employee.name,
      employee.role,
      employee.tenantId.toString()
    );

    return { employee, accessToken, refreshToken };
  }

  static async loginEmployee(data: any, tenantId: mongoose.Types.ObjectId) {
    const { email, password } = data;

    const employee = await Employee.findOne({ email, tenantId });
    if (employee && (await bcrypt.compare(password, employee.password || ''))) {
      const { accessToken, refreshToken } = await this.generateTokens(
        employee._id.toString(),
        employee.name,
        employee.role,
        employee.tenantId.toString()
      );
      return { employee, accessToken, refreshToken };
    }
    
    throw new Error('Invalid email or password');
  }

  static async updatePassword(id: string, tenantId: mongoose.Types.ObjectId, data: any) {
    const { currentPassword, newPassword } = data;
    const employee = await Employee.findOne({ _id: id, tenantId });

    if (!employee) throw new Error('Employee not found');

    const isMatch = await bcrypt.compare(currentPassword, employee.password || '');
    if (!isMatch) throw new Error('Incorrect current password');

    const salt = await bcrypt.genSalt(10);
    employee.password = await bcrypt.hash(newPassword, salt);
    employee.requiresPasswordChange = false;
    await employee.save();

    // Revoke all refresh tokens on password change for security
    await this.revokeAllUserTokens(id);

    return true;
  }

  static async forgotPassword(email: string, tenantId: mongoose.Types.ObjectId, protocol: string, host: string) {
    const employee = await Employee.findOne({ email, tenantId });
    if (!employee) throw new Error('No employee with that email');

    const resetToken = crypto.randomBytes(20).toString('hex');
    employee.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    employee.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await employee.save();

    const publicHost = process.env.DOMAIN_NAME || host;
    const resetUrl = `${protocol}://${publicHost}/api/v1/auth/reset-password/${resetToken}`;
    const message = `You requested a password reset. Please click this link to reset your password: ${resetUrl}`;
    
    await sendNotification('ADMIN', message, 'EMAIL', 'SECURITY', tenantId, { email: employee.email });
    
    return resetUrl;
  }

  static async resetPassword(token: string, password: any, tenantId: mongoose.Types.ObjectId) {
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    const employee = await Employee.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: new Date() },
      tenantId
    });

    if (!employee) throw new Error('Invalid or expired reset token');

    const salt = await bcrypt.genSalt(10);
    employee.password = await bcrypt.hash(password, salt);
    employee.resetPasswordToken = undefined;
    employee.resetPasswordExpire = undefined;
    employee.requiresPasswordChange = false;
    await employee.save();

    // Revoke all refresh tokens on password reset
    await this.revokeAllUserTokens(employee._id.toString());

    return true;
  }
}
