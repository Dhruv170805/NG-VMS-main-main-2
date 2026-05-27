'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { API_CONFIG } from '@/app/config';

interface TenantConfig {
  name: string;
  logoUrl?: string;
  subdomain: string;
  features: {
    email: boolean;
    sms: boolean;
    aadhaar: boolean;
  };
  licenseValid?: boolean;
  licenseReason?: string;
}

interface TenantContextType {
  tenant: TenantConfig | null;
  loading: boolean;
  error: string | null;
  getTenantId: () => string;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const isIpAddress = (hostname: string) => {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':');
};

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getSubdomain = React.useCallback(() => {
    if (typeof window === 'undefined') return '';
    
    // --- IIS/Local Network Dynamic Tenant Resolution ---
    // In local private network deployments (like IIS), multiple PCs access the app via IP addresses
    // (e.g. http://192.168.1.50) making subdomain DNS resolution impossible without DNS servers.
    // We allow defining/persisting the tenant using a query parameter (e.g. ?tenant=client_name or ?t=client_name).
    const urlParams = new URLSearchParams(window.location.search);
    const queryTenant = urlParams.get('tenant') || urlParams.get('t');
    
    if (queryTenant) {
      localStorage.setItem('vms_tenant_id', queryTenant);
      return queryTenant;
    }
    
    const storedTenant = localStorage.getItem('vms_tenant_id');
    if (storedTenant) {
      return storedTenant;
    }

    const hostname = window.location.hostname;

    // Ignore hosting provider domains and use empty string (triggering backend auto-bind)
    if (hostname.includes('.onrender.com') || hostname.includes('.vercel.app')) {
      return '';
    }

    // Accessing the site via an IP address should use empty string (triggering backend auto-bind)
    if (isIpAddress(hostname) || hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.lan') || hostname.endsWith('.internal')) {
      return '';
    }

    const parts = hostname.split('.');

    // Check for custom multi-tenant subdomains
    if (parts.length >= 2) {
      // If first part is 'www', use the second part as tenant
      if (parts[0].toLowerCase() === 'www' && parts.length > 1) return parts[1];
      return parts[0];
    }

    // Default to empty string for dev/localhost (triggering backend auto-bind)
    return '';
  }, []);

  const fetchTenantConfig = React.useCallback(async () => {
    const subdomain = getSubdomain();
    try {
      const res = await fetch(`${API_CONFIG.ENDPOINTS.SYSTEM}/config`, {
        headers: {
          'x-tenant-id': subdomain
        }
      });

      if (!res.ok) {
        throw new Error('Failed to load tenant configuration');
      }

      const data = await res.json();
      setTenant(data);
    } catch (err: any) {
      console.error('[TENANT CONTEXT] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getSubdomain]);

  useEffect(() => {
    fetchTenantConfig();
  }, [fetchTenantConfig]);

  const getTenantId = React.useCallback(() => getSubdomain(), [getSubdomain]);

  return (
    <TenantContext.Provider value={{ tenant, loading, error, getTenantId }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
