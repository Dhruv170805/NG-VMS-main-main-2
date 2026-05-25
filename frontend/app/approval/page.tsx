"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, AlertCircle, CheckCircle2, Copy, Share2, Mail, MessageCircle, MessageSquare } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

import styles from './approval.module.css';
import { API_CONFIG } from '../config';
import { STATUS_LABELS } from '../constants';

import { useSocketStore, useHostStore } from '../../src/store';
import { useTenant } from '../TenantContext';

import { HostHeader } from '../../components/approval/HostHeader';
import { VisitorGrid } from '../../components/approval/VisitorGrid';
import { HistorySidebar } from '../../components/approval/HistorySidebar';
import { PassModal } from '../../components/ui/PassModal';

const APPROVAL_STATUS_MAP: Record<string, string> = {
  PENDING_GUARD: styles.pending_guard,
  SENT_FOR_APPROVAL: styles.sent_for_approval,
  APPROVED: styles.approved,
  GATE_IN: styles.gate_in,
  GATE_OUT: styles.gate_out,
  REJECTED: styles.rejected,
};

const OverstayTimer = ({ expectedCheckout }: { expectedCheckout?: string }) => {
  const [time, setTime] = useState({ text: '', isOverstay: false });

  useEffect(() => {
    if (!expectedCheckout) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(expectedCheckout).getTime();
      const diff = now - end;
      const isOverstay = diff > 0;
      const absDiff = Math.abs(diff);
      const h = Math.floor(absDiff / (1000 * 60 * 60));
      const m = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
      setTime({ 
        text: isOverstay ? `${h > 0 ? h + 'h ' : ''}${m}m OVER` : `${h > 0 ? h + 'h ' : ''}${m}m left`, 
        isOverstay 
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [expectedCheckout]);

  if (!expectedCheckout) return null;
  return <div className={`${styles.overstay_timer} ${time.isOverstay ? styles.overdue_urgent : ''}`}><span>{time.text}</span></div>;
};

const EmployeeApproval: React.FC = () => {
  const router = useRouter();
  const { socket, connect, isConnected } = useSocketStore();
  const { 
    visitors, history, isLoading, timeline, activeVisitor, historyPagination,
    fetchHostVisitors, fetchHostHistory, fetchTimeline, updateStatus, 
    setActiveVisitor, setTimeline, setVisitors
  } = useHostStore();

  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modalType, setModalType] = useState<'REJECT' | 'MEET_OUT' | 'APPROVE' | null>(null);
  const [passModalVisitor, setPassModalVisitor] = useState<any>(null);
  const [targetVisitor, setTargetVisitor] = useState<any>(null);
  const [remark, setRemark] = useState('');
  const { tenant } = useTenant();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    connect(token);
    fetchHostVisitors(parsedUser.id || parsedUser._id);
    fetchHostHistory(parsedUser.id || parsedUser._id);
  }, [router, connect, fetchHostVisitors, fetchHostHistory]);

  useEffect(() => {
    if (!socket || !user) return;
    socket.emit('join:host', user.id || user._id);
    socket.on('visitor:update', () => {
      fetchHostVisitors(user.id || user._id, searchQuery);
      fetchHostHistory(user.id || user._id, historyPagination.page, historySearch);
    });
    return () => { socket.off('visitor:update'); };
  }, [socket, user, searchQuery, historyPagination.page, historySearch, fetchHostVisitors, fetchHostHistory]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      fetchHostHistory(user.id || user._id, 1, historySearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [user, historySearch, fetchHostHistory]);

  const handleAction = async (visitor: any, type: string) => {
    setTargetVisitor(visitor);
    setModalType(type as any);
  };

  const confirmAction = async () => {
    if (!targetVisitor) return;
    const status = modalType === 'REJECT' ? 'REJECTED' : (modalType === 'APPROVE' ? 'APPROVED' : 'MEET_OUT');
    await updateStatus(targetVisitor._id, status, remark);
    setModalType(null);
    setRemark('');
    fetchHostVisitors(user.id || user._id, searchQuery);
  };

  const filteredVisitors = useMemo(() => {
    let list = visitors;
    if (statusFilter === 'OVERSTAY') {
      list = list.filter(v => ['GATE_IN', 'MEET_IN', 'MEET_OUT'].includes(v.status) && v.expectedCheckout && new Date(v.expectedCheckout) < new Date());
    } else if (statusFilter === 'GATE_OUT') {
      list = history;
    } else if (statusFilter !== 'ALL' && statusFilter !== 'HISTORY') {
      list = list.filter(v => v.status === statusFilter);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(v => 
        v.name.toLowerCase().includes(q) ||
        v.phone.includes(q) ||
        v.company?.toLowerCase().includes(q) ||
        v._id.toLowerCase().includes(q)
      );
    }
    
    return list;
  }, [visitors, statusFilter, history, searchQuery]);

  const stats = useMemo(() => ({
    all: visitors.length,
    sent_for_approval: visitors.filter(v => v.status === 'SENT_FOR_APPROVAL').length,
    gate_in: visitors.filter(v => v.status === 'GATE_IN').length,
    overstay: visitors.filter(v => ['GATE_IN', 'MEET_IN', 'MEET_OUT'].includes(v.status) && v.expectedCheckout && new Date(v.expectedCheckout) < new Date()).length,
    gate_out: history.length
  }), [visitors, history]);

  return (
    <div className={styles.approval_page}>
      <HostHeader 
        user={user} stats={stats} statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery} 
        onInvite={() => setShowInviteModal(true)}
        onLogout={() => { localStorage.clear(); router.push('/login'); }}
        notificationPermission="default" onRequestNotifications={() => {}}
        isConnected={isConnected}
        onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <main className={styles.approval_content}>
        <div className={styles.portal_section}>
          <VisitorGrid 
            visitors={filteredVisitors} isLoading={isLoading}
            onAction={handleAction} onViewTraceability={(v) => { setActiveVisitor(v); fetchTimeline(v._id); }}
            onViewPass={setPassModalVisitor}
            statusLabels={STATUS_LABELS} getStatusClass={(s) => APPROVAL_STATUS_MAP[s] || ''}
            OverstayTimer={OverstayTimer}
          />
        </div>

        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={styles.mobile_overlay}
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        <motion.div 
          className={styles.sidebar_wrapper}
          initial={false}
          animate={{ 
            x: typeof window !== 'undefined' && window.innerWidth <= 768 
              ? (isSidebarOpen ? 0 : 400) 
              : 0 
          }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <HistorySidebar 
            historyData={history} isLoading={isLoading} search={historySearch} onSearchChange={setHistorySearch}
            page={historyPagination.page} totalPages={historyPagination.totalPages}
            onPageChange={(p) => fetchHostHistory(user.id || user._id, p, historySearch)}
            selectedTimeline={timeline} activeVisitor={activeVisitor}
            onViewTimeline={(v) => { setActiveVisitor(v); fetchTimeline(v._id); }}
            onBackToHistory={() => { setActiveVisitor(null); setTimeline(null); }}
            getStatusClass={(s) => APPROVAL_STATUS_MAP[s] || ''} statusLabels={STATUS_LABELS}
          />
        </motion.div>
      </main>

      <AnimatePresence>
        {modalType && (
          <motion.div className={styles.modal_overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
             <motion.div className={`glass-card ${styles.remark_modal}`} initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}>
                <div className={styles.modal_header}>
                   <h3>{modalType} REMARK</h3>
                   <button onClick={() => setModalType(null)}><X size={20} /></button>
                </div>
                <textarea className={styles.remark_input} value={remark} onChange={e => setRemark(e.target.value)} placeholder="Optional remark..." />
                <div className={styles.modal_footer}>
                   <button className="glass-btn secondary" onClick={() => setModalType(null)}>CANCEL</button>
                   <button className="glass-btn primary" onClick={confirmAction}><Send size={16} /> CONFIRM</button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInviteModal && (
          <motion.div className={styles.modal_overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
             <motion.div className={`glass-card ${styles.remark_modal}`} style={{ textAlign: 'center', maxWidth: '400px' }}>
                <div className={styles.modal_header} style={{ justifyContent: 'center' }}>
                   <h3>Invite Visitor</h3>
                   <button className={styles.close_modal} onClick={() => setShowInviteModal(false)}><X size={20} /></button>
                </div>
                <p className={styles.modal_desc} style={{ marginTop: '8px', fontSize: '0.85rem' }}>Share this QR code or link with your visitor to allow them to register.</p>
                <div style={{ background: 'white', padding: '24px', borderRadius: '24px', display: 'inline-block', margin: '16px 0', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)' }}>
                   <QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/register?hostId=${user?.id || user?._id}`} size={180} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                   <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                      <button className="glass-btn secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }} onClick={() => {
                         const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?hostId=${user?.id || user?._id}`;
                         navigator.clipboard.writeText(url);
                         alert('Link copied to clipboard!');
                      }}><Copy size={14} /> Copy Link</button>
                      
                      <button className="glass-btn secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: '#25D366', color: 'white', border: 'none' }} onClick={() => {
                         const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?hostId=${user?.id || user?._id}`;
                         const message = `Hi, ${user?.name || 'A host'} has invited you to visit. Please register using this link: ${url}`;
                         window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                      }}><MessageCircle size={14} /> WhatsApp</button>
                   </div>
                   
                   <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                      <button className="glass-btn secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: '#FF9500', color: 'white', border: 'none' }} onClick={() => {
                         const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?hostId=${user?.id || user?._id}`;
                         const message = `Hi, ${user?.name || 'A host'} has invited you to visit. Please register using this link: ${url}`;
                         window.open(`sms:?body=${encodeURIComponent(message)}`, '_blank');
                      }}><MessageSquare size={14} /> SMS</button>
                      
                      <button className="glass-btn secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: '#007AFF', color: 'white', border: 'none' }} onClick={() => {
                         const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?hostId=${user?.id || user?._id}`;
                         const message = `Hi, ${user?.name || 'A host'} has invited you to visit. Please register using this link: ${url}`;
                         window.open(`mailto:?subject=${encodeURIComponent('Invitation to Visit')}&body=${encodeURIComponent(message)}`, '_blank');
                      }}><Mail size={14} /> Email</button>
                   </div>
                   
                   <button className="glass-btn primary" style={{ background: 'var(--apple-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', marginTop: '8px' }} onClick={() => setShowInviteModal(false)}>Done</button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PassModal
        isOpen={!!passModalVisitor}
        onClose={() => setPassModalVisitor(null)}
        visitor={passModalVisitor}
        tenant={tenant}
      />
    </div>
  );
};

export default EmployeeApproval;
