"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import Webcam from 'react-webcam';
import { LogOut, XCircle, Menu } from 'lucide-react';
import { API_CONFIG, buildUrl } from '../config';
import { useTenant } from '../TenantContext';

// Global Store
import { useAppStore } from '../../src/store';

// Types
import { Visitor, ShiftStats } from '../../components/guard/types';

// Sub-components
import { SidebarHistory } from '../../components/guard/SidebarHistory';
import { ScannerModule } from '../../components/guard/ScannerModule';
import { VisitorDossier } from '../../components/guard/VisitorDossier';
import { AadhaarQuickLook } from '../../components/guard/AadhaarQuickLook';
import { QuickEntryForm } from '../../components/guard/QuickEntryForm';

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

  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'verifying' | 'success' | 'error'>('idle');
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [auditHistory, setAuditHistory] = useState<Visitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [manualId, setManualId] = useState('');
  const [user, setUser] = useState<any>(null);
  const [clock, setClock] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [shiftStats, setShiftStats] = useState<ShiftStats | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Modals & UI State
  const [showHandover, setShowHandover] = useState(false);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [historyFilter, setHistoryFilter] = useState<any>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string, title: string, isAadhaar?: boolean, id?: string } | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [isPreviewZoomed, setIsPreviewZoomed] = useState(false);

  // Aadhaar 2FA State
  const [isUploadingAadhaar, setIsUploadingAadhaar] = useState(false);
  const [aadhaarReviewData, setAadhaarReviewData] = useState<any>(null);
  const [aadhaarPassword, setAadhaarPassword] = useState('');
  const [pdfRenderedImage, setPdfRenderedImage] = useState<string | null>(null);
  const [uidaiWindow, setUidaiWindow] = useState<Window | null>(null);
  const [persistedHandle, setPersistedHandle] = useState<any>(null);
  const [guardConfig, setGuardConfig] = useState<any>({ autoScan: false, folderName: '', requireAadhaar: false });
  const [fetchedFile, setFetchedFile] = useState<File | null>(null);

  // Quick Entry State
  const [activeRegTab, setActiveRegTab] = useState<'NEW' | 'REVISIT'>('NEW');
  const [revisitSearch, setRevisitSearch] = useState('');
  const [revisitResults, setRevisitResults] = useState<Visitor[]>([]);
  const [isSearchingRevisit, setIsSearchingRevisit] = useState(false);
  const [formData, setFormData] = useState<any>({
    name: '', phone: '', email: '', company: '', purpose: '', hostId: '', hostName: '', 
    idProofType: 'Aadhar Card', idProofNumber: '', requestedDuration: '1H', hostRemark: '', 
    photoUrl: '', idProofPhotoUrl: '',
  });
  const [employees, setEmployees] = useState<any[]>([]);
  const [systemPurposes, setSystemPurposes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captureMode, setCaptureMode] = useState<'VISITOR' | 'ID'>('VISITOR');
  
  // Refs
  const shiftStartRef = useRef(new Date().toISOString());
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const webcamRefReg = useRef<Webcam>(null);

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

  const fetchHistory = useCallback(async (signal?: AbortSignal, search?: string) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const fetchUrl = buildUrl(API_CONFIG.ENDPOINTS.VISITORS, {
        limit: '50',
        ...(search ? { search } : {}),
      });

      const res = await fetch(fetchUrl, { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        }, 
        signal, 
        credentials: 'include' 
      });
      const data = await res.json();
      if (data.success) setAuditHistory(data.data);
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('History fetch failed', err);
    } finally {
      setIsLoading(false);
    }
  }, [getTenantId]);

  const fetchShiftStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.ANALYTICS}/shift-summary?start=${shiftStartRef.current}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) setShiftStats(data.summary);
    } catch (err) {
      console.error('Stats fetch failed', err);
    }
  }, [getTenantId]);

  useEffect(() => {
    setMounted(true);
    fetchConfig();
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, [fetchConfig]);

  useEffect(() => {
    const timer = setTimeout(() => fetchHistory(undefined, searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchHistory]);

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (!token || !storedUser) {
      router.push('/login');
      return;
    }
    
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'GUARD' && parsedUser.role !== 'ADMIN') {
      router.push('/');
      return;
    }
    setUser(parsedUser);
    fetchHistory(controller.signal);
    fetchShiftStats();
    
    // Connect Global Socket
    connectSocket(token);

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

  // UIDAI Window Observer
  useEffect(() => {
    const handleReentry = () => {
      if (uidaiWindow && !uidaiWindow.closed) {
        try { uidaiWindow.close(); } catch (e) { console.error(e); }
        setUidaiWindow(null);
      }
    };
    window.addEventListener('focus', handleReentry);
    window.addEventListener('click', handleReentry, { capture: true });
    
    const handleVisibility = () => document.visibilityState === 'visible' && handleReentry();
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      window.removeEventListener('focus', handleReentry);
      window.removeEventListener('click', handleReentry, { capture: true });
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [uidaiWindow]);

  const handleOpenUidai = () => {
    const win = window.open('https://myaadhaar.uidai.gov.in/genricDownloadAadhaar/en', 'UIDAIPortal', 'width=1200,height=800,top=50,left=50');
    if (win) {
      setUidaiWindow(win);
      setTimeout(() => {
        try {
          if (!win.closed) win.close();
          setUidaiWindow(null);
          window.focus();
        } catch (e) { console.error(e); }
      }, 45000);
    }
  };

  const handleStep2Interact = () => {
    if (uidaiWindow && !uidaiWindow.closed) {
      uidaiWindow.close();
      setUidaiWindow(null);
    }
  };

  const renderAndUploadPdf = async (base64Pdf: string, visitorId: string, password?: string) => {
    try {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) return;

      const binaryString = atob(base64Pdf);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

      const loadingTask = pdfjsLib.getDocument({ data: bytes, password });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.5 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setPdfRenderedImage(dataUrl);

      const token = localStorage.getItem('token');
      await fetch(`${API_CONFIG.ENDPOINTS.VISITORS}/${visitorId}/id-preview`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        body: JSON.stringify({ image: dataUrl }),
        credentials: 'include'
      });
    } catch (err) {
      console.error('PDF render failed:', err);
    }
  };

  const handleAadhaarUpload = async (file: File | null | undefined, visitorId: string) => {
    if (!file) return;
 
     setIsUploadingAadhaar(true);
     const form = new FormData();
     form.append('file', file);
     if (aadhaarPassword) form.append('password', aadhaarPassword);
 
     const controller = new AbortController();
     const timeoutId = setTimeout(() => controller.abort(), 30000);
 
     try {
       const res = await fetch(`${API_CONFIG.BASE_URL}/aadhaar/upload`, {
         method: 'POST', 
         headers: {
           'x-tenant-id': getTenantId()
         },
         body: form, 
         signal: controller.signal
       });
       clearTimeout(timeoutId);
       
       const data = await res.json();
       if (res.ok) {
         setAadhaarReviewData({ ...data, visitorId });
         if (data.pdfData) renderAndUploadPdf(data.pdfData, visitorId, aadhaarPassword);
         if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
       } else {
         alert(data.error || 'Aadhaar processing failed');
       }
     } catch (err: any) {
       clearTimeout(timeoutId);
       if (err.name === 'AbortError') alert('Aadhaar processing timed out.');
       else alert('Error uploading Aadhaar: ' + (err.message || 'Check connection.'));
     } finally {
       setIsUploadingAadhaar(false);
     }
   };

  const handleAutoFetchLatest = async (visitorId: string) => {
    setIsUploadingAadhaar(true);
    try {
      const fetchUrl = buildUrl(`${API_CONFIG.BASE_URL}/aadhaar/latest`, {
        ...(guardConfig.folderName ? { folder: guardConfig.folderName } : {}),
      });
      
      const res = await fetch(fetchUrl, {
        headers: {
          'x-tenant-id': getTenantId()
        }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch latest PDF');
      }
      const data = await res.json();
      
      const byteCharacters = atob(data.pdfData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const file = new File([blob], data.filename, { type: 'application/pdf' });
      
      setFetchedFile(file);
      alert(`Found latest file: ${data.filename}. Enter password and click Validate.`);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsUploadingAadhaar(false);
    }
  };

  const handleAadhaarConfirm = async () => {
    if (!aadhaarReviewData) return;
    try {
      const token = localStorage.getItem('token');
      const updateRes = await fetch(`${API_CONFIG.ENDPOINTS.VISITORS}/${aadhaarReviewData.visitorId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        body: JSON.stringify({
           aadhaarVerified: true,
           maskedAadhaar: aadhaarReviewData.maskedAadhaar,
           aadhaarImageUrl: pdfRenderedImage || aadhaarReviewData.imageUrl
        }),
        credentials: 'include'
      });
      
      if (updateRes.ok) {
         const updated = await updateRes.json();
         setVisitor(updated.visitor);
         setAuditHistory(prev => prev.map(v => v._id === updated.visitor._id ? updated.visitor : v));
         setAadhaarReviewData(null);
         setPdfRenderedImage(null);
         alert('Aadhaar Verification Successful.');
      } else {
         alert('Failed to update visitor with Aadhaar data.');
      }
    } catch (err) {
      alert('Error confirming Aadhaar');
    }
  };

  const handleAadhaarReject = () => {
    setAadhaarReviewData(null);
    alert('Aadhaar mismatch recorded. Preview cleared.');
  };

  const startScanner = async () => {
    setScanStatus('scanning');
    setVisitor(null);
    setErrorMsg('');
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("reader");
        scannerRef.current = scanner;
        await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, (decodedText) => {
            handleVerification(decodedText);
            stopScanner();
        }, () => {});
      } catch (err) {
        setScanStatus('error');
        setErrorMsg('Camera access denied or not found');
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); scannerRef.current = null; } catch (err) { console.error(err); }
    }
  };

  const handleVerification = async (id: string) => {
    setScanStatus('verifying');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.VISITORS}/${id}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        }, credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setVisitor(data);
        setScanStatus('success');
        if (navigator.vibrate) navigator.vibrate([50, 20, 50]);
      } else {
        setScanStatus('error');
        setErrorMsg(data.message || 'Invalid or expired pass');
      }
    } catch (err) {
      setScanStatus('error');
      setErrorMsg('Network error.');
    }
  };

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

  const performCapture = useCallback(() => {
    if (!webcamRefReg.current) return;
    const imageSrc = webcamRefReg.current.getScreenshot();
    if (!imageSrc) return;
    if (captureMode === 'VISITOR') setFormData((prev: any) => ({ ...prev, photoUrl: imageSrc }));
    else setFormData((prev: any) => ({ ...prev, idProofPhotoUrl: imageSrc }));
    if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
  }, [captureMode]);

  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.hostId) return alert('Please complete required fields.');
    if (!formData.photoUrl || (!tenant?.features.aadhaar && !formData.idProofPhotoUrl)) return alert('Photos are required.');

    setIsSubmitting(true);
    try {
      const res = await fetch(API_CONFIG.ENDPOINTS.VISITORS + '/register', {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-id': getTenantId()
        }, 
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowQuickEntry(false);
        setFormData({ 
          name: '', phone: '', email: '', company: '', purpose: '', hostId: '', hostName: '', 
          idProofType: 'Aadhar Card', idProofNumber: '', requestedDuration: '1H', hostRemark: '', 
          photoUrl: '', idProofPhotoUrl: ''
        });
        fetchHistory();
        if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
      } else {
        const data = await res.json();
        alert(data.message || 'Registration failed');
      }
    } catch (err) { alert('Network error.'); } 
    finally { setIsSubmitting(false); }
  };

  const handleRevisitorSearch = async () => {
    if (!revisitSearch.trim()) return setRevisitResults([]);
    setIsSearchingRevisit(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.VISITORS}?search=${encodeURIComponent(revisitSearch)}&limit=5`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        }, credentials: 'include'
      });
      const data = await res.json();
      if (data.success) setRevisitResults(data.data);
    } catch (err) { console.error(err); } 
    finally { setIsSearchingRevisit(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (revisitSearch.trim().length >= 3) {
        handleRevisitorSearch();
      } else if (!revisitSearch.trim()) {
        setRevisitResults([]);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [revisitSearch]);

  const autofillVisitor = (v: Visitor) => {
    setFormData({
      ...formData, name: v.name, phone: v.phone, email: v.email || '', company: v.company || '',
      idProofType: v.idProofType || 'Aadhar Card', idProofNumber: v.idProofNumber || '',
      // Mandatory new capture: Explicitly clear photo fields
      photoUrl: '', idProofPhotoUrl: ''
    });
    setActiveRegTab('NEW');
    setRevisitResults([]);
    setRevisitSearch('');
  };

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

  useEffect(() => {
    if (!guardConfig.autoScan || !visitor || visitor.aadhaarVerified || visitor.status !== 'PENDING_GUARD') return;
    
    const interval = setInterval(() => {
      if (!isUploadingAadhaar && !aadhaarReviewData) {
        handleAutoFetchLatest(visitor._id);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [guardConfig.autoScan, visitor, isUploadingAadhaar, aadhaarReviewData]);

  const handleHandover = async () => {
    if (!shiftStats) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.HANDOVER}/submit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        body: JSON.stringify({
          gateId: 'MAIN_GATE', // Should be dynamic if multiple gates exist
          shiftStart: shiftStartRef.current,
          notes: handoverNotes,
          stats: shiftStats
        }),
        credentials: 'include'
      });
      if (res.ok) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      } else {
        alert('Handover failed. Please try again.');
      }
    } catch (err) {
      alert('Network error during handover.');
    }
  };

  if (!mounted) return null;

  return (
    <div className="guard_terminal">
      <header className={`terminal_nav glass_panel`}>
        <div className="terminal_brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="hamburger_btn_global" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <Menu size={24} />
          </button>
          {tenant?.logoUrl && (
            <img src={tenant.logoUrl} alt={tenant.name} width={28} height={28} style={{ objectFit: 'contain' }} />
          )}
          <div className="status_pulse" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>{tenant?.name || 'VMS'} <strong>Security</strong></span>
            <span style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 700, textTransform: 'uppercase' }}>Guard: {user?.name || 'Loading...'}</span>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button className="glass-btn primary" onClick={() => setShowQuickEntry(true)} style={{ background: 'var(--apple-blue)', padding: '6px 12px', fontSize: '0.65rem', fontWeight: 900, width: 'fit-content' }}>
                + NEW VISITOR
              </button>
            </div>
          </div>
        </div>

        <div className="terminal_stats">
          <div className={`stat_pill ${historyFilter === 'ALL' ? 'active_filter' : ''}`} onClick={() => setHistoryFilter('ALL')}>
             APPLIED <strong>{summary.applied}</strong>
          </div>
          <div className={`stat_pill pending_pill ${historyFilter === 'PENDING' ? 'active_filter' : ''}`} onClick={() => setHistoryFilter('PENDING')}>
             PENDING <strong>{summary.pending}</strong>
          </div>
          <div className={`stat_pill forwarded_pill ${historyFilter === 'SENT_FOR_APPROVAL' ? 'active_filter' : ''}`} onClick={() => setHistoryFilter('SENT_FOR_APPROVAL')}>
             FORWARDED <strong>{summary.forwarded}</strong>
          </div>
          <div className={`stat_pill approved_pill ${historyFilter === 'APPROVED' ? 'active_filter' : ''}`} onClick={() => setHistoryFilter('APPROVED')}>
             APPROVED <strong>{summary.approved}</strong>
          </div>
          <div className={`stat_pill rejected_pill ${historyFilter === 'REJECTED' ? 'active_filter' : ''}`} onClick={() => setHistoryFilter('REJECTED')}>
             REJECTED <strong>{summary.rejected}</strong>
          </div>
          <div className={`stat_pill gate_in_pill ${historyFilter === 'GATE_IN' ? 'active_filter' : ''}`} onClick={() => setHistoryFilter('GATE_IN')}>
             GATE IN <strong>{summary.gate_in}</strong>
          </div>
          <div className={`stat_pill meet_in_pill ${historyFilter === 'MEET_IN' ? 'active_filter' : ''}`} onClick={() => setHistoryFilter('MEET_IN')}>
             MEET IN <strong>{summary.meet_in}</strong>
          </div>
          <div className={`stat_pill meet_out_pill ${historyFilter === 'MEET_OUT' ? 'active_filter' : ''}`} onClick={() => setHistoryFilter('MEET_OUT')}>
             MEET OUT <strong>{summary.meet_out}</strong>
          </div>
          <div className={`stat_pill gate_out_pill ${historyFilter === 'GATE_OUT' ? 'active_filter' : ''}`} onClick={() => setHistoryFilter('GATE_OUT')}>
             GATE OUT <strong>{summary.gate_out}</strong>
          </div>
          <div className={`stat_pill overdue_pill ${historyFilter === 'OVERSTAY' ? 'active_filter' : ''}`} onClick={() => setHistoryFilter('OVERSTAY')}>
             OVER STAY <strong>{summary.overdue}</strong>
          </div>
        </div>

        <div className="terminal_clock_hub">
          <div className="t_clock_main">
            {clock.getHours().toString().padStart(2, '0')}
            <span className="clock_blink">:</span>
            {clock.getMinutes().toString().padStart(2, '0')}
          </div>
          <div className="t_clock_date">{clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</div>
        </div>

        <button className="glass-btn end_shift_btn" onClick={() => setShowHandover(true)}>
          <LogOut size={16} /> END SHIFT
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

        <div className="operational_zone">
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
                <div className="summary_item"><span>GATE INS</span><strong>{shiftStats?.GATE_IN}</strong></div>
                <div className="summary_item"><span>GATE OUTS</span><strong>{shiftStats?.GATE_OUT}</strong></div>
                <div className="summary_item"><span>DENIED</span><strong>{shiftStats?.DENIED}</strong></div>
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
                <button onClick={() => setShowQuickEntry(false)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
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
                    <button onClick={() => setSelectedPhoto(null)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0, 0, 0, 0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><XCircle size={20} /></button>
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
