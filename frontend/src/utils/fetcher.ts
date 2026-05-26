import { API_CONFIG, buildUrl } from '../../app/config';

// Global SWR fetcher configured to always include tenantId and credentials
export const fetcher = async (url: string) => {
  const getTenantId = () => {
    if (typeof window === 'undefined') return 'demo';
    const urlParams = new URLSearchParams(window.location.search);
    const queryTenant = urlParams.get('tenant') || urlParams.get('t');
    if (queryTenant) return queryTenant;
    
    const storedTenant = localStorage.getItem('vms_tenant_id');
    if (storedTenant) return storedTenant;
    
    const hostname = window.location.hostname;
    if (hostname.includes('.onrender.com') || hostname.includes('.vercel.app')) return 'demo';
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':')) return 'demo';
    
    const parts = hostname.split('.');
    if (parts.length > 2) return parts[0];
    
    return 'demo';
  };

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: any = {
    'x-tenant-id': getTenantId()
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    headers,
    credentials: 'include'
  });

  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    // Attach extra info to the error object.
    (error as any).info = await res.json().catch(() => ({}));
    (error as any).status = res.status;
    throw error;
  }

  const json = await res.json();
  
  // Unwrap standard response formats if needed
  if (json.success !== undefined && json.data !== undefined) {
    return json.data;
  }
  
  return json;
};
