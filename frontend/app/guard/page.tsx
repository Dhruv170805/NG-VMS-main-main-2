"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import Webcam from 'react-webcam';
import { LogOut, XCircle, Menu, Shield } from 'lucide-react';
import { API_CONFIG, buildUrl } from '../config';
import { useTenant } from '../TenantContext';

// Global Store
import { useAppStore } from '../../src/store';
import { useAuth } from '../../src/context/AuthContext';

// Types
import { Visitor, ShiftStats } from '../../components/guard/types';

// Sub-components
import { SidebarHistory } from '../../components/guard/SidebarHistory';
import { ScannerModule } from '../../components/guard/ScannerModule';
import { VisitorDossier } from '../../components/guard/VisitorDossier';
import { AadhaarQuickLook } from '../../components/guard/AadhaarQuickLook';
import { QuickEntryForm } from '../../components/guard/QuickEntryForm';
import { useVisitorQueries } from '../../src/hooks/useVisitorQueries';
import { useGuardScanner } from '../../src/hooks/useGuardScanner';
import { useGuardAadhaar } from '../../src/hooks/useGuardAadhaar';
import { useGuardRegistration } from '../../src/hooks/useGuardRegistration';
import { useGuardUI } from '../../src/hooks/useGuardUI';

export default function GuardTerminal() {
  const router = useRouter();
  const { getTenantId, tenant } = useTenant();

  // Zustand Store
  const { connectSocket, disconnectSocket, socket } = useAppStore();

  // Core State
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Custom Hooks
  const { 
    scanStatus, setScanStatus, visitor, setVisitor, 
    errorMsg, setErrorMsg, manualId, setManualId, 
    startScanner, stopScanner, handleVerification 
  } = useGuardScanner();

  const [auditHistory, setAuditHistory] = useState<Visitor[]>([]);

  const [guardConfig, setGuardConfig] = useState<any>({ autoScan: false, folderName: '', requireAadhaar: false });

  const {
    isUploadingAadhaar, aadhaarReviewData, aadhaarPassword, setAadhaarPassword,
    pdfRenderedImage, uidaiWindow, fetchedFile,
    handleOpenUidai, handleStep2Interact, handleAadhaarUpload,
    handleAutoFetchLatest, handleAadhaarConfirm, handleAadhaarReject
  } = useGuardAadhaar(setVisitor, setAuditHistory, guardConfig);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoading: authLoading, logout } = useAuth();
  const [clock, setClock] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Refs
  const shiftStartRef = useRef(new Date().toISOString());

  const summary = {
    applied: auditHistory.length,
    pending: auditHistory.filter(v => v.status === 'PENDING_GUARD').length,
    forwarded: auditHistory.filter(v => v.status === 'SENT_FOR_APPROVAL').length,
    approved: auditHistory.filter(v => v.status === 'APPROVED').length,
    rejected: auditHistory.filter(v => v.status === 'REJECTED').length,
    gate_in: auditHistory.filter(v => v.status === 'GATE_IN').length,
    meet_in: auditHistory.filter(v => v.status === 'MEET_IN').length,
    meet_out: auditHistory.filter(v => v.status === 'MEET_OUT').length,
    gate_out: auditHistory.filter(v => v.status === 'GATE_OUT').length,
    overdue: auditHistory.filter(v => ['GATE_IN', 'MEET_IN', 'MEET_OUT'].includes(v.status) && v.expectedCheckout && new Date(v.expectedCheckout) < new Date()).length
  };

  // UI Hook
  const {
    showHandover, setShowHandover,
    handoverNotes, setHandoverNotes,
    showPreviousNotes, setShowPreviousNotes,
    previousHandover, setPreviousHandover,
    selectedPhoto, setSelectedPhoto,
    previewScale, setPreviewScale,
    isPreviewZoomed, setIsPreviewZoomed,
    shiftStats, setShiftStats,
    fetchShiftStats,
    handleHandover
  } = useGuardUI(router, shiftStartRef, summary);

  const [historyFilter, setHistoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [persistedHandle, setPersistedHandle] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [systemPurposes, setSystemPurposes] = useState<string[]>([]);
  
  // Load PDF.js
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).pdfjsLib) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      };
      document.head.appendChild(script);
    }
  }, []);

  // Keyboard Shortcuts (Power User UX)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      // Alt + N -> Open New Visitor Modal
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setShowQuickEntry(true);
      }

      // Esc -> Close Modals/Previews
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowQuickEntry(false);
        setShowHandover(false);
        setSelectedPhoto(null);
        setIsPreviewZoomed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.SYSTEM}/config`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        credentials: 'include'
      });
      const data = await res.json();
      setEmployees(data.hosts || []);
      setSystemPurposes(data.purposes || ['Meeting', 'Internship', 'Training', 'Personal', 'Other']);
      setGuardConfig({ autoScan: false, folderName: '', requireAadhaar: false, ...data.guard_config });
    } catch (err) {
      console.error('Failed to fetch config', err);
    }
  }, [getTenantId]);

  const { getVisitorsGql, getVisitorGql, searchRevisitorsGql } = useVisitorQueries();

  const fetchHistory = useCallback(async (signal?: AbortSignal, search?: string) => {
    if (typeof window !== 'undefined' && !localStorage.getItem('token')) return;
    setIsLoading(true);
    try {
      const { data } = await getVisitorsGql({
        variables: {
          search,
          limit: 50
        }
      });
      if (data?.getVisitors) setAuditHistory(data.getVisitors.visitors);
    } catch (err) {
      console.error('GraphQL History fetch failed', err);
    } finally {
      setIsLoading(false);
    }
  }, [getVisitorsGql, getTenantId, historyFilter, searchQuery]);

  const {
    activeRegTab, setActiveRegTab,
    revisitSearch, setRevisitSearch,
    revisitResults, setRevisitResults,
    isSearchingRevisit,
    formData, setFormData,
    isSubmitting,
    captureMode, setCaptureMode,
    webcamRefReg,
    performCapture,
    handleQuickRegister,
    handleRevisitorSearch,
    autofillVisitor
  } = useGuardRegistration(tenant, setShowQuickEntry, fetchHistory);

  useEffect(() => {
    setMounted(true);
    fetchConfig();
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, [fetchConfig]);

  useEffect(() => {
    const fetchLatestHandover = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${API_CONFIG.ENDPOINTS.HANDOVER}/latest?gateId=MAIN_GATE`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': getTenantId()
          },
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success && data.handover && data.handover.notes) {
          setPreviousHandover(data.handover);
          setShowPreviousNotes(true);
        }
      } catch (err) {
        console.error('Failed to fetch previous handover', err);
      }
    };
    fetchLatestHandover();
  }, [getTenantId]);

  useEffect(() => {
    const timer = setTimeout(() => fetchHistory(undefined, searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchHistory]);

  useEffect(() => {
    const controller = new AbortController();
    if (authLoading) return; // Wait for initial /me auth fetch to complete

    if (!user) {
      router.push('/login');
      return;
    }
    
    if (user.role !== 'GUARD' && user.role !== 'ADMIN') {
      router.push('/');
      return;
    }
    fetchHistory(controller.signal);
    fetchShiftStats();
    
    // Connect Global Socket
    connectSocket();

    return () => {
      controller.abort();
      disconnectSocket();
    };
  }, [fetchHistory, fetchShiftStats, router, connectSocket, disconnectSocket]);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewVisitor = (newVisitor: Visitor) => {
      setAuditHistory(prev => [newVisitor, ...prev]);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    };

    const handleUpdateVisitor = (updatedVisitor: Visitor) => {
      setAuditHistory(prev => prev.map(v => v._id === updatedVisitor._id ? updatedVisitor : v));
      if (visitor?._id === updatedVisitor._id) setVisitor(updatedVisitor);
    };

    socket.on('visitor:new', handleNewVisitor);
    socket.on('visitor:update', handleUpdateVisitor);

    return () => {
      socket.off('visitor:new', handleNewVisitor);
      socket.off('visitor:update', handleUpdateVisitor);
    };
  }, [socket, visitor?._id]);







  const handleGrantAccess = async (action: 'checkin' | 'completed' | 'forward') => {
    if (!visitor?._id) return;
    try {
      const token = localStorage.getItem('token');
      let body: any = { status: '' };
      if (action === 'checkin') body.status = 'GATE_IN';
      else if (action === 'completed') body.status = 'GATE_OUT';
      else if (action === 'forward') body.status = 'SENT_FOR_APPROVAL';

      const res = await fetch(`${API_CONFIG.ENDPOINTS.VISITORS}/${visitor._id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        body: JSON.stringify(body),
        credentials: 'include'
      });

      if (res.ok) {
        const updated = await res.json();
        setVisitor(updated.visitor);
        setScanStatus('success');
        fetchShiftStats();
        if (navigator.vibrate) navigator.vibrate([100, 30, 100]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendAlert = async (id: string, type: 'OVERSTAY' | 'POST_MEETING') => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_CONFIG.ENDPOINTS.VISITORS}/${id}/notify-alert`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        body: JSON.stringify({ type }),
        credentials: 'include'
      });
      alert('Alert successfully dispatched.');
    } catch (err) { console.error(err); }
  };




  useEffect(() => {
    if (!guardConfig.autoScan || !visitor || visitor.aadhaarVerified || visitor.status !== 'PENDING_GUARD') return;
    
    const interval = setInterval(() => {
      if (!isUploadingAadhaar && !aadhaarReviewData) {
        handleAutoFetchLatest(visitor._id);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [guardConfig.autoScan, visitor, isUploadingAadhaar, aadhaarReviewData]);

  if (!mounted) return null;

  return (
    <div className="guard_terminal">
      <header className={`terminal_nav glass_panel`} role="banner">
        <div className="terminal_brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            className="hamburger_btn_global" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label={isSidebarOpen ? "Close history sidebar" : "Open history sidebar"}
            aria-expanded={isSidebarOpen}
          >
            <Menu size={24} />
          </button>
          
          <div className="glass-card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px' }}>
            <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {tenant?.logoUrl ? (
                <img src={tenant.logoUrl} alt={`${tenant?.name || 'Tenant'} Logo`} width={36} height={36} style={{ objectFit: 'contain', borderRadius: '6px' }} />
              ) : (
                <Shield size={26} color="var(--apple-blue)" />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', letterSpacing: '-0.3px', lineHeight: 1.2, color: 'white' }}>{tenant?.name || 'VMS'} Security</span>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, lineHeight: 1.2 }}>Guard: {user?.name || 'Loading...'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button 
                className="glass-btn primary" 
                onClick={(e) => { e.stopPropagation(); setShowQuickEntry(true); }} 
                style={{ background: 'var(--apple-blue)', padding: '6px 12px', fontSize: '0.65rem', fontWeight: 900, width: 'fit-content', display: 'flex', alignItems: 'center', gap: '4px' }}
                aria-label="Register New Visitor"
                title="Shortcut: Alt + N"
              >
                + NEW VISITOR
              </button>
            </div>
          </div>
        </div>

        <div className="terminal_stats" role="navigation" aria-label="Filter visitors by status">
          <button className={`stat_pill ${historyFilter === 'ALL' ? 'active_filter' : ''}`} onClick={() => setHistoryFilter('ALL')} aria-pressed={historyFilter === 'ALL'}>
             APPLIED <strong>{summary.applied}</strong>
          </button>
          <button className={`stat_pill pending_pill ${historyFilter === 'PENDING' ? 'active_filter' : ''}`} onClick={() => setHistoryFilter('PENDING')} aria-pressed={historyFilter === 'PENDING'}>
             PENDING <strong>{summary.pending}</strong>
          </button>
          <button className={`stat_pill forwarded_pill ${historyFilter === 'SENT_FOR_APPROVAL' ? 'active_filter' : ''}`} onClick={() => setHistoryFilter('SENT_FOR_APPROVAL')} aria-pressed={historyFilter === 'SENT_FOR_APPROVAL'}>
             FORWARDED <strong>{summary.forwarded}</strong>
          </button>
          <button className={`stat_pill approved_pill ${historyFilter === 'APPROVED' ? 'active_filter' : ''}`} onClick={() => setHistoryFilter('APPROVED')} aria-pressed={historyFilter === 'APPROVED'}>
             APPROVED <strong>{summary.approved}</strong>
          </button>
          <button className={`stat_pill rejected_pill ${historyFilter === 'REJECTED' ? 'active_filter' : ''}`} onClick={() => setHistoryFilter('REJECTED')} aria-pressed={historyFilter === 'REJECTED'}>
             REJECTED <strong>{summary.rejected}</strong>
          </button>
          <button className={`stat_pill gate_in_pill ${historyFilter === 'GATE_IN' ? 'active_filter' : ''}`} onClick={() => setHistoryFilter('GATE_IN')} aria-pressed={historyFilter === 'GATE_IN'}>
             GATE IN <strong>{summary.gate_in}</strong>
          </button>
          <button className={`stat_pill meet_in_pill ${historyFilter === 'MEET_IN' ? 'active_filter' : ''}`} onClick={() => setHistoryFilter('MEET_IN')} aria-pressed={historyFilter === 'MEET_IN'}>
             MEET IN <strong>{summary.meet_in}</strong>
          </button>
          <button className={`stat_pill meet_out_pill ${historyFilter === 'MEET_OUT' ? 'active_filter' : ''}`} onClick={() => setHistoryFilter('MEET_OUT')} aria-pressed={historyFilter === 'MEET_OUT'}>
             MEET OUT <strong>{summary.meet_out}</strong>
          </button>
          <button className={`stat_pill gate_out_pill ${historyFilter === 'GATE_OUT' ? 'active_filter' : ''}`} onClick={() => setHistoryFilter('GATE_OUT')} aria-pressed={historyFilter === 'GATE_OUT'}>
             GATE OUT <strong>{summary.gate_out}</strong>
          </button>
          <button className={`stat_pill overdue_pill ${historyFilter === 'OVERSTAY' ? 'active_filter' : ''}`} onClick={() => setHistoryFilter('OVERSTAY')} aria-pressed={historyFilter === 'OVERSTAY'}>
             OVER STAY <strong>{summary.overdue}</strong>
          </button>
        </div>

        <div className="terminal_clock_hub">
            <div className="t_clock_main" style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span>{clock.getHours().toString().padStart(2, '0')}</span>
              <span className="clock_blink" style={{ margin: '0 4px' }}>:</span>
              <span>{clock.getMinutes().toString().padStart(2, '0')}</span>
              <span className="clock_blink" style={{ margin: '0 4px' }}>:</span>
              <span>
                {clock.getSeconds().toString().padStart(2, '0')}
              </span>
            </div>
          <div className="t_clock_date">{clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</div>
        </div>

        <button className="glass-btn secondary" onClick={() => { fetchShiftStats(); setShowHandover(true); }} style={{ padding: '12px 24px', fontSize: '0.85rem', fontWeight: 900 }}>
          HANDOVER SHIFT
        </button>
      </header>

      <main className="terminal_body">
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mobile_overlay_global"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        <motion.div 
          className="sidebar_wrapper_global"
          initial={false}
          animate={{ 
            x: windowWidth <= 768 
              ? (isSidebarOpen ? 0 : -420) 
              : 0 
          }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <SidebarHistory 
            auditHistory={auditHistory}
            isLoading={isLoading}
            visitor={visitor}
            searchQuery={searchQuery}
            historyFilter={historyFilter}
            setSearchQuery={setSearchQuery}
            setVisitor={setVisitor}
            setScanStatus={setScanStatus}
            handleGrantAccess={handleGrantAccess}
            handleSendAlert={handleSendAlert}
            setSelectedPhoto={setSelectedPhoto}
            isAadhaarLicensed={tenant?.features.aadhaar}
          />
        </motion.div>

        <div className="operational_zone" aria-live="polite">
          <div className="kiosk_scanner glass_panel">
            <ScannerModule 
              scanStatus={scanStatus}
              manualId={manualId}
              errorMsg={errorMsg}
              setManualId={setManualId}
              startScanner={startScanner}
              stopScanner={stopScanner}
              handleVerification={handleVerification}
              setScanStatus={setScanStatus}
            />

            {scanStatus === 'success' && visitor && (
              <VisitorDossier 
                visitor={visitor}
                setScanStatus={setScanStatus}
                aadhaarReviewData={aadhaarReviewData}
                uidaiWindow={uidaiWindow}
                aadhaarPassword={aadhaarPassword}
                isUploadingAadhaar={isUploadingAadhaar}
                pdfRenderedImage={pdfRenderedImage}
                handleOpenUidai={handleOpenUidai}
                handleStep2Interact={handleStep2Interact}
                setAadhaarPassword={setAadhaarPassword}
                handleAadhaarUpload={handleAadhaarUpload}
                handleAutoFetchLatest={handleAutoFetchLatest}
                fetchedFile={fetchedFile}
                setIsPreviewZoomed={setIsPreviewZoomed}
                handleAadhaarConfirm={handleAadhaarConfirm}
                handleAadhaarReject={handleAadhaarReject}
                handleGrantAccess={handleGrantAccess}
                handleSendAlert={handleSendAlert}
                guardConfig={guardConfig}
              />
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showHandover && (
          <motion.div className="modal_overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={`handover_modal glass_panel`} initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}>
              <h2>Shift Handover</h2>
              <div className="shift_summary_grid">
                <div className="summary_item"><span>GATE INS</span><strong>{shiftStats?.GATE_IN ?? summary.gate_in}</strong></div>
                <div className="summary_item"><span>GATE OUTS</span><strong>{shiftStats?.GATE_OUT ?? summary.gate_out}</strong></div>
                <div className="summary_item"><span>DENIED</span><strong>{shiftStats?.DENIED ?? summary.rejected}</strong></div>
              </div>
              <div className="notes_area">
                <label>OPERATIONAL NOTES</label>
                <textarea
                  className="glass-input"
                  placeholder="Incidents or equipment status..."
                  value={handoverNotes}
                  onChange={e => setHandoverNotes(e.target.value)}
                  style={{ minHeight: '100px', resize: 'none' }}
                />
              </div>
              <div className="modal_actions">
                <button className="glass-btn secondary" onClick={() => setShowHandover(false)}>CANCEL</button>
                <button className="glass-btn primary" onClick={handleHandover}>CONFIRM & LOGOUT</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showQuickEntry && (
          <motion.div className="modal_overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={`handover_modal glass_panel`} initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} style={{ maxWidth: '1200px', width: '95%', maxHeight: '95vh', overflowY: 'auto', padding: '24px 30px' }}>
              <div className="modal_header_v3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="status_pulse" style={{ background: 'var(--apple-blue)' }} />
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>Quick Visitor Entry</h2>
                  </div>
                  <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                    <button className={`glass-btn ${activeRegTab === 'NEW' ? 'primary' : 'secondary'}`} onClick={() => setActiveRegTab('NEW')}>NEW VISITOR</button>
                    <button className={`glass-btn ${activeRegTab === 'REVISIT' ? 'primary' : 'secondary'}`} onClick={() => setActiveRegTab('REVISIT')}>RE-VISITOR</button>
                  </div>
                </div>
                <button 
                  onClick={() => setShowQuickEntry(false)} 
                  style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
                  aria-label="Close quick entry form"
                >
                  <XCircle size={28} />
                </button>
              </div>

              <QuickEntryForm 
                activeRegTab={activeRegTab}
                setActiveRegTab={setActiveRegTab}
                setShowQuickEntry={setShowQuickEntry}
                revisitSearch={revisitSearch}
                setRevisitSearch={setRevisitSearch}
                handleRevisitorSearch={handleRevisitorSearch}
                isSearchingRevisit={isSearchingRevisit}
                revisitResults={revisitResults}
                autofillVisitor={autofillVisitor}
                formData={formData}
                setFormData={setFormData}
                systemPurposes={systemPurposes}
                employees={employees}
                handleQuickRegister={handleQuickRegister}
                isSubmitting={isSubmitting}
                captureMode={captureMode}
                setCaptureMode={setCaptureMode}
                webcamRefReg={webcamRefReg}
                performCapture={performCapture}
                features={tenant?.features}
                guardConfig={guardConfig}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPhoto && !selectedPhoto.isAadhaar && (
          <motion.div className="photo_modal_overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(30px)', display: 'flex', flexDirection: 'column' }} onClick={() => setSelectedPhoto(null)}>
             <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                <motion.div style={{ background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '32px', width: '100%', maxWidth: '900px', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0, 0, 0, 0.2)' }} onClick={e => e.stopPropagation()}>
                  <div style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{selectedPhoto.title}</h3>
                    <button 
                    onClick={() => setSelectedPhoto(null)} 
                    style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0, 0, 0, 0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    aria-label="Close photo preview"
                  >
                    <XCircle size={20} />
                  </button>
                  </div>
                  <div style={{ padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9', minHeight: '400px' }}>
                    <img src={selectedPhoto.url} alt={selectedPhoto.title} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)', border: '1px solid rgba(0, 0, 0, 0.05)' }} />
                  </div>
                </motion.div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPreviewZoomed && visitor && (
          <AadhaarQuickLook 
            visitor={visitor}
            pdfRenderedImage={pdfRenderedImage}
            previewScale={previewScale}
            setPreviewScale={setPreviewScale}
            setIsPreviewZoomed={setIsPreviewZoomed}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
