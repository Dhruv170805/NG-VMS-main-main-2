import { useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Visitor } from '@/components/guard/types';
import { useVisitorQueries } from '@/hooks/useVisitorQueries';

export const useGuardScanner = () => {
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'verifying' | 'success' | 'error'>('idle');
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [manualId, setManualId] = useState('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { getVisitorGql } = useVisitorQueries();

  const handleVerification = async (id: string) => {
    setScanStatus('verifying');
    try {
      const { data } = await getVisitorGql({ variables: { id } });
      if (data?.getVisitor) {
        setVisitor(data.getVisitor);
        setScanStatus('success');
        if (navigator.vibrate) navigator.vibrate([50, 20, 50]);
      } else {
        setScanStatus('error');
        setErrorMsg('Invalid or expired pass');
      }
    } catch (err) {
      setScanStatus('error');
      setErrorMsg('Network error.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); scannerRef.current = null; } catch (err) { console.error(err); }
    }
  };

  const startScanner = async () => {
    setScanStatus('scanning');
    setVisitor(null);
    setErrorMsg('');
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("reader");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" }, 
          { fps: 10, qrbox: { width: 250, height: 250 } }, 
          (decodedText) => {
            handleVerification(decodedText);
            stopScanner();
          }, 
          () => {}
        );
      } catch (err) {
        setScanStatus('error');
        setErrorMsg('Camera access denied or not found');
      }
    }, 100);
  };

  return {
    scanStatus,
    setScanStatus,
    visitor,
    setVisitor,
    errorMsg,
    setErrorMsg,
    manualId,
    setManualId,
    startScanner,
    stopScanner,
    handleVerification
  };
};
