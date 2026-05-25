import React from 'react';
import { Search, RefreshCw, ShieldAlert } from 'lucide-react';

interface ScannerModuleProps {
  scanStatus: 'idle' | 'scanning' | 'verifying' | 'success' | 'error';
  manualId: string;
  errorMsg: string;
  setManualId: (id: string) => void;
  startScanner: () => void;
  stopScanner: () => void;
  handleVerification: (id: string) => void;
  setScanStatus: (s: 'idle') => void;
}

export const ScannerModule: React.FC<ScannerModuleProps> = ({
  scanStatus,
  manualId,
  errorMsg,
  setManualId,
  startScanner,
  stopScanner,
  handleVerification,
  setScanStatus
}) => {
  if (scanStatus === 'success') return null;

  return (
    <>
      {scanStatus === 'idle' && (
        <div className="scan_placeholder">
          <div className="qr_box_icon" onClick={startScanner}>
            <div className="corner tl" /><div className="corner tr" />
            <div className="corner bl" /><div className="corner br" />
            <div className="qr_glyph">QR SCAN</div>
          </div>
          <div className="scan_hint">Scan Digital Pass to Verify Entry</div>
          <div className="manual_divider"><span>OR</span></div>
          <div className="manual_entry_group">
             <div className="search_wrapper">
                <input 
                  className="manual_input" 
                  placeholder="Enter Phone or ID Number..." 
                  value={manualId}
                  onChange={e => setManualId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleVerification(manualId)}
                />
                <Search className="search_icon" />
             </div>
             <button className="verify_btn" onClick={() => handleVerification(manualId)} disabled={!manualId}>
               VERIFY IDENTITY
             </button>
          </div>
        </div>
      )}

      {scanStatus === 'scanning' && (
        <div className="scanning_active">
          <div className="camera_viewfinder_pro">
            <div id="reader" style={{ width: '400px', height: '400px' }} />
            <div className="scanner_overlay_pro">
              <div className="scan_frame" style={{ width: '250px', height: '250px' }} />
              <div className="laser_line_v3" style={{ width: '250px' }} />
            </div>
          </div>
          <div className="processing_text">LIVE CAMERA FEED ACTIVE</div>
          <button className="cancel_link" onClick={() => { stopScanner(); setScanStatus('idle'); }}>CANCEL SCANNING</button>
        </div>
      )}

      {scanStatus === 'verifying' && (
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={48} className="spinning" style={{ color: 'var(--apple-blue)', marginBottom: '20px' }} />
          <div className="processing_text">DECRYPTING SECURITY TOKEN...</div>
        </div>
      )}

      {scanStatus === 'error' && (
        <div className="verification_error">
          <div className="error_icon_wrap"><ShieldAlert size={40} /></div>
          <h2 style={{ fontWeight: 900 }}>Access Denied</h2>
          <div className="error_detail">{errorMsg}</div>
          <button className="glass-btn primary" style={{ marginTop: '20px' }} onClick={() => setScanStatus('idle')}>TRY AGAIN</button>
        </div>
      )}
    </>
  );
};
