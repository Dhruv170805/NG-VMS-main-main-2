"use client";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import Tesseract from 'tesseract.js';
import { API_CONFIG } from '../config';
import { useTenant } from '../TenantContext';
import { 
  User, Phone, Mail, Building, Target, Clock, Calendar, 
  ShieldCheck, Camera, Search, RefreshCw, Briefcase, 
  CheckCircle, Shield, ArrowRight, Zap, Heart
} from 'lucide-react';

import * as faceapi from '@vladmandic/face-api';

const DEFAULT_PURPOSES = ['Meeting', 'Internship', 'Training', 'Personal', 'Other'];

const VisitorRegistration: React.FC = () => {
  const { tenant, getTenantId } = useTenant();
  const [currentStep, setCurrentStep] = useState(1);
  const [isReturningVisitor, setIsReturningVisitor] = useState(false);
  const [systemConfig, setSystemConfig] = useState<{ purposes: string[], hosts: any[], guard_config: any }>({ 
    purposes: DEFAULT_PURPOSES, 
    hosts: [],
    guard_config: { requireAadhaar: false }
  });
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', purpose: 'Meeting', customPurpose: '', hostName: '', hostId: '', company: '',
    startDate: new Date().toISOString().split('T')[0], 
    endDate: '', 
    visitTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), 
    photoUrl: '',
    idProofType: 'PAN', idProofNumber: '', idProofPhotoUrl: '',
    requestedDuration: '1H',
    consentGiven: false
  });

  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isOCRRunning, setIsOCRRunning] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isAutoCapturing, setIsAutoCapturing] = useState(false);
  const [captureMode, setCaptureMode] = useState<'VISITOR' | 'ID'>('ID');
  const [registeredId, setRegisteredId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [greeting, setGreeting] = useState('Welcome');

  // Update default ID type if Aadhaar is enabled
  useEffect(() => {
    if (tenant?.features.aadhaar) {
      setFormData(prev => ({ ...prev, idProofType: 'Aadhaar Card' }));
      setCaptureMode('VISITOR');
    } else {
      setFormData(prev => ({ ...prev, idProofType: 'PAN' }));
    }
  }, [tenant]);
  
  const webcamRef = useRef<Webcam>(null);
  const lookupRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Set time-based greeting
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  // Initialize face-api on Main Thread (God Level Fix)
  useEffect(() => {
    const loadModels = async () => {
      try {
        const modelUrl = window.location.origin + '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelUrl),
          faceapi.nets.faceExpressionNet.loadFromUri(modelUrl)
        ]);
        setModelsLoaded(true);
        console.log('[FaceAPI] Models Loaded Successfully');
      } catch (err) {
        console.error('[FaceAPI] Model Loading Failed:', err);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const fetchConfig = async (signal?: AbortSignal) => {
      try {
        const res = await fetch(`${API_CONFIG.ENDPOINTS.SYSTEM}/config`, { 
          signal, 
          credentials: 'include',
          headers: {
            'x-tenant-id': getTenantId()
          }
        });
        const data = await res.json();
        
        let initialHostId = '';
        let initialHostName = '';

        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const queryHostId = urlParams.get('hostId');
          
          if (queryHostId && data.hosts) {
            const matchedHost = data.hosts.find((h: any) => h._id === queryHostId);
            if (matchedHost) {
              initialHostId = matchedHost._id;
              initialHostName = matchedHost.name;
            }
          }
        }

        if (!initialHostId && data.hosts?.length > 0) {
          initialHostId = data.hosts[0]._id;
          initialHostName = data.hosts[0].name;
        }

        setSystemConfig({
          purposes: (data.purposes?.length > 0) ? data.purposes : DEFAULT_PURPOSES,
          hosts: data.hosts || [],
          guard_config: { requireAadhaar: false, ...data.guard_config }
        });
        
        if (initialHostId) {
          setFormData(prev => ({ ...prev, hostName: initialHostName, hostId: initialHostId }));
        }
      } catch (err: any) { 
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch system config', err); 
        }
      }
    };
    fetchConfig(controller.signal);
    return () => controller.abort();
  }, []);

  // Client-side Image Resizer (Sovereign Pre-processor)
  const resizeImage = (base64Str: string, maxWidth = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    });
  };

  // Main Thread Detection Loop (Optimized with requestAnimationFrame)
  useEffect(() => {
    let isDetecting = false;
    let animationFrameId: number;

    const detect = async () => {
      if (!isDetecting && modelsLoaded && webcamRef.current?.video?.readyState === 4) {
        isDetecting = true;
        try {
          const detection = await faceapi.detectSingleFace(
            webcamRef.current.video, 
            new faceapi.TinyFaceDetectorOptions()
          );
          setFaceDetected(!!detection);
        } catch (err) {
          console.error('[FaceAPI] Detection Error:', err);
        }
        isDetecting = false;
      }
      animationFrameId = requestAnimationFrame(detect);
    };

    if (modelsLoaded) {
      animationFrameId = requestAnimationFrame(detect);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [modelsLoaded]);

  const runOCR = useCallback(async (image: string) => {
    setIsOCRRunning(true);
    try {
      // Tesseract.js uses Workers by default, but we ensure high-speed recognition
      const { data: { text } } = await Tesseract.recognize(image, 'eng');
      const matches = text.match(/\d{4}\s\d{4}\s\d{4}|\d{10,12}/);
      if (matches) {
        const clean = matches[0].replace(/\s/g, '');
        setFormData(prev => ({ ...prev, idProofNumber: clean }));
        if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
      }
    } catch (err) { console.error('OCR failed', err); }
    setIsOCRRunning(false);
  }, []);

  const performCapture = useCallback(async () => {
    if (!webcamRef.current) return;
    const rawImage = webcamRef.current.getScreenshot();
    if (!rawImage) return;

    // Pre-optimize on client to reduce payload latency
    const optimizedImage = await resizeImage(rawImage);

    if (captureMode === 'VISITOR') {
      setFormData(prev => ({ 
        ...prev, 
        photoUrl: optimizedImage 
      }));
      if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
    } else {
      setFormData(prev => ({ ...prev, idProofPhotoUrl: optimizedImage }));
      runOCR(optimizedImage);
      if (navigator.vibrate) navigator.vibrate(50);
    }
  }, [captureMode, runOCR]);

  const handleLookup = async (phoneValue?: string) => {
    const phone = (phoneValue || formData.phone).trim();
    if (phone.length < 10) return;
    setIsLookingUp(true);
    try {
      const res = await fetch(`${API_CONFIG.ENDPOINTS.VISITORS}/lookup/${encodeURIComponent(phone)}`, {
        credentials: 'include',
        headers: {
          'x-tenant-id': getTenantId()
        }
      });
      const data = await res.json();
      if (data.success && data.visitor) {
        setFormData(prev => ({
          ...prev,
          name: data.visitor.name || prev.name,
          email: data.visitor.email || prev.email,
          company: data.visitor.company || prev.company,
          idProofType: data.visitor.idProofType || prev.idProofType,
          idProofNumber: data.visitor.idProofNumber || prev.idProofNumber,
          // Mandatory new capture: Explicitly clear photo fields
          photoUrl: '',
          idProofPhotoUrl: ''
        }));
        setIsReturningVisitor(true);
        if (navigator.vibrate) navigator.vibrate(20);
      } else {
        setIsReturningVisitor(false);
      }
    } catch (err) { console.error('Lookup failed', err); }
    setIsLookingUp(false);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!formData.name || !formData.phone || !formData.email) {
      alert('Please fill all required identity fields');
      return;
    }
    if (!formData.photoUrl || (!tenant?.features.aadhaar && !formData.idProofPhotoUrl)) {
      alert('Biometric and ID photos are required for security');
      return;
    }
    if (!formData.consentGiven) {
      alert('Please provide your consent to proceed with registration');
      return;
    }

    if (formData.idProofType === 'Aadhaar Card' || formData.idProofType === 'Aadhar') {
      const numericAadhaar = formData.idProofNumber.replace(/\D/g, '');
      if (numericAadhaar.length !== 12) {
        alert('Aadhaar number must be exactly 12 digits');
        return;
      }
    }
 else if (formData.idProofType === 'PAN') {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
      if (!panRegex.test(formData.idProofNumber.trim())) {
        alert('PAN number must be exactly 10 characters (e.g., ABCDE1234F)');
        return;
      }
    } else if (formData.idProofType === 'Election') {
      const voterIdRegex = /^[A-Z]{3}[0-9]{7}$/i;
      if (!voterIdRegex.test(formData.idProofNumber.trim())) {
        alert('Voter ID must be 10 characters (3 letters followed by 7 digits)');
        return;
      }
    } else if (formData.idProofType === 'Driving License') {
      const cleanDL = formData.idProofNumber.replace(/[\s\-]/g, '');
      if (cleanDL.length < 10 || cleanDL.length > 16) {
        alert('Driving License must be between 10 to 16 characters');
        return;
      }
    } else if (formData.idProofType === 'Other') {
      if (formData.idProofNumber.trim().length < 4) {
        alert('Please provide a valid ID number');
        return;
      }
    }

    setIsSubmitting(true);
    const finalPurpose = formData.purpose === 'Other' ? formData.customPurpose : formData.purpose;
    const submissionData = { ...formData, purpose: finalPurpose };
    try {
      const res = await fetch(`${API_CONFIG.ENDPOINTS.VISITORS}/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-id': getTenantId()
        },
        body: JSON.stringify(submissionData),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.visitor?._id) {
        setRegisteredId(data.visitor._id);
        if (navigator.vibrate) navigator.vibrate([30, 100, 30]);
      } else {
        alert(`Registration Failed: ${data.message || 'Unknown Error'}`);
      }
    } catch (err: any) { alert(`Registration Failed: ${err.message}`); }
    finally { setIsSubmitting(false); }
  };

  const steps = [
    { id: 1, name: 'Identity', desc: 'Contact Details', icon: <User size={20} /> },
    { id: 2, name: 'Logistics', desc: 'Visit Details', icon: <Briefcase size={20} /> },
    { id: 3, name: 'Security', desc: 'Biometrics & ID', icon: <Shield size={20} /> },
    { id: 4, name: 'Review', desc: 'Final Confirmation', icon: <CheckCircle size={20} /> }
  ];

  return (
    <div className="reg_page">
      <div className="bg-mesh" />
      
      <div className="reg_layout">
        
        {/* CENTERED HEADER */}
        <div className="reg_header_center">
          <div className="reg_brand_center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {tenant?.logoUrl && (
              <img src={tenant.logoUrl} alt={tenant.name} width={28} height={28} style={{ objectFit: 'contain' }} />
            )}
            <span>{tenant?.name || 'NG-VMS'}</span>
          </div>
          <h1 className="reg_title_center">{greeting}!</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '12px', fontWeight: 600 }}>Welcome to Visitor Registration</p>
        </div>

        {/* MAIN CONTENT */}
        <main className="reg_content">
          <AnimatePresence mode="wait">
            {!registeredId ? (
              <motion.div 
                key="single-form" 
                initial={{ opacity: 0, y: 40 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -40 }} 
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} 
                className="reg_card" 
                style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}
              >
                
                {/* IDENTITY SECTION */}
                <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.4, ease: "easeOut" }} className="reg_section" onFocusCapture={() => setCurrentStep(1)} onMouseEnter={() => setCurrentStep(1)}>
                  <div className="reg_section_header">
                    <h2 className="reg_section_title">
                      <div className="icon_wrap icon_identity"><User size={24} /></div>
                      01. Identity
                    </h2>
                    <p>Tell us a bit about yourself to begin your visit.</p>
                  </div>

                  <AnimatePresence>
                    {isReturningVisitor && (
                      <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="welcome_badge">
                        <Heart size={14} fill="white" /> Welcome Back, we remembered your details!
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="reg_grid">
                    <div className="reg_input_wrapper">
                      <Phone size={18} />
                      <input 
                        className="glass-input" 
                        placeholder="Phone Number" 
                        value={formData.phone} 
                        aria-label="Phone Number"
                        onChange={e => {
                          const val = e.target.value;
                          setFormData(prev => ({...prev, phone: val}));
                          if (val.length >= 10) {
                            if (lookupRef.current) clearTimeout(lookupRef.current);
                            lookupRef.current = setTimeout(() => handleLookup(val), 500);
                          }
                        }} 
                      />
                      {isLookingUp && <RefreshCw size={16} className="spinning" style={{ position: 'absolute', right: 16 }} />}
                    </div>
                    <div className="reg_input_wrapper"><User size={18} /><input className="glass-input" placeholder="Full Name" value={formData.name} aria-label="Full Name" onChange={e => setFormData(prev => ({...prev, name: e.target.value}))} /></div>
                    <div className="reg_input_wrapper"><Mail size={18} /><input className="glass-input" placeholder="Email Address" value={formData.email} aria-label="Email Address" onChange={e => setFormData(prev => ({...prev, email: e.target.value}))} /></div>
                    <div className="reg_input_wrapper"><Building size={18} /><input className="glass-input" placeholder="Company Name" value={formData.company} aria-label="Company Name" onChange={e => setFormData(prev => ({...prev, company: e.target.value}))} /></div>
                  </div>
                </motion.div>

                {/* LOGISTICS SECTION */}
                <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.4, ease: "easeOut" }} className="reg_section" onFocusCapture={() => setCurrentStep(2)} onMouseEnter={() => setCurrentStep(2)}>
                  <div className="reg_section_header">
                    <h2 className="reg_section_title">
                      <div className="icon_wrap icon_logistics"><Briefcase size={24} /></div>
                      02. Visit Details
                    </h2>
                    <p>Help us prepare for your arrival.</p>
                  </div>
                  <div className="reg_grid">
                    <div className="reg_field">
                      <label htmlFor="reg-purpose"><Target size={12} /> PURPOSE</label>
                      <select id="reg-purpose" className="glass-input" value={formData.purpose} onChange={e => setFormData(prev => ({...prev, purpose: e.target.value}))}>
                        <option value="">Select Purpose...</option>
                        {systemConfig.purposes.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="reg_field">
                      <label htmlFor="reg-host"><User size={12} /> MEET HOST</label>
                      <select id="reg-host" className="glass-input" value={formData.hostId} onChange={e => { const host = systemConfig.hosts.find(h => h._id === e.target.value); setFormData(prev => ({...prev, hostId: e.target.value, hostName: host?.name || ''})); }}>
                        {systemConfig.hosts.map(h => <option key={h._id} value={h._id}>{h.name} ({h.department})</option>)}
                      </select>
                    </div>
                    
                    <div className="reg_field">
                      <label htmlFor="reg-start-date"><Calendar size={12} /> FROM DATE</label>
                      <div className="reg_input_wrapper"><Calendar size={16} /><input id="reg-start-date" type="date" className="glass-input" value={formData.startDate} onChange={e => setFormData(prev => ({...prev, startDate: e.target.value}))} /></div>
                    </div>
                    <div className="reg_field">
                      <label htmlFor="reg-end-date"><Calendar size={12} /> TO DATE</label>
                      <div className="reg_input_wrapper"><Calendar size={16} /><input id="reg-end-date" type="date" className="glass-input" value={formData.endDate} onChange={e => setFormData(prev => ({...prev, endDate: e.target.value}))} /></div>
                    </div>

                    <div className="reg_field">
                      <label htmlFor="reg-visit-time"><Clock size={12} /> ARRIVAL TIME</label>
                      <div className="reg_input_wrapper"><Clock size={16} /><input id="reg-visit-time" type="time" className="glass-input" value={formData.visitTime} onChange={e => setFormData(prev => ({...prev, visitTime: e.target.value}))} /></div>
                    </div>
                    <div className="reg_field">
                      <label htmlFor="reg-duration"><Clock size={12} /> DURATION</label>
                      <select id="reg-duration" className="glass-input" value={formData.requestedDuration} onChange={e => setFormData(prev => ({...prev, requestedDuration: e.target.value}))}>
                        <option value="1H">1 Hour</option>
                        <option value="2H">2 Hours</option>
                        <option value="3H">3 Hours</option>
                        <option value="5H">5 Hours</option>
                        <option value="FULL_DAY">Full Day</option>
                        <option value="MULTIPLE_DAYS">Multiple Days</option>
                      </select>
                    </div>
                  </div>
                </motion.div>

                {/* SECURITY SECTION */}
                <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.4, ease: "easeOut" }} className="reg_section" onFocusCapture={() => setCurrentStep(3)} onMouseEnter={() => setCurrentStep(3)}>
                  <div className="reg_section_header">
                    <h2 className="reg_section_title">
                      <div className="icon_wrap icon_security"><Shield size={24} /></div>
                      03. Biometrics & ID
                    </h2>
                    <p>Secure your identity with a photo and ID proof.</p>
                  </div>

                  <div className="reg_grid" style={{ marginBottom: '24px' }}>
                    <div className="reg_field">
                      <label htmlFor="reg-id-type"><ShieldCheck size={12} /> ID TYPE</label>
                      <select 
                        id="reg-id-type"
                        className="glass-input" 
                        value={formData.idProofType} 
                        onChange={e => setFormData(prev => ({...prev, idProofType: e.target.value, idProofNumber: ''}))}
                      >
                        {tenant?.features.aadhaar && <option value="Aadhaar Card">Aadhaar Card</option>}
                        {!(systemConfig?.guard_config?.requireAadhaar) && (
                          <>
                            <option value="PAN">PAN Card</option>
                            <option value="Election">Voter ID</option>
                            <option value="Driving License">Driving License</option>
                            <option value="Other">Other</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div className="reg_field">
                      <label htmlFor="reg-id-number"><ShieldCheck size={12} /> ID NUMBER</label>
                      <input id="reg-id-number" className="glass-input" placeholder="Enter ID Number" value={formData.idProofNumber} onChange={e => setFormData(prev => ({...prev, idProofNumber: e.target.value}))} />
                    </div>
                  </div>

                  <div className="reg_capture_grid" style={{ marginBottom: '24px' }}>
                    {!tenant?.features.aadhaar && (
                      <div className={`reg_capture_box ${captureMode === 'ID' ? 'active' : ''} ${formData.idProofPhotoUrl ? 'success' : ''}`} onClick={() => setCaptureMode('ID')}>
                        {isOCRRunning && captureMode === 'ID' ? <RefreshCw className="spinning" /> : formData.idProofPhotoUrl ? <img src={formData.idProofPhotoUrl} alt="ID" /> : (
                          <div className="reg_capture_placeholder">
                            <ShieldCheck size={32} />
                            <p>ID Proof</p>
                          </div>
                        )}
                      </div>
                    )}
                    <div className={`reg_capture_box ${captureMode === 'VISITOR' ? 'active' : ''} ${formData.photoUrl ? 'success' : ''}`} onClick={() => setCaptureMode('VISITOR')}>
                      {formData.photoUrl ? <img src={formData.photoUrl} alt="Visitor" /> : (
                        <div className="reg_capture_placeholder">
                          <Camera size={32} />
                          <p>Visitor Photo</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--apple-blue)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {tenant?.features.aadhaar || captureMode === 'VISITOR' ? 'Center your face' : `Position ${formData.idProofType} Card/ID inside frame`}
                    </p>
                  </div>

                  <div className="reg_webcam_viewport">
                    <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="webcam_element" mirrored={false} videoConstraints={{ aspectRatio: 1, facingMode: 'user' }} />
                    
                    {/* HUD ELEMENTS */}
                    <div className="hud_bracket hud_tl" />
                    <div className="hud_bracket hud_tr" />
                    <div className="hud_bracket hud_bl" />
                    <div className="hud_bracket hud_br" />
                    <div className="hud_scanline" />
                    
                    {faceDetected && captureMode === 'VISITOR' && <div className="face_pulse" />}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-12px' }}>
                    <button className="glass-btn primary shimmer_btn" onClick={performCapture} style={{ width: '220px', borderRadius: '50px', padding: '16px 0', fontSize: '1.1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', zIndex: 20 }}>
                      <Camera size={20} fill="white" /> Capture
                    </button>
                  </div>
                </motion.div>

                <div className="reg_consent_container" style={{ padding: '0 12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.4' }}>
                    <input 
                      type="checkbox" 
                      checked={formData.consentGiven} 
                      onChange={e => setFormData(prev => ({ ...prev, consentGiven: e.target.checked }))}
                      style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--apple-blue)' }}
                    />
                    <span>I hereby consent to the collection and storage of my personal information and ID proof for security and legal compliance purposes.</span>
                  </label>
                </div>

                <div className="reg_submit_footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                  <button className="glass-btn primary shimmer_btn" onClick={handleSubmit} disabled={isSubmitting} style={{ width: '100%', padding: '24px', fontSize: '1.2rem', borderRadius: '24px' }}>
                    {isSubmitting ? 'ENROLLING...' : 'Submit'}
                  </button>
                </div>

              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="reg_card success_screen" style={{ paddingBottom: 0, overflow: 'hidden' }}>
                <div style={{ padding: '56px 56px 40px' }}>
                  <div className="qr_success_wrap">
                    <QRCodeSVG value={registeredId} size={200} level="H" includeMargin={false} />
                  </div>
                  <p style={{ opacity: 0.6, marginBottom: '24px', marginTop: '24px', fontSize: '1.1rem' }}>Your visit request has been sent to <strong>{formData.hostName}</strong>. You will be notified once approved.</p>
                  <button className="glass-btn primary shimmer_btn" style={{ margin: '0 auto', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => router.push(`/pass?id=${registeredId}`)}>
                    View My Digital Pass <ArrowRight size={18} />
                  </button>
                </div>

                {/* --- God Level Passport Footer --- */}
                <div className="pass_footer_container">
                  <div className="mrz_zone">
                    <code>{`V<IND ${(formData?.name || 'VISITOR').toUpperCase().replace(' ', '<<')}<<<<<<<<<<<<<<<<<<`}</code>
                    <code>{`VMS-${new Date().getFullYear()}<<${registeredId?.toUpperCase()}<<<<<<<<<<<<<<<<<<`}</code>
                  </div>
                  <div className="security_bar">
                    <div className="security_left">
                      <p className="issued_text">Issued by {tenant?.name || 'NextGen VMS'}</p>
                      <p className="vid_text">VID: {registeredId?.toUpperCase() || '0000000000000'}</p>
                    </div>
                    <div className="security_right">
                      <span>{`${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()} · ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}</span>
                      <div className="verified_check">✓</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default VisitorRegistration;
