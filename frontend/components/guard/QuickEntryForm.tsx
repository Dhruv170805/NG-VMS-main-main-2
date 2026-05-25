import React from 'react';
import { ShieldCheck, User, Camera, RotateCw, Search, XCircle } from 'lucide-react';
import Webcam from 'react-webcam';
import { Visitor } from './types';

interface QuickEntryFormProps {
  activeRegTab: 'NEW' | 'REVISIT';
  setActiveRegTab: (tab: 'NEW' | 'REVISIT') => void;
  setShowQuickEntry: (s: boolean) => void;
  revisitSearch: string;
  setRevisitSearch: (q: string) => void;
  handleRevisitorSearch: () => void;
  isSearchingRevisit: boolean;
  revisitResults: Visitor[];
  autofillVisitor: (v: Visitor) => void;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  systemPurposes: string[];
  employees: any[];
  handleQuickRegister: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  captureMode: 'VISITOR' | 'ID';
  setCaptureMode: (m: 'VISITOR' | 'ID') => void;
  webcamRefReg: React.RefObject<Webcam>;
  performCapture: () => void;
  features?: { aadhaar: boolean; email: boolean; sms: boolean };
  guardConfig?: any;
}

export const QuickEntryForm: React.FC<QuickEntryFormProps> = ({
  activeRegTab,
  setActiveRegTab,
  setShowQuickEntry,
  revisitSearch,
  setRevisitSearch,
  handleRevisitorSearch,
  isSearchingRevisit,
  revisitResults,
  autofillVisitor,
  formData,
  setFormData,
  systemPurposes,
  employees,
  handleQuickRegister,
  isSubmitting,
  captureMode,
  setCaptureMode,
  webcamRefReg,
  performCapture,
  features,
  guardConfig
}) => {
  return (
    <div className="quick_entry_horizontal_layout" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
      <div className="quick_entry_left_pane">
        {activeRegTab === 'REVISIT' ? (
          <div className="revisit_search_zone" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
             <div className="search_bar_v2" style={{ position: 'relative' }}>
                <input 
                  className="glass-input" 
                  placeholder="Search by Name, Phone, Company, or ID..." 
                  value={revisitSearch}
                  onChange={e => setRevisitSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRevisitorSearch()}
                  style={{ paddingRight: '120px', height: '54px' }}
                />
                <button 
                  className="glass-btn primary" 
                  onClick={handleRevisitorSearch}
                  style={{ position: 'absolute', right: '6px', top: '6px', bottom: '6px', padding: '0 20px', background: 'var(--apple-blue)' }}
                >
                  {isSearchingRevisit ? <RotateCw size={18} className="spinning" /> : 'SEARCH'}
                </button>
             </div>

             <div className="search_results_v2" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {revisitResults.length > 0 ? (
                  revisitResults.map(res => (
                    <div key={res._id} className="search_result_card glass_panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.4)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
                       <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                          <div style={{ width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden', background: '#eee' }}>
                            <img src={res.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(res.name)}&background=random&color=fff`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                          </div>
                          <div>
                             <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{res.name}</div>
                             <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{res.phone} • {res.company || 'Private'}</div>
                          </div>
                       </div>
                       <button className="glass-btn primary" onClick={() => autofillVisitor(res)} style={{ padding: '8px 16px', fontSize: '0.7rem' }}>
                          AUTO-FILL FORM
                       </button>
                    </div>
                  ))
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
                     <Search size={48} />
                     <p style={{ marginTop: '10px', fontWeight: 600 }}>Enter details to find returning visitors</p>
                  </div>
                )}
             </div>
          </div>
        ) : (
          <form onSubmit={handleQuickRegister} id="quick-reg-form" className="quick_entry_form">
            <div className="form_grid_ultra" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div className="input_group_v3">
                <label>VISITOR NAME*</label>
                <input autoFocus tabIndex={1} type="text" className="glass-input" placeholder="e.g. John Doe" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="input_group_v3">
                <label>PHONE NUMBER*</label>
                <input tabIndex={2} type="tel" className="glass-input" placeholder="+91 XXXXX XXXXX" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
              </div>
              <div className="input_group_v3">
                <label>EMAIL ADDRESS (OPTIONAL)</label>
                <input tabIndex={3} type="email" className="glass-input" placeholder="john@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="input_group_v3">
                <label>COMPANY NAME</label>
                <input tabIndex={4} type="text" className="glass-input" placeholder="Self / Company Name" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} />
              </div>
              
              <div className="input_group_v3" style={{ gridColumn: '1 / -1', margin: '8px 0' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 950, color: 'var(--apple-blue)', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldCheck size={14} /> Security Credentials
                    <div style={{ flex: 1, height: '1px', background: 'rgba(0,122,255,0.1)' }} />
                </div>
              </div>

              <div className="input_group_v3">
                <label>ID PROOF TYPE*</label>
                <select tabIndex={5} className="glass-input" value={formData.idProofType} onChange={e => setFormData({ ...formData, idProofType: e.target.value })} required>
                  {features?.aadhaar && <option value="Aadhaar Card">Aadhaar Card</option>}
                  {!guardConfig?.requireAadhaar && (
                    <>
                      <option value="PAN Card">PAN Card</option>
                      <option value="Passport">Passport</option>
                      <option value="Driving License">Driving License</option>
                      <option value="Other">Other</option>
                    </>
                  )}
                </select>
              </div>
              <div className="input_group_v3">
                <label>ID PROOF NUMBER*</label>
                <input tabIndex={5} type="text" className="glass-input" placeholder="ID Number" value={formData.idProofNumber} onChange={e => setFormData({ ...formData, idProofNumber: e.target.value })} required />
              </div>
              <div className="input_group_v3">
                <label>EXPECTED DURATION*</label>
                <select tabIndex={6} className="glass-input" value={formData.requestedDuration} onChange={e => setFormData({ ...formData, requestedDuration: e.target.value as any })} required>
                  <option value="1H">1 HOUR</option>
                  <option value="2H">2 HOURS</option>
                  <option value="3H">3 HOURS</option>
                  <option value="5H">5 HOURS</option>
                  <option value="FULL_DAY">FULL DAY</option>
                </select>
              </div>
              <div className="input_group_v3">
                <label>VISIT PURPOSE*</label>
                <select tabIndex={8} className="glass-input" value={formData.purpose} onChange={e => setFormData({ ...formData, purpose: e.target.value })} required>
                  <option value="">Select Purpose...</option>
                  {systemPurposes.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="input_group_v3" style={{ gridColumn: '1 / -1' }}>
                <label>HOST / CONTACT PERSON*</label>
                <select tabIndex={7} className="glass-input" value={formData.hostId} onChange={e => {
                    const host = employees.find(emp => emp._id === e.target.value);
                    setFormData({ ...formData, hostId: e.target.value, hostName: host?.name || '' });
                  }} required>
                  <option value="">Select Host User...</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name} ({emp.department})</option>
                  ))}
                </select>
              </div>
              
              <div className="input_group_v3" style={{ gridColumn: '1 / -1' }}>
                <label>HOST REMARKS (OPTIONAL)</label>
                <textarea tabIndex={9} className="glass-input" placeholder="Instructions..." style={{ minHeight: '50px', resize: 'none' }} value={formData.hostRemark} onChange={e => setFormData({ ...formData, hostRemark: e.target.value })} />
              </div>
            </div>

            <div className="modal_actions" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: '12px' }}>
              <button type="button" className="glass-btn secondary" onClick={() => setShowQuickEntry(false)} style={{ flex: 1, padding: '12px' }}>CANCEL</button>
              <button 
                type="submit" 
                className="glass-btn primary" 
                style={{ background: 'var(--apple-green)', flex: 2, padding: '12px', fontWeight: 900 }} 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'ENROLLING...' : 'INITIALIZE REGISTRATION & GRANT ENTRY'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="biometric_capture_zone" style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className={`glass-btn ${captureMode === 'VISITOR' ? 'primary' : 'secondary'}`} 
            style={{ flex: 1, padding: '10px', fontSize: '0.75rem', borderRadius: '12px' }}
            onClick={() => setCaptureMode('VISITOR')}
          >
            <User size={14} /> VISITOR
          </button>
          {!features?.aadhaar && (
            <button 
              className={`glass-btn ${captureMode === 'ID' ? 'primary' : 'secondary'}`} 
              style={{ flex: 1, padding: '10px', fontSize: '0.75rem', borderRadius: '12px' }}
              onClick={() => setCaptureMode('ID')}
            >
              <ShieldCheck size={14} /> ID PROOF
            </button>
          )}
        </div>

        <div className="reg_webcam_viewport" style={{ maxWidth: '100%', height: '240px', border: '4px solid var(--apple-blue)', borderRadius: '20px', position: 'relative', overflow: 'hidden' }}>
          <Webcam audio={false} ref={webcamRefReg} screenshotFormat="image/jpeg" className="webcam_element" mirrored={captureMode === 'VISITOR'} videoConstraints={{ aspectRatio: 1.33, facingMode: 'user' }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div className="hud_bracket hud_tl" />
          <div className="hud_bracket hud_tr" />
          <div className="hud_bracket hud_bl" />
          <div className="hud_bracket hud_br" />
          <div className="hud_scanline" />
        </div>

        <button className="glass-btn primary" onClick={performCapture} style={{ width: '100%', borderRadius: '12px', padding: '12px', background: 'var(--apple-blue)', fontWeight: 800 }}>
          <Camera size={18} /> CAPTURE {features?.aadhaar || captureMode === 'VISITOR' ? 'VISITOR' : 'ID'}
        </button>

        <div className="capture_previews" style={{ display: 'grid', gridTemplateColumns: features?.aadhaar ? '1fr' : '1fr 1fr', gap: '12px' }}>
          <div className={`preview_box ${formData.photoUrl ? 'captured' : ''}`} style={{ height: '90px', borderRadius: '16px', background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {formData.photoUrl ? <img src={formData.photoUrl} alt="Visitor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <><User size={18} opacity={0.3} /><span style={{ fontSize: '0.55rem', fontWeight: 800, opacity: 0.5 }}>VISITOR</span></>}
          </div>
          {!features?.aadhaar && (
            <div className={`preview_box ${formData.idProofPhotoUrl ? 'captured' : ''}`} style={{ height: '90px', borderRadius: '16px', background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {formData.idProofPhotoUrl ? <img src={formData.idProofPhotoUrl} alt="ID" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <><ShieldCheck size={18} opacity={0.3} /><span style={{ fontSize: '0.55rem', fontWeight: 800, opacity: 0.5 }}>ID PROOF</span></>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
