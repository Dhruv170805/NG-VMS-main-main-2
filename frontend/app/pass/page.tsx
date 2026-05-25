"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { useSearchParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { API_CONFIG } from '../config';
import { useTenant } from '../TenantContext';
import { SkeletonCard, SkeletonText } from '../../components/ui/Skeleton';
import { STATUS_LABELS } from '../constants';
import { PassCard } from '../../components/ui/PassCard';
import { PassFooter } from '../../components/ui/PassFooter';
import { AlertCircle, ArrowRight, Shield, Info, CheckCircle, Smartphone, Download, RotateCcw, RotateCw, Printer } from 'lucide-react';
import styles from './pass.module.css';

// Socket connection
const socket = io(API_CONFIG.SOCKET_URL, {
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionAttempts: Infinity
});

const DigitalPass: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { tenant, getTenantId } = useTenant();
  const visitorId = searchParams.get('id') || '';
  const isPrintView = searchParams.get('print') === 'true';
  const [guardConfig, setGuardConfig] = useState<any>(null);
  const activePrintMode = searchParams.get('mode') || guardConfig?.printMode || 'HARD_PRINT_BOTH';
  
  const [status, setStatus] = useState<string>('PENDING');
  const [visitor, setVisitor] = useState<any>(null);
  const [elapsed, setElapsed] = useState<string>('00:00:00');
  const [walletStatus, setWalletStatus] = useState<'idle' | 'adding' | 'success'>('idle');
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [adminRules, setAdminRules] = useState<string[]>([]);
  const [emergencyContact, setEmergencyContact] = useState<string>('Contact Command Center at ext. 911 or +91 12345 67890 immediately.');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Failed to parse user data');
      }
    }
  }, []);

  const isStaff = user && (['ADMIN', 'SUPER_ADMIN', 'HOST', 'RECEPTIONIST', 'GUARD', 'MANAGER', 'STAFF'].includes(user.role));
  const canPrintPass = user && 
    (activePrintMode !== 'DIGITAL_ONLY') && 
    (['ADMIN', 'SUPER_ADMIN', 'GUARD'].includes(user.role)) && 
    (['APPROVED', 'GATE_IN', 'MEET_IN', 'MEET_OUT', 'GATE_OUT'].includes(status));

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) setPlatform('ios');
      else if (/android/.test(ua)) setPlatform('android');
      else setPlatform('desktop');
    }
  }, []);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const res = await fetch(`${API_CONFIG.ENDPOINTS.SYSTEM}/config`, {
          headers: {
            'x-tenant-id': getTenantId()
          }
        });
        const data = await res.json();
        if (data.pass_rules) setAdminRules(data.pass_rules);
        if (data.emergency_contact) setEmergencyContact(data.emergency_contact);
        if (data.guard_config) setGuardConfig(data.guard_config);
      } catch (err) {
        console.error('Failed to fetch pass rules:', err);
      }
    };
    fetchRules();
  }, []);

  useEffect(() => {
    if (!visitorId) return;
    const controller = new AbortController();
    const fetchVisitor = async (signal?: AbortSignal) => {
      try {
        const res = await fetch(`${API_CONFIG.ENDPOINTS.VISITORS}/${visitorId}`, {
          credentials: 'include',
          signal,
          headers: {
            'x-tenant-id': getTenantId()
          }
        });
        const data = await res.json();
        if (data) {
          setVisitor(data);
          setStatus(data.status || 'PENDING');
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error('Failed to fetch visitor:', err);
      }
    };
    fetchVisitor(controller.signal);
    socket.emit('join:visitor', visitorId);
    socket.on('status:update', (data: any) => {
      if (typeof data === 'string') {
        setStatus(data);
      } else {
        setStatus(data.status);
        if (data.visitor) setVisitor(data.visitor);
      }
      if (navigator.vibrate) navigator.vibrate([20, 50, 20]);
    });
    return () => {
      controller.abort();
      socket.off('status:update');
    };
  }, [visitorId]);

  useEffect(() => {
    if (!visitor || !['GATE_IN', 'MEET_IN', 'MEET_OUT', 'CHECKED_IN', 'IN_MEETING'].includes(status)) {
      setElapsed('00:00:00');
      return;
    }
    const timer = setInterval(() => {
      const startTime = new Date(visitor.checkInTime || visitor.updatedAt).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, now - startTime);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [visitor, status]);

  const handleWalletAdd = () => {
    setWalletStatus('adding');
    setTimeout(() => {
      setWalletStatus('success');
      if (navigator.vibrate) navigator.vibrate([10, 30, 10, 30, 50]);
    }, 2500);
  };

  const getStepClass = (step: string) => {
    const states = ['PENDING_GUARD', 'SENT_FOR_APPROVAL', 'APPROVED', 'GATE_IN', 'MEET_IN', 'MEET_OUT', 'GATE_OUT'];
    const currentIndex = states.indexOf(status);
    const stepIndex = states.indexOf(step);
    if (currentIndex > stepIndex) return styles.done;
    if (currentIndex === stepIndex) return styles.active;
    return '';
  };

  const getStatusOverlay = () => {
    if (isStaff) return null;
    if (status === 'PENDING_GUARD') return <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}><div className={styles.spinner_apple} style={{ borderColor: 'rgba(255,149,0,0.2)', borderTopColor: '#FF9500' }}></div><span style={{ color: '#FF9500', fontWeight: 800, letterSpacing: '1px', fontSize: '16px' }}>GUARD VERIFICATION PENDING</span></div>;
    if (status === 'REJECTED') return <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,59,48,0.85)', backdropFilter: 'blur(4px)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#FFF', fontWeight: 900, letterSpacing: '2px', fontSize: '22px' }}>ACCESS DENIED</span></div>;
    return null;
  };

  if (!visitorId) return <div className={styles.pass_container_apple} style={{ justifyContent: 'center', minHeight: '100vh' }}><motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`glass-card ${styles.no_pass_card}`}><div className={styles.alert_icon_wrapper}><AlertCircle size={48} color="var(--apple-blue)" /></div><h2 className={styles.no_pass_title}>No Active Pass Found</h2><p className={styles.no_pass_text}>Please register at the reception to generate your biometric digital pass.</p><button className="glass-btn primary" onClick={() => router.push('/register')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '10px', padding: '14px' }}>Start Registration <ArrowRight size={18} /></button></motion.div></div>;
  if (!visitor) return <div className={styles.pass_container_apple}><div style={{padding: '50px', textAlign: 'center'}}><div className={styles.spinner_apple} /><p style={{ marginTop: '20px', fontWeight: 600, opacity: 0.5 }}>FETCHING BIOMETRIC PASS...</p></div></div>;

  const passId = `VMS-${new Date(visitor.createdAt).toISOString().slice(0, 10).replace(/-/g, '')}-${visitorId.slice(-4).toUpperCase()}`;
  const mrzLine1 = `V<IND ${visitor.name.split(' ')[1] || 'VISITOR'}<<${visitor.name.split(' ')[0]}<<<<<<<<<<<<<<<<<<<<<<`.toUpperCase();
  const mrzLine2 = `${passId.replace(/-/g, '')}<<IND<900115<1M${new Date().toISOString().slice(2, 8).replace(/-/g, '')}<<<<<<<<6`.toUpperCase();
  const mrzSingleLine = `${mrzLine1} ${mrzLine2}`;

  const defaultRules = ["Scan pass at all entry/exit terminals.", "Carry physical ID for spot verification.", "Escort required for restricted zones.", "No photography inside the premises.", "Gate-Out mandatory for security audit."];
  const displayRules = adminRules.length > 0 ? adminRules : defaultRules;

  return (
    <div className={styles.pass_container_apple}>
      <div className="bg-mesh" />
      
      {isStaff && !isPrintView && (
        <div style={{ position: 'fixed', top: '24px', left: '24px', zIndex: 100 }}>
          <button 
            className="glass-btn secondary" 
            onClick={() => router.back()}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              padding: '12px 24px', 
              borderRadius: '16px', 
              background: 'rgba(255,255,255,0.9)', 
              backdropFilter: 'blur(20px)', 
              border: '1px solid rgba(0,0,0,0.08)', 
              fontWeight: 800, 
              fontSize: '0.8rem', 
              letterSpacing: '0.5px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
              color: '#000'
            }}
          >
            <RotateCcw size={18} /> BACK TO DASHBOARD
          </button>
        </div>
      )}

      <div className={styles.pass_layout_v2}>
        {/* SCREEN VIEW: SIDE-BY-SIDE DUAL PASS */}
        {!isPrintView && (
          <div className={`${styles.dual_page_display} ${styles.no_print}`} style={{ flexDirection: 'column', gap: '2rem' }}>
            <PassCard 
              visitor={visitor} 
              tenant={tenant} 
              adminRules={adminRules} 
              emergencyContact={emergencyContact}
              elapsed={elapsed} 
              hideOverlay={isStaff}
              sideBySide={isStaff}
            />
            <PassFooter visitor={visitor} />
          </div>
        )}

        {/* PRINT SECTION — PERFECT REPRODUCTION FOR CR80 */}        <div className={styles.only_print}>
           {/* FRONT CARD (PRINT) */}
           <div style={{ width: '3.375in', height: '2.125in', overflow: 'hidden', position: 'relative', marginBottom: '0.5in' }}>
             <div className={styles.vms_card_studio} style={{ transform: 'scale(0.623)', transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
               {getStatusOverlay()}
               <div className={styles.card_top}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {tenant?.logoUrl ? (
                      <img src={tenant.logoUrl} alt={tenant.name} width={26} height={26} style={{ objectFit: 'contain' }} />
                    ) : (
                      <div style={{ color: '#fff', fontWeight: 900, fontSize: '16px', background: 'rgba(255,255,255,0.1)', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}>N</div>
                    )}
                    <div style={{ color: '#fff', fontWeight: 800, letterSpacing: '0.5px', fontSize: '13px', lineHeight: 1 }}>{tenant?.name || 'NG-VMS'}</div>
                 </div>
                 <div style={{ color: '#fff', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', opacity: 0.8 }}>Visitor pass</div>
               </div>

               {activePrintMode === 'QR_VID_ONLY' ? (
                 <div className={styles.card_main} style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '20px', padding: '40px' }}>
                    <div className={styles.v_qr_studio} style={{ width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <QRCodeSVG value={visitorId} size={110} level="H" />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                       <h2 className={styles.v_name_text} style={{ fontSize: '28px' }}>{visitor.name}</h2>
                       <p style={{ color: '#007AFF', fontWeight: 900, fontSize: '16px', fontFamily: 'monospace', marginTop: '10px', letterSpacing: '2px' }}>VID: {visitorId.slice(-8).toUpperCase()}</p>
                    </div>
                 </div>
               ) : (
                 <div className={styles.card_main}>
                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                     <div className={styles.v_photo_studio}><img src={visitor.photoUrl || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200&h=250"} alt="Visitor" /></div>
                     <div style={{ color: '#007AFF', fontSize: '8px', fontWeight: 800, fontFamily: 'monospace' }}>{passId}</div>
                   </div>
                   <div style={{ flex: 1 }}>
                     <h2 className={styles.v_name_text}>{visitor.name}</h2>
                     <div className={styles.v_company_hero}>{visitor.company || 'Private Visit'}</div>
                     <div className={styles.info_grid_studio}>
                       <div className={styles.info_item}><span>Host</span><p>{visitor.hostName}</p></div>
                       <div className={styles.info_item}><span>Purpose</span><p>{visitor.purpose}</p></div>
                       <div className={styles.info_item}><span>Duration</span><p>{visitor.requestedDuration || '1 Hour'}</p></div>
                       <div className={styles.info_item}><span>Approved</span><p>{visitor.approvedAt ? new Date(visitor.approvedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p></div>
                       <div className={styles.info_item}><span>ID TYPE</span><p>{visitor.idProofType || 'Aadhar'}</p></div>
                       <div className={styles.info_item}><span>Status</span><p style={{ color: '#34C759', fontWeight: 900 }}>{STATUS_LABELS[status] || status}</p></div>
                     </div>
                     <div className={styles.valid_period_row} style={{ marginTop: 'auto', padding: '6px 12px' }}>
                       <div style={{ display: 'flex', flexDirection: 'column' }}><span className={styles.v_label}>VALID UNTIL</span><div className={styles.valid_period_dates} style={{ fontSize: '10px' }}>{new Date(visitor.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div></div>
                       <div style={{ fontSize: '12px', fontWeight: 900, color: '#007AFF' }}>{elapsed}</div>
                     </div>
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                     <div className={styles.v_qr_studio}><QRCodeSVG value={visitorId} size={70} level="H" /></div>
                     <p style={{ fontSize: '6px', fontWeight: 900, textAlign: 'center', opacity: 0.5 }}>SECURE SCAN</p>
                   </div>
                 </div>
               )}
               
               {activePrintMode !== 'QR_VID_ONLY' && (
                 <div className={styles.pass_timeline}>
                   {['PENDING_GUARD', 'SENT_FOR_APPROVAL', 'APPROVED', 'GATE_IN', 'GATE_OUT'].map(step => (
                      <div key={step} className={`${styles.timeline_step} ${getStepClass(step)}`}>
                        <div className={styles.timeline_dot} />
                        <span className={styles.timeline_label}>
                          {step === 'SENT_FOR_APPROVAL' ? 'FORWARDED' : step.replace('_', ' ')}
                        </span>
                      </div>
                   ))}
                 </div>
               )}
               <div className={styles.card_bottom}><div style={{ opacity: 0.5, overflow: 'hidden' }}>{mrzSingleLine}</div></div>
             </div>
           </div>

           {/* BACK CARD (PRINT) - INVERTED FOR FOLDING */}
           <div className={styles.inverted_print_wrap}>
             <div className={`${styles.vms_card_studio} ${styles.card_back_v2}`} style={{ transform: 'scale(0.623)', transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
               <div className={styles.card_top_back}>
                 <div style={{ color: '#fff', fontWeight: 900, fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>rule</div>
                 <Shield size={16} color="#fff" />
               </div>
               <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '15px', height: '100%' }}>
                 <div className={styles.rules_container_v2}>
                   {displayRules.slice(0, 4).map((rule, idx) => (
                     <div key={idx} className={styles.rule_item_v2}><div className={styles.rule_bullet}>{idx + 1}</div><p className={styles.rule_text_v2}>{rule}</p></div>
                   ))}
                 </div>
                 <div className={styles.emergency_box_v2}>
                   <AlertCircle size={16} color="#ff3b30" />
                   <p><strong>EMERGENCY:</strong> {emergencyContact}</p>
                 </div>
                 <div className={styles.back_footer_branding} style={{ padding: 0, border: 'none' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.4 }}><QRCodeSVG value={visitorId} size={30} level="H" /><div style={{ fontSize: '7px', fontWeight: 900 }}>ENCRYPTED PROTOCOL v2.4.8</div></div>
                   <div style={{ textAlign: 'right', fontSize: '7px', fontWeight: 800, opacity: 0.3 }}>NON-TRANSFERABLE DOCUMENT</div>
                 </div>
               </div>
               <div style={{ background: '#000', height: '6px', width: '100%' }} />
             </div>
           </div>
           <PassFooter visitor={visitor} />
        </div>

        {/* CONTROLS */}
        {!isPrintView && (
          <div className={`${styles.pass_controls} ${styles.no_print}`}>
            <motion.button 
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="glass-btn primary" 
              style={{ flex: 1.5, background: walletStatus === 'success' ? '#34C759' : (platform === 'ios' ? '#000' : '#4285F4'), color: '#fff' }}
              onClick={handleWalletAdd} disabled={walletStatus !== 'idle'}
            >
              {walletStatus === 'idle' ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {platform === 'ios' ? 'Apple Wallet' : 'Google Wallet'} <Smartphone size={18} />
                </span>
              ) : walletStatus === 'adding' ? <RotateCw size={18} className="spinning" /> : <CheckCircle size={18} />}
            </motion.button>

            {canPrintPass && (
              <motion.button 
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="glass-btn secondary"
                style={{ padding: '12px 24px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700 }}
                onClick={() => window.print()}
              >
                <Printer size={18} /> PRINT PASS
              </motion.button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default function PassPage() {
  return (
    <React.Suspense fallback={
      <div className={styles.pass_container_apple}>
        <div className="bg-mesh" />
        <div style={{padding: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px'}}>
           <SkeletonCard width={320} height={480} borderRadius={20} />
           <SkeletonText width={200} height={16} />
        </div>
      </div>
    }>
      <DigitalPass />
    </React.Suspense>
  );
}
