import { vi } from 'vitest';

// Use a proper constructor function for MockRedis to avoid "is not a constructor" TypeError
const mockOn = vi.fn();
const mockInfo = vi.fn().mockResolvedValue('');
const mockGet = vi.fn().mockResolvedValue(null);
const mockSet = vi.fn().mockResolvedValue('OK');
const mockDel = vi.fn().mockResolvedValue(1);
const mockCall = vi.fn().mockImplementation((cmd, ...args) => {
  if (typeof cmd === 'string' && cmd.toLowerCase() === 'script') {
    return Promise.resolve('mock-sha-hash');
  }
  return Promise.resolve(0);
});
const mockQuit = vi.fn().mockResolvedValue('OK');
const mockDisconnect = vi.fn();

function MockRedis() {
  return {
    on: mockOn,
    info: mockInfo,
    get: mockGet,
    set: mockSet,
    del: mockDel,
    status: 'ready',
    call: mockCall,
    quit: mockQuit,
    disconnect: mockDisconnect,
  };
}

// Mock ioredis
vi.mock('ioredis', () => {
  return {
    default: MockRedis,
    Redis: MockRedis,
  };
});

const mockAdd = vi.fn().mockResolvedValue({ id: 'mock-job-id' });
const mockGetRepeatableJobs = vi.fn().mockResolvedValue([]);
const mockRemoveRepeatableByKey = vi.fn().mockResolvedValue(true);
const mockClose = vi.fn().mockResolvedValue(undefined);

function MockQueue() {
  return {
    add: mockAdd,
    getRepeatableJobs: mockGetRepeatableJobs,
    removeRepeatableByKey: mockRemoveRepeatableByKey,
    close: mockClose,
  };
}

function MockWorker() {
  return {
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

// Mock bullmq
vi.mock('bullmq', () => {
  return {
    Queue: MockQueue,
    Worker: MockWorker,
  };
});
