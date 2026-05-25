"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Download, FileText, RefreshCw, Search,
  Eye, ShieldCheck, Ban,
} from 'lucide-react';
import { Skeleton, SkeletonText, SkeletonAvatar } from '../ui/Skeleton';
import StatCard from '../ui/StatCard';
import { renderBadge } from './renderBadge';
import { Visitor } from './types';
import styles from '../../app/admin/admin.module.css';

interface Props {
  visitors: Visitor[];
  loading: boolean;
  searchQuery: string;
  statusFilter: string | null;
  tableTimeFilter: string;
  tableCustomFrom: string;
  tableCustomTo: string;
  onSetStatusFilter: (f: string | null) => void;
  onSetTableTimeFilter: (f: string) => void;
  onSetTableCustomFrom: (v: string) => void;
  onSetTableCustomTo: (v: string) => void;
  onRefresh: () => void;
  onQuickExport: () => void;
  onGoToReports: () => void;
  onViewPhoto: (target: { url: string; title: string; isAadhaar?: boolean; id?: string }) => void;
  onViewPass: (v: Visitor) => void;
  onBlacklist: (v: Visitor) => void;
  onFetchEncryptedId: (id: string, name: string) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export const OverviewTab: React.FC<Props> = ({
  visitors,
  loading,
  searchQuery,
  statusFilter,
  tableTimeFilter,
  tableCustomFrom,
  tableCustomTo,
  onSetStatusFilter,
  onSetTableTimeFilter,
  onSetTableCustomFrom,
  onSetTableCustomTo,
  onRefresh,
  onQuickExport,
  onGoToReports,
  onViewPhoto,
  onViewPass,
  onBlacklist,
  onFetchEncryptedId,
}) => {
  const stats = useMemo(
    () => ({
      approved: visitors.filter((v) => v.status === 'APPROVED').length,
      forwarded: visitors.filter(
        (v) => v.status === 'SENT_FOR_APPROVAL' || v.status === 'FORWARDED'
      ).length,
      gate_in: visitors.filter((v) =>
        ['GATE_IN', 'MEET_IN', 'MEET_OUT', 'CHECKED_IN', 'IN_MEETING'].includes(v.status)
      ).length,
      denied: visitors.filter((v) =>
        ['REJECTED', 'DENIED_BLACKLIST'].includes(v.status)
      ).length,
    }),
    [visitors]
  );

  const filteredVisitors = useMemo(() => {
    const q = searchQuery.toLowerCase();
    let filtered = visitors.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.phone.includes(q) ||
        (v.company && v.company.toLowerCase().includes(q)) ||
        v._id.toLowerCase().includes(q) ||
        (v.idNumberHash && v.idNumberHash.toLowerCase().includes(q)) ||
        (v.hostName && v.hostName.toLowerCase().includes(q)) ||
        (v.hostId?.name && v.hostId.name.toLowerCase().includes(q))
    );

    if (statusFilter === 'approved') {
      filtered = filtered.filter((v) => v.status === 'APPROVED');
    } else if (statusFilter === 'forwarded') {
      filtered = filtered.filter(
        (v) => v.status === 'SENT_FOR_APPROVAL' || v.status === 'FORWARDED'
      );
    } else if (statusFilter === 'gate_in') {
      filtered = filtered.filter((v) =>
        ['GATE_IN', 'MEET_IN', 'MEET_OUT', 'CHECKED_IN', 'IN_MEETING'].includes(v.status)
      );
    } else if (statusFilter === 'rejected') {
      filtered = filtered.filter((v) =>
        ['REJECTED', 'DENIED_BLACKLIST'].includes(v.status)
      );
    }

    const now = new Date();
    if (tableTimeFilter !== 'all') {
      filtered = filtered.filter((v) => {
        const vDate = new Date(v.createdAt);
        if (tableTimeFilter === 'today') return vDate.toDateString() === now.toDateString();
        if (tableTimeFilter === 'last_day') {
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          return vDate.toDateString() === yesterday.toDateString();
        }
        if (tableTimeFilter === 'week') {
          const firstDay = new Date(now);
          firstDay.setDate(now.getDate() - now.getDay());
          firstDay.setHours(0, 0, 0, 0);
          return vDate >= firstDay;
        }
        if (tableTimeFilter === 'last_week') {
          const lastWeekStart = new Date(now);
          lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
          lastWeekStart.setHours(0, 0, 0, 0);
          const lastWeekEnd = new Date(now);
          lastWeekEnd.setDate(now.getDate() - now.getDay() - 1);
          lastWeekEnd.setHours(23, 59, 59, 999);
          return vDate >= lastWeekStart && vDate <= lastWeekEnd;
        }
        if (tableTimeFilter === 'month')
          return vDate.getMonth() === now.getMonth() && vDate.getFullYear() === now.getFullYear();
        if (tableTimeFilter === 'last_month') {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return (
            vDate.getMonth() === lastMonth.getMonth() &&
            vDate.getFullYear() === lastMonth.getFullYear()
          );
        }
        if (tableTimeFilter === 'year') return vDate.getFullYear() === now.getFullYear();
        if (tableTimeFilter === 'last_year') return vDate.getFullYear() === now.getFullYear() - 1;
        if (tableTimeFilter === 'custom') {
          const from = tableCustomFrom ? new Date(tableCustomFrom) : new Date(0);
          const to = tableCustomTo ? new Date(tableCustomTo) : new Date();
          to.setHours(23, 59, 59, 999);
          return vDate >= from && vDate <= to;
        }
        return true;
      });
    }
    return filtered;
  }, [visitors, searchQuery, statusFilter, tableTimeFilter, tableCustomFrom, tableCustomTo]);

