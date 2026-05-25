import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import crypto from 'crypto';
import Visitor from '../models/Visitor';
import VisitorLog from '../models/VisitorLog';
import { registerVisitor, updateVisitorStatus } from '../modules/visitor/visitor.controller';
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

// Mock socket.io
const mockSocketIo = {
  to: vi.fn().mockReturnThis(),
  emit: vi.fn()
};
app.set('socketio', mockSocketIo);

// Mocks for notifications
vi.mock('../utils/notificationService', () => ({
  notifyHostRegistration: vi.fn(),
  notifyVisitorApproval: vi.fn(),
  notifyHostArrival: vi.fn()
}));

app.post('/api/visitors/register', registerVisitor);

app.put('/api/visitors/:id/status_staff', (req, res, next) => {
  req.user = { id: new mongoose.Types.ObjectId().toString(), name: 'Staff User', role: 'STAFF', tenantId: new mongoose.Types.ObjectId().toString() };
  next();
}, updateVisitorStatus);

app.put('/api/visitors/:id/status_admin', (req, res, next) => {
  req.user = { id: new mongoose.Types.ObjectId().toString(), name: 'Admin User', role: 'ADMIN', tenantId: new mongoose.Types.ObjectId().toString() };
  next();
}, updateVisitorStatus);

describe('TEST_GENERATOR: Visitor Intake & Approval Workflows', () => {
  let testTenant: any;

  beforeAll(async () => {
    const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/ng-vms-test-visitor';
    await mongoose.connect(url);

    // Clean up
    await Tenant.deleteMany({});
    await Visitor.deleteMany({});
    await VisitorLog.deleteMany({});

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

  it('INTAKE_AGENT: should parse and normalize raw form submission correctly', async () => {
    const idProofNumber = "AB1234567";
    const res = await request(app)
      .post('/api/visitors/register')
      .send({
        name: 'Alice Smith',
        email: 'alice@corp.com',
        phone: '1122334455',
        company: 'Corp Inc',
        purpose: 'Interview',
        idProofNumber,
        consentGiven: true
        });
    if (res.status !== 202) console.error('Registration failed body:', res.body);
    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.visitor.name).toBe('Alice Smith');
    expect(res.body.visitor.consentGiven).toBe(true);
    expect(res.body.visitor.consentTimestamp).toBeDefined();
    expect(res.body.visitor.idNumberHash).toBe(crypto.createHash('sha256').update(idProofNumber).digest('hex'));

    const log = await VisitorLog.findOne({ visitorId: res.body.visitor._id });
    expect(log).toBeDefined();
    expect(log?.event).toBe('Registered');
  });

  it('APPROVAL_AGENT: should update status if approved by STAFF', async () => {
    const visitor = await Visitor.create({
      tenantId: testTenant._id,
      name: 'Bob Jones',
      phone: '9988776655',
      email: 'bob@jones.com',
      hostName: 'Reception',
      purpose: 'Meeting',
      status: 'SENT_FOR_APPROVAL'
    });

    const res = await request(app)
      .put(`/api/visitors/${visitor._id}/status_staff`)
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(200);
    // Controller currently grants approval if any authorized user acts
    expect(res.body.visitor.status).toBe('APPROVED');
  });

  it('APPROVAL_AGENT: should grant final approval if acted by ADMIN', async () => {
    const visitor = await Visitor.create({
      tenantId: testTenant._id,
      name: 'Charlie Brown',
      phone: '5544332211',
      email: 'charlie@brown.com',
      hostName: 'Admin',
      purpose: 'VIP Visit',
      status: 'SENT_FOR_APPROVAL'
    });

    const res = await request(app)
      .put(`/api/visitors/${visitor._id}/status_admin`)
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(200);
    // ADMIN can grant final approval
    expect(res.body.visitor.status).toBe('APPROVED');
  });
});
