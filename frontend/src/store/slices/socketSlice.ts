import { StateCreator } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../../../app/config';

export interface SocketSlice {
  socket: Socket | null;
  isConnected: boolean;
  error: string | null;
  connectSocket: (token: string) => void;
  disconnectSocket: () => void;
  emitSocket: (event: string, data: any) => void;
}

export const createSocketSlice: StateCreator<SocketSlice> = (set, get) => ({
  socket: null,
  isConnected: false,
  error: null,

  connectSocket: (token: string) => {
    const { socket } = get();
    if (socket?.connected) return;
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }
    const newSocket = io(API_CONFIG.SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });
    newSocket.on('connect', () => set({ isConnected: true, error: null }));
    newSocket.on('disconnect', (reason) => {
      set({ isConnected: false });
      if (reason === 'io server disconnect') newSocket.connect();
    });
    newSocket.on('connect_error', (err) => set({ error: err.message, isConnected: false }));
    set({ socket: newSocket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      socket.removeAllListeners();
      set({ socket: null, isConnected: false });
    }
  },

  emitSocket: (event: string, data: any) => {
    const { socket } = get();
    if (socket?.connected) socket.emit(event, data);
  },
});
