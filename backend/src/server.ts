import dotenv from 'dotenv';
dotenv.config(); // MUST be first — before any module that reads process.env
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { SecurityManager } from './utils/securityManager';

import { startOtel, shutdownTracing } from './utils/otel';
startOtel();

import express, { Request } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import cookieParser from 'cookie-parser';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { validateEnv } from './config/env';
import logger from './utils/logger';
import requestLogger from './middleware/requestLogger';
import redisConnection from './config/redis';
import { initQueues } from './queues/queueSetup';

// Pre-flight environment check
validateEnv();

import { EventEmitter } from 'events';
// Runtime stability: prevent MaxListenersExceededWarning on ServerResponse
// This happens when multiple instrumentations (OTEL, express-rate-limit, etc.) attach listeners
EventEmitter.defaultMaxListeners = 25;
process.setMaxListeners(25);

// Routes
import visitorRoutes from './modules/visitor/visitor.routes';
import authRoutes from './modules/auth/auth.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import systemRoutes from './modules/system/system.routes';
import employeeRoutes from './modules/employee/employee.routes';
import gateRoutes from './modules/gate/gate.routes';
import handoverRoutes from './modules/handover/handover.routes';
import blacklistRoutes from './modules/blacklist/blacklist.routes';
import aadhaarRoutes from './modules/aadhaar/aadhaar.routes';
import bootstrapRoutes from './modules/bootstrap/bootstrap.routes';
import { BootstrapService } from './modules/bootstrap/bootstrap.service';
import { setNotificationIO } from './utils/notificationService';
import { tenantMiddleware } from './middleware/tenantMiddleware';
import { protect } from './middleware/authMiddleware';
import { errorHandler } from './middleware/errorHandler';

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { typeDefs, resolvers } from './graphql/schema';

export const app = express();
app.set('trust proxy', 1);
export const server = http.createServer(app);

