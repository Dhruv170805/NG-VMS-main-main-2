"use client";
import React from 'react';
import { motion } from "framer-motion";
import { QRCodeSVG } from 'qrcode.react';
import { useRouter } from 'next/navigation';
import { useTenant } from '../TenantContext';
import styles from './reception.module.css';

export default function Reception() {
  const router = useRouter();
  const { tenant } = useTenant();
  // In a real scenario, this URL would point to the hosted registration page
  const registrationUrl = typeof window !== 'undefined' ? `${window.location.origin}/register` : '';

  return (
    <div className={styles.center_screen}>
      <div className="bg-mesh" />
      
      <motion.div
        className={`glass-card ${styles.reception_card}`}
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        {tenant?.logoUrl ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
            <img src={tenant.logoUrl} alt={tenant.name} width={36} height={36} style={{ objectFit: 'contain' }} />
            <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#000' }}>{tenant.name}</span>
          </div>
        ) : (
          <div className={styles.brand_badge}>NG-VMS</div>
        )}
        <h1 className={styles.title}>Welcome</h1>
        <p className={styles.subtitle}>Scan to Register Your Arrival</p>

        <motion.div 
          className={styles.qr_box}
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
          onClick={() => router.push('/register')}
        >
          {registrationUrl && (
            <QRCodeSVG 
              value={registrationUrl} 
              size={220} 
              level="H"
              includeMargin={false}
              className={styles.qr_svg}
            />
          )}
          <div className={styles.qr_overlay}>
             <span>TAP TO START</span>
          </div>
        </motion.div>

        <p className={styles.hint}>Use your mobile camera or tap the QR</p>
        
        <div className={styles.security_footer}>
            Secure Biometric Entry Enabled
        </div>
      </motion.div>
    </div>
  );
}
