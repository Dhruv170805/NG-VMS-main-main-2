"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, FileText,
} from 'lucide-react';
import { ExportConfig } from './types';
import styles from '../../app/admin/admin.module.css';

interface Props {
  exportConfig: ExportConfig;
  uploadStatus: { message: string; type: string };
  onSetExportConfig: (cfg: ExportConfig) => void;
  onAdvancedExport: () => void;
}

export const ReportsTab: React.FC<Props> = ({
  exportConfig,
  uploadStatus,
  onSetExportConfig,
  onAdvancedExport,
}) => (
  <motion.div
    key="reports"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className={styles.settings_view}
  >
    <div className="glass-card" style={{ padding: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
        <div className={styles.preset_icon} style={{ background: 'var(--apple-blue-glow)', width: '60px', height: '60px' }}>
          <FileText size={32} color="var(--apple-blue)" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Reports &amp; Data Export</h2>
          <p style={{ opacity: 0.6 }}>Generate comprehensive security audits and visitor logs.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Time Configuration */}
        <div className="glass-card" style={{ padding: '30px', background: 'rgba(255,255,255,0.3)' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Time Configuration
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className={styles.input_group_stacked}>
              <label style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.4, letterSpacing: '1px' }}>REPORT PERIOD</label>
              <select
                className="glass-input"
                value={exportConfig.timeRange}
                onChange={(e) => onSetExportConfig({ ...exportConfig, timeRange: e.target.value })}
              >
                <option value="all">Full Historical Registry</option>
                <option value="today">Daily Operational Audit (Today)</option>
                <option value="week">Current Weekly Cycle</option>
                <option value="month">Specific Monthly Period</option>
                <option value="year">Specific Annual Period</option>
                <option value="custom">Custom ISO Date Range</option>
              </select>
            </div>

            <AnimatePresence mode="wait">
              {exportConfig.timeRange === 'month' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                   <select className="glass-input" value={exportConfig.customMonth || new Date().getMonth()} onChange={(e) => onSetExportConfig({ ...exportConfig, customMonth: parseInt(e.target.value) })}>
                     {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                       <option key={m} value={i}>{m}</option>
                     ))}
                   </select>
                   <select className="glass-input" value={exportConfig.customYear || new Date().getFullYear()} onChange={(e) => onSetExportConfig({ ...exportConfig, customYear: parseInt(e.target.value) })}>
                     {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                   </select>
                </motion.div>
              )}

              {exportConfig.timeRange === 'year' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                   <select className="glass-input" value={exportConfig.customYear || new Date().getFullYear()} onChange={(e) => onSetExportConfig({ ...exportConfig, customYear: parseInt(e.target.value) })}>
                     {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                   </select>
                </motion.div>
              )}

              {exportConfig.timeRange === 'custom' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.4 }}>START DATE</label>
                    <input
                      type="date"
                      className="glass-input"
                      value={exportConfig.customFrom}
                      onChange={(e) => onSetExportConfig({ ...exportConfig, customFrom: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.4 }}>END DATE</label>
                    <input
                      type="date"
                      className="glass-input"
                      value={exportConfig.customTo}
                      onChange={(e) => onSetExportConfig({ ...exportConfig, customTo: e.target.value })}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Report Parameters */}
        <div className="glass-card" style={{ padding: '30px', background: 'rgba(255,255,255,0.3)' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Report Parameters
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                className="glass-input"
                style={{ flex: 1 }}
                value={exportConfig.filterType}
                onChange={(e) => onSetExportConfig({ ...exportConfig, filterType: e.target.value })}
              >
                <option value="all">Global Registry</option>
                <option value="vid">By Visitor ID</option>
                <option value="company">By Company</option>
              </select>
              {exportConfig.filterType !== 'all' && (
                <input
                  type="text"
                  className="glass-input"
                  style={{ flex: 2 }}
                  placeholder="Filter value..."
                  value={exportConfig.filterValue}
                  onChange={(e) => onSetExportConfig({ ...exportConfig, filterValue: e.target.value })}
                />
              )}
            </div>
            <select
              className="glass-input"
              value={exportConfig.downloadType}
              onChange={(e) => onSetExportConfig({ ...exportConfig, downloadType: e.target.value })}
            >
              <option value="full">Detailed Lifecycle Log (Full Data)</option>
              <option value="count">Executive Summary (Counts Only)</option>
              <option value="hostCount">Host Performance (Count per Host)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Format + Export CTA */}
      <div style={{ marginTop: '30px', padding: '30px', borderRadius: '24px', background: 'rgba(0,122,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ color: 'var(--apple-blue)' }}>Select Export Format</h4>
          <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
              <input type="radio" name="rpt_format" value="excel" checked={exportConfig.format === 'excel'} onChange={() => onSetExportConfig({ ...exportConfig, format: 'excel' })} />
              Microsoft Excel (.xlsx)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
              <input type="radio" name="rpt_format" value="pdf" checked={exportConfig.format === 'pdf'} onChange={() => onSetExportConfig({ ...exportConfig, format: 'pdf' })} />
              Portable Document Format (.pdf)
            </label>
          </div>
        </div>
        <button className="glass-btn primary" style={{ padding: '15px 40px', fontSize: '1.1rem' }} onClick={onAdvancedExport}>
          <Download size={22} style={{ marginRight: '10px' }} /> GENERATE REPORT
        </button>
      </div>

      <AnimatePresence>
        {uploadStatus.message && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`${styles.config_status} ${styles[uploadStatus.type as keyof typeof styles]}`}
            style={{ marginTop: '20px' }}
          >
            {uploadStatus.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </motion.div>
);
