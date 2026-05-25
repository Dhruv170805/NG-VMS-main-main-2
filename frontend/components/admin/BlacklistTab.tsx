"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ShieldAlert, UserCheck, UserX } from 'lucide-react';
import { Skeleton, SkeletonText } from '../ui/Skeleton';
import { BlacklistEntry } from './types';
import styles from '../../app/admin/admin.module.css';

interface Props {
  filteredBlacklist: BlacklistEntry[];
  loading: boolean;
  blacklistSearch: string;
  onRefresh: () => void;
  onToggleBlacklist: (id: string) => void;
  onDeleteFromBlacklist: (id: string) => void;
}

export const BlacklistTab: React.FC<Props> = ({
  filteredBlacklist,
  loading,
  blacklistSearch,
  onRefresh,
  onToggleBlacklist,
  onDeleteFromBlacklist,
}) => (
  <motion.div
    key="blacklist"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className={styles.settings_view}
  >
    <div className={`glass-card ${styles.registry_card}`}>
      <div className={styles.table_header}>
        <h3>Blocked Identity List</h3>
        <div className={styles.header_actions}>
          <button onClick={onRefresh} className={styles.refresh_btn} disabled={loading}>
            <RefreshCw size={16} className={loading ? styles.spinning : ''} />
          </button>
        </div>
      </div>
      <div className={styles.table_container}>
        <table className={styles.glass_table}>
          <thead>
            <tr>
              <th>Visitor &amp; Company</th>
              <th>Reason for Restriction</th>
              <th>Status</th>
              <th>Blacklisted On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="wait">
              {loading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <motion.tr key={`skel-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={styles.audit_row}>
                      <td><SkeletonText width={160} height={14} /></td>
                      <td><SkeletonText width={200} height={14} /></td>
                      <td><Skeleton width={80} height={24} borderRadius={12} /></td>
                      <td><Skeleton width={100} height={14} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Skeleton width={80} height={28} borderRadius={4} />
                          <Skeleton width={80} height={28} borderRadius={4} />
                        </div>
                      </td>
                    </motion.tr>
                  ))
              ) : filteredBlacklist.length === 0 ? (
                <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>
                    {blacklistSearch
                      ? `No results matching "${blacklistSearch}"`
                      : 'No individuals are currently blocked.'}
                  </td>
                </motion.tr>
              ) : (
                filteredBlacklist.map((item) => (
                  <motion.tr key={item._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={styles.audit_row}>
                    <td>
                      <div className={styles.profile_cell}>
                        <div className={styles.profile_initials}>{(item.name || 'U')[0]}</div>
                        <div className={styles.profile_details}>
                          <span
                            className={styles.name_text_link}
                            onClick={() => item.visitorId && window.open(`/pass?id=${item.visitorId}`, '_blank')}
                          >
                            {item.name || 'Unknown Visitor'}
                          </span>
                          <span className={styles.sub_text}>{item.company || 'N/A'}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: item.active ? 'var(--apple-red)' : 'var(--text-secondary)' }}>
                      {item.reason}
                    </td>
                    <td>
                      <span className={`badge ${item.active ? 'rejected' : 'approved'}`}>
                        {item.active ? 'Blocked' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem' }}>
                        <span style={{ fontWeight: 700 }}>{new Date(item.createdAt).toLocaleDateString()}</span>
                        <span style={{ opacity: 0.5 }}>
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.action_cell}>
                        <button
                          className={item.active ? styles.action_btn_blue : styles.action_btn_green}
                          onClick={() => onToggleBlacklist(item._id)}
                        >
                          {item.active ? <UserCheck size={14} /> : <UserX size={14} />}
                          {item.active ? 'Unblock' : 'Block'}
                        </button>
                        <button className={styles.action_btn_red} onClick={() => onDeleteFromBlacklist(item._id)}>Remove</button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>

    <div className="glass-card" style={{ padding: '30px', background: 'rgba(255,255,255,0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
        <div className={styles.preset_icon} style={{ background: 'rgba(0,122,255,0.1)' }}>
          <ShieldAlert size={20} />
        </div>
        <h3>Security Information</h3>
      </div>
      <p style={{ fontSize: '0.9rem', opacity: 0.7, lineHeight: '1.6' }}>
        Blacklisted visitors are identified by a secure cryptographic hash of their ID document.
        The system automatically cross-references these hashes during the registration process to prevent entry.
        Deactivating an entry will temporarily allow the visitor, while removing it will permanently clear the restriction.
      </p>
    </div>
  </motion.div>
);
