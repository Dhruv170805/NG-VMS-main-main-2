"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { API_CONFIG } from '../../../config';
import { useTenant } from '../../../TenantContext';
import styles from '../../login.module.css';

const ResetPassword = () => {
  const { tenant } = useTenant();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const params = useParams();
  const token = params.token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const res = await fetch(`${API_CONFIG.ENDPOINTS.AUTH}/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Password reset successfully. Redirecting to login...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(data.message || 'Reset failed');
      }
    } catch (err) {
      setError('Server connection failed');
    }
  };

  return (
    <div className={styles.login_page}>
      <div className="bg-mesh" />
      <motion.div 
        className={`glass-card ${styles.login_container}`}
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
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
          <h1>New Password</h1>
          <p>Set a new secure password for your account.</p>
        </header>

        {error && <div className={styles.error_banner}>{error}</div>}
        {success && <div className={styles.error_banner} style={{ background: 'rgba(52, 199, 89, 0.1)', color: 'var(--apple-green)', borderColor: 'rgba(52, 199, 89, 0.2)' }}>{success}</div>}

        <form onSubmit={handleSubmit} className={styles.login_form}>
          <div className={styles.input_group}>
            <label>New Password</label>
            <input 
              type="password" 
              className="glass-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className={styles.input_group}>
            <label>Confirm New Password</label>
            <input 
              type="password" 
              className="glass-input" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className={`glass-btn ${styles.primary_btn}`}>Reset Password</button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;