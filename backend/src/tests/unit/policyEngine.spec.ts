import { describe, it, expect } from 'vitest';
import { PolicyEngine } from '../../utils/policyEngine';

describe('PolicyEngine - Invariants & Rules', () => {
  describe('RBAC Permissions validation', () => {
    it('should grant ADMIN access to all actions', () => {
      const admin = { id: 'admin1', role: 'ADMIN' };
      const visitor = { status: 'APPROVED' };
      
      const actions = ['GATE_IN', 'MEET_IN', 'MEET_OUT', 'GATE_OUT', 'APPROVED', 'REJECTED', 'DENIED', 'SENT_FOR_APPROVAL', 'EXPORT', 'SECURITY_ALERT'] as const;
      
      for (const action of actions) {
        // Mock status to make transitions valid for proving RBAC specifically
        const mockVisitor = {
          status: action === 'GATE_IN' ? 'APPROVED' :
                  action === 'MEET_IN' ? 'GATE_IN' :
                  action === 'MEET_OUT' ? 'MEET_IN' :
                  action === 'GATE_OUT' ? 'GATE_IN' : 'PENDING_GUARD',
          isBlacklisted: false
        };
        const res = PolicyEngine.prove(action, mockVisitor, admin);
        expect(res.allowed).toBe(true);
      }
    });

    it('should deny unauthorized actions for GUARD role', () => {
      const guard = { id: 'guard1', role: 'GUARD' };
      const visitor = { status: 'GATE_IN' };

      // Guards cannot approve meetings or export reports
      expect(PolicyEngine.prove('APPROVED', visitor, guard).allowed).toBe(false);
      expect(PolicyEngine.prove('EXPORT', visitor, guard).allowed).toBe(false);
    });

    it('should allow authorized actions for GUARD role', () => {
      const guard = { id: 'guard1', role: 'GUARD' };
      
      expect(PolicyEngine.prove('GATE_IN', { status: 'APPROVED' }, guard).allowed).toBe(true);
      expect(PolicyEngine.prove('GATE_OUT', { status: 'GATE_IN' }, guard).allowed).toBe(true);
    });
  });

  describe('Status Transition Safety checks', () => {
    it('should only allow GATE_IN if status is APPROVED', () => {
      expect(PolicyEngine.prove('GATE_IN', { status: 'APPROVED' }).allowed).toBe(true);
      expect(PolicyEngine.prove('GATE_IN', { status: 'PENDING_GUARD' }).allowed).toBe(false);
      expect(PolicyEngine.prove('GATE_IN', { status: 'GATE_OUT' }).allowed).toBe(false);
    });

    it('should only allow GATE_OUT if status is GATE_IN or MEET_OUT', () => {
      expect(PolicyEngine.prove('GATE_OUT', { status: 'GATE_IN' }).allowed).toBe(true);
      expect(PolicyEngine.prove('GATE_OUT', { status: 'MEET_OUT' }).allowed).toBe(true);
      expect(PolicyEngine.prove('GATE_OUT', { status: 'APPROVED' }).allowed).toBe(false);
    });

    it('should only allow MEET_IN if status is GATE_IN', () => {
      expect(PolicyEngine.prove('MEET_IN', { status: 'GATE_IN' }).allowed).toBe(true);
      expect(PolicyEngine.prove('MEET_IN', { status: 'APPROVED' }).allowed).toBe(false);
    });
  });

  describe('Blacklist Safety checks', () => {
    it('should reject critical actions if visitor is blacklisted', () => {
      const visitor = { status: 'APPROVED', isBlacklisted: true };
      const user = { id: 'admin', role: 'ADMIN' };
      
      expect(PolicyEngine.prove('GATE_IN', visitor, user).allowed).toBe(false);
    });
  });

  describe('Aadhaar verifications', () => {
    it('should validate format of 12 digit numbers', () => {
      expect(PolicyEngine.validateIdentity('12345678901').allowed).toBe(false); // 11 digits
      expect(PolicyEngine.validateIdentity('1234567890123').allowed).toBe(false); // 13 digits
      expect(PolicyEngine.validateIdentity('abc123456789').allowed).toBe(false); // letters
    });

    it('should validate correct Verhoeff checksums', () => {
      let validAadhaar = '';
      for (let i = 0; i <= 9; i++) {
        const candidate = `99999999999${i}`;
        if (PolicyEngine.validateIdentity(candidate).allowed) {
          validAadhaar = candidate;
          break;
        }
      }
      expect(validAadhaar).not.toBe('');
      expect(PolicyEngine.validateIdentity(validAadhaar).allowed).toBe(true);
      
      const lastDigit = Number(validAadhaar.slice(-1));
      const invalidLastDigit = (lastDigit + 1) % 10;
      const invalidAadhaar = validAadhaar.slice(0, -1) + invalidLastDigit;
      expect(PolicyEngine.validateIdentity(invalidAadhaar).allowed).toBe(false);
    });
  });
});
