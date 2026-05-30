import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export const setupSocketHandlers = (io: Server) => {
  // Socket.io Authentication Middleware
  io.use((socket: Socket, next) => {
    let token = socket.handshake.auth?.token;
    
    if (!token && socket.request.headers.cookie) {
      const cookies = socket.request.headers.cookie.split(';').map(c => c.trim());
      const tokenCookie = cookies.find(c => c.startsWith('token='));
      if (tokenCookie) {
        token = tokenCookie.substring(6);
      }
    }

    if (!token) {
      // Non-authenticated socket (e.g. public visitor viewing a pass)
      return next();
    }

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        logger.error('[SOCKET] JWT_SECRET is not configured');
        return next(new Error('JWT_SECRET is not configured'));
      }
      const decoded = jwt.verify(token, secret) as { id: string, name: string, role: string, tenantId: string };
      (socket as any).user = decoded;
      (socket as any).tenantId = decoded.tenantId;
      next();
    } catch (error: any) {
      logger.error(`[SOCKET AUTH] Auth Error: ${error.message}`);
      next(new Error('Authentication failed'));
    }
  });

  // Socket.io Event Handlers
  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    const tenantId = (socket as any).tenantId;

    if (tenantId) {
      // Automically join the global tenant room for updates
      socket.join(`tenant_${tenantId}`);
      logger.info(`[SOCKET] User ${user?.id || 'unknown'} joined tenant room tenant_${tenantId}`);
    } else {
      logger.info(`[SOCKET] Anonymous connection established (Socket ID: ${socket.id})`);
    }

    socket.on('ping', () => socket.emit('pong'));

    socket.on('join:host', (hostId: string) => {
      // Hosts must be authenticated within a tenant context
      if (!tenantId || !user) {
        logger.warn(`[SOCKET] Unauthorized attempt to join host room ${hostId}`);
        return;
      }
      if (user.id !== hostId && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        logger.warn(`[SOCKET] User ${user.id} attempted to spoof host room ${hostId}`);
        return;
      }
      socket.join(`tenant_${tenantId}_host_${hostId}`);
      logger.info(`[SOCKET] User ${user?.id} joined host room tenant_${tenantId}_host_${hostId}`);
    });

    let lastJoinTime = 0;
    let joinRequests = 0;

    socket.on('join:visitor', async (data: any) => {
      try {
        const visitorId = typeof data === 'string' ? data : data.visitorId;
        const socketToken = typeof data === 'object' ? data.socketToken : null;

        const now = Date.now();
        if (now - lastJoinTime < 5000) {
          joinRequests++;
          if (joinRequests > 5) {
            logger.warn(`[SOCKET] Too many join requests for visitor ${visitorId}`);
            socket.emit('error', 'Too many join requests. Back off.');
            return;
          }
        } else {
          joinRequests = 1;
          lastJoinTime = now;
        }

        if (!mongoose.Types.ObjectId.isValid(visitorId)) {
          logger.warn(`[SOCKET] Invalid visitor ID format: ${visitorId}`);
          return;
        }
        const visitor = await mongoose.model('Visitor').findOne({ _id: visitorId }) as any;
        if (visitor) {
          // Strict tenant boundary: if authenticated, socket tenantId must match visitor tenantId
          if (tenantId && tenantId.toString() !== visitor.tenantId.toString()) {
            logger.warn(`[SOCKET] Tenant mismatch for visitor ${visitorId}`);
            return;
          }

          // Unauthenticated users MUST provide a valid short-lived socket token
          if (!tenantId) {
            if (!socketToken) {
              logger.warn(`[SOCKET] Missing socket token for unauthenticated join attempt (Visitor: ${visitorId})`);
              return;
            }
            try {
              const decoded = jwt.verify(socketToken, process.env.JWT_SECRET as string) as any;
              if (decoded.visitorId !== visitorId || decoded.type !== 'socket') {
                logger.warn(`[SOCKET] Invalid socket token payload for visitor ${visitorId}`);
                return;
              }
            } catch (e: any) {
              logger.warn(`[SOCKET] Socket token verification failed: ${e.message}`);
              return;
            }
          }

          socket.join(`tenant_${visitor.tenantId}_visitor_${visitorId}`);
          logger.info(`[SOCKET] Joined visitor room tenant_${visitor.tenantId}_visitor_${visitorId}`);
        } else {
          logger.warn(`[SOCKET] Visitor not found: ${visitorId}`);
        }
      } catch (err: any) {
        logger.error(`[SOCKET] Error in join:visitor: ${err.message}`);
      }
    });

    socket.on('disconnect', () => {
      // Intentionally silent — handled by redis adapter
      logger.info(`[SOCKET] Connection disconnected (Socket ID: ${socket.id})`);
    });
  });
};
