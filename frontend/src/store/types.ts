export interface Visitor {
  _id: string;
  name: string;
  phone: string;
  status: string;
  purpose: string;
  hostName?: string;
  hostId?: string | { _id: string; name: string; email: string; department: string };
  photoUrl?: string;
  company?: string;
  visitTime?: string;
  createdAt?: string;
  expectedCheckout?: string;
  [key: string]: any;
}

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  },
};

export const getTenantId = () => {
  if (typeof window === 'undefined') return '';

  // 1. Check Query Parameters (highest priority for first-time login)
  const urlParams = new URLSearchParams(window.location.search);
  const queryTenant = urlParams.get('tenant') || urlParams.get('t');
  if (queryTenant) {
    localStorage.setItem('vms_tenant_id', queryTenant);
    return queryTenant;
  }

  // 2. Check LocalStorage (persisted tenant)
  const storedTenant = localStorage.getItem('vms_tenant_id');
  if (storedTenant) return storedTenant;

  // 3. Fallback to Hostname (standard multi-tenant resolution)
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    if (parts[0].toLowerCase() === 'www' && parts.length > 1) return parts[1];
    return parts[0];
  }
  
  return '';
};
