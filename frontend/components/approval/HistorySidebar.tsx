import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Search, History, ArrowRight } from 'lucide-react';
import styles from '../../app/approval/approval.module.css';

interface HistorySidebarProps {
  historyData: any[];
  isLoading: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  selectedTimeline: any[] | null;
  activeVisitor: any | null;
  onViewTimeline: (v: any) => void;
  onBackToHistory: () => void;
  getStatusClass: (s: string) => string;
  statusLabels: Record<string, string>;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  historyData, isLoading, search, onSearchChange,
  page, totalPages, onPageChange, selectedTimeline,
  activeVisitor, onViewTimeline, onBackToHistory,
  getStatusClass, statusLabels
}) => {
  return (
    <aside className={`${styles.host_audit_sidebar} glass-card`}>
      <div className={styles.sidebar_header_h}>
        <h3>📜 HISTORY</h3>
        <div className={styles.live_indicator} />
      </div>

      <AnimatePresence mode="wait">
        {selectedTimeline && activeVisitor ? (
          <motion.div key="timeline" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={styles.timeline_view}>
            <button className={styles.back_to_history} onClick={onBackToHistory}>
              <ChevronLeft size={14} /> BACK TO HISTORY
            </button>
            <div className={styles.timeline_header_v3}>
              <div className={styles.h_avatar_v3}>
                {activeVisitor.photoUrl ? <img src={activeVisitor.photoUrl} alt="" /> : activeVisitor.name.substring(0,2).toUpperCase()}
              </div>
              <div className={styles.t_header_info_v3}>
                <h4>{activeVisitor.name}</h4>
                <p>#{activeVisitor._id.substring(activeVisitor._id.length-6).toUpperCase()} • {activeVisitor.company || 'Private'}</p>
              </div>
            </div>
            <div className={styles.timeline_container_pro}>
               {selectedTimeline.map((log, i) => (
                 <div key={i} className={styles.timeline_item_pro}>
                    <div className={styles.t_dot} />
                    <div className={styles.t_content}>
                       <strong>{log.event}</strong>
                       <p>{log.details}</p>
                       <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                 </div>
               ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.history_list}>
            <div className={styles.sidebar_search_wrap}>
              <Search size={14} />
              <input type="text" placeholder="Find..." value={search} onChange={e => onSearchChange(e.target.value)} />
            </div>
            {historyData.map((h) => (
              <div key={h._id} className={styles.history_card_v3} onClick={() => onViewTimeline(h)}>
                <div className={styles.h_avatar_v3}>
                   {h.photoUrl ? <img src={h.photoUrl} alt="" /> : h.name.substring(0,2).toUpperCase()}
                </div>
                <div className={styles.h_info_v3}>
                  <div className={styles.h_top_row_v3}>
                    <span className={styles.h_name_v3}>{h.name}</span>
                    <span className={styles.h_time_v3}>{new Date(h.updatedAt || h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={styles.h_desc_v3}>{h.purpose} • {h.company || 'Private'}</div>
                  <span className={`${styles.h_status_pill_v3} ${getStatusClass(h.status)}`}>
                    {statusLabels[h.status] || h.status}
                  </span>
                </div>
              </div>
            ))}
            {totalPages > 1 && (
              <div className={styles.mini_pagination}>
                 <button disabled={page === 1} onClick={() => onPageChange(page - 1)}><ChevronLeft size={12} /></button>
                 <span>{page} / {totalPages}</span>
                 <button disabled={page === totalPages} onClick={() => onPageChange(page + 1)}><ArrowRight size={12} /></button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
};
