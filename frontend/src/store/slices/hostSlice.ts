import { StateCreator } from 'zustand';
import { API_CONFIG, buildUrl } from '../../../app/config';
import { withRetry } from '../../utils/retryQueue';
import { Visitor, getTenantId } from '../types';

export interface HostSlice {
  hostVisitors: Visitor[];
  hostHistory: Visitor[];
  hostTimeline: any[] | null;
  hostActiveVisitor: Visitor | null;
  hostPagination: { page: number; totalPages: number };
  hostIsLoading: boolean;
  fetchHostVisitors: (hostId: string, search?: string) => Promise<void>;
  fetchHostHistory: (hostId: string, page?: number, search?: string) => Promise<void>;
  fetchHostTimeline: (visitorId: string) => Promise<void>;
  updateHostVisitorStatus: (id: string, status: string, remark?: string) => Promise<void>;
  setHostActiveVisitor: (v: Visitor | null) => void;
  setHostTimeline: (t: any[] | null) => void;
  setHostVisitors: (v: Visitor[]) => void;
}

export const createHostSlice: StateCreator<HostSlice> = (set) => ({
  hostVisitors: [],
  hostHistory: [],
  hostTimeline: null,
  hostActiveVisitor: null,
  hostPagination: { page: 1, totalPages: 1 },
  hostIsLoading: false,

  setHostVisitors: (v) => set({ hostVisitors: v }),
  setHostActiveVisitor: (v) => set({ hostActiveVisitor: v }),
  setHostTimeline: (t) => set({ hostTimeline: t }),

  fetchHostVisitors: async (hostId, search) => {
    set({ hostIsLoading: true });
    try {
      const data = await withRetry(async () => {
        const fetchUrl = buildUrl(API_CONFIG.ENDPOINTS.VISITORS, {
          hostId,
          ...(search ? { search } : {}),
        });
        const res = await fetch(fetchUrl, { 
          headers: { 'x-tenant-id': getTenantId() },
          credentials: 'include' 
        });
        if (!res.ok) throw new Error(`fetchHostVisitors failed: ${res.status}`);
        return res.json();
      });
      set({ hostVisitors: data.data || data });
    } catch (err) {
      console.error('[Store] fetchHostVisitors error:', err);
    } finally {
      set({ hostIsLoading: false });
    }
  },

  fetchHostHistory: async (hostId, page = 1, search = '') => {
    set({ hostIsLoading: true });
    try {
      const data = await withRetry(async () => {
        // Build history URL — completed/rejected visits for this host
        const historyUrl = buildUrl(API_CONFIG.ENDPOINTS.VISITORS, {
          hostId,
          page: page.toString(),
          limit: '10',
          ...(search ? { search } : {}),
        });
        // Append multiple status values manually (buildUrl doesn't support multi-value)
        const historyFinalUrl = `${historyUrl}&status=GATE_OUT&status=REJECTED`;
        const res = await fetch(historyFinalUrl, { 
          headers: { 'x-tenant-id': getTenantId() },
          credentials: 'include' 
        });
        if (!res.ok) throw new Error(`fetchHostHistory failed: ${res.status}`);
        return res.json();
      });
      set({
        hostHistory: data.data || [],
        hostPagination: { page, totalPages: data.pagination?.pages || 1 },
      });
    } catch (err) {
      console.error('[Store] fetchHostHistory error:', err);
    } finally {
      set({ hostIsLoading: false });
    }
  },

  fetchHostTimeline: async (visitorId) => {
    try {
      const data = await withRetry(async () => {
        const res = await fetch(
          `${API_CONFIG.ENDPOINTS.VISITORS}/${visitorId}/timeline`,
          { 
            headers: { 'x-tenant-id': getTenantId() },
            credentials: 'include' 
          }
        );
        if (!res.ok) throw new Error(`fetchHostTimeline failed: ${res.status}`);
        return res.json();
      });
      set({ hostTimeline: data });
    } catch (err) {
      console.error('[Store] fetchHostTimeline error:', err);
    }
  },

  updateHostVisitorStatus: async (id, status, remark) => {
    try {
      await withRetry(async () => {
        const res = await fetch(`${API_CONFIG.ENDPOINTS.VISITORS}/${id}/status`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'x-tenant-id': getTenantId()
          },
          body: JSON.stringify({ status, remark }),
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`updateHostVisitorStatus failed: ${res.status}`);
        return res.json();
      });
    } catch (err) {
      console.error('[Store] updateHostVisitorStatus error:', err);
    }
  },
});
