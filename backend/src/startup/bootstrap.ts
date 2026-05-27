import fs from 'fs';
import path from 'path';
import { SecurityManager } from '../utils/securityManager';
import { BootstrapService } from '../modules/bootstrap/bootstrap.service';
import logger from '../utils/logger';

export const runStartupBootstrap = async () => {
  if (process.env.NODE_ENV === 'test') return;
  
  const searchDirs = [
    process.cwd(),
    path.join(process.cwd(), 'shared')
  ];
  const foundLicenses: { path: string; filename: string; key: string; companyCode: string }[] = [];

  // Check explicit environment variable first
  if (process.env.LICENSE_KEY_PATH && fs.existsSync(process.env.LICENSE_KEY_PATH)) {
    try {
      const key = await fs.promises.readFile(process.env.LICENSE_KEY_PATH, 'utf8');
      if (key && key.trim()) {
        const filename = path.basename(process.env.LICENSE_KEY_PATH);
        const match = filename.match(/^([a-zA-Z0-9_-]+)&([a-zA-Z0-9_-]+)_NGS\.lic$/i);
        const companyCode = match ? match[1] : 'default';
        foundLicenses.push({ path: process.env.LICENSE_KEY_PATH, filename, key: key.trim(), companyCode });
      }
    } catch (err) {}
  }

  // Check directories for *_NGS.lic
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = await fs.promises.readdir(dir);
      for (const file of files) {
        const isNgsLic = file.toLowerCase().endsWith('_ngs.lic');
        if (isNgsLic) {
          const fullPath = path.join(dir, file);
          try {
            const key = await fs.promises.readFile(fullPath, 'utf8');
            if (key && key.trim()) {
              const match = file.match(/^([a-zA-Z0-9_-]+)&([a-zA-Z0-9_-]+)_NGS\.lic$/i);
              const companyCode = match ? match[1] : 'default';
              foundLicenses.push({ path: fullPath, filename: file, key: key.trim(), companyCode });
            }
          } catch (err) {}
        }
      }
    } catch (err) {}
  }

  const securityManager = SecurityManager.getInstance();

  // Process each found license key
  for (const lic of foundLicenses) {
    const validation = await securityManager.validateTenantLicense(lic.key);
    if (!validation.valid) {
      logger.warn(`[NG-VMS] Found license file at ${lic.path} but validation failed: ${validation.reason}`);
      continue;
    }

    const data = validation.data!;
    const companyCode = (lic.companyCode || data.companyCode || data.company || 'default').toLowerCase().replace(/[^a-z0-9_-]/g, '');

    const status = await BootstrapService.checkStatus();
    if (status.bootstrapRequired) {
      logger.info(`[NG-VMS] Clean database detected. Auto-bootstrapping using license from ${lic.path}...`);
      const companyName = data.company || 'Enterprise Corporation';
      const adminEmail = data.rootAdmin?.id || 'admin@enterprise.com';
      const adminPassword = data.rootAdmin?.password || 'password123';

      await BootstrapService.runBootstrap({
        companyName,
        subdomain: companyCode,
        adminName: 'System Administrator',
        adminEmail,
        adminPassword,
        guardName: 'Main Gate Guard',
        guardEmail: `guard@${companyCode}.com`,
        guardPassword: adminPassword,
        licenseKey: lic.key
      });
      logger.info(`[NG-VMS] Auto-bootstrapping complete! Tenant: ${companyName}, Subdomain: ${companyCode}, Admin: ${adminEmail}`);
    } else {
      // If already bootstrapped, check for dynamic update/alignment
      await BootstrapService.updateTenantLicense(lic.key, data, companyCode);
    }
  }
};
