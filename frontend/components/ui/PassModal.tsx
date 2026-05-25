"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { PassCard } from './PassCard';

interface PassModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitor: any;
  tenant: any;
  adminRules?: string[];
}

export const PassModal: React.FC<PassModalProps> = ({ isOpen, onClose, visitor, tenant, adminRules }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="modal_overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={onClose}
        >
          <motion.div 
            className="pass_modal_content"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <button 
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '-50px',
                right: '0',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: 'white',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={24} />
            </button>
            <PassCard 
              visitor={visitor} 
              tenant={tenant} 
              adminRules={adminRules} 
              hideOverlay={true}
              sideBySide={true}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
