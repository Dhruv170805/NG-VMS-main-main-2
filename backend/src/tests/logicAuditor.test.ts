import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import crypto from 'crypto';
import express from 'express';
import Visitor from '../models/Visitor';
import Blacklist from '../models/Blacklist';
import VisitorLog from '../models/VisitorLog';
import { gateCheckIn } from '../modules/gate/gate.controller';
import Tenant from '../models/Tenant';
import { tenantMiddleware } from '../middleware/tenantMiddleware';

// Setup Mock App for Controller testing
const app = express();
app.use(express.json());

// Mock tenantMiddleware injection for testing
app.use((req: any, res, next) => {
  req.headers['x-tenant-id'] = 'test-tenant';
  next();
});
app.use(tenantMiddleware);

// Mock auth middleware injection
app.use((req, res, next) => {
  req.user = { id: new mongoose.Types.ObjectId().toString(), name: 'Test Guard', role: 'GUARD', tenantId: new mongoose.Types.ObjectId().toString() };
  next();
});
app.set('socketio', { to: vi.fn().mockReturnThis(), emit: vi.fn() });
app.post('/api/gate/checkin', gateCheckIn);

describe('Logic Auditor: Gate Security & Blacklist', () => {
  let testTenant: any;

  beforeAll(async () => {
    const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/ng-vms-test-logic';
    await mongoose.connect(url);

    // Clean up
    await Tenant.deleteMany({});
    await Visitor.deleteMany({});
    await Blacklist.deleteMany({});

    // Create test tenant
    testTenant = await Tenant.create({      name: 'Test Tenant',
      subdomain: 'test-tenant',
      licenseKey: Buffer.from(JSON.stringify({ status: 'ACTIVE', companyCode: 'test-tenant', features: { email: true, sms: true, aadhaar: true } })).toString('base64')
    });
  });

  afterAll(async () => {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.connection.close();
  });

  it('should REJECT a blacklisted visitor even if status is APPROVED', async () => {
    const idNumber = "999988887777";
    const hash = crypto.createHash('sha256').update(idNumber).digest('hex');
    
    // 1. Blacklist the hash
    await Blacklist.create({ 
      tenantId: testTenant._id,
      idNumberHash: hash, 
      name: 'Bad Actor', 
      reason: 'Test Block', 
      active: true 
    });

    // 2. Create an Approved visitor with this hash
    const visitor = await Visitor.create({
      tenantId: testTenant._id,
      name: 'Bad Actor',
      email: 'bad@actor.com',
      phone: '1234567890',
      purpose: 'Meeting',
      hostName: 'Admin',
      status: 'APPROVED',
      idNumberHash: hash
    });

    // 3. Attempt Gate In
    const res = await request(app)
      .post('/api/gate/checkin')
      .send({ visitorId: visitor._id, gateId: 'GATE-01' });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Blacklisted');

    // 4. Verify Log Entry
    const log = await VisitorLog.findOne({ visitorId: visitor._id, event: 'DENIED_BLACKLIST' });
    expect(log).toBeDefined();
    expect(log?.details).toContain('Test Block');
  });

  it('should PREVENT double check-in (Idempotency)', async () => {
    const visitor = await Visitor.create({
      tenantId: testTenant._id,
      name: 'Normal Guest',
      email: 'guest@test.com',
      phone: '0000000000',
      purpose: 'Meeting',
      hostName: 'Admin',
      status: 'GATE_IN'
    });

    const res = await request(app)
      .post('/api/gate/checkin')
      .send({ visitorId: visitor._id, gateId: 'GATE-01' });

    expect(res.body.message).toBe('Already inside');
  });
});
