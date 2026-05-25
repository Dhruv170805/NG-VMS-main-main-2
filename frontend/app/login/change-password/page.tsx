"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { API_CONFIG } from '../../config';
import { useTenant } from '../../TenantContext';
import styles from '../login.module.css';

const ChangePassword = () => {
  const { tenant } = useTenant();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.AUTH}/update-password`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Password updated successfully. Redirecting...');
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        userData.requiresPasswordChange = false;
        localStorage.setItem('user', JSON.stringify(userData));

        setTimeout(() => {
          if (userData.role === 'ADMIN') {
            router.push('/admin');
          } else if (userData.role === 'GUARD') {
            router.push('/guard');
          } else {
            router.push('/approval');
          }
        }, 2000);
      } else {
        setError(data.message || 'Update failed');
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
            <div className={styles.brand_badge_login}>SECURITY ACTION</div>
          )}
          <h1>Reset Password</h1>
          <p>You must change your password to continue.</p>
        </header>

        {error && <div className={styles.error_banner}>{error}</div>}
        {success && <div className={styles.error_banner} style={{ background: 'rgba(52, 199, 89, 0.1)', color: 'var(--apple-green)', borderColor: 'rgba(52, 199, 89, 0.2)' }}>{success}</div>}

        <form onSubmit={handleSubmit} className={styles.login_form}>
          <div className={styles.input_group}>
            <label>Current Password</label>
            <input 
              type="password" 
              className="glass-input" 
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className={styles.input_group}>
            <label>New Password</label>
            <input 
              type="password" 
              className="glass-input" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
          <button type="submit" className={`glass-btn ${styles.primary_btn}`}>Update & Continue</button>
        </form>
      </motion.div>
    </div>
  );
};

export default ChangePassword;