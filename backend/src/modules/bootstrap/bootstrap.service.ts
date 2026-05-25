import Tenant from '../../models/Tenant';
import Employee from '../../models/Employee';
import Setting from '../../models/Setting';
import bcryptjs from 'bcryptjs';
import { SecurityManager } from '../../utils/securityManager';

export class BootstrapService {
  static async checkStatus() {
    const tenantCount = await Tenant.countDocuments();
    return { bootstrapRequired: tenantCount === 0 };
  }

  static async runBootstrap(data: any) {
    const tenantCount = await Tenant.countDocuments();
    if (tenantCount > 0) {
      throw new Error('Bootstrap already completed. Endpoint permanently disabled.');
    }

    const { 
      companyName, subdomain, 
      adminName, adminEmail, adminPassword, 
      licenseKey, 
      smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom,
      guardName, guardEmail, guardPassword 
    } = data;

    if (!companyName || !adminEmail || !adminPassword) {
      throw new Error('Company Name, Admin Email, and Admin Password are required.');
    }

    let finalLicenseKey = licenseKey;
    if (!finalLicenseKey || finalLicenseKey === 'TRIAL-MODE') {
      const trialPayload = JSON.stringify({
        company: companyName,
        companyCode: subdomain || 'default',
        status: 'ACTIVE',
        features: { email: true, sms: false, aadhaar: false },
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days trial
      });
      finalLicenseKey = Buffer.from(trialPayload).toString('base64');
    }

    let resolvedLogo = undefined;
    if (finalLicenseKey && finalLicenseKey !== 'TRIAL-MODE') {
      try {
        const validation = await SecurityManager.getInstance().validateTenantLicense(finalLicenseKey);
        if (validation.valid && validation.data) {
          const lData = validation.data as any;
          const logoFile = lData.features?.branding?.logoFile || lData.logoFile;
          const logoUrl = lData.features?.branding?.logoUrl || lData.logoUrl;
          resolvedLogo = logoFile ? `/assets/${logoFile}` : (logoUrl || undefined);
        }
      } catch (err) {
        // Safe fallback
      }
    }

    // 1. Create Tenant
    const tenant = new Tenant({
      name: companyName,
      subdomain: subdomain || 'default',
      licenseKey: finalLicenseKey,
      logoUrl: resolvedLogo
    });
    await tenant.save();

    // 2. Create Super Admin
    const hashedAdminPassword = await bcryptjs.hash(adminPassword, 10);
    const admin = new Employee({
      name: adminName || 'System Admin',
      email: adminEmail,
      password: hashedAdminPassword,
      role: 'ADMIN',
      department: 'Management',
      tenantId: tenant._id,
      isHost: true
    });
    await admin.save();

    // 3. Create First Guard
    if (guardEmail && guardPassword) {
      const hashedGuardPassword = await bcryptjs.hash(guardPassword, 10);
      const guard = new Employee({
        name: guardName || 'Main Gate',
        email: guardEmail,
        password: hashedGuardPassword,
        role: 'GUARD',
        department: 'Security',
        tenantId: tenant._id,
        isHost: false
      });
      await guard.save();
    }

    // 4. SMTP Settings
    if (smtpHost) {
      await Setting.create({
        tenantId: tenant._id,
        key: 'smtp_config',
        value: {
          host: smtpHost,
          port: smtpPort || 587,
          user: smtpUser,
          pass: smtpPass,
          from: smtpFrom || 'no-reply@ng-vms.enterprise',
          secure: Number(smtpPort) === 465
        }
      });
    }

    // 5. Default Notifications Settings
    await Setting.create({
      tenantId: tenant._id,
      key: 'notifications',
      value: {
        REGISTRATION: { HOST: { web: true, email: true, sms: false }, ADMIN: { web: true, email: false, sms: false }, GUARD: { web: true, email: false, sms: false } },
        APPROVAL: { VISITOR: { web: false, email: true, sms: false } },
        CHECK_IN: { HOST: { web: true, email: true, sms: false } },
        OVERDUE: { HOST: { web: true, email: true, sms: false }, ADMIN: { web: true, email: true, sms: false }, GUARD: { web: true, email: false, sms: false } }
      }
    });

    return { 
      success: true, 
      message: 'Bootstrap completed successfully. System is now locked.' 
    };
  }

  static async updateTenantLicense(licenseKey: string, data: any, companyCode: string) {
    const normalizedCode = companyCode.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    let tenant = await Tenant.findOne({ subdomain: normalizedCode });
    if (!tenant) {
      tenant = await Tenant.findOne();
    }

    if (tenant) {
      const newName = data.company || tenant.name;
      const newSubdomain = normalizedCode || tenant.subdomain;

      const logoFile = data.features?.branding?.logoFile || data.logoFile;
      const logoUrl = data.features?.branding?.logoUrl || data.logoUrl;
      const resolvedLogo = logoFile ? `/assets/${logoFile}` : (logoUrl || null);

      if (
        tenant.licenseKey !== licenseKey ||
        tenant.name !== newName ||
        tenant.subdomain !== newSubdomain ||
        tenant.logoUrl !== resolvedLogo
      ) {
        console.log(`🛡️ [SECURITY] Dynamic update for tenant '${tenant.name}' -> '${newName}' (subdomain: '${newSubdomain}', logoUrl: '${resolvedLogo}')...`);
        tenant.licenseKey = licenseKey;
        tenant.name = newName;
        tenant.subdomain = newSubdomain;
        tenant.logoUrl = resolvedLogo;
        await tenant.save();
        console.log(`🛡️ [SECURITY] Dynamic NGS license update complete for tenant: ${tenant.name}`);
        return true;
      }
    }
    return false;
  }
}
