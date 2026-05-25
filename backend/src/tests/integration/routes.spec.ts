import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server';
import { setupIntegration, teardownIntegration, testTenant, testEmployee, adminToken } from './setup';

beforeAll(async () => {
  await setupIntegration();
});

afterAll(async () => {
  await teardownIntegration();
});

describe('NG-VMS API Integration Tests', () => {
  describe('Authentication Endpoint: POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials and return tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('x-tenant-id', 'test')
        .send({
          email: 'admin@test.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.email).toBe('admin@test.com');
      
      // Verify cookies are set
      const rawCookies = res.headers['set-cookie'];
      const cookies = Array.isArray(rawCookies) ? rawCookies : (rawCookies ? [rawCookies] : []);
      expect(cookies.some((c: string) => c.startsWith('token='))).toBe(true);
      expect(cookies.some((c: string) => c.startsWith('refreshToken='))).toBe(true);
    });

    it('should return 401 for incorrect credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('x-tenant-id', 'test')
        .send({
          email: 'admin@test.com',
          password: 'WrongPassword!'
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 400 if tenant header is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Tenant identifier missing');
    });
  });

  describe('Visitor Endpoints: /api/v1/visitors', () => {
    it('should return 401 when accessing list without Authorization header', async () => {
      const res = await request(app)
        .get('/api/v1/visitors')
        .set('x-tenant-id', 'test');

      expect(res.status).toBe(401);
    });

    it('should return list of visitors when fully authorized', async () => {
      const res = await request(app)
        .get('/api/v1/visitors')
        .set('x-tenant-id', 'test')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
