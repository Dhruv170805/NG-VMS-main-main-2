import Setting from '../models/Setting';
import Employee from '../models/Employee';
import { Server } from 'socket.io';
import nodemailer from 'nodemailer';
import { SecurityManager } from './securityManager';

let ioInstance: Server | null = null;

export const setNotificationIO = (io: Server) => {
  ioInstance = io;
};

const getSMTPTransport = async (tenantId: any) => {
  const settings = await Setting.findOne({ key: 'smtp_config', tenantId });
  if (settings && settings.value) {
    const { host, port, user, pass, secure } = settings.value;
    if (host && user && pass) {
      return nodemailer.createTransport({
        host,
        port: parseInt(port),
        secure: secure === 'true' || secure === true,
        auth: { user, pass }
      });
    }
  }

  // Environment fallback
  if (process.env.SMTP_HOST) {
    const options: any = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '1025'),
      secure: process.env.SMTP_SECURE === 'true',
    };
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      options.auth = {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      };
    }
    return nodemailer.createTransport(options);
  }

  return null;
};

export type RecipientType = 'ADMIN' | 'GUARD' | 'HOST' | 'VISITOR';

/**
 * Enhanced Notification Service
 * Granular: Stage -> Recipient -> Channel
 */
export const sendNotification = async (
  recipientType: RecipientType,
  message: string,
  type: 'SMS' | 'EMAIL' | 'WEB',
  stage: string,
  tenantId: any,
  context: { email?: string; phone?: string; hostId?: string; visitorId?: string } = {}
) => {
  // 1. License Check
  if (tenantId) {
    const features = await SecurityManager.getInstance().getTenantFeatures(tenantId);
    if (type === 'EMAIL' && !features.email) return false;
    if (type === 'SMS' && !features.sms) return false;
  }

  // 2. Configuration Check (Stage -> Recipient -> Channel)
  const settings = await Setting.findOne({ key: 'notifications', tenantId });
  const config = settings?.value || {};
  
  let settingsKey = stage.toUpperCase();
  if (settingsKey === 'OVERSTAY') settingsKey = 'OVERDUE';
  const recType = recipientType.toUpperCase();

  const stageConfig = config[settingsKey]?.[recType] || { web: true, email: true, sms: false };
  if (!stageConfig[type.toLowerCase()]) {
    return false;
  }

  // 3. Resolve Real Recipients
  let targets: { email?: string; phone?: string; id?: string }[] = [];

  if (recipientType === 'VISITOR') {
    targets = [{ email: context.email, phone: context.phone, id: context.visitorId }];
  } else if (recipientType === 'HOST' && context.hostId) {
    targets = [{ email: context.email, id: context.hostId }];
  } else if (recipientType === 'ADMIN') {
    const admins = await Employee.find({ tenantId, role: 'ADMIN' });
    targets = admins.map(a => ({ email: a.email, id: a._id.toString() }));
  } else if (recipientType === 'GUARD') {
    const guards = await Employee.find({ tenantId, role: 'GUARD' });
    targets = guards.map(g => ({ email: g.email, id: g._id.toString() }));
  }

  // 4. Dispatch
  for (const target of targets) {
    if (type === 'WEB' && ioInstance) {
      if (target.id) {
        ioInstance.to(`host_${target.id}`).emit('notification:web', { message, stage });
      } else {
        ioInstance.emit('notification:web', { message, stage });
      }
    }

    if (type === 'EMAIL' && target.email) {
      try {
        const transporter = await getSMTPTransport(tenantId);
        if (transporter) {
          const smtpConfig = await Setting.findOne({ key: 'smtp_config', tenantId });
          const fromEmail = smtpConfig?.value?.from || 'no-reply@vms.com';
          await transporter.sendMail({
            from: `"NG-VMS" <${fromEmail}>`,
            to: target.email,
            subject: `Alert: ${stage.replace('_', ' ')}`,
            text: message,
          });
        }
      } catch (err) {
        console.error('[NOTIF] Email Fail:', err);
      }
    }

    // SMS logic would use target.phone...
  }

  return true;
};

export const notifyHostRegistration = async (hostId: string, hostEmail: string, visitorName: string, tenantId: any) => {
  const message = `Alert: New visitor "${visitorName}" registration pending for you.`;
  await sendNotification('HOST', message, 'EMAIL', 'REGISTRATION', tenantId, { hostId, email: hostEmail });
  await sendNotification('HOST', message, 'WEB', 'REGISTRATION', tenantId, { hostId });
  
  // Also notify admins and guards if configured
  const staffMsg = `System: Visitor "${visitorName}" registered for host (ID: ${hostId.slice(-4)}).`;
  await sendNotification('ADMIN', staffMsg, 'WEB', 'REGISTRATION', tenantId);
  await sendNotification('GUARD', staffMsg, 'WEB', 'REGISTRATION', tenantId);
};

export const notifyVisitorApproval = async (visitorPhone: string, visitorName: string, visitorId: string, tenantId: any, visitorEmail?: string) => {
  const passUrl = `${process.env.FRONTEND_URL}/pass?id=${visitorId}`;
  const message = `Hi ${visitorName}, your visitor pass is APPROVED. Access here: ${passUrl}`;
  await sendNotification('VISITOR', message, 'SMS', 'APPROVAL', tenantId, { phone: visitorPhone, visitorId });
  if (visitorEmail) await sendNotification('VISITOR', message, 'EMAIL', 'APPROVAL', tenantId, { email: visitorEmail, visitorId });
};

export const notifyHostArrival = async (hostId: string, hostEmail: string, visitorName: string, tenantId: any) => {
  const message = `Alert: Your visitor "${visitorName}" has Checked-In at the main gate.`;
  await sendNotification('HOST', message, 'EMAIL', 'CHECK_IN', tenantId, { hostId, email: hostEmail });
  await sendNotification('HOST', message, 'WEB', 'CHECK_IN', tenantId, { hostId });
};

export const notifyVisitorRejection = async (visitorPhone: string, visitorName: string, tenantId: any) => {
  const message = `Hi ${visitorName}, your visit request was REJECTED. Contact reception.`;
  await sendNotification('VISITOR', message, 'SMS', 'REJECTION', tenantId, { phone: visitorPhone });
};

export const notifySecurityOverstay = async (visitorName: string, hostEmail: string, hostId: string, tenantId: any) => {
  const message = `SECURITY ALERT: Visitor "${visitorName}" has EXCEEDED scheduled duration.`;
  await sendNotification('HOST', message, 'EMAIL', 'OVERSTAY', tenantId, { hostId, email: hostEmail });
  await sendNotification('HOST', message, 'WEB', 'OVERSTAY', tenantId, { hostId });
  await sendNotification('ADMIN', message, 'WEB', 'OVERSTAY', tenantId);
  await sendNotification('GUARD', message, 'WEB', 'OVERSTAY', tenantId);
};