// CORS — support dynamic subdomains
const baseFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const baseDomain = baseFrontendUrl.replace(/^https?:\/\//, '').split(':')[0];
const extraOrigins = process.env.EXTRA_ALLOWED_ORIGINS ? process.env.EXTRA_ALLOWED_ORIGINS.split(',') : [];

const allowedOrigins = new Set(
  [
    baseFrontendUrl,
    ...(process.env.NODE_ENV !== 'production' ? [
      'http://localhost:3000',
      'http://localhost:8080',
    ] : []),
    ...extraOrigins,
    process.env.CORS_EXTRA_ORIGIN,
  ].filter(Boolean)
);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const host = process.env.SERVER_HOST || 'localhost';
    
    // Allow server-to-server (no Origin) and explicitly allowed origins
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      try {
        const originUrl = new URL(origin);
        const hostname = originUrl.hostname;
        
        // Dynamic Origin Detection: Allow if it matches the base domain or is a local hostname
        const isIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':') || hostname === 'localhost' || hostname === '127.0.0.1';
        const isLocal = hostname.endsWith('.local') || hostname.endsWith('.lan') || hostname.endsWith('.home') || hostname.endsWith('.patel') || hostname.endsWith('.internal');
        
        if (isIp || isLocal || hostname === baseDomain || hostname.endsWith('.' + baseDomain)) {
          callback(null, true);
          return;
        }

        // IIS/ARR Proxy Support: If the origin matches the server host name, allow it
        if (hostname === host || hostname.endsWith('.' + host)) {
          callback(null, true);
          return;
        }
      } catch (err) {
        // ignore invalid URL formats
      }
      callback(new Error(`CORS: Origin '${origin}' not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-tenant-id'],
};

// Rate Limiting per Tenant
const tenantKeyGenerator = (req: any) => {
  const tenantId = req.headers['x-tenant-id'] || 'global';
  return `rate_limit:${tenantId}:${req.ip}`;
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_GLOBAL || '1000', 10),
  validate: { keyGeneratorIpFallback: false },
  // Skip rate limiting in testing environments or when explicitly disabled via environment
  // variables (e.g. to allow parallel Playwright workers to run without hitting 429 errors).
  skip: () => process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMITS === 'true',
  message: { error: 'Too many requests from this tenant, please try again after 15 minutes' },
  store: new RedisStore({
    // @ts-expect-error - ioredis sendCommand type is compatible
    sendCommand: (...args: string[]) => redisConnection.call(args[0], ...args.slice(1)),
  }),
  keyGenerator: tenantKeyGenerator,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_AUTH || '20', 10),
  validate: { keyGeneratorIpFallback: false },
  // Skip authentication rate limits for automated test runs or explicit bypass
  skip: () => process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMITS === 'true',
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
  store: new RedisStore({
    // @ts-expect-error - ioredis sendCommand type is compatible
    sendCommand: (...args: string[]) => redisConnection.call(args[0], ...args.slice(1)),
  }),
  keyGenerator: tenantKeyGenerator,
});

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      try {
        const hostname = new URL(origin).hostname;
        const isIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':') || hostname === 'localhost' || hostname === '127.0.0.1';
        const isDynamicLocal = hostname.endsWith('.local') || hostname.endsWith('.lan') || hostname.endsWith('.home') || hostname.endsWith('.internal');
        
        if (isIp || isDynamicLocal) {
          callback(null, true);
          return;
        }
        
        // Allowed domains check
        if (hostname === baseDomain || hostname.endsWith('.' + baseDomain)) {
          callback(null, true);
          return;
        }
      } catch (err) {}
      callback(new Error('CORS: Origin not allowed'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 20000,
  pingInterval: 10000,
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  connectTimeout: 45000,
});

// Redis Adapter for horizontal scalability
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()])
  .then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('[NG-VMS] Socket.io Redis adapter connected');
  })
  .catch((err) => {
    logger.warn({ err: err.message }, '[NG-VMS] Redis unavailable, using in-memory adapter');
  });

setNotificationIO(io);

// Middleware
app.use(cors(corsOptions));
app.use(cookieParser());

// Global body parsing with 100kb limit, but 10mb limit for high-payload routes
app.use((req, res, next) => {
  const isHighPayload = req.path.includes('/visitors/register') || req.path.includes('/id-preview');
  const limit = isHighPayload ? '10mb' : '100kb';
  express.json({ limit })(req, res, (err) => {
    if (err) return next(err);
    express.urlencoded({ limit, extended: true })(req, res, next);
  });
});

app.use(requestLogger); // Structured Request Logging

// Apply Tenant Middleware to all versioned and base API routes
app.use('/api/v1', tenantMiddleware);
app.use('/api', tenantMiddleware);

app.use('/api/v1', limiter);
app.use('/api', limiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/auth/login', authLimiter);

// GraphQL Integration
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
});

const startApollo = async () => {
  await apolloServer.start();
  app.use(
    '/api/graphql',
    tenantMiddleware,
    protect,
    expressMiddleware(apolloServer, {
      context: async ({ req }) => ({
        user: (req as any).user,
        tenantId: (req as any).tenantId,
      }),
    })
  );
  logger.info('[NG-VMS] Apollo GraphQL Server mounted at /api/graphql');
};

// Make Socket.io available in controllers
app.set('socketio', io);

// Database Connection
const MONGODB_URI = process.env.NODE_ENV === 'test'
  ? (process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/ng-vms-integration-tests?directConnection=true')
  : (process.env.MONGODB_URI || 'mongodb://localhost:27017/ng-vms');
mongoose
  .connect(MONGODB_URI, {
    maxPoolSize: 20,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(async () => {
    mongoose.connection.setMaxListeners(25);
    logger.info('[NG-VMS] Connected to MongoDB');
    
    // Initialize BullMQ background queues
    await initQueues();

    // Auto-bootstrap or update tenant license from files dynamically on startup
    try {
      const searchDirs = [
        process.cwd(),
        path.join(process.cwd(), 'shared')
      ];
      const foundLicenses: { path: string; filename: string; key: string; companyCode: string }[] = [];

      // Check explicit environment variable first
      if (process.env.LICENSE_KEY_PATH && fs.existsSync(process.env.LICENSE_KEY_PATH)) {
        try {
          const key = await fs.promises.readFile(process.env.LICENSE_KEY_PATH, 'utf8');
          if (key && key.trim()) {
            const filename = path.basename(process.env.LICENSE_KEY_PATH);
            const match = filename.match(/^([a-zA-Z0-9_-]+)&([a-zA-Z0-9_-]+)_NGS\.lic$/i);
            const companyCode = match ? match[1] : 'default';
            foundLicenses.push({ path: process.env.LICENSE_KEY_PATH, filename, key: key.trim(), companyCode });
          }
        } catch (err) {}
      }

      // Check directories for *_NGS.lic
      for (const dir of searchDirs) {
        if (!fs.existsSync(dir)) continue;
        try {
          const files = await fs.promises.readdir(dir);
          for (const file of files) {
            const isNgsLic = file.toLowerCase().endsWith('_ngs.lic');
            if (isNgsLic) {
              const fullPath = path.join(dir, file);
              try {
                const key = await fs.promises.readFile(fullPath, 'utf8');
                if (key && key.trim()) {
                  const match = file.match(/^([a-zA-Z0-9_-]+)&([a-zA-Z0-9_-]+)_NGS\.lic$/i);
                  const companyCode = match ? match[1] : 'default';
                  foundLicenses.push({ path: fullPath, filename: file, key: key.trim(), companyCode });
                }
              } catch (err) {}
            }
          }
        } catch (err) {}
      }

      const securityManager = SecurityManager.getInstance();

      // Process each found license key
      for (const lic of foundLicenses) {
        const validation = await securityManager.validateTenantLicense(lic.key);
        if (!validation.valid) {
          console.warn(`[NG-VMS] Found license file at ${lic.path} but validation failed: ${validation.reason}`);
          continue;
        }

        const data = validation.data!;
        const companyCode = (lic.companyCode || data.companyCode || data.company || 'default').toLowerCase().replace(/[^a-z0-9_-]/g, '');

        const status = await BootstrapService.checkStatus();
        if (status.bootstrapRequired) {
          console.log(`[NG-VMS] Clean database detected. Auto-bootstrapping using license from ${lic.path}...`);
          const companyName = data.company || 'Enterprise Corporation';
          const adminEmail = data.rootAdmin?.id || 'admin@enterprise.com';
          const adminPassword = data.rootAdmin?.password || 'password123';

          await BootstrapService.runBootstrap({
            companyName,
            subdomain: companyCode,
            adminName: 'System Administrator',
            adminEmail,
            adminPassword,
            guardName: 'Main Gate Guard',
            guardEmail: `guard@${companyCode}.com`,
            guardPassword: adminPassword,
            licenseKey: lic.key
          });
          console.log(`[NG-VMS] Auto-bootstrapping complete! Tenant: ${companyName}, Subdomain: ${companyCode}, Admin: ${adminEmail}`);
        } else {
          // If already bootstrapped, check for dynamic update/alignment
          await BootstrapService.updateTenantLicense(lic.key, data, companyCode);
        }
      }
    } catch (err: any) {
      console.error('[NG-VMS] Dynamic license processing error:', err.message);
    }
  })
  .catch((err) => console.error('[NG-VMS] MongoDB Connection Error:', err));

// Socket.io Authentication Middleware
io.use((socket, next) => {
  let token = socket.handshake.auth?.token;
  
  if (!token && socket.request.headers.cookie) {
    const cookies = socket.request.headers.cookie.split(';').map(c => c.trim());
    const tokenCookie = cookies.find(c => c.startsWith('token='));
    if (tokenCookie) {
      token = tokenCookie.split('=')[1];
    }
  }

  if (!token) {
    // Non-authenticated socket (e.g. public visitor viewing a pass)
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return next(new Error('JWT_SECRET is not configured'));
    }
    const decoded = jwt.verify(token, secret) as { id: string, name: string, role: string, tenantId: string };
    (socket as any).user = decoded;
    (socket as any).tenantId = decoded.tenantId;
    next();
  } catch (error) {
    console.error('[SOCKET AUTH] Auth Error:', error);
    next(new Error('Authentication failed'));
  }
});

// Socket.io Event Handlers
io.on('connection', (socket) => {
  const user = (socket as any).user;
  const tenantId = (socket as any).tenantId;

  if (tenantId) {
    // Automically join the global tenant room for updates
    socket.join(`tenant_${tenantId}`);
  }

  socket.on('ping', () => socket.emit('pong'));

  socket.on('join:host', (hostId: string) => {
    // Hosts must be authenticated within a tenant context
    if (!tenantId) {
      return;
    }
    socket.join(`tenant_${tenantId}_host_${hostId}`);
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
          socket.emit('error', 'Too many join requests. Back off.');
          return;
        }
      } else {
        joinRequests = 1;
      }
      lastJoinTime = now;

      if (!mongoose.Types.ObjectId.isValid(visitorId)) return;
      const visitor = await mongoose.model('Visitor').findOne({ _id: visitorId }) as any;
      if (visitor) {
        // Strict tenant boundary: if authenticated, socket tenantId must match visitor tenantId
        if (tenantId && tenantId.toString() !== visitor.tenantId.toString()) {
          return;
        }

        // Unauthenticated users MUST provide a valid short-lived socket token
        if (!tenantId) {
          if (!socketToken) return;
          try {
            const decoded = jwt.verify(socketToken, process.env.JWT_SECRET as string) as any;
            if (decoded.visitorId !== visitorId || decoded.type !== 'socket') {
              return;
            }
          } catch (e) {
            return;
          }
        }

        socket.join(`tenant_${visitor.tenantId}_visitor_${visitorId}`);
      }
    } catch (err) {
      // Safe catch
    }
  });

  socket.on('disconnect', () => {
    // Intentionally silent — handled by redis adapter
  });
});

// API Routes
app.get('/', (_req, res) =>
  res.status(200).send(`NG-VMS API Server is running. Access the frontend at ${baseFrontendUrl}`)
);

const registerRoutes = (prefix: string) => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/visitors`, visitorRoutes);
  app.use(`${prefix}/bootstrap`, bootstrapRoutes);
  app.use(`${prefix}/system`, systemRoutes);
  app.use(`${prefix}/analytics`, analyticsRoutes);
  app.use(`${prefix}/employees`, employeeRoutes);
  app.use(`${prefix}/gate`, gateRoutes);
  app.use(`${prefix}/handover`, handoverRoutes);
  app.use(`${prefix}/blacklist`, blacklistRoutes);
  app.use(`${prefix}/aadhaar`, aadhaarRoutes);
};

