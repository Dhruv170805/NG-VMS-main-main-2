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
  if (typeof window === 'undefined') return 'demo';
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  if (parts.length > 2) return parts[0];
  return 'demo';
};
