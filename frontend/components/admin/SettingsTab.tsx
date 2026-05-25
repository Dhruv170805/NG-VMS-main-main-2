"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Target, Shield, FolderOpen, BellRing, Globe, MessageSquare,
} from 'lucide-react';
import { SmtpConfig, GuardConfig } from './types';
import styles from '../../app/admin/admin.module.css';
import { API_CONFIG } from '../../app/config';

interface Props {
  tenant: any;
  notificationSettings: Record<string, { email: boolean; sms: boolean; web: boolean }>;
  smtpConfig: SmtpConfig;
  purposesText: string;
  passRulesText: string;
  guardConfig: GuardConfig;
  licenseInfo: { isValid: boolean; reason?: string; details?: any } | null;
  onUpdateLicense: (key: string) => void;
  uploadStatus: { message: string; type: string };
  onSetSmtpConfig: (cfg: SmtpConfig) => void;
  onSetPurposesText: (t: string) => void;
  onSetPassRulesText: (t: string) => void;
  onSetGuardConfig: (cfg: GuardConfig) => void;
  onToggleNotification: (stage: string, recipient: string, channel: string) => void;
  onSaveSMTPConfig: () => void;
  onSavePurposes: () => void;
  onSavePassRules: () => void;
  onSaveSetting: (key: string, value: any) => void;
  emergencyContact: string;
  onSetEmergencyContact: (t: string) => void;
  onSaveEmergencyContact: () => void;
  getTenantId?: () => string;
}

