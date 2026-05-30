import { useState, useEffect, useRef } from 'react';
import { API_CONFIG, buildUrl } from '@/app/config';
import { Visitor } from '@/components/guard/types';
import { useTenant } from '@/context/TenantContext';

export const useGuardAadhaar = (
  setVisitor: React.Dispatch<React.SetStateAction<Visitor | null>>,
  setAuditHistory: React.Dispatch<React.SetStateAction<Visitor[]>>,
  guardConfig: any
) => {
  const { getTenantId } = useTenant();

  const [isUploadingAadhaar, setIsUploadingAadhaar] = useState(false);
  const [aadhaarReviewData, setAadhaarReviewData] = useState<any>(null);
  const [aadhaarPassword, setAadhaarPassword] = useState('');
  const [pdfRenderedImage, setPdfRenderedImage] = useState<string | null>(null);
  const [uidaiWindow, setUidaiWindow] = useState<Window | null>(null);
  const [fetchedFile, setFetchedFile] = useState<File | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  useEffect(() => {
    const handleReentry = () => {
      if (uidaiWindow && uidaiWindow.closed) {
        setUidaiWindow(null);
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && uidaiWindow && uidaiWindow.closed) {
        setUidaiWindow(null);
      }
    };

    window.addEventListener('focus', handleReentry);
    window.addEventListener('click', handleReentry, { capture: true });
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleReentry);
      window.removeEventListener('click', handleReentry, { capture: true });
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [uidaiWindow]);

  const handleOpenUidai = () => {
    const win = window.open('https://myaadhaar.uidai.gov.in/genricDownloadAadhaar/en', 'UIDAIPortal', 'width=1200,height=800,top=50,left=50');
    if (win) {
      setUidaiWindow(win);
      setTimeout(() => {
        try {
          if (!win.closed) win.close();
          setUidaiWindow(null);
          window.focus();
        } catch (e) { console.error(e); }
      }, 45000);
    }
  };

  const handleStep2Interact = () => {
    if (uidaiWindow && !uidaiWindow.closed) {
      uidaiWindow.close();
      setUidaiWindow(null);
    }
  };

  const renderAndUploadPdf = async (base64Pdf: string, visitorId: string, password?: string) => {
    try {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) return;

      const binaryString = atob(base64Pdf);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

      const loadingTask = pdfjsLib.getDocument({ data: bytes, password });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.5 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setPdfRenderedImage(dataUrl);

      await fetch(`${API_CONFIG.ENDPOINTS.VISITORS}/${visitorId}/id-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': getTenantId()
        },
        body: JSON.stringify({ image: dataUrl }),
        credentials: 'include'
      });    } catch (err) {
      console.error('PDF render failed:', err);
    }
  };

  const handleAadhaarUpload = async (file: File | null | undefined, visitorId: string) => {
    if (!file) return;

    setIsUploadingAadhaar(true);
    const form = new FormData();
    form.append('file', file);
    if (aadhaarPassword) form.append('password', aadhaarPassword);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    timeoutIdRef.current = timeoutId;

    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/aadhaar/upload`, {
        method: 'POST', 
        headers: {
          'x-tenant-id': getTenantId()
        },
        body: form, 
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await res.json();
      if (res.ok) {
        setAadhaarReviewData({ ...data, visitorId });
        if (data.pdfData) renderAndUploadPdf(data.pdfData, visitorId, aadhaarPassword);
        if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
      } else {
        alert(data.error || 'Aadhaar processing failed');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') alert('Aadhaar processing timed out.');
      else alert('Error uploading Aadhaar: ' + (err.message || 'Check connection.'));
    } finally {
      setIsUploadingAadhaar(false);
    }
  };

  const handleAutoFetchLatest = async (visitorId: string) => {
    setIsUploadingAadhaar(true);
    try {
      const fetchUrl = buildUrl(`${API_CONFIG.BASE_URL}/aadhaar/latest`, {
        ...(guardConfig.folderName ? { folder: guardConfig.folderName } : {}),
      });
      
      const res = await fetch(fetchUrl, {
        headers: {
          'x-tenant-id': getTenantId()
        }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch latest PDF');
      }
      const data = await res.json();
      
      const byteCharacters = atob(data.pdfData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const file = new File([blob], data.filename, { type: 'application/pdf' });
      
      setFetchedFile(file);
      alert(`Found latest file: ${data.filename}. Enter password and click Validate.`);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsUploadingAadhaar(false);
    }
  };

  const handleAadhaarConfirm = async () => {
    if (!aadhaarReviewData) return;
    try {
      const updateRes = await fetch(`${API_CONFIG.ENDPOINTS.VISITORS}/${aadhaarReviewData.visitorId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': getTenantId()
        },
        body: JSON.stringify({
           aadhaarVerified: true,
           maskedAadhaar: aadhaarReviewData.maskedAadhaar,
           aadhaarImageUrl: pdfRenderedImage || aadhaarReviewData.imageUrl
        }),
        credentials: 'include'
      });      
      if (updateRes.ok) {
         const updated = await updateRes.json();
         setVisitor(updated.visitor);
         setAuditHistory(prev => prev.map(v => v._id === updated.visitor._id ? updated.visitor : v));
         setAadhaarReviewData(null);
         setPdfRenderedImage(null);
         alert('Aadhaar Verification Successful.');
      } else {
         alert('Failed to update visitor with Aadhaar data.');
      }
    } catch (err) {
      alert('Error confirming Aadhaar');
    }
  };

  const handleAadhaarReject = () => {
    setAadhaarReviewData(null);
    alert('Aadhaar mismatch recorded. Preview cleared.');
  };

  return {
    isUploadingAadhaar,
    aadhaarReviewData,
    aadhaarPassword,
    setAadhaarPassword,
    pdfRenderedImage,
    uidaiWindow,
    fetchedFile,
    handleOpenUidai,
    handleStep2Interact,
    handleAadhaarUpload,
    handleAutoFetchLatest,
    handleAadhaarConfirm,
    handleAadhaarReject,
    setIsPreviewZoomed: () => {} // Passed in later if needed by UI
  };
};
