import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, UserCheck, Info, Clock, Shield, RefreshCw, LogIn, LogOut, ArrowRight, XCircle, Upload } from 'lucide-react';
import { useTenant } from '../../app/TenantContext';
import { ActiveTimer } from './ActiveTimer';
import { Visitor, STATUS_CONFIG } from './types';

interface VisitorDossierProps {
  visitor: Visitor;
  setScanStatus: (s: 'idle') => void;
  aadhaarReviewData: any;
  uidaiWindow: Window | null;
  aadhaarPassword: string;
  isUploadingAadhaar: boolean;
  pdfRenderedImage: string | null;
  handleOpenUidai: () => void;
  handleStep2Interact: () => void;
  setAadhaarPassword: (pwd: string) => void;
  handleAadhaarUpload: (file: File | null | undefined, id: string) => void;
  handleAutoFetchLatest: (id: string) => void;
  fetchedFile: File | null;
  setIsPreviewZoomed: (z: boolean) => void;
  handleAadhaarConfirm: () => void;
  handleAadhaarReject: () => void;
  handleGrantAccess: (action: 'checkin' | 'completed' | 'forward') => void;
  handleSendAlert: (id: string, type: 'OVERSTAY' | 'POST_MEETING') => void;
  guardConfig?: any;
}

export const VisitorDossier: React.FC<VisitorDossierProps> = ({
  visitor,
  setScanStatus,
  aadhaarReviewData,
  uidaiWindow,
  aadhaarPassword,
  isUploadingAadhaar,
  pdfRenderedImage,
  handleOpenUidai,
  handleStep2Interact,
  setAadhaarPassword,
  handleAadhaarUpload,
  handleAutoFetchLatest,
  fetchedFile,
  setIsPreviewZoomed,
  handleAadhaarConfirm,
  handleAadhaarReject,
  handleGrantAccess,
  handleSendAlert,
  guardConfig
}) => {
  const { tenant } = useTenant();
  const isAadhaarLicensed = tenant?.features?.aadhaar;

  const handlePrint = () => {
    const printUrl = `/pass?id=${visitor._id}&print=true&mode=${guardConfig?.printMode || 'HARD_PRINT_BOTH'}`;
    const printWindow = window.open(printUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <motion.div className="dossier_container" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="dossier_header">
        <div className="dossier_avatar">
          <img src={visitor.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(visitor.name)}&background=random&color=fff`} alt={visitor.name} />
        </div>
        <div className="dossier_meta">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2>{visitor.name}</h2>
            <div className={`v_status_badge ${STATUS_CONFIG[visitor.status]?.class || 'chip_pending'}`}>
              {STATUS_CONFIG[visitor.status]?.label || visitor.status.replace(/_/g, ' ')}
            </div>
          </div>
          <p>{visitor.company || 'Private Visit'}</p>
          <div style={{ display: 'flex', gap: '15px', marginTop: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, opacity: 0.6 }}><Phone size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> {visitor.phone}</span>
          </div>
        </div>
      </div>

      <div className="dossier_section_label">Visit Profile</div>
      <div className="feed_details" style={{ border: 'none', padding: 0 }}>
        <div className="detail_box">
          <label><UserCheck size={10} /> Contact Person</label>
          <span>{visitor.hostName}</span>
        </div>
        <div className="detail_box">
          <label><Info size={10} /> Purpose</label>
          <span>{visitor.purpose}</span>
        </div>
        {visitor.requestedDuration && (
          <div className="detail_box">
            <label><Clock size={10} /> Requested Duration</label>
            <span>{visitor.requestedDuration}</span>
          </div>
        )}
        {visitor.expectedCheckout && ['GATE_IN', 'MEET_IN', 'MEET_OUT'].includes(visitor.status) && (
          <div className="detail_box">
            <label><Clock size={10} /> Live Session Timer</label>
            <ActiveTimer expectedCheckout={visitor.expectedCheckout} />
          </div>
        )}
      </div>

      {visitor.hostRemark && (
        <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0,122,255,0.05)', borderRadius: '12px', borderLeft: '4px solid var(--apple-blue)' }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 950, color: 'var(--apple-blue)', textTransform: 'uppercase', marginBottom: '4px' }}>Host Instructions</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>&quot;{visitor.hostRemark}&quot;</div>
        </div>
      )}

      <div className="dossier_section_label">Log History</div>
      <div className="timestamp_dossier">
        <div className="ts_box">
          <label>Applied</label>
          <strong>{new Date(visitor.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong>
        </div>
        <div className={`ts_box ${visitor.approvedAt ? 'highlight' : ''}`}>
          <label>Approved</label>
          <strong>{visitor.approvedAt ? new Date(visitor.approvedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</strong>
        </div>
        <div className={`ts_box ${visitor.checkInTime ? 'highlight' : ''}`}>
          <label>GATE IN</label>
          <strong>{visitor.checkInTime ? new Date(visitor.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</strong>
        </div>
        <div className={`ts_box ${visitor.meetInTime ? 'highlight' : ''}`}>
          <label>MEET IN</label>
          <strong>{visitor.meetInTime ? new Date(visitor.meetInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</strong>
        </div>
        <div className={`ts_box ${visitor.meetOutTime ? 'highlight' : ''}`}>
          <label>MEET OUT</label>
          <strong>{visitor.meetOutTime ? new Date(visitor.meetOutTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</strong>
        </div>
        <div className={`ts_box ${visitor.checkOutTime ? 'highlight' : ''}`}>
          <label>GATE OUT</label>
          <strong>{visitor.checkOutTime ? new Date(visitor.checkOutTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</strong>
        </div>
      </div>

      <div className="dossier_section_label">Security Actions</div>
      <div className="dossier_actions">
        {visitor.status === 'PENDING_GUARD' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {isAadhaarLicensed && !visitor.aadhaarVerified && !aadhaarReviewData && (
              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--apple-blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900 }}>1</div>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Verify Aadhaar ID</p>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={handleOpenUidai} 
                    className="glass-btn secondary" 
                    style={{ flex: 2, background: 'var(--apple-blue)', color: '#fff', padding: '14px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                  >
                     <Shield size={18} /> VERIFY Aadhaar ID

                  </button>
                  {uidaiWindow && !uidaiWindow.closed && (
                    <button 
                      onClick={handleStep2Interact}
                      className="glass-btn secondary"
                      style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '14px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700 }}
                    >
                      CLOSE PORTAL
                    </button>
                  )}
                </div>
                
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--apple-orange)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900 }}>2</div>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Enter Password & Upload</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input 
                    type="password" 
                    className="glass-input" 
                    placeholder="Aadhaar Password (e.g. PRER1990)" 
                    value={aadhaarPassword} 
                    onChange={(e) => { setAadhaarPassword(e.target.value); handleStep2Interact(); }}
                    onFocus={handleStep2Interact}
                    style={{ padding: '14px', borderRadius: '10px', fontSize: '0.9rem' }}
                  />
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="glass-btn secondary"
                      onClick={() => handleAutoFetchLatest(visitor._id)}
                      style={{ flex: 1, background: 'rgba(0, 122, 255, 0.15)', color: 'var(--apple-blue)', padding: '12px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid rgba(0, 122, 255, 0.2)' }}
                    >
                      <RefreshCw size={14} /> AUTO FETCH
                    </button>
                    
                    <button 
                      className="glass-btn secondary"
                      onClick={() => document.getElementById('aadhaar-upload-input')?.click()}
                      style={{ flex: 1, background: 'rgba(255, 149, 0, 0.15)', color: 'var(--apple-orange)', padding: '12px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid rgba(255, 149, 0, 0.2)' }}
                    >
                      <Upload size={14} /> MANUAL UPLOAD
                    </button>
                  </div>

                  {fetchedFile && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--apple-green)', fontWeight: 600, textAlign: 'center' }}>
                      Ready to validate: {fetchedFile.name}
                    </div>
                  )}

                  <button 
                    className="glass-btn primary"
                    onClick={() => handleAadhaarUpload(fetchedFile, visitor._id)}
                    disabled={isUploadingAadhaar || !fetchedFile}
                    style={{ padding: '14px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'var(--apple-blue)', color: '#fff', opacity: (isUploadingAadhaar || !fetchedFile) ? 0.5 : 1 }}
                  >
                    {isUploadingAadhaar ? <RefreshCw size={18} className="spinning" /> : <Shield size={18} />} VALIDATE Aadhaar

                  </button>
                  
                  <input id="aadhaar-upload-input" type="file" accept="application/pdf" style={{ display: 'none' }} onChange={(e) => { handleAadhaarUpload(e.target.files?.[0], visitor._id); handleStep2Interact(); }} disabled={isUploadingAadhaar} />
                </div>
              </div>
            )}

            {isAadhaarLicensed && aadhaarReviewData && (
              <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                   <h4 style={{ margin: 0, color: 'var(--apple-blue)' }}>Extracted Aadhaar</h4>
                   {pdfRenderedImage && (
                     <button
                       className="glass-btn secondary small"
                       style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                       onClick={() => setIsPreviewZoomed(true)}
                     >
                       🔍 ZOOM
                     </button>
                   )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ background: 'rgba(0,122,255,0.1)', padding: '10px', borderRadius: '10px' }}>
                     <p style={{ margin: '0 0 8px 0', fontSize: '0.65rem', fontWeight: 900, color: 'var(--apple-blue)' }}>EXTRACTED AADHAAR</p>
                     <div style={{ height: '160px', borderRadius: '6px', overflow: 'hidden', background: '#000', marginBottom: '8px', cursor: 'zoom-in' }} onClick={() => setIsPreviewZoomed(true)}>
                        {pdfRenderedImage ? (
                          <img src={pdfRenderedImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <RefreshCw size={20} className="spinning" />
                          </div>
                        )}
                     </div>
                     <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800 }}>{aadhaarReviewData.maskedAadhaar}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="glass-btn primary" style={{ flex: 1, background: 'var(--apple-green)' }} onClick={handleAadhaarConfirm} disabled={!pdfRenderedImage}>
                    CONFIRM & MATCH
                  </button>
                  <button className="glass-btn primary" style={{ flex: 1, background: 'var(--apple-red)' }} onClick={handleAadhaarReject}>
                    NOT MATCHING
                  </button>
                </div>
              </div>
            )}

            <button 
              className="glass-btn primary" 
              style={{ 
                background: (visitor.aadhaarVerified || !isAadhaarLicensed) ? 'var(--apple-green)' : 'rgba(255,59,48,0.1)', 
                color: (visitor.aadhaarVerified || !isAadhaarLicensed) ? '#fff' : 'var(--apple-red)', 
                border: (visitor.aadhaarVerified || !isAadhaarLicensed) ? 'none' : '1px solid rgba(255,59,48,0.2)', 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '10px' 
              }} 
              onClick={() => (visitor.aadhaarVerified || !isAadhaarLicensed) ? handleGrantAccess('forward') : alert('Please verify Aadhaar first.')}
            >
              {(visitor.aadhaarVerified || !isAadhaarLicensed) ? <ArrowRight size={18} /> : <Shield size={18} />} 
              {(visitor.aadhaarVerified || !isAadhaarLicensed) ? 'FORWARD TO HOST' : 'REQUIRE AADHAAR VERIFICATION'}
            </button>
          </div>
        )}
        {visitor.status === 'APPROVED' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            <button className="glass-btn primary" style={{ background: 'var(--apple-green)' }} onClick={() => handleGrantAccess('checkin')}>
              <LogIn size={18} /> GRANT PHYSICAL ENTRY
            </button>
            {guardConfig?.printMode !== 'DIGITAL_ONLY' && (
              <button className="glass-btn secondary" style={{ background: 'rgba(0,0,0,0.05)', color: '#000', border: '1px solid rgba(0,0,0,0.1)' }} onClick={handlePrint}>
                <RefreshCw size={18} /> PRINT PHYSICAL PASS
              </button>
            )}
          </div>
        )}
        {(['GATE_IN', 'MEET_IN', 'MEET_OUT', 'CHECKED_IN', 'IN_MEETING'].includes(visitor.status)) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            <button className="glass-btn primary" style={{ background: 'var(--apple-red)' }} onClick={() => handleGrantAccess('completed')}>
              <LogOut size={18} /> GATE OUT (EXIT)
            </button>
            {guardConfig?.printMode !== 'DIGITAL_ONLY' && (
              <button className="glass-btn secondary" style={{ background: 'rgba(0,0,0,0.05)', color: '#000', border: '1px solid rgba(0,0,0,0.1)' }} onClick={handlePrint}>
                <RefreshCw size={18} /> RE-PRINT PHYSICAL PASS
              </button>
            )}
          </div>
        )}
        
        {['CHECKED_IN', 'IN_MEETING', 'MEET_OUT'].includes(visitor.status) && visitor.expectedCheckout && new Date(visitor.expectedCheckout) < new Date() && (
          <button className="glass-btn primary" style={{ background: 'var(--apple-red)' }} onClick={() => handleSendAlert(visitor._id, 'OVERSTAY')}>
            🚨 ALERT OVER STAY (VISITOR + HOST)
          </button>
        )}
        
        {visitor.status === 'MEET_OUT' && !(visitor.expectedCheckout && new Date(visitor.expectedCheckout) < new Date()) && (
          <button className="glass-btn primary" style={{ background: 'var(--apple-orange)' }} onClick={() => handleSendAlert(visitor._id, 'POST_MEETING')}>
            🔔 NOTIFY EXIT REMINDER
          </button>
        )}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
        <button className="back_to_scanner_mini" onClick={() => setScanStatus('idle')} style={{ width: '100%', justifyContent: 'center', padding: '16px' }}>
          <RefreshCw size={16} /> BACK TO LIVE SCANNER
        </button>
      </div>
    </motion.div>
  );
};
