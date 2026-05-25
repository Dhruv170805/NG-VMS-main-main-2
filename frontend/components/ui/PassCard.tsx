"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, AlertCircle, RefreshCw } from 'lucide-react';
import styles from '../../app/pass/pass.module.css';

interface PassCardProps {
  visitor: any;
  tenant: any;
  adminRules?: string[];
  emergencyContact?: string;
  elapsed?: string;
  hideOverlay?: boolean;
  sideBySide?: boolean;
}

export const PassCard: React.FC<PassCardProps> = ({ 
  visitor, tenant, adminRules = [], 
  emergencyContact = 'Contact Command Center at ext. 911 or +91 12345 67890 immediately.',
  elapsed = '00:00:00', 
  hideOverlay = false, sideBySide = false 
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  if (!visitor) return null;

  const passId = `VMS-${new Date(visitor.createdAt).toISOString().slice(0, 10).replace(/-/g, '')}-${visitor._id.slice(-4).toUpperCase()}`;
  const mrzLine1 = `V<IND ${visitor.name.split(' ')[1] || 'VISITOR'}<<${visitor.name.split(' ')[0]}<<<<<<<<<<<<<<<<<<<<<<`.toUpperCase();
  const mrzLine2 = `${passId.replace(/-/g, '')}<<IND<900115<1M${new Date().toISOString().slice(2, 8).replace(/-/g, '')}<<<<<<<<6`.toUpperCase();
  const mrzSingleLine = `${mrzLine1} ${mrzLine2}`;

  const defaultRules = ["Scan pass at all entry/exit terminals.", "Carry physical ID for spot verification.", "Escort required for restricted zones.", "No photography inside the premises.", "Gate-Out mandatory for security audit."];
  const displayRules = adminRules.length > 0 ? adminRules : defaultRules;

  const getStepClass = (step: string) => {
    const states = ['PENDING_GUARD', 'SENT_FOR_APPROVAL', 'APPROVED', 'GATE_IN', 'MEET_IN', 'MEET_OUT', 'GATE_OUT'];
    const currentIndex = states.indexOf(visitor.status);
    const stepIndex = states.indexOf(step);
    if (currentIndex > stepIndex) return styles.done;
    if (currentIndex === stepIndex) return styles.active;
    return '';
  };

  const getStatusOverlay = () => {
    if (hideOverlay) return null;
    if (visitor.status === 'PENDING_GUARD') return <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}><div className={styles.spinner_apple} style={{ borderColor: 'rgba(255,149,0,0.2)', borderTopColor: '#FF9500' }}></div><span style={{ color: '#FF9500', fontWeight: 800, letterSpacing: '1px', fontSize: '16px' }}>GUARD VERIFICATION PENDING</span></div>;
    if (visitor.status === 'REJECTED' || visitor.status === 'DENIED_BLACKLIST') return <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,59,48,0.85)', backdropFilter: 'blur(4px)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#FFF', fontWeight: 900, letterSpacing: '2px', fontSize: '22px' }}>ACCESS DENIED</span></div>;
    return null;
  };

  const renderFrontSide = () => (
    <div className={styles.vms_card_studio} style={{ margin: 0 }}>
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
            <div className={styles.info_item}><span>Status</span><p style={{ color: '#34C759', fontWeight: 900 }}>{visitor.status}</p></div>
          </div>
          <div className={styles.valid_period_row} style={{ marginTop: 'auto', padding: '6px 12px', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}><span className={styles.v_label} style={{ fontSize: '8px', fontWeight: 800, color: '#8E8E93' }}>VALID UNTIL</span><div className={styles.valid_period_dates} style={{ fontSize: '10px', fontWeight: 600 }}>{new Date(visitor.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div></div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#007AFF' }}>{elapsed}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
          <div className={styles.v_qr_studio}><QRCodeSVG value={visitor._id} size={70} level="H" /></div>
          <p style={{ fontSize: '6px', fontWeight: 900, textAlign: 'center', opacity: 0.5 }}>SECURE SCAN</p>
        </div>
      </div>
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
      <div className={styles.card_bottom}><div style={{ opacity: 0.5, overflow: 'hidden' }}>{mrzSingleLine}</div></div>
    </div>
  );

  const renderBackSide = () => (
    <div className={`${styles.vms_card_studio} ${styles.card_back_v2}`} style={{ margin: 0 }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.4 }}><QRCodeSVG value={visitor._id} size={30} level="H" /><div style={{ fontSize: '7px', fontWeight: 900 }}>ENCRYPTED PROTOCOL v2.4.8</div></div>
          <div style={{ textAlign: 'right', fontSize: '7px', fontWeight: 800, opacity: 0.3 }}>NON-TRANSFERABLE DOCUMENT</div>
        </div>
      </div>
      <div style={{ background: '#000', height: '6px', width: '100%' }} />
    </div>
  );

  if (sideBySide) {
    return (
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {renderFrontSide()}
        {renderBackSide()}
      </div>
    );
  }

  return (
    <div className={styles.pass_card_wrapper} style={{ perspective: '1200px', cursor: 'pointer' }} onClick={() => setIsFlipped(!isFlipped)}>
      <motion.div
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
        style={{ transformStyle: 'preserve-3d', position: 'relative', width: '520px', height: '330px' }}
      >
        {/* FRONT SIDE */}
        <div style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', zIndex: isFlipped ? 0 : 1 }}>
          {renderFrontSide()}
        </div>

        {/* BACK SIDE */}
        <div style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', zIndex: isFlipped ? 1 : 0 }}>
          {renderBackSide()}
        </div>
      </motion.div>
      <div style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>
        Tap card to flip <RefreshCw size={12} style={{ verticalAlign: 'middle', marginLeft: '4px' }} />
      </div>
    </div>
  );
};