const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
  try {
    await startApollo();
  } catch (err: any) {
    logger.error({ err: err.message }, '[NG-VMS] Failed to start Apollo Server');
  }

  registerRoutes('/api/v1');
  registerRoutes('/api'); // legacy routing support

  // Catch-all 404 for API
  app.use('/api/v1', (req, res) => {
    logger.warn(`[404] Missing API Endpoint: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ success: false, message: `API endpoint not found: ${req.originalUrl}` });
  });
  app.use('/api', (req, res) => {
    logger.warn(`[404] Missing API Endpoint: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ success: false, message: `API endpoint not found: ${req.originalUrl}` });
  });

  // Health Check
  app.get('/health', (_req, res) =>
    res.status(200).json({ status: 'healthy', version: '1.0.0', timestamp: new Date().toISOString() })
  );

  // Centralized error handler — must be last
  app.use(errorHandler);

  if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`[NG-VMS] Server running on http://127.0.0.1:${PORT}`);
    });
  }
};

startServer();

// removed duplicate PORT

// Graceful Shutdown
const shutdown = async () => {
  logger.info('\n[NG-VMS] Initiating graceful shutdown...');
  try {
    io.close();
    if (pubClient.isOpen) await pubClient.quit();
    if (subClient.isOpen) await subClient.quit();
    await mongoose.connection.close();
    await shutdownTracing();
    server.close(() => {
      logger.info('[NG-VMS] Server offline. Shutdown complete.');
      process.exit(0);
    });
  } catch (err: any) {
    logger.error({ err: err.message }, '[NG-VMS] Shutdown error');
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Server listen is handled in startServer
