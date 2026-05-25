import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Users, RefreshCcw, LogOut, Clock, Activity } from 'lucide-react';
import { Visitor } from '../../src/store/index';
import styles from '../../app/approval/approval.module.css';

interface VisitorGridProps {
  visitors: Visitor[];
  isLoading: boolean;
  onAction: (visitor: Visitor, action: string) => void;
  onViewTraceability: (visitor: Visitor) => void;
  onViewPass: (visitor: Visitor) => void;
  statusLabels: Record<string, string>;
  getStatusClass: (status: string) => string;
  OverstayTimer: React.ComponentType<{ expectedCheckout?: string }>;
}

export const VisitorGrid: React.FC<VisitorGridProps> = ({
  visitors, isLoading, onAction, onViewTraceability, onViewPass, 
  statusLabels, getStatusClass, OverstayTimer
}) => {
  return (
    <div className={styles.lifecycle_grid}>
      {isLoading ? (
        Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`glass-card ${styles.host_card_lifecycle}`} style={{ opacity: 0.5 }}>
            <div className={styles.card_top_info}>Loading...</div>
          </div>
        ))
      ) : (
        <AnimatePresence mode="popLayout">
          {visitors.map((req) => (
            <motion.div 
              key={req._id} 
              className={`glass-card ${styles.host_card_lifecycle} ${styles.pass_design}`} 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ borderLeft: `6px solid var(--status-${req.status.toLowerCase().replace('_', '-')})` }}
              layout
            >
              <div className={styles.card_top_info} onClick={() => onViewPass(req)}>
                <div className={styles.visitor_biometrics}>
                  <div className={styles.v_initials}>
                     {req.photoUrl ? <img src={req.photoUrl} alt="" className={styles.v_photo_tiny} /> : req.name.substring(0,2).toUpperCase()}
                  </div>
                  <div className={styles.v_meta}>
                     <span className={styles.v_name_main}>{req.name}</span>
                     <span className={styles.v_id}>🏷️ ID: {req._id.substring(req._id.length - 6).toUpperCase()}</span>
                     <OverstayTimer expectedCheckout={req.expectedCheckout} />
                  </div>
                </div>
                <div className={`${styles.status_badge_v2} ${getStatusClass(req.status)}`}>
                   {statusLabels[req.status] || req.status}
                   <ExternalLink size={10} style={{ marginLeft: '4px' }} />
                </div>
              </div>

              <div className={styles.card_body_details}>
                <div className={styles.detail_node}><label>🎯 PURPOSE</label><strong>{req.purpose}</strong></div>
                <div className={styles.detail_node}><label>📅 TIME</label><strong>{new Date(req.visitTime || req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>
                <div className={styles.detail_node}><label>📞 CONTACT</label><strong>{req.company || 'Private'} • {req.phone}</strong></div>
              </div>

              <div className={styles.lifecycle_actions}>
                <button className={styles.timeline_trigger} onClick={() => onViewTraceability(req)}>
                   <Users size={14} style={{ marginRight: '8px' }} /> VIEW TRACEABILITY
                </button>
                
                {req.status === 'SENT_FOR_APPROVAL' && (
                  <div className={styles.dual_actions}>
                    <button className={`${styles.action_btn} ${styles.deny}`} onClick={() => onAction(req, 'REJECT')}>❌ REJECT</button>
                    <button className={`${styles.action_btn} ${styles.allow}`} onClick={() => onAction(req, 'APPROVE')}>✅ APPROVE</button>
                  </div>
                )}
                
                {req.status === 'APPROVED' && (
                  <div className={styles.waiting_stage}><RefreshCcw size={16} className={styles.spin_icon} /><span>WAITING AT GATE</span></div>
                )}
                
                {req.status === 'GATE_IN' && (
                  <div className={styles.dual_actions}>
                    <button className={`${styles.action_btn} ${styles.start}`} onClick={() => onAction(req, 'MEET_IN')}>🤝 MEET IN</button>
                    <button className={`${styles.action_btn} ${styles.end}`} onClick={() => onAction(req, 'CANCEL_MEET')}>👻 CANCEL</button>
                  </div>
                )}
                
                {req.status === 'MEET_IN' && (
                  <button className={`${styles.action_btn} ${styles.end} ${styles.full_w}`} onClick={() => onAction(req, 'MEET_OUT')}>🏁 MEET OUT</button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
};
