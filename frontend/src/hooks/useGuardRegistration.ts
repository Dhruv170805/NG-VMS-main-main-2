import { useState, useEffect, useCallback, useRef } from 'react';
import { API_CONFIG } from '../../app/config';
import { Visitor } from '../../components/guard/types';
import { useVisitorQueries } from './useVisitorQueries';
import { useTenant } from '../../app/TenantContext';
import Webcam from 'react-webcam';

export const useGuardRegistration = (
  tenant: any,
  setShowQuickEntry: React.Dispatch<React.SetStateAction<boolean>>,
  fetchHistory: () => Promise<void>
) => {
  const { getTenantId } = useTenant();
  const { searchRevisitorsGql } = useVisitorQueries();

  const [activeRegTab, setActiveRegTab] = useState<'NEW' | 'REVISIT'>('NEW');
  const [revisitSearch, setRevisitSearch] = useState('');
  const [revisitResults, setRevisitResults] = useState<Visitor[]>([]);
  const [isSearchingRevisit, setIsSearchingRevisit] = useState(false);
  const [formData, setFormData] = useState<any>({
    name: '', phone: '', email: '', company: '', purpose: '', hostId: '', hostName: '', 
    idProofType: 'Aadhar Card', idProofNumber: '', requestedDuration: '1H', hostRemark: '', 
    photoUrl: '', idProofPhotoUrl: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captureMode, setCaptureMode] = useState<'VISITOR' | 'ID'>('VISITOR');
  
  const webcamRefReg = useRef<Webcam>(null);

  const performCapture = useCallback(() => {
    if (!webcamRefReg.current) return;
    const imageSrc = webcamRefReg.current.getScreenshot();
    if (!imageSrc) return;
    if (captureMode === 'VISITOR') setFormData((prev: any) => ({ ...prev, photoUrl: imageSrc }));
    else setFormData((prev: any) => ({ ...prev, idProofPhotoUrl: imageSrc }));
    if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
  }, [captureMode]);

  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.hostId) return alert('Please complete required fields.');
    if (!formData.photoUrl || (!tenant?.features?.aadhaar && !formData.idProofPhotoUrl)) return alert('Photos are required.');

    setIsSubmitting(true);
    try {
      const res = await fetch(API_CONFIG.ENDPOINTS.VISITORS + '/register', {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-id': getTenantId()
        }, 
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowQuickEntry(false);
        setFormData({ 
          name: '', phone: '', email: '', company: '', purpose: '', hostId: '', hostName: '', 
          idProofType: 'Aadhar Card', idProofNumber: '', requestedDuration: '1H', hostRemark: '', 
          photoUrl: '', idProofPhotoUrl: ''
        });
        fetchHistory();
        if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
      } else {
        const data = await res.json();
        alert(data.message || 'Registration failed');
      }
    } catch (err) { alert('Network error.'); } 
    finally { setIsSubmitting(false); }
  };

  const handleRevisitorSearch = async () => {
    if (!revisitSearch.trim()) return setRevisitResults([]);
    setIsSearchingRevisit(true);
    try {
      const { data } = await searchRevisitorsGql({
        variables: {
          search: revisitSearch,
          limit: 5
        }
      });
      if (data?.getVisitors) setRevisitResults(data.getVisitors.visitors);
    } catch (err) {
      console.error('Revisitor search failed', err);
    } finally {
      setIsSearchingRevisit(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (revisitSearch.trim().length >= 3) {
        handleRevisitorSearch();
      } else if (!revisitSearch.trim()) {
        setRevisitResults([]);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [revisitSearch]);

  const autofillVisitor = (v: Visitor) => {
    setFormData({
      ...formData, name: v.name, phone: v.phone, email: v.email || '', company: v.company || '',
      idProofType: v.idProofType || 'Aadhar Card', idProofNumber: v.idProofNumber || '',
      // Mandatory new capture: Explicitly clear photo fields
      photoUrl: '', idProofPhotoUrl: ''
    });
    setActiveRegTab('NEW');
    setRevisitResults([]);
    setRevisitSearch('');
  };

  return {
    activeRegTab, setActiveRegTab,
    revisitSearch, setRevisitSearch,
    revisitResults, setRevisitResults,
    isSearchingRevisit,
    formData, setFormData,
    isSubmitting,
    captureMode, setCaptureMode,
    webcamRefReg,
    performCapture,
    handleQuickRegister,
    handleRevisitorSearch,
    autofillVisitor
  };
};
