"use client";
import React from 'react';
import { motion } from 'framer-motion';
import styles from './statcard.module.css';

interface StatCardProps {
  title: string;
  value: string | number;
  type?: 'approved' | 'pending' | 'checkin' | 'rejected';
  icon?: string;
  onClick?: () => void;
  isActive?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  type = 'pending', 
  icon, 
  onClick, 
  isActive 
}) => {
  const colors = {
    approved: '#34C759', // Apple Green
    pending: '#FFCC00',  // Apple Yellow
    checkin: '#007AFF',  // Apple Blue
    rejected: '#FF3B30'  // Apple Red
  };

  return (
    <motion.div 
      className={`glass-card ${styles.stat_card} ${styles[type]} ${isActive ? styles.active_card : ''}`}
      whileHover={{ y: -10, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className={styles.stat_main}>
        <div className={styles.stat_icon_wrap} style={{ color: colors[type], background: `${colors[type]}10` }}>
          {icon}
        </div>
        <div className={styles.stat_content}>
          <h3>{value}</h3>
          <p>{title}</p>
        </div>
      </div>
      <div className={styles.stat_liquid_bg} style={{ background: `linear-gradient(135deg, ${colors[type]}15, transparent)` }} />
      
      {isActive && (
        <motion.div 
          layoutId="active-indicator"
          className={styles.active_indicator}
          style={{ backgroundColor: colors[type] }}
        />
      )}
    </motion.div>
  );
};

export default StatCard;
