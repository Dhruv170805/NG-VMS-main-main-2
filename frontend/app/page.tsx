"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { API_CONFIG } from './config';
import { useTenant } from './TenantContext';
import { 
  QrCode, User, ShieldCheck, ArrowRight, Search, 
  AlertCircle, CheckCircle2, Loader2, LogIn, Smartphone
} from 'lucide-react';
import styles from './home.module.css';
import { useAuth } from '../src/context/AuthContext';

// --- SUB-COMPONENTS (Defined outside to prevent re-creation flicker) ---

const TiltCard = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  return (
    <div className={className}>
      <div>
        {children}
      </div>
    </div>
  );
};

const MagneticButton = ({ children, className, style, ...props }: any) => {
  return (
    <button className={className} style={style} {...props}>
      {children}
    </button>
  );
};

// --- MAIN HOME COMPONENT ---

const Home = () => {
  const router = useRouter();
  const { tenant, getTenantId } = useTenant();
  const { setUser } = useAuth();
  const [regUrl, setRegUrl] = useState('');
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Status Track State
  const [phone, setPhone] = useState('');
  const [isTrackLoading, setIsTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setRegUrl(`${window.location.origin}/register`);
    }
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
    }
  };

  const titleVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 1, ease: [0.16, 1, 0.3, 1] }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const res = await fetch(`${API_CONFIG.ENDPOINTS.AUTH}/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-id': getTenantId()
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      const data = await res.json();

      if (res.ok) {
        setUser({
          id: data._id,
          name: data.name,
          email: data.email,
          role: data.role,
          department: data.department
        });

        if (data.role === 'ADMIN') router.push('/admin');
        else if (data.role === 'GUARD') router.push('/guard');
        else router.push('/approval');
      } else {
        setLoginError(data.message || 'Authentication failed');
      }

    } catch (err) {
      setLoginError('Server connection failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleTrackStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setTrackError('');
    setIsTrackLoading(true);

    try {
      const res = await fetch(`${API_CONFIG.ENDPOINTS.VISITORS}/lookup/${phone.trim()}`, {
        headers: {
          'x-tenant-id': getTenantId()
        }
      });
      const data = await res.json();

      if (data.success && data.visitor) {
        router.push(`/pass?id=${data.visitor._id}`);
      } else {
        setTrackError('No active pass found for this number');
      }
    } catch (err) {
      setTrackError('Failed to verify status');
    } finally {
      setIsTrackLoading(false);
    }
  };

  return (
    <div className={styles.home_container}>
      {/* Dynamic Background Circles */}
      <div className={styles.bg_circles}>
        <div className={`${styles.circle} ${styles.circle_1}`} />
        <div className={`${styles.circle} ${styles.circle_2}`} />
        <div className={`${styles.circle} ${styles.circle_3}`} />
      </div>
      
      <motion.header 
        className={styles.home_header}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        <motion.div 
          variants={titleVariants} 
          style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', marginTop: '10px' }}
        >
          <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.9)', borderRadius: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
            <div style={{ width: '64px', height: '64px', background: '#fff', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', flexShrink: 0 }}>
              {tenant?.logoUrl ? (
                <img src={tenant.logoUrl} alt={tenant.name} width={48} height={48} style={{ objectFit: 'contain', borderRadius: '8px' }} />
              ) : (
                <ShieldCheck size={36} color="var(--apple-blue)" />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>{tenant?.name || 'Enterprise VMS'}</h1>
              <span style={{ fontSize: '0.75rem', color: 'var(--apple-gray)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Workspace Portal</span>
            </div>
          </div>
        </motion.div>
        <motion.p variants={titleVariants} style={{ opacity: 0.6, marginTop: '8px', fontWeight: 600 }}>
          Welcome to the {tenant?.name || 'Enterprise VMS'}. Please select a portal to proceed.
        </motion.p>
      </motion.header>

      <motion.main 
        className={styles.split_layout}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* LEFT PANEL: REGISTRATION QR & TRACKING */}
        <motion.section variants={itemVariants} className={styles.left_panel}>
          <TiltCard className={styles.glass_card_v2}>
            <div className={styles.scanner_section}>
              <div className={styles.qr_display_wrapper}>
                <div className={styles.qr_bg_glow} />
                <motion.div 
                  className={styles.qr_inner_card}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className={styles.scanning_line} />
                  {regUrl ? (
                    <QRCodeSVG 
                      value={regUrl} 
                      size={200}
                      level="H"
                      includeMargin={false}
                      title="Registration QR Code"
                      aria-label="Registration QR Code"
                    />
                  ) : (
                    <Loader2 className="animate-spin" size={40} />
                  )}
                </motion.div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                   Visitor Registration
                </h3>
                <p style={{ opacity: 0.6, fontSize: '0.9rem', maxWidth: '280px', margin: '0 auto' }}>
                  Scan to register your visit instantly.
                </p>
              </div>
            </div>

            <div className={styles.status_section}>
              <style dangerouslySetInnerHTML={{__html: `
                .glass-input::placeholder {
                  color: #000000 !important;
                  opacity: 1 !important;
                }
                .glass-input {
                  color: #000000 !important;
                  background-color: #ffffff !important;
                }
              `}} />
              <div style={{ marginBottom: '15px' }}>
                <h4 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '1rem' }}>
                   🔍 Track Status 📱
                </h4>
                <p style={{ fontSize: '0.85rem', opacity: 0.5 }}>Check your approval with phone number.</p>
              </div>

              <form onSubmit={handleTrackStatus} className={styles.track_form}>
                <motion.input 
                  whileFocus={{ scale: 1.01, boxShadow: "0 0 20px rgba(0, 122, 255, 0.15)" }}
                  type="tel" 
                  placeholder="Enter phone number..." 
                  className="glass-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ height: '54px', fontSize: '1rem', textAlign: 'center' }}
                  aria-label="Phone Number to Track Status"
                  required
                />
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit" 
                  className={`glass-btn primary ${styles.shimmer_effect}`} 
                  disabled={isTrackLoading} 
                  style={{ background: 'var(--apple-blue)', color: 'white', fontWeight: 700, padding: '12px', width: '100%', borderRadius: '12px' }}
                >
                  {isTrackLoading ? <Loader2 className="animate-spin" size={18} /> : 'Check Status ✨'}
                </motion.button>
                <AnimatePresence>
                  {trackError && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{ color: '#FF3B30', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center' }}
                    >
                      {trackError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </form>
            </div>
          </TiltCard>
        </motion.section>

        {/* RIGHT PANEL: STAFF LOGIN */}
        <motion.section variants={itemVariants} className={styles.right_panel}>
          <TiltCard className={styles.glass_card_v2}>
            <div className={styles.login_section}>
              <header className={styles.login_header}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                  <ShieldCheck size={28} color="var(--apple-blue)" />
                  <span style={{ fontWeight: 900, color: 'var(--apple-blue)', fontSize: '0.75rem', letterSpacing: '2px' }}>PORTAL</span>
                </div>
                <h2>Staff Login 🔐</h2>
                <p style={{ opacity: 0.5, fontSize: '0.9rem' }}>Secure access for authorized teams.</p>
              </header>

              <AnimatePresence mode="wait">
                {loginError && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={styles.error_banner} 
                    style={{ padding: '10px', fontSize: '0.8rem', width: '100%' }}
                  >
                    <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                    {loginError}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleLogin} className={styles.login_form}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="login-email" style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.6 }}>EMAIL</label>
                  <motion.input 
                    id="login-email"
                    whileFocus={{ scale: 1.01, boxShadow: "0 0 20px rgba(0, 122, 255, 0.15)" }}
                    type="email" 
                    className="glass-input" 
                    placeholder="email@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ height: '54px', fontSize: '1rem' }}
                    required
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="login-password" style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.6 }}>PASSWORD</label>
                  <motion.input 
                    id="login-password"
                    whileFocus={{ scale: 1.01, boxShadow: "0 0 20px rgba(0, 122, 255, 0.15)" }}
                    type="password" 
                    className="glass-input" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ height: '54px', fontSize: '1rem' }}
                    required
                  />
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit" 
                  className={`glass-btn primary ${styles.shimmer_effect}`} 
                  disabled={isLoggingIn} 
                  style={{ marginTop: '5px', padding: '14px', width: '100%', borderRadius: '12px' }}
                >
                  {isLoggingIn ? <Loader2 className="animate-spin" size={20} /> : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>Sign In <LogIn size={18} /></span>}
                </motion.button>
              </form>

              <div style={{ marginTop: 'auto', paddingTop: '20px', textAlign: 'center' }}>
                <Link href="/login/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--apple-blue)', textDecoration: 'none', fontWeight: 600 }}>
                  Trouble signing in?
                </Link>
              </div>
            </div>
          </TiltCard>
        </motion.section>
      </motion.main>

      <motion.footer 
        className={styles.home_footer}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
      >
        <p>© 2026 {tenant?.name || 'NextGen VMS'} • A Project by Print Electronics Equipments Pvt Ltd</p>
      </motion.footer>
    </div>
  );
};

export default Home;