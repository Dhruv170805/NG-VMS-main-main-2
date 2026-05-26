import { useState, useCallback, useEffect, MutableRefObject } from 'react';
import { API_CONFIG } from '../../app/config';
import { useTenant } from '../../app/TenantContext';

export const useGuardUI = (
  router: any,
  shiftStartRef: MutableRefObject<string>,
  summary: any
) => {
  const { getTenantId } = useTenant();

  const [showHandover, setShowHandover] = useState(false);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [showPreviousNotes, setShowPreviousNotes] = useState(false);
  const [previousHandover, setPreviousHandover] = useState<any>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string, title: string, isAadhaar?: boolean, id?: string } | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [isPreviewZoomed, setIsPreviewZoomed] = useState(false);
  const [shiftStats, setShiftStats] = useState<any>(null);

  const fetchShiftStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.HANDOVER}/stats?gateId=MAIN_GATE&start=${shiftStartRef.current}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) setShiftStats(data.summary);
    } catch (err) {
      console.error('Stats fetch failed', err);
    }
  }, [getTenantId, shiftStartRef]);

  const fetchLatestHandover = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API_CONFIG.ENDPOINTS.HANDOVER}/latest?gateId=MAIN_GATE`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success && data.handover && data.handover.notes) {
        setPreviousHandover(data.handover);
        setShowPreviousNotes(true);
      }
    } catch (err) {
      console.error('Failed to fetch previous handover', err);
    }
  }, [getTenantId]);

  useEffect(() => {
    fetchLatestHandover();
  }, [fetchLatestHandover]);

  const handleHandover = async () => {
    // If shiftStats isn't loaded from API yet, fallback to locally calculated stats
    const statsToSubmit = shiftStats || {
      GATE_IN: summary.gate_in,
      GATE_OUT: summary.gate_out,
      DENIED: summary.rejected
    };

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.HANDOVER}/submit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        body: JSON.stringify({
          gateId: 'MAIN_GATE', // Should be dynamic if multiple gates exist
          shiftStart: shiftStartRef.current,
          notes: handoverNotes,
          stats: statsToSubmit
        }),
        credentials: 'include'
      });
      if (res.ok) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      } else if (res.status === 401) {
        alert('Session expired: Your login token is no longer valid. Forcing logout to unblock the terminal.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      } else {
        alert('Failed to submit handover report');
      }
    } catch (err) {
      console.error('Handover failed', err);
      alert('Handover request failed.');
    }
  };

  return {
    showHandover, setShowHandover,
    handoverNotes, setHandoverNotes,
    showPreviousNotes, setShowPreviousNotes,
    previousHandover, setPreviousHandover,
    selectedPhoto, setSelectedPhoto,
    previewScale, setPreviewScale,
    isPreviewZoomed, setIsPreviewZoomed,
    shiftStats, setShiftStats,
    fetchShiftStats,
    handleHandover
  };
};
