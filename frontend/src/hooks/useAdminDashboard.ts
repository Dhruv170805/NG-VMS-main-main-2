import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { API_CONFIG, buildUrl } from '../../app/config';
import { useTenant } from '../../app/TenantContext';
import { useSocketStore } from '../store';
import { VisitorListResponseSchema } from '../schemas/visitorSchema';
import { 
  Visitor, Employee, AnalyticsData, BlacklistEntry, 
  ExportConfig, PhotoTarget, SmtpConfig, GuardConfig 
} from '../../components/admin/types';
import { generateAdvancedExport, handleQuickExport as quickExportUtil } from '../utils/exportUtils';

export const useAdminDashboard = () => {
  const router = useRouter();
  const { getTenantId } = useTenant();
  const { socket } = useSocketStore();

  // --- State ---
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'settings' | 'analytics' | 'blacklist' | 'reports'>('overview');
  const [staffView, setStaffView] = useState<'directory' | 'config'>('directory');
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [users, setUsers] = useState<Employee[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [employeeStats, setEmployeeStats] = useState<Record<string, any>>({});
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    traffic: [],
    purposes: [],
    hosts: []
  });
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<number>(7);
  const [trafficChartType, setTrafficChartType] = useState<'area' | 'bar' | 'line'>('area');
  const [purposeChartType, setPurposeChartType] = useState<'pie' | 'bar'>('pie');
  const [hostChartType, setHostChartType] = useState<'bar' | 'pie'>('bar');
  const [previewScale, setPreviewScale] = useState(1);
  
  const [notificationSettings, setNotificationSettings] = useState<any>({
    REGISTRATION: {
      ADMIN: { web: true, email: false, sms: false },
      GUARD: { web: true, email: false, sms: false },
      HOST: { web: true, email: true, sms: false },
      VISITOR: { web: false, email: false, sms: false }
    },
    APPROVAL: {
      ADMIN: { web: false, email: false, sms: false },
      GUARD: { web: false, email: false, sms: false },
      HOST: { web: true, email: true, sms: false },
      VISITOR: { web: true, email: false, sms: true }
    },
    CHECK_IN: {
      ADMIN: { web: false, email: false, sms: false },
      GUARD: { web: false, email: false, sms: false },
      HOST: { web: true, email: true, sms: false },
      VISITOR: { web: false, email: false, sms: false }
    },
    REJECTION: {
      ADMIN: { web: false, email: false, sms: false },
      GUARD: { web: false, email: false, sms: false },
      HOST: { web: false, email: false, sms: false },
      VISITOR: { web: true, email: false, sms: true }
    },
    OVERDUE: {
      ADMIN: { web: true, email: true, sms: false },
      GUARD: { web: true, email: false, sms: false },
      HOST: { web: true, email: true, sms: false },
      VISITOR: { web: false, email: false, sms: false }
    }
  });

  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    host: '',
    port: '587',
    user: '',
    pass: '',
    from: '',
    secure: false
  });
  const [purposesText, setPurposesText] = useState<string>('');
  const [passRulesText, setPassRulesText] = useState<string>('');
  const [emergencyContact, setEmergencyContact] = useState<string>('');
  const [guardConfig, setGuardConfig] = useState<GuardConfig>({
    autoScan: false,
    folderName: '',
    printMode: 'DIGITAL_ONLY',
    requireAadhaar: false
  });
  
  const [licenseInfo, setLicenseInfo] = useState<{ isValid: boolean; reason?: string; details?: any } | null>(null);

  const [loading, setLoading] = useState<Record<string, boolean>>({
    visitors: true,
    staff: false,
    analytics: false,
    settings: false,
    blacklist: false,
    reports: false,
    license: false
  });

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    timeRange: 'all',
    customFrom: '',
    customTo: '',
    filterType: 'all',
    filterValue: '',
    downloadType: 'full',
    format: 'excel'
  });

  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState({ message: '', type: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [matrixSearch, setMatrixSearch] = useState('');
  const [blacklistSearch, setBlacklistSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoTarget | null>(null);
  const [tableTimeFilter, setTableTimeFilter] = useState('today');
  const [tableCustomFrom, setTableCustomFrom] = useState('');
  const [tableCustomTo, setTableCustomTo] = useState('');
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [passModalVisitor, setPassModalVisitor] = useState<any>(null);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    role: 'STAFF'
  });
  const [user, setUser] = useState<any>(null);
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  // --- Data Fetching ---
  const fetchVisitors = useCallback(async (signal?: AbortSignal, search?: string) => {
    setLoading(prev => ({ ...prev, visitors: true }));
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      const fetchUrl = buildUrl(API_CONFIG.ENDPOINTS.VISITORS, {
        limit: '500',
        ...(search ? { search } : {}),
      });

      const res = await fetch(fetchUrl, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        credentials: 'include',
        signal
      });
      
      if (res.status === 401 || res.status === 403) {
        router.push('/login');
        return;
      }

      const response = await res.json();
      try {
        const validated = VisitorListResponseSchema.parse(response);
        const visitorData = validated.data || [];
        setVisitors(visitorData.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()) as any[]);
      } catch (zodError) {
        const visitorData = response.data || response;
        if (Array.isArray(visitorData)) {
          setVisitors(visitorData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('Failed to fetch visitors', err);
    } finally {
      setLoading(prev => ({ ...prev, visitors: false }));
    }
  }, [router, getTenantId]);

  const fetchAnalytics = useCallback(async (signal?: AbortSignal) => {
    setLoading(prev => ({ ...prev, analytics: true }));
    try {
      const token = localStorage.getItem('token');
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': getTenantId()
      };
      const fetchOptions = { headers, credentials: 'include' as const, signal };
      
      const [trafficRes, purposesRes, hostsRes, hourlyRes, dailyRes, statusRes] = await Promise.all([
        fetch(`${API_CONFIG.ENDPOINTS.ANALYTICS}/traffic?days=${analyticsTimeRange}`, fetchOptions),
        fetch(`${API_CONFIG.ENDPOINTS.ANALYTICS}/purposes`, fetchOptions),
        fetch(`${API_CONFIG.ENDPOINTS.ANALYTICS}/hosts`, fetchOptions),
        fetch(`${API_CONFIG.ENDPOINTS.ANALYTICS}/hourly-density`, fetchOptions),
        fetch(`${API_CONFIG.ENDPOINTS.ANALYTICS}/daily-distribution`, fetchOptions),
        fetch(`${API_CONFIG.ENDPOINTS.ANALYTICS}/status-distribution`, fetchOptions)
      ]);

      if (trafficRes.status === 401 || trafficRes.status === 403) {
        router.push('/login');
        return;
      }

      const results = await Promise.all([
        trafficRes.ok && trafficRes.headers.get("content-type")?.includes("application/json") ? trafficRes.json() : Promise.resolve([]),
        purposesRes.ok && purposesRes.headers.get("content-type")?.includes("application/json") ? purposesRes.json() : Promise.resolve([]),
        hostsRes.ok && hostsRes.headers.get("content-type")?.includes("application/json") ? hostsRes.json() : Promise.resolve([]),
        hourlyRes.ok && hourlyRes.headers.get("content-type")?.includes("application/json") ? hourlyRes.json() : Promise.resolve([]),
        dailyRes.ok && dailyRes.headers.get("content-type")?.includes("application/json") ? dailyRes.json() : Promise.resolve([]),
        statusRes.ok && statusRes.headers.get("content-type")?.includes("application/json") ? statusRes.json() : Promise.resolve([])
      ]);

      setAnalyticsData({ 
        traffic: results[0], 
        purposes: results[1], 
        hosts: results[2],
        hourly: results[3],
        daily: results[4],
        statusDist: results[5]
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(prev => ({ ...prev, analytics: false }));
    }
  }, [router, analyticsTimeRange, getTenantId]);

  const fetchUsers = useCallback(async (signal?: AbortSignal, search?: string) => {
    setLoading(prev => ({ ...prev, staff: true }));
    try {
      const token = localStorage.getItem('token');
      const fetchUrl = buildUrl(API_CONFIG.ENDPOINTS.EMPLOYEES, {
        ...(search ? { search } : {}),
      });

      const res = await fetch(fetchUrl, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        credentials: 'include',
        signal
      });

      if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
        const data = await res.json();
        if (Array.isArray(data)) setUsers(data);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('Failed to fetch users', err);
    } finally {
      setLoading(prev => ({ ...prev, staff: false }));
    }
  }, [getTenantId]);

  // --- Socket Integration ---
  useEffect(() => {
    if (!socket) return;

    const handleStatsUpdate = (data: any) => {
      setLastEvent(`System Update: ${data.type}`);
      setTimeout(() => setLastEvent(null), 3000);
      if (data.type === 'new_visitor') {
         fetchVisitors();
      }
    };

    const handleVisitorUpdate = (updatedVisitor: Visitor) => {
      if (updatedVisitor.status === 'APPROVED') {
        setLastEvent(`Visitor Approved: ${updatedVisitor.name}`);
        setTimeout(() => setLastEvent(null), 3000);
      }
      setVisitors(prev => prev.map(v => v._id === updatedVisitor._id ? updatedVisitor : v));
    };

    socket.on('stats:update', handleStatsUpdate);
    socket.on('visitor:update', handleVisitorUpdate);

    return () => {
      socket.off('stats:update', handleStatsUpdate);
      socket.off('visitor:update', handleVisitorUpdate);
    };
  }, [socket, fetchVisitors]);

  // --- Auth Guard ---
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed.role !== 'ADMIN') {
          if (parsed.role === 'GUARD') router.push('/guard');
          else router.push('/approval');
          return;
        }
        setUser(parsed);
      } catch (e) {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  const fetchBlacklist = useCallback(async (signal?: AbortSignal, search?: string) => {
    setLoading(prev => ({ ...prev, blacklist: true }));
    try {
      const token = localStorage.getItem('token');
      const fetchUrl = buildUrl(API_CONFIG.ENDPOINTS.BLACKLIST, {
        ...(search ? { search } : {}),
      });

      const res = await fetch(fetchUrl, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        credentials: 'include',
        signal
      });

      if (res.status === 401 || res.status === 403) {
        router.push('/login');
        return;
      }

      if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
        const data = await res.json();
        if (Array.isArray(data)) setBlacklist(data);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('Blacklist fetch failed', err);
    } finally {
      setLoading(prev => ({ ...prev, blacklist: false }));
    }
  }, [router, getTenantId]);

  const fetchSettings = useCallback(async (signal?: AbortSignal) => {
    setLoading(prev => ({ ...prev, settings: true }));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.SYSTEM}/settings`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        credentials: 'include',
        signal
      });
      if (res.ok) {
        const data = await res.json();
        if (data.notifications) setNotificationSettings(data.notifications);
        if (data.smtp_config) setSmtpConfig(data.smtp_config);
        if (data.allowed_purposes) setPurposesText(data.allowed_purposes.join(', '));
        if (data.pass_rules) setPassRulesText(data.pass_rules.join('\n'));
        if (data.emergency_contact) setEmergencyContact(data.emergency_contact);
        if (data.guard_config) setGuardConfig({
          autoScan: false,
          folderName: '',
          printMode: 'DIGITAL_ONLY',
          requireAadhaar: false,
          ...data.guard_config
        });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('Failed to fetch settings', err);
    } finally {
      setLoading(prev => ({ ...prev, settings: false }));
    }
  }, [getTenantId]);

  const fetchLicense = useCallback(async (signal?: AbortSignal) => {
    setLoading(prev => ({ ...prev, license: true }));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.SYSTEM}/license`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        credentials: 'include',
        signal
      });
      if (res.ok) {
        const data = await res.json();
        setLicenseInfo(data);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('Failed to fetch license', err);
    } finally {
      setLoading(prev => ({ ...prev, license: false }));
    }
  }, [getTenantId]);

  const handleUpdateLicense = async (licenseKey: string) => {
    setLoading(prev => ({ ...prev, license: true }));
    setUploadStatus({ message: 'Validating & Updating License...', type: 'info' });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.SYSTEM}/license`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json',
          'x-tenant-id': getTenantId()
        },
        credentials: 'include',
        body: JSON.stringify({ licenseKey })
      });
      const data = await res.json();
      if (res.ok) {
        setUploadStatus({ message: 'NGS License Updated Successfully.', type: 'success' });
        fetchLicense();
        // Refresh page to apply feature changes
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setUploadStatus({ message: `Activation Failed: ${data.message}`, type: 'error' });
      }
    } catch (err) {
      setUploadStatus({ message: 'Failed to connect to Activation Server.', type: 'error' });
    } finally {
      setLoading(prev => ({ ...prev, license: false }));
    }
  };

  // --- Effects ---
  useEffect(() => {
    const controller = new AbortController();
    if (activeTab === 'overview') fetchVisitors(controller.signal);
    if (activeTab === 'analytics') fetchAnalytics(controller.signal);
    if (activeTab === 'staff') fetchUsers(controller.signal);
    if (activeTab === 'blacklist') fetchBlacklist(controller.signal);
    if (activeTab === 'settings') {
      fetchSettings(controller.signal);
      fetchLicense(controller.signal);
    }
    return () => controller.abort();
  }, [activeTab, fetchVisitors, fetchAnalytics, fetchUsers, fetchBlacklist, fetchSettings, fetchLicense]);

  useEffect(() => {
    if (activeTab !== 'overview') return;
    const timer = setTimeout(() => fetchVisitors(undefined, searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, fetchVisitors]);

  useEffect(() => {
    if (activeTab !== 'staff') return;
    const timer = setTimeout(() => fetchUsers(undefined, matrixSearch), 500);
    return () => clearTimeout(timer);
  }, [matrixSearch, activeTab, fetchUsers]);

  useEffect(() => {
    if (activeTab !== 'blacklist') return;
    const timer = setTimeout(() => fetchBlacklist(undefined, blacklistSearch), 500);
    return () => clearTimeout(timer);
  }, [blacklistSearch, activeTab, fetchBlacklist]);

  // --- Handlers ---
  const handleLogout = async () => {
    try {
      await fetch(`${API_CONFIG.ENDPOINTS.AUTH}/logout`, { 
        method: 'POST', 
        headers: {
          'x-tenant-id': getTenantId()
        },
        credentials: 'include' 
      });
    } catch (err) {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleUpload = async () => {
    if (!file) return;
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'HOST');

    setUploadStatus({ message: 'Processing sync...', type: 'info' });
    try {
      const res = await fetch(`${API_CONFIG.ENDPOINTS.SYSTEM}/upload`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        credentials: 'include',
        body: formData
      });
      const data = res.headers.get("content-type")?.includes("application/json") ? await res.json() : null;
      setUploadStatus({ message: data?.message || (res.ok ? "Sync successful" : `Sync failed (${res.status})`), type: res.ok ? 'success' : 'error' });
      if (res.ok) fetchUsers();
    } catch (err) {
      setUploadStatus({ message: 'Sync failed. Check file format.', type: 'error' });
    }
  };

  const handleQuickExport = () => quickExportUtil(filteredVisitors);

  const handleAdvancedExport = () => {
    const fetchData = async (params: URLSearchParams) => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.VISITORS}?${params.toString()}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        credentials: 'include'
      });
      const response = await res.json();
      return response.data || [];
    };
    generateAdvancedExport(exportConfig, fetchData, setUploadStatus, setShowExportModal);
  };

  const handleDownloadPurposeReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_CONFIG.ENDPOINTS.ANALYTICS}/export-purposes`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Purpose_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {}
  };

  const saveSetting = async (key: string, value: any) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_CONFIG.ENDPOINTS.SYSTEM}/settings`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json',
          'x-tenant-id': getTenantId()
        },
        credentials: 'include',
        body: JSON.stringify({ key, value })
      });
      setUploadStatus({ message: `${key.charAt(0).toUpperCase() + key.slice(1)} settings synced.`, type: 'success' });
      setTimeout(() => setUploadStatus({ message: '', type: '' }), 3000);
    } catch (err) {
      setUploadStatus({ message: `Failed to sync ${key} settings.`, type: 'error' });
    }
  };

  const toggleNotification = (stage: string, recipient: string, channel: string) => {
    setNotificationSettings((prev: any) => {
      const updated = { ...prev };
      if (!updated[stage]) updated[stage] = {};
      if (!updated[stage][recipient]) updated[stage][recipient] = { web: false, email: false, sms: false };
      
      const newRecipientConfig = { ...updated[stage][recipient], [channel]: !updated[stage][recipient][channel] };
      updated[stage] = { ...updated[stage], [recipient]: newRecipientConfig };
      
      saveSetting('notifications', updated);
      return updated;
    });
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.AUTH}/register`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json',
          'x-tenant-id': getTenantId()
        },
        credentials: 'include',
        body: JSON.stringify(newStaff)
      });
      if (res.ok) {
        setUploadStatus({ message: 'User created successfully.', type: 'success' });
        setShowAddStaff(false);
        setNewStaff({ name: '', email: '', password: '', department: '', role: 'STAFF' });
        fetchUsers();
      }
    } catch (err) {}
  };

  const handleBlacklist = async (visitor: Visitor) => {
    if (!confirm(`Are you sure you want to BLACKLIST ${visitor.name}?`)) return;
    const reason = prompt(`Enter security restriction reason for ${visitor.name}:`);
    if (!reason) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.BLACKLIST}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json',
          'x-tenant-id': getTenantId()
        },
        credentials: 'include',
        body: JSON.stringify({ idNumberHash: visitor.idNumberHash || visitor._id, name: visitor.name, company: visitor.company, visitorId: visitor._id, reason })
      });
      if (res.ok) alert('Entity blacklisted successfully.');
    } catch (err) {}
  };

  const fetchEncryptedId = async (id: string, name: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.VISITORS}/${id}/id-preview`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedPhoto({ url: data.image, title: `Secure Vault ID: ${name}` });
      }
    } catch (err) {}
  };

  const removeEmployee = async (id: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.EMPLOYEES}/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        credentials: 'include'
      });
      if (res.ok) setUsers(prev => prev.filter(p => p._id !== id));
    } catch (err) {}
  };

  const toggleHost = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.EMPLOYEES}/${id}/host`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        credentials: 'include'
      });
      if (res.ok) setUsers(prev => prev.map(item => item._id === id ? { ...item, isHost: !item.isHost } : item));
    } catch (err) {}
  };

  const bulkToggleHost = async (isHost: boolean) => {
    const filteredIds = users
      .filter(p => p.name.toLowerCase().includes(matrixSearch.toLowerCase()) || p.department.toLowerCase().includes(matrixSearch.toLowerCase()))
      .map(p => p._id);
    if (filteredIds.length === 0) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.EMPLOYEES}/bulk-host`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json',
          'x-tenant-id': getTenantId()
        },
        credentials: 'include',
        body: JSON.stringify({ ids: filteredIds, isHost })
      });
      if (res.ok) setUsers(prev => prev.map(item => filteredIds.includes(item._id) ? { ...item, isHost } : item));
    } catch (err) {}
  };

  const fetchEmployeeStats = async (id: string) => {
    if (employeeStats[id]) {
      setEmployeeStats(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.EMPLOYEES}/${id}/stats`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setEmployeeStats(prev => ({ ...prev, [id]: data }));
      }
    } catch (err) {}
  };

  const toggleBlacklist = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_CONFIG.ENDPOINTS.BLACKLIST}/${id}/toggle`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        credentials: 'include'
      });
      setBlacklist(prev => prev.map(item => item._id === id ? { ...item, active: !item.active } : item));
    } catch (err) {}
  };

  const deleteFromBlacklist = async (id: string) => {
    if (!confirm('Are you sure you want to permanently remove this entry?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_CONFIG.ENDPOINTS.BLACKLIST}/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': getTenantId()
        },
        credentials: 'include'
      });
      if (res.ok) setBlacklist(prev => prev.filter(item => item._id !== id));
    } catch (err) {}
  };

  // --- Derived State ---
  const filteredVisitors = useMemo(() => {
    let filtered = visitors.filter(v => {
      const q = searchQuery.toLowerCase();
      return v.name.toLowerCase().includes(q) || v.phone.includes(q) || (v.company && v.company.toLowerCase().includes(q)) || v._id.toLowerCase().includes(q) || (v.idNumberHash && v.idNumberHash.toLowerCase().includes(q)) || (v.hostName && v.hostName.toLowerCase().includes(q)) || (v.hostId?.name && v.hostId.name.toLowerCase().includes(q));
    });

    if (statusFilter === 'approved') filtered = filtered.filter(v => v.status === 'APPROVED');
    else if (statusFilter === 'forwarded') filtered = filtered.filter(v => v.status === 'SENT_FOR_APPROVAL' || v.status === 'FORWARDED');
    else if (statusFilter === 'gate_in') filtered = filtered.filter(v => ['GATE_IN', 'MEET_IN', 'MEET_OUT', 'CHECKED_IN', 'IN_MEETING'].includes(v.status));
    else if (statusFilter === 'rejected') filtered = filtered.filter(v => ['REJECTED', 'DENIED_BLACKLIST'].includes(v.status));

    const now = new Date();
    if (tableTimeFilter !== 'all') {
      filtered = filtered.filter(v => {
          const vDate = new Date(v.createdAt);
          if (tableTimeFilter === 'today') return vDate.toDateString() === now.toDateString();
          if (tableTimeFilter === 'last_day') {
              const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
              return vDate.toDateString() === yesterday.toDateString();
          }
          if (tableTimeFilter === 'week') {
              const firstDay = new Date(now); firstDay.setDate(now.getDate() - now.getDay());
              firstDay.setHours(0,0,0,0);
              return vDate >= firstDay;
          }
          if (tableTimeFilter === 'month') {
              return vDate.getMonth() === now.getMonth() && vDate.getFullYear() === now.getFullYear();
          }
          if (tableTimeFilter === 'custom') {
              const from = tableCustomFrom ? new Date(tableCustomFrom) : new Date(0);
              const to = tableCustomTo ? new Date(tableCustomTo) : new Date();
              to.setHours(23, 59, 59, 999);
              return vDate >= from && vDate <= to;
          }
          return true;
      });
    }
    return filtered;
  }, [visitors, searchQuery, statusFilter, tableTimeFilter, tableCustomFrom, tableCustomTo]);

  const filteredBlacklist = useMemo(() => {
    return blacklist.filter(item => 
      (item.name?.toLowerCase() || '').includes(blacklistSearch.toLowerCase()) || 
      (item.company?.toLowerCase() || '').includes(blacklistSearch.toLowerCase()) ||
      (item.reason?.toLowerCase() || '').includes(blacklistSearch.toLowerCase())
    );
  }, [blacklist, blacklistSearch]);

  return {
    activeTab, setActiveTab,
    staffView, setStaffView,
    visitors, users, blacklist, filteredBlacklist,
    employeeStats, analyticsData, analyticsTimeRange, setAnalyticsTimeRange,
    trafficChartType, setTrafficChartType,
    purposeChartType, setPurposeChartType,
    hostChartType, setHostChartType,
    previewScale, setPreviewScale,
    notificationSettings, smtpConfig, setSmtpConfig,
    purposesText, setPurposesText,
    passRulesText, setPassRulesText,
    guardConfig, setGuardConfig,
    licenseInfo, handleUpdateLicense,
    loading, showExportModal, setShowExportModal,
    exportConfig, setExportConfig,
    file, setFile,
    uploadStatus, setUploadStatus,
    searchQuery, setSearchQuery,
    matrixSearch, setMatrixSearch,
    blacklistSearch, setBlacklistSearch,
    emergencyContact, setEmergencyContact,
    statusFilter, setStatusFilter,

    selectedPhoto, setSelectedPhoto,
    tableTimeFilter, setTableTimeFilter,
    tableCustomFrom, setTableCustomFrom,
    tableCustomTo, setTableCustomTo,
    showAddStaff, setShowAddStaff,
    passModalVisitor, setPassModalVisitor,
    newStaff, setNewStaff,
    user, lastEvent,
    filteredVisitors,
    handleLogout, handleUpload, handleQuickExport, handleAdvancedExport, handleDownloadPurposeReport,
    saveSMTPConfig: () => saveSetting('smtp_config', smtpConfig),
    savePurposes: () => saveSetting('allowed_purposes', purposesText.split(',').map(p => p.trim()).filter(p => p)),
    savePassRules: () => saveSetting('pass_rules', passRulesText.split('\n').map(r => r.trim()).filter(r => r)),
    saveEmergencyContact: () => saveSetting('emergency_contact', emergencyContact),
    saveSetting,
 toggleNotification, handleAddStaff, handleBlacklist, fetchEncryptedId,
    removeEmployee, toggleHost, bulkToggleHost, fetchEmployeeStats,
    toggleBlacklist, deleteFromBlacklist,
    fetchVisitors, fetchBlacklist
  };
};
