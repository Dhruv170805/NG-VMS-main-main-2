import { IVisitor } from '../models/Visitor';

export type ActionType = 'GATE_IN' | 'MEET_IN' | 'MEET_OUT' | 'GATE_OUT' | 'APPROVED' | 'REJECTED' | 'DENIED' | 'SENT_FOR_APPROVAL' | 'EXPORT' | 'SECURITY_ALERT';

export interface InvariantResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Sovereign Policy Engine (AETHER)
 * Externalizes hardcoded business logic and RBAC into pure, testable invariants.
 */
export class PolicyEngine {
  private static readonly ROLE_PERMISSIONS: Record<string, ActionType[]> = {
    'ADMIN': ['GATE_IN', 'MEET_IN', 'MEET_OUT', 'GATE_OUT', 'APPROVED', 'REJECTED', 'DENIED', 'SENT_FOR_APPROVAL', 'EXPORT', 'SECURITY_ALERT'],
    'GUARD': ['GATE_IN', 'GATE_OUT', 'SENT_FOR_APPROVAL', 'SECURITY_ALERT'],
    'STAFF': ['APPROVED', 'REJECTED', 'DENIED', 'MEET_IN', 'MEET_OUT']
  };

  /**
   * Proves whether an action is semantically valid based on system state and user role.
   */
  static prove(action: ActionType, visitor: any, user?: { id: string, role: string }): InvariantResult {
    // 1. RBAC Invariant
    if (user) {
      const allowedActions = this.ROLE_PERMISSIONS[user.role] || [];
      if (!allowedActions.includes(action)) {
        return { allowed: false, reason: `RBAC Violation: Role ${user.role} is not authorized for ${action}.` };
      }
    }

    const currentStatus = visitor.status;
    
    // 2. Status Transition Safety Invariant
    if (action === 'GATE_IN') {
      if (currentStatus !== 'APPROVED') {
        return { allowed: false, reason: `Invalid Transition: Cannot GATE_IN from ${currentStatus}. Expected APPROVED.` };
      }
    }

    if (action === 'GATE_OUT') {
      const activeStates = ['GATE_IN', 'MEET_OUT'];
      if (!activeStates.includes(currentStatus)) {
        return { allowed: false, reason: `Invalid Transition: Cannot GATE_OUT from ${currentStatus}. Expected GATE_IN or MEET_OUT.` };
      }
    }

    if (action === 'MEET_IN' && currentStatus !== 'GATE_IN') {
      return { allowed: false, reason: 'Invalid Transition: Must be GATE_IN to enter meeting.' };
    }

    if (action === 'MEET_OUT' && currentStatus !== 'MEET_IN') {
      return { allowed: false, reason: 'Invalid Transition: Must be MEET_IN to exit meeting.' };
    }

    // 3. Security / Blacklist Safety Invariant
    if (visitor.isBlacklisted && !['DENIED', 'SENT_FOR_APPROVAL'].includes(action)) {
      return { allowed: false, reason: 'Security Invariant: Cannot perform critical actions on blacklisted entities.' };
    }

    return { allowed: true };
  }

  /**
   * Verhoeff algorithm check for Aadhaar validity.
   */
  private static verhoeffCheck(id: string): boolean {
    const d = [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
      [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
      [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
      [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
      [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
      [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
      [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
      [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
      [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
    ];
    const p = [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
      [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
      [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
      [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
      [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
      [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
      [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
    ];
    const inv = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

    let c = 0;
    const invertedArray = id.split('').map(Number).reverse();

    for (let i = 0; i < invertedArray.length; i++) {
      c = d[c][p[i % 8][invertedArray[i]]];
    }

    return c === 0;
  }

  /**
   * Proves the semantic validity of an Aadhaar number.
   * Verifies it is exactly 12 digits and follows the Verhoeff algorithm.
   */
  static validateIdentity(idNumber: string): InvariantResult {
    const clean = idNumber.replace(/\s/g, '');
    if (!/^\d{12}$/.test(clean)) {
      return { allowed: false, reason: 'Identity Invariant: Aadhaar must be exactly 12 digits.' };
    }
    
    if (!this.verhoeffCheck(clean)) {
      return { allowed: false, reason: 'Identity Invariant: Invalid Aadhaar number (Checksum failure).' };
    }

    return { allowed: true };
  }
}