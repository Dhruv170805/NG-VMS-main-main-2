import mongoose from 'mongoose';
import Employee from '../../models/Employee';
import Setting from '../../models/Setting';
import Visitor from '../../models/Visitor';
import Tenant from '../../models/Tenant';
import bcrypt from 'bcryptjs';
import xlsx from '@e965/xlsx';
import os from 'os';
import { SecurityManager } from '../../utils/securityManager';

export class SystemService {
  static async getSystemHealth(io: any, tenantId?: mongoose.Types.ObjectId) {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const cpuLoad = os.loadavg()[0];
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsage = `${Math.round(((totalMem - freeMem) / totalMem) * 100)}%`;
    
    let activeRooms = 0;
    if (io && io.engine) {
      activeRooms = io.sockets.adapter.rooms.size;
    }

    const visitorQuery: any = { status: { $in: ['GATE_IN', 'MEET_IN'] } };
    const backlogQuery: any = { status: { $in: ['PENDING_GUARD', 'SENT_FOR_APPROVAL'] } };

    if (tenantId) {
      visitorQuery.tenantId = tenantId;
      backlogQuery.tenantId = tenantId;
    }

    const [activeVisitors, queueBacklog] = await Promise.all([
      Visitor.countDocuments(visitorQuery),
      Visitor.countDocuments(backlogQuery)
    ]);

    return {
      mongo: mongoStatus,
      redis: 'connected', // Handled by adapter implicitly in this stack
      socketRooms: activeRooms,
      cpuUsage: `${Math.round(cpuLoad * 100)}%`,
      memory: memoryUsage,
      activeVisitors,
      queueBacklog
    };
  }

  static async getSystemVersion() {
    const tenantCount = await Tenant.countDocuments();
    return {
      version: '2.1.1',
      build: 'NG-VMS-ENT-SEC-2026.05.16',
      license: 'Enterprise On-Prem',
      tenantCount
    };
  }

  static async getLicense(tenantId: mongoose.Types.ObjectId) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const result = await SecurityManager.getInstance().validateTenantLicense(tenant.licenseKey);
    return {
      isValid: result.valid,
      reason: result.reason,
      details: result.data
    };
  }

  static async updateLicense(licenseKey: string, tenantId: mongoose.Types.ObjectId) {
    // Verify the new license before applying
    const result = await SecurityManager.getInstance().validateTenantLicense(licenseKey);
    if (!result.valid) {
      throw new Error(`Invalid License: ${result.reason}`);
    }

    const logo = result.data?.features?.branding?.logoFile 
      ? `/assets/${result.data.features.branding.logoFile}` 
      : (result.data?.features?.branding?.logoUrl || undefined);

    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { 
        licenseKey,
        name: result.data?.company || undefined,
        logoUrl: logo
      },
      { new: true }
    );

    // If rootAdmin info is in the license, ensure the user exists
    if (result.data?.rootAdmin?.id && result.data?.rootAdmin?.password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(result.data.rootAdmin.password, salt);
      
      await Employee.findOneAndUpdate(
        { email: result.data.rootAdmin.id, tenantId },
        { 
          name: 'System Root',
          password: hashedPassword,
          role: 'ADMIN',
          isHost: false,
          tenantId
        },
        { upsert: true }
      );
    }
    
    return { success: true, message: 'License updated successfully. System rebranded and Root Admin configured.', expiry: result.data?.expiresAt };
  }

  static async inspectLicense(licenseKey: string) {
    const result = await SecurityManager.getInstance().validateTenantLicense(licenseKey);
    return {
      isValid: result.valid,
      reason: result.reason,
      payload: result.data,
      hint: "NGS Decryption Successful. Integrity Verified."
    };
  }

  static async getTenantConfig(tenant: any, tenantId: mongoose.Types.ObjectId) {
    try {
      if (!tenant) {
        throw new Error('Tenant object is null or undefined');
      }
      if (!tenant.name) {
        throw new Error('Tenant name is missing');
      }
      
      const securityManager = SecurityManager.getInstance();
      let licenseValid = false;
      let licenseReason = 'No valid license found';
      let features = { email: false, sms: false, aadhaar: false, storage: 'local' };
      
      if (tenant.licenseKey) {
        const result = await securityManager.validateTenantLicense(tenant.licenseKey);
        licenseValid = result.valid;
        if (result.reason) licenseReason = result.reason;
        if (result.data?.features) features = result.data.features as any;
      }
      
      let extraConfig = {};
      if (licenseValid) {
        const [hosts, purposeSetting, guardConfigSetting, passRulesSetting, emergencyContactSetting] = await Promise.all([
          Employee.find({ isHost: true, tenantId }).select('name department'),
          Setting.findOne({ key: 'allowed_purposes', tenantId }),
          Setting.findOne({ key: 'guard_config', tenantId }),
          Setting.findOne({ key: 'pass_rules', tenantId }),
          Setting.findOne({ key: 'emergency_contact', tenantId })
        ]);
        extraConfig = {
          purposes: purposeSetting ? purposeSetting.value : ['Meeting', 'Internship', 'Training', 'Personal', 'Other'],
          hosts: hosts.map(h => ({ _id: h._id, name: h.name, department: h.department })),
          guard_config: guardConfigSetting ? guardConfigSetting.value : { autoScan: false, folderName: '', requireAadhaar: false, printMode: 'DIGITAL_ONLY' },
          pass_rules: passRulesSetting ? passRulesSetting.value : [],
          emergency_contact: emergencyContactSetting ? emergencyContactSetting.value : 'Contact Command Center at ext. 911 or +91 12345 67890 immediately.'
        };
      }
      
      return {
        name: tenant.name,
        logoUrl: tenant.logoUrl || null,
        subdomain: tenant.subdomain,
        features,
        licenseValid,
        licenseReason,
        ...extraConfig
      };
    } catch (error: any) {
      console.error('[SYSTEM SERVICE] getTenantConfig error:', error);
      throw error;
    }
  }

  static async uploadHosts(buffer: Buffer, tenantId: mongoose.Types.ObjectId) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];

    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('Welcome@123', salt);

    const employees = data.map(item => ({
      name: item.name || item.HostName || '',
      email: item.email || item.Email || '',
      phone: item.phone || item.Phone || item.Contact || '',
      department: item.department || item.Department || 'General',
      password: defaultPassword,
      role: 'STAFF',
      isAvailable: true,
      isHost: true,
      requiresPasswordChange: true,
      tenantId
    })).filter(e => e.name && e.email);

    for (const emp of employees) {
      await Employee.findOneAndUpdate(
        { email: emp.email, tenantId },
        {
          $setOnInsert: { password: emp.password, requiresPasswordChange: true },
          $set: {
            name: emp.name,
            phone: emp.phone,
            department: emp.department,
            role: emp.role,
            isAvailable: emp.isAvailable,
            isHost: emp.isHost
          }
        },
        { upsert: true, new: true }
      );
    }

    return employees.length;
  }

  static async getSystemData(tenantId: mongoose.Types.ObjectId) {
    const [hosts, purposeSetting, guardConfigSetting, passRulesSetting, emergencyContactSetting] = await Promise.all([
      Employee.find({ isHost: true, tenantId }).select('name department'),
      Setting.findOne({ key: 'allowed_purposes', tenantId }),
      Setting.findOne({ key: 'guard_config', tenantId }),
      Setting.findOne({ key: 'pass_rules', tenantId }),
      Setting.findOne({ key: 'emergency_contact', tenantId })
    ]);

    return {
      purposes: purposeSetting ? purposeSetting.value : ['Meeting', 'Internship', 'Training', 'Personal', 'Other'],
      hosts: hosts.map(h => ({ _id: h._id, name: h.name, department: h.department })),
      guard_config: guardConfigSetting ? guardConfigSetting.value : { autoScan: false, folderName: '', requireAadhaar: false },
      pass_rules: passRulesSetting ? passRulesSetting.value : [],
      emergency_contact: emergencyContactSetting ? emergencyContactSetting.value : 'Contact Command Center at ext. 911 or +91 12345 67890 immediately.'
    };
  }

  static async getSettings(tenantId: mongoose.Types.ObjectId) {
    const settings = await Setting.find({ tenantId });
    return settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
  }

  static async updateSetting(key: string, value: any, tenantId: mongoose.Types.ObjectId) {
    return await Setting.findOneAndUpdate(
      { key, tenantId },
      { value },
      { upsert: true, new: true }
    );
  }

  static async bulkUpdateSettings(settings: Record<string, any>, tenantId: mongoose.Types.ObjectId) {
    const ops = Object.entries(settings).map(([key, value]) => ({
      updateOne: {
        filter: { key, tenantId },
        update: { value },
        upsert: true
      }
    }));
    return await Setting.bulkWrite(ops);
  }
}
