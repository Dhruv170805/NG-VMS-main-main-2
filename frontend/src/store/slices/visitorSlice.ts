import { StateCreator } from 'zustand';
import { API_CONFIG, buildUrl } from '../../../app/config';
import { withRetry } from '../../utils/retryQueue';
import { Visitor, getTenantId, safeLocalStorage } from '../types';

export interface VisitorSlice {
  globalVisitors: Visitor[];
  currentVisitor: Visitor | null;
  globalHistory: Visitor[];
  visitorSummary: any;
  visitorIsLoading: boolean;
  fetchGlobalHistory: (search?: string) => Promise<void>;
  updateGlobalVisitorStatus: (id: string, status: string, data?: any) => Promise<Visitor | null>;
  notifyVisitorAlert: (id: string, type: string) => Promise<void>;
  setCurrentVisitor: (v: Visitor | null) => void;
}

export const createVisitorSlice: StateCreator<VisitorSlice> = (set) => ({
  globalVisitors: [],
  currentVisitor: null,
  globalHistory: [],
  visitorSummary: {},
  visitorIsLoading: false,

  setCurrentVisitor: (v) => set({ currentVisitor: v }),

  fetchGlobalHistory: async (search?: string) => {
    set({ visitorIsLoading: true });
    try {
      const data = await withRetry(async () => {
        const token = safeLocalStorage.getItem('token');
        const fetchUrl = buildUrl(API_CONFIG.ENDPOINTS.VISITORS, {
          limit: '500',
          ...(search ? { search } : {}),
        });
        const res = await fetch(fetchUrl, {
          headers: {
            'x-tenant-id': getTenantId(),
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`fetchGlobalHistory failed: ${res.status}`);
        return res.json();
      });
      if (data.success) {
        set({ globalHistory: data.data });
      }
    } catch (err) {
      console.error('[Store] fetchGlobalHistory error:', err);
    } finally {
      set({ visitorIsLoading: false });
    }
  },

  updateGlobalVisitorStatus: async (id: string, status: string, data?: any) => {
    try {
      const visitor = await withRetry(async () => {
        const token = safeLocalStorage.getItem('token');
        const res = await fetch(`${API_CONFIG.ENDPOINTS.VISITORS}/${id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': getTenantId(),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ status, ...data }),
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`updateGlobalVisitorStatus failed: ${res.status}`);
        const result = await res.json();
        return result.visitor;
      });
      return visitor;
    } catch (err) {
      console.error('[Store] updateGlobalVisitorStatus error:', err);
      return null;
    }
  },

  notifyVisitorAlert: async (id: string, type: string) => {
    try {
      await withRetry(async () => {
        const token = safeLocalStorage.getItem('token');
        const res = await fetch(`${API_CONFIG.ENDPOINTS.VISITORS}/${id}/notify-alert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': getTenantId(),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ type }),
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`notifyVisitorAlert failed: ${res.status}`);
      });
    } catch (err) {
      console.error('[Store] notifyVisitorAlert error:', err);
    }
  },
});
