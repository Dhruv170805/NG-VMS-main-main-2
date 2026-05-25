import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { createSocketSlice, SocketSlice } from './slices/socketSlice';
import { createHostSlice, HostSlice } from './slices/hostSlice';
import { createVisitorSlice, VisitorSlice } from './slices/visitorSlice';

export type AppState = SocketSlice & HostSlice & VisitorSlice;

export const useAppStore = create<AppState>()((...a) => ({
  ...createSocketSlice(...a),
  ...createHostSlice(...a),
  ...createVisitorSlice(...a),
}));

// Backward-compatibility selector hooks
export const useSocketStore = () =>
  useAppStore(useShallow((state) => ({
    socket: state.socket,
    isConnected: state.isConnected,
    error: state.error,
    connect: state.connectSocket,
    disconnect: state.disconnectSocket,
    emit: state.emitSocket,
  })));

export const useHostStore = () =>
  useAppStore(useShallow((state) => ({
    visitors: state.hostVisitors,
    history: state.hostHistory,
    isLoading: state.hostIsLoading,
    timeline: state.hostTimeline,
    activeVisitor: state.hostActiveVisitor,
    historyPagination: state.hostPagination,
    fetchHostVisitors: state.hostVisitors.length === 0 ? state.fetchHostVisitors : state.fetchHostVisitors, // existing logic placeholder
    fetchHostHistory: state.fetchHostHistory,
    fetchTimeline: state.fetchHostTimeline,
    updateStatus: state.updateHostVisitorStatus,
    setActiveVisitor: state.setHostActiveVisitor,
    setTimeline: state.setHostTimeline,
    setVisitors: state.setHostVisitors,
  })));

export const useVisitorStore = () =>
  useAppStore(useShallow((state) => ({
    visitors: state.globalVisitors,
    currentVisitor: state.currentVisitor,
    history: state.globalHistory,
    isLoading: state.visitorIsLoading,
    summary: state.visitorSummary,
    fetchHistory: state.fetchGlobalHistory,
    updateStatus: state.updateGlobalVisitorStatus,
    notifyAlert: state.notifyVisitorAlert,
    setCurrentVisitor: state.setCurrentVisitor,
  })));

export * from './types';