  return (
    <motion.div key="overview" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: -20 }}>
      <div className={styles.stats_grid}>
        <StatCard
          title="APPROVED"
          value={stats.approved}
          type="approved"
          icon="✓"
          onClick={() => onSetStatusFilter(statusFilter === 'approved' ? null : 'approved')}
          isActive={statusFilter === 'approved'}
        />
        <StatCard
          title="FORWARDED"
          value={stats.forwarded}
          type="pending"
          icon="◷"
          onClick={() => onSetStatusFilter(statusFilter === 'forwarded' ? null : 'forwarded')}
          isActive={statusFilter === 'forwarded'}
        />
        <StatCard
          title="GATE IN"
          value={stats.gate_in}
          type="checkin"
          icon="◎"
          onClick={() => onSetStatusFilter(statusFilter === 'gate_in' ? null : 'gate_in')}
          isActive={statusFilter === 'gate_in'}
        />
        <StatCard
          title="REJECTED"
          value={stats.denied}
          type="rejected"
          icon="✕"
          onClick={() => onSetStatusFilter(statusFilter === 'rejected' ? null : 'rejected')}
          isActive={statusFilter === 'rejected'}
        />
      </div>

      <motion.div variants={itemVariants} className={`glass-card ${styles.registry_card}`}>
        <div className={styles.table_header}>
          <div>
            <h3>Visitor HISTORY</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Real-time HISTORY &amp; COUNT OF VISITOR
            </p>
          </div>
          <div className={styles.header_actions} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              className="glass-input"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem', height: 'auto', borderRadius: '8px', cursor: 'pointer' }}
              value={tableTimeFilter}
              onChange={(e) => onSetTableTimeFilter(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="last_day">Yesterday</option>
              <option value="week">This Week</option>
              <option value="last_week">Last Week</option>
              <option value="month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="year">This Year</option>
              <option value="last_year">Last Year</option>
              <option value="custom">Custom Date</option>
            </select>

            {tableTimeFilter === 'custom' && (
              <div style={{ display: 'flex', gap: '5px' }}>
                <input
                  type="date"
                  className="glass-input"
                  style={{ padding: '6px', fontSize: '0.8rem', height: 'auto', borderRadius: '8px' }}
                  value={tableCustomFrom}
                  onChange={(e) => onSetTableCustomFrom(e.target.value)}
                />
                <input
                  type="date"
                  className="glass-input"
                  style={{ padding: '6px', fontSize: '0.8rem', height: 'auto', borderRadius: '8px' }}
                  value={tableCustomTo}
                  onChange={(e) => onSetTableCustomTo(e.target.value)}
                />
              </div>
            )}

            <button className="glass-btn secondary small" onClick={onQuickExport} title="Download Current View">
              <Download size={14} style={{ marginRight: '6px' }} /> Quick Export
            </button>
            <button className="glass-btn primary small" onClick={onGoToReports}>
              <FileText size={14} style={{ marginRight: '6px' }} /> Reports
            </button>
            <button onClick={onRefresh} className={styles.refresh_btn} disabled={loading}>
              <RefreshCw size={16} className={loading ? styles.spinning : ''} />
            </button>
          </div>
        </div>

        <div className={styles.table_container}>
          <table className={styles.glass_table}>
            <thead>
              <tr>
                <th>Visitor Name &amp; Code</th>
                <th>Remarks</th>
                <th>Current Status</th>
                <th>TIMESTAMPS</th>
                <th>Security Proof</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <tr key={i} className={styles.audit_row}>
                      <td>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <SkeletonAvatar width={40} height={40} borderRadius="50%" />
                          <div>
                            <SkeletonText width={120} height={14} style={{ marginBottom: '6px' }} />
                            <SkeletonText width={80} height={10} />
                          </div>
                        </div>
                      </td>
                      <td><SkeletonText width={120} height={12} /></td>
                      <td><Skeleton width={80} height={24} borderRadius={12} /></td>
                      <td>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <SkeletonText width={90} height={12} />
                          <SkeletonText width={90} height={12} />
                          <SkeletonText width={90} height={12} />
                          <SkeletonText width={90} height={12} />
                        </div>
                      </td>
                      <td><Skeleton width={100} height={28} borderRadius={16} /></td>
                      <td><Skeleton width={80} height={28} borderRadius={4} /></td>
                    </tr>
                  ))
              ) : filteredVisitors.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>
                    No matching records found in registry.
                  </td>
                </tr>
              ) : (
                filteredVisitors.map((v) => (
                  <motion.tr key={v._id} variants={itemVariants} className={styles.audit_row}>
                    <td>
                      <div className={styles.profile_cell}>
                        {v.photoUrl ? (
                          <img src={v.photoUrl} className={styles.profile_img} alt="" />
                        ) : (
                          <div className={styles.profile_initials}>{v.name[0]}</div>
                        )}
                        <div className={styles.profile_details}>
                          <span
                            className={styles.name_text_link}
                            onClick={() => onViewPass(v)}
                          >
                            {v.name}
                          </span>
                          <span className={styles.sub_text}>
                            Code: {v._id.substring(v._id.length - 6).toUpperCase()}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--apple-blue)', marginTop: '2px', opacity: 0.8 }}>
                            {v.company || 'Private Entity'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        title={v.hostRemark}
                        style={{ fontSize: '0.85rem', opacity: 0.8, display: 'block', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {v.hostRemark || '--'}
                      </span>
                    </td>
                    <td>{renderBadge(v.status)}</td>
                    <td className={styles.lifecycle_cell}>
                      <div className={styles.timeline_detailed}>
                        {[
                          { label: 'Gate In', val: v.checkInTime, color: 'var(--status-gate-in)' },
                          { label: 'Meet In', val: v.meetInTime, color: 'var(--status-meet-in)' },
                          { label: 'Meet Out', val: v.meetOutTime, color: 'var(--status-meet-out)' },
                          { label: 'Gate Out', val: v.checkOutTime, color: 'var(--status-gate-out)' },
                        ].map(({ label, val, color }) => (
                          <div className={styles.time_item} key={label}>
                            <span className={styles.time_label}>{label}</span>
                            <span
                              className={val ? styles.time_val : styles.time_na}
                              style={val ? { color, fontWeight: 800 } : {}}
                            >
                              {val
                                ? new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : '--:--'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className={styles.proof_cluster}>
                        {v.photoUrl && (
                          <button
                            className={`${styles.proof_btn} ${styles.proof_btn_photo}`}
                            onClick={() => onViewPhoto({ url: v.photoUrl!, title: `Visitor: ${v.name}` })}
                            title="View Visitor Photo"
                          >
                            <Eye size={12} /> Photo
                          </button>
                        )}
                        {v.idProofPhotoUrl && (
                          <button
                            className={`${styles.proof_btn} ${styles.proof_btn_id}`}
                            onClick={() => onViewPhoto({ url: v.idProofPhotoUrl!, title: `ID Proof: ${v.name}` })}
                            title="View ID Proof"
                          >
                            <ShieldCheck size={12} /> ID Proof
                          </button>
                        )}
                        {v.aadhaarImageUrl && (
                          <button
                            className={`${styles.proof_btn} ${styles.proof_btn_aadhaar}`}
                            onClick={() =>
                              onViewPhoto({
                                url: v.aadhaarImageUrl!,
                                title: `Aadhaar: ${v.name} (${v.maskedAadhaar || 'Verified'})`,
                                isAadhaar: true,
                                id: v._id,
                              })
                            }
                            title="View Aadhaar Preview"
                          >
                            <ShieldCheck size={12} /> Aadhaar
                          </button>
                        )}
                        {v.encryptedIdProofPreview && (
                          <button
                            className={`${styles.proof_btn} ${styles.proof_btn_vault}`}
                            onClick={() => onFetchEncryptedId(v._id, v.name)}
                            title="View Secure Vault ID"
                          >
                            <ShieldCheck size={12} /> Vault ID
                          </button>
                        )}
                        {!v.photoUrl && !v.idProofPhotoUrl && !v.aadhaarImageUrl && !v.encryptedIdProofPreview && (
                          <span style={{ opacity: 0.4, fontSize: '0.8rem' }}>No Biometrics</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <button className={styles.blacklist_btn} onClick={() => onBlacklist(v)}>
                        <Ban size={14} /> Blacklist
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};