export const SettingsTab: React.FC<Props> = ({
  tenant,
  notificationSettings,
  smtpConfig,
  purposesText,
  passRulesText,
  guardConfig,
  licenseInfo,
  onUpdateLicense,
  uploadStatus,
  onSetSmtpConfig,
  onSetPurposesText,
  onSetPassRulesText,
  onSetGuardConfig,
  onToggleNotification,
  onSaveSMTPConfig,
  onSavePurposes,
  onSavePassRules,
  onSaveSetting,
  emergencyContact,
  onSetEmergencyContact,
  onSaveEmergencyContact,
  getTenantId,
}) => {
  const features = tenant?.features || { email: false, sms: false, aadhaar: false };
  const [licenseKeyInput, setLicenseKeyInput] = React.useState('');
  const [showInspector, setShowInspector] = React.useState(false);
  const [inspectData, setInspectData] = React.useState<any>(null);

  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={styles.settings_view}
    >
      <div className={styles.system_presets_grid}>
      {/* NGS License Activation */}
      <div className="glass-card" style={{ padding: '30px', gridColumn: 'span 2', border: '1px solid rgba(0,122,255,0.2)', background: 'linear-gradient(135deg, rgba(0,122,255,0.05) 0%, rgba(255,255,255,0.05) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div className={styles.preset_icon} style={{ background: 'rgba(0,122,255,0.1)' }}>
              <Shield size={20} color="var(--apple-blue)" />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>NGS License Perimeter</h3>
              <p className={styles.config_desc} style={{ margin: '4px 0 0 0' }}>Manage enterprise activation and machine-locked security.</p>
            </div>
          </div>
          {licenseInfo?.isValid ? (
            <div className={styles.status_pill_active} style={{ background: 'rgba(40,205,65,0.1)', color: 'var(--apple-green)', border: '1px solid rgba(40,205,65,0.2)' }}>
               ROOT ACTIVATED
            </div>
          ) : (
            <div className={styles.status_pill_active} style={{ background: 'rgba(255,59,48,0.1)', color: 'var(--apple-red)', border: '1px solid rgba(255,59,48,0.2)' }}>
               UNLICENSED
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' }}>
          <div>
             <div className={styles.input_group_stacked}>
                <label>Activation Key (AES-256 Encrypted)</label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                  <textarea 
                    className="glass-input" 
                    style={{ flex: 1, minHeight: '80px', resize: 'none', fontFamily: 'monospace', fontSize: '0.75rem' }}
                    placeholder="Paste your .vlic or .lic encrypted string here..."
                    value={licenseKeyInput}
                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label className="glass-btn secondary small" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'center', padding: '0 15px' }}>
                      <FolderOpen size={16} />
                      LOAD .VLIC
                      <input 
                        type="file" 
                        accept=".vlic,.lic" 
                        style={{ display: 'none' }} 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const content = event.target?.result as string;
                              setLicenseKeyInput(content.trim());
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
             </div>
             <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className="glass-btn primary small" 
                  style={{ flex: 1 }}
                  onClick={() => onUpdateLicense(licenseKeyInput)}
                >
                  Activate License
                </button>
                <button 
                  className="glass-btn secondary small"
                  onClick={() => setShowInspector(!showInspector)}
                >
                  {showInspector ? 'Hide Inspector' : 'Inspect Payload'}
                </button>
             </div>
          </div>

          <div className={styles.license_details_pane} style={{ background: 'rgba(0,0,0,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
             <h4 style={{ fontSize: '0.8rem', color: 'var(--apple-gray)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Current License Details</h4>
             {licenseInfo?.details ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--apple-gray)' }}>Company:</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{licenseInfo.details.company || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--apple-gray)' }}>Project:</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{licenseInfo.details.project || 'N/A'}</span>
                  </div>
                  {licenseInfo.details.features?.branding?.logoFile && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--apple-gray)' }}>Logo File:</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--apple-green)' }}>{licenseInfo.details.features.branding.logoFile}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--apple-gray)' }}>Expires:</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: new Date(licenseInfo.details.expiresAt) < new Date() ? 'var(--apple-red)' : 'inherit' }}>
                      {new Date(licenseInfo.details.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                  {licenseInfo.details.rootAdmin?.id && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--apple-gray)' }}>Root ID:</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--apple-blue)' }}>{licenseInfo.details.rootAdmin.id}</span>
                    </div>
                  )}
                  <div style={{ height: '1px', background: 'rgba(0,0,0,0.05)', margin: '4px 0' }} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                     {licenseInfo.details.features?.aadhaar && <span className={styles.feature_tag}>AADHAAR</span>}
                     {licenseInfo.details.features?.email && <span className={styles.feature_tag}>EMAIL</span>}
                     {licenseInfo.details.features?.sms && <span className={styles.feature_tag}>SMS</span>}
                     {licenseInfo.details.features?.branding && <span className={styles.feature_tag}>WHITE_LABEL</span>}
                  </div>
               </div>
             ) : (
               <p style={{ fontSize: '0.75rem', color: 'var(--apple-gray)', textAlign: 'center', margin: '20px 0' }}>No active license found.</p>
             )}
          </div>
        </div>

        <AnimatePresence>
          {showInspector && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden', marginTop: '20px' }}
            >
              <div style={{ background: '#1c1c1e', color: '#32d74b', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ color: '#0a84ff' }}>{"// NGS License Decryption Inspector"}</span>
                  <button 
                    style={{ background: 'transparent', border: 'none', color: '#636366', cursor: 'pointer' }}
                    onClick={async () => {
                      if (!licenseKeyInput) return;
                      try {
                        const token = localStorage.getItem('token');
                        const res = await fetch(`${API_CONFIG.ENDPOINTS.SYSTEM}/license/inspect`, {
                          method: 'POST',
                          headers: { 
                            'Authorization': `Bearer ${token}`, 
                            'Content-Type': 'application/json',
                            'x-tenant-id': getTenantId ? getTenantId() : (tenant?.subdomain || '')
                          },
                          body: JSON.stringify({ licenseKey: licenseKeyInput })
                        });
                        const data = await res.json();
                        setInspectData(data);
                      } catch (err) {
                        setInspectData({ error: 'Decryption sequence failed.' });
                      }
                    }}
                  >
                    RUN_DECRYPT_SYMLINK
                  </button>
                </div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {inspectData ? JSON.stringify(inspectData, null, 2) : '// Paste key and click RUN to decrypt...'}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SMTP Config */}
      {features.email && (
        <div className="glass-card" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
            <div className={styles.preset_icon} style={{ background: 'rgba(255,204,0,0.1)' }}>
              <Mail size={20} color="var(--apple-yellow)" />
            </div>
            <h3>SMTP Gateways</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className={styles.input_group_stacked} style={{ gridColumn: 'span 2' }}>
              <label>SMTP Host</label>
              <input className="glass-input" placeholder="smtp.provider.com" value={smtpConfig.host} onChange={(e) => onSetSmtpConfig({ ...smtpConfig, host: e.target.value })} />
            </div>
            <div className={styles.input_group_stacked}>
              <label>Port</label>
              <input className="glass-input" placeholder="587" value={smtpConfig.port} onChange={(e) => onSetSmtpConfig({ ...smtpConfig, port: e.target.value })} />
            </div>
            <div className={styles.input_group_stacked}>
              <label>Secure SSL</label>
              <select className="glass-input" value={smtpConfig.secure ? 'true' : 'false'} onChange={(e) => onSetSmtpConfig({ ...smtpConfig, secure: e.target.value === 'true' })}>
                <option value="false">STARTTLS</option>
                <option value="true">SSL/TLS</option>
              </select>
            </div>
            <div className={styles.input_group_stacked}>
              <label>Username</label>
              <input className="glass-input" value={smtpConfig.user} onChange={(e) => onSetSmtpConfig({ ...smtpConfig, user: e.target.value })} />
            </div>
            <div className={styles.input_group_stacked}>
              <label>Password</label>
              <input className="glass-input" type="password" value={smtpConfig.pass} onChange={(e) => onSetSmtpConfig({ ...smtpConfig, pass: e.target.value })} />
            </div>
          </div>
          <button className="glass-btn primary small" style={{ marginTop: '20px', width: '100%' }} onClick={onSaveSMTPConfig}>
            Secure SMTP Credentials
          </button>
        </div>
      )}

      {/* Visit Purposes */}
      <div className="glass-card" style={{ padding: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
          <div className={styles.preset_icon} style={{ background: 'rgba(40,205,65,0.1)' }}>
            <Target size={20} color="var(--apple-green)" />
          </div>
          <h3>Visit Purposes</h3>
        </div>
        <p className={styles.config_desc}>Configure allowed visit purposes (comma separated).</p>
        <textarea
          className="glass-input"
          style={{ minHeight: '120px', resize: 'none', marginBottom: '15px' }}
          value={purposesText}
          onChange={(e) => onSetPurposesText(e.target.value)}
          placeholder="Meeting, Internship, Training..."
        />
        <button className="glass-btn primary small" style={{ width: '100%' }} onClick={onSavePurposes}>
          Update Purpose Catalog
        </button>
      </div>

      {/* Digital Pass Governance */}
      <div className="glass-card" style={{ padding: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
          <div className={styles.preset_icon} style={{ background: 'rgba(255,149,0,0.1)' }}>
            <Shield size={20} color="var(--apple-orange)" />
          </div>
          <h3>Digital Pass Governance</h3>
        </div>
        <p className={styles.config_desc}>Configure security rules and policy text displayed on the back of digital passes (One rule per line).</p>
        <textarea
          className="glass-input"
          style={{ minHeight: '120px', resize: 'none', marginBottom: '15px', fontFamily: 'monospace', fontSize: '0.8rem' }}
          value={passRulesText}
          onChange={(e) => onSetPassRulesText(e.target.value)}
          placeholder={'Scan pass at entry...\nCarry physical ID...\nNo photography...'}
        />
        <button className="glass-btn primary small" style={{ width: '100%' }} onClick={onSavePassRules}>
          Apply Policy Updates
        </button>
      </div>

      {/* Emergency Contact */}
      <div className="glass-card" style={{ padding: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
          <div className={styles.preset_icon} style={{ background: 'rgba(255,59,48,0.1)' }}>
            <BellRing size={20} color="var(--apple-red)" />
          </div>
          <h3>Emergency Contact</h3>
        </div>
        <p className={styles.config_desc}>Custom emergency message displayed on the back of all digital passes.</p>
        <textarea
          className="glass-input"
          style={{ minHeight: '80px', resize: 'none', marginBottom: '15px', fontSize: '0.85rem' }}
          value={emergencyContact}
          onChange={(e) => onSetEmergencyContact(e.target.value)}
          placeholder="Contact Command Center at ext. 911..."
        />
        <button className="glass-btn primary small" style={{ width: '100%' }} onClick={onSaveEmergencyContact}>
          Update Emergency Protocol
        </button>
      </div>

      {/* Guard Terminal Config */}
      <div className="glass-card" style={{ padding: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
          <div className={styles.preset_icon} style={{ background: 'rgba(255,100,0,0.1)' }}>
            <FolderOpen size={20} color="var(--apple-orange)" />
          </div>
          <h3>Guard Terminal Configuration</h3>
        </div>
        <p className={styles.config_desc}>Configure printing policies and terminal-specific security folders.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div className={styles.input_group_stacked}>
            <label style={{ fontWeight: 800, color: 'var(--apple-blue)' }}>Pass Printing Policy</label>
            <p className={styles.config_desc} style={{ fontSize: '0.75rem', marginBottom: '8px' }}>Restricts pass printing to Guard terminals only. Digital pass remains compulsory.</p>
            <select 
              className="glass-input" 
              value={guardConfig.printMode || 'DIGITAL_ONLY'} 
              onChange={(e) => {
                const updated = { ...guardConfig, printMode: e.target.value as any };
                onSetGuardConfig(updated);
                onSaveSetting('guard_config', updated);
              }}
            >
              <option value="DIGITAL_ONLY">Digital Pass Only (No Printing)</option>
              <option value="HARD_PRINT_BOTH">Digital + Hard Print (Both Sides)</option>
              <option value="QR_VID_ONLY">Digital + QR & VID Only (Front/Back)</option>
            </select>
          </div>

          {features.aadhaar && (
            <div style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '15px', padding: '15px', background: 'rgba(0,122,255,0.03)', borderRadius: '16px', border: '1px dashed rgba(0,122,255,0.1)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={guardConfig.autoScan}
                  onChange={(e) => {
                    const updated = { ...guardConfig, autoScan: e.target.checked };
                    onSetGuardConfig(updated);
                    onSaveSetting('guard_config', updated);
                  }}
                />
                Enable Auto-Scan for Downloads
              </label>
              
              <div style={{ height: '1px', background: 'rgba(0,0,0,0.05)', margin: '5px 0' }} />

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={!!guardConfig.requireAadhaar}
                  onChange={(e) => {
                    const updated = { ...guardConfig, requireAadhaar: e.target.checked };
                    onSetGuardConfig(updated);
                    onSaveSetting('guard_config', updated);
                  }}
                />
                Mandate Aadhaar for All Visitors
              </label>

              <div style={{ height: '1px', background: 'rgba(0,0,0,0.05)', margin: '5px 0' }} />
              
              <button
                className="glass-btn secondary small"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                onClick={async () => {
                  try {
                    if (!('showDirectoryPicker' in window)) {
                      alert("Your browser doesn't support folder access.");
                      return;
                    }
                    const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' });
                    const updated = { ...guardConfig, folderName: dirHandle.name };
                    onSetGuardConfig(updated);
                    onSaveSetting('guard_config', updated);
                    const dbRequest = indexedDB.open('NGVMS_CONFIG', 1);
                    dbRequest.onupgradeneeded = (e: any) => {
                      if (!e.target.result.objectStoreNames.contains('handles')) {
                        e.target.result.createObjectStore('handles');
                      }
                    };
                    dbRequest.onsuccess = (e: any) => {
                      const db = e.target.result;
                      const tx = db.transaction('handles', 'readwrite');
                      tx.objectStore('handles').put(dirHandle, 'downloads_folder');
                    };
                    alert(`Master folder configured: ${dirHandle.name}. Guards on this machine will now use this automatically.`);
                  } catch (err) {
                    console.error('Folder selection failed', err);
                  }
                }}
              >
                <FolderOpen size={16} />
                {guardConfig.folderName ? `Reconfigure (${guardConfig.folderName})` : 'Set Master Downloads Folder'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notification Matrix */}
      <div className={`glass-card ${styles.notification_config_card}`} style={{ padding: '30px', gridColumn: 'span 2' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
          <div className={styles.preset_icon} style={{ background: 'rgba(0,122,255,0.1)' }}>
            <BellRing size={20} color="var(--apple-blue)" />
          </div>
          <h3>Global Notification Orchestrator</h3>
        </div>
        <p className={styles.config_desc}>Configure granular alerts: Define exactly who receives what notification through which channel.</p>

        <div className={styles.notification_matrix_granular}>
          {Object.keys(notificationSettings).map((stage) => {
            let displayLabel = stage.replace('_', ' ');
            if (stage === 'REGISTRATION') displayLabel = 'FORWARDED';
            if (stage === 'APPROVAL') displayLabel = 'APPROVED';
            if (stage === 'CHECK_IN') displayLabel = 'GATE IN';
            if (stage === 'OVERDUE') displayLabel = 'OVER STAY';

            return (
              <div key={stage} className={styles.stage_block}>
                <div className={styles.stage_block_header}>
                  <strong>{displayLabel}</strong>
                  <div className={styles.channel_labels_row}>
                    <div className={styles.ch_label}><Globe size={12} /> WEB</div>
                    {features.email && <div className={styles.ch_label}><Mail size={12} /> EMAIL</div>}
                    {features.sms && <div className={styles.ch_label}><MessageSquare size={12} /> SMS</div>}
                  </div>
                </div>
                
                <div className={styles.recipient_rows}>
                  {(['GUARD', 'HOST', 'ADMIN', 'VISITOR'] as const).map((recipient) => (
                    <div key={recipient} className={styles.recipient_row}>
                      <span className={styles.recipient_name}>{recipient}</span>
                      <div className={styles.recipient_channels}>
                        {(['web', 'email', 'sms'] as const).map((ch) => {
                          if (ch === 'email' && !features.email) return <div key={ch} className={styles.channel_disabled} />;
                          if (ch === 'sms' && !features.sms) return <div key={ch} className={styles.channel_disabled} />;
                          
                          const isActive = notificationSettings[stage]?.[recipient]?.[ch];
                          return (
                            <button
                              key={ch}
                              className={`${styles.toggle_dot_btn} ${isActive ? styles.active : ''}`}
                              onClick={() => onToggleNotification(stage, recipient, ch)}
                              title={`${recipient} ${ch} alert`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <AnimatePresence>
          {uploadStatus.message && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`${styles.config_status} ${styles[uploadStatus.type as keyof typeof styles]}`}
            >
              {uploadStatus.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </motion.div>
);
};
