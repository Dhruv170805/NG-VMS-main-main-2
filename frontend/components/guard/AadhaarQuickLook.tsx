import React from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCw, Share, Printer, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Visitor } from './types';

interface AadhaarQuickLookProps {
  visitor: Visitor;
  pdfRenderedImage: string | null;
  previewScale: number;
  setPreviewScale: React.Dispatch<React.SetStateAction<number>>;
  setIsPreviewZoomed: (z: boolean) => void;
}

export const AadhaarQuickLook: React.FC<AadhaarQuickLookProps> = ({
  visitor,
  pdfRenderedImage,
  previewScale,
  setPreviewScale,
  setIsPreviewZoomed
}) => {
  if (!pdfRenderedImage) return null;

  return (
    <motion.div 
      className="apple_quicklook_overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ 
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(30px)',
        display: 'flex', flexDirection: 'column'
      }}
    >
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="quicklook_toolbar"
        style={{ 
          height: '52px', background: 'rgba(45,45,45,0.7)', 
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="window_controls" style={{ display: 'flex', gap: '8px' }}>
            <div onClick={() => setIsPreviewZoomed(false)} style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FF5F57', cursor: 'pointer' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FFBD2E' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#28C940' }} />
          </div>
          <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Eye size={14} /> 
            <span>Aadhaar_Dossier_{visitor._id.substring(visitor._id.length-6)}.pdf</span>
            <span style={{ opacity: 0.4 }}>— 1.2 MB</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button className="ql_tool_btn" onClick={() => { setIsPreviewZoomed(false); setPreviewScale(1); }} style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
            Done
          </button>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 10px' }} />
          <button className="ql_tool_icon" onClick={() => setPreviewScale(prev => Math.min(prev + 0.25, 4))}><ZoomIn size={18} /></button>
          <button className="ql_tool_icon" onClick={() => setPreviewScale(prev => Math.max(prev - 0.25, 0.5))}><ZoomOut size={18} /></button>
          <button className="ql_tool_icon" onClick={() => setPreviewScale(1)} style={{ fontSize: '0.65rem', fontWeight: 900 }}>RESET</button>
          <button className="ql_tool_icon"><RotateCw size={18} /></button>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 10px' }} />
          <button className="ql_tool_icon"><Share size={18} /></button>
          <button className="ql_tool_icon"><Printer size={18} /></button>
        </div>
      </motion.header>

      <div 
        className="quicklook_body"
        style={{ 
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '60px', overflow: 'auto', position: 'relative'
        }}
        onClick={() => { setIsPreviewZoomed(false); setPreviewScale(1); }}
      >
        <motion.div 
          drag
          dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }}
          dragElastic={0.1}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ 
            scale: previewScale, 
            opacity: 1,
            cursor: previewScale > 1 ? 'grab' : 'default'
          }}
          whileDrag={{ cursor: 'grabbing' }}
          className="quicklook_document_container"
          style={{ 
            boxShadow: '0 50px 100px rgba(0,0,0,0.5)',
            borderRadius: '4px', overflow: 'hidden',
            background: 'white',
            touchAction: 'none'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <img 
            src={pdfRenderedImage} 
            alt="Aadhaar Document" 
            style={{ 
              display: 'block', maxWidth: '85vw', maxHeight: '80vh', 
              objectFit: 'contain', pointerEvents: 'none'
            }} 
          />
        </motion.div>
      </div>

      <footer style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <ChevronLeft size={16} />
          <span>Page 1 of 1</span>
          <ChevronRight size={16} />
        </div>
      </footer>
    </motion.div>
  );
};
