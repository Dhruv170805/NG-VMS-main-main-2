"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { API_CONFIG } from '../../config';
import { useTenant } from '../../TenantContext';
import styles from '../login.module.css';

const ForgotPassword = () => {
  const { tenant } = useTenant();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_CONFIG.ENDPOINTS.AUTH}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('If an account exists, a reset link has been generated.');
        if (data.resetUrl) {
           console.log('DEV ONLY - Reset URL:', data.resetUrl);
        }
      } else {
        setError(data.message || 'Request failed');
      }
    } catch (err) {
      setError('Server connection failed');
    }
  };

  return (
    <div className={styles.login_page} style={{ background: 'transparent' }}>
      <motion.div 
        className={`glass-card ${styles.login_container}`}
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(40px)' }}
      >
        <header className={styles.login_header_v2}>
          {tenant?.logoUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <img src={tenant.logoUrl} alt={tenant.name} width={50} height={50} style={{ objectFit: 'contain' }} />
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#000' }}>{tenant.name}</span>
            </div>
          ) : (
            <div className={styles.brand_badge_login}>RECOVERY</div>
          )}
          <h1 style={{ fontWeight: 800 }}>Forgot Password</h1>
          <p>Enter your email to receive a reset link.</p>
        </header>

        {error && <div className={styles.error_banner}>{error}</div>}
        {success && <div className={styles.error_banner} style={{ background: 'rgba(52, 199, 89, 0.1)', color: 'var(--apple-green)', borderColor: 'rgba(52, 199, 89, 0.2)' }}>{success}</div>}

        <form onSubmit={handleSubmit} className={styles.login_form}>
          <div className={styles.input_group}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.6, textTransform: 'uppercase' }}>Email Address</label>
            <input 
              type="email" 
              className="glass-input" 
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ height: '56px !important', fontSize: '1rem !important' }}
              required
            />
          </div>
          <button type="submit" className={`glass-btn primary ${styles.primary_btn}`} style={{ padding: '16px' }}>Send Reset Link</button>
        </form>

        <footer className={styles.login_footer}>
          <Link href="/" style={{ color: 'var(--apple-blue)', fontWeight: 600 }}>Back to Login</Link>
        </footer>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;