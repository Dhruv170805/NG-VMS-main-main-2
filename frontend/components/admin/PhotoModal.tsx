"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, ZoomIn, ZoomOut, RotateCw, Share, Printer, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { PhotoTarget } from './types';
import styles from '../../app/admin/admin.module.css';

interface Props {
  selectedPhoto: PhotoTarget | null;
  previewScale: number;
  onClose: () => void;
  onSetPreviewScale: React.Dispatch<React.SetStateAction<number>>;
}

export const PhotoModal: React.FC<Props> = ({ selectedPhoto, previewScale, onClose, onSetPreviewScale }) => (
  <AnimatePresence>
    {selectedPhoto && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={selectedPhoto.isAadhaar ? 'apple_quicklook_overlay' : styles.photo_modal_overlay}
        style={
          selectedPhoto.isAadhaar
            ? {
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(30px)',
                display: 'flex',
                flexDirection: 'column',
              }
            : {}
        }
        onClick={() => { onClose(); onSetPreviewScale(1); }}
      >
        {selectedPhoto.isAadhaar ? (
          <>
            {/* Apple Preview Style Toolbar */}
            <motion.header
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              style={{
                height: '52px',
                background: 'rgba(45,45,45,0.7)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                userSelect: 'none',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div className="window_controls" style={{ display: 'flex', gap: '8px' }}>
                  <div onClick={() => { onClose(); onSetPreviewScale(1); }} style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FF5F57', cursor: 'pointer' }} />
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FFBD2E' }} />
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#28C940' }} />
                </div>
                <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye size={14} />
                  <span>Aadhaar_Dossier_{selectedPhoto.id?.substring(selectedPhoto.id.length - 6) || 'SECURE'}.pdf</span>
                  <span style={{ opacity: 0.4 }}>— 1.2 MB</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  className="ql_tool_btn"
                  onClick={() => { onClose(); onSetPreviewScale(1); }}
                  style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Done
                </button>
                <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 10px' }} />
                <button className="ql_tool_icon" onClick={(e) => { e.stopPropagation(); onSetPreviewScale((p) => Math.min(p + 0.25, 4)); }}><ZoomIn size={18} /></button>
                <button className="ql_tool_icon" onClick={(e) => { e.stopPropagation(); onSetPreviewScale((p) => Math.max(p - 0.25, 0.5)); }}><ZoomOut size={18} /></button>
                <button className="ql_tool_icon" onClick={(e) => { e.stopPropagation(); onSetPreviewScale(1); }} style={{ fontSize: '0.65rem', fontWeight: 900 }}>RESET</button>
                <button className="ql_tool_icon"><RotateCw size={18} /></button>
                <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 10px' }} />
                <button className="ql_tool_icon"><Share size={18} /></button>
                <button className="ql_tool_icon"><Printer size={18} /></button>
              </div>
            </motion.header>

            {/* Document Area */}
            <div
              className="quicklook_body"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', overflow: 'auto', position: 'relative' }}
            >
              <motion.div
                drag
                dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }}
                dragElastic={0.1}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: previewScale, opacity: 1, cursor: previewScale > 1 ? 'grab' : 'default' }}
                whileDrag={{ cursor: 'grabbing' }}
                className="quicklook_document_container"
                style={{ boxShadow: '0 50px 100px rgba(0,0,0,0.5)', borderRadius: '4px', overflow: 'hidden', background: 'white', touchAction: 'none' }}
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={selectedPhoto.url}
                  alt="Aadhaar Document"
                  style={{ display: 'block', maxWidth: '85vw', maxHeight: '80vh', objectFit: 'contain', pointerEvents: 'none' }}
                />
              </motion.div>
            </div>

            {/* Page Indicator Footer */}
            <footer style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <ChevronLeft size={16} />
                <span>Page 1 of 1</span>
                <ChevronRight size={16} />
              </div>
            </footer>
          </>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={styles.photo_modal_content}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.photo_modal_header}>
              <h3>{selectedPhoto.title}</h3>
              <button onClick={onClose} className={styles.close_btn}><X size={20} /></button>
            </div>
            <div className={styles.photo_wrapper}>
              <img src={selectedPhoto.url} alt={selectedPhoto.title} />
            </div>
          </motion.div>
        )}
      </motion.div>
    )}
  </AnimatePresence>
);
