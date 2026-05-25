import { vi } from 'vitest';

// Mock ioredis to prevent connection errors and hangs under testing
vi.mock('ioredis', () => {
  const MockRedis = vi.fn().mockImplementation(() => {
    return {
      on: vi.fn(),
      info: vi.fn().mockResolvedValue(''),
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      status: 'ready',
      call: vi.fn().mockResolvedValue(0), // Mock for rate-limit-redis store calls
      quit: vi.fn().mockResolvedValue('OK'),
      disconnect: vi.fn(),
    };
  });
  return {
    default: MockRedis,
    Redis: MockRedis,
  };
});

// Mock bullmq so we don't attempt background job processing or need active Redis connections
vi.mock('bullmq', () => {
  const MockQueue = vi.fn().mockImplementation(() => {
    return {
      add: vi.fn().mockResolvedValue({ id: 'mock-job-id' }),
      getRepeatableJobs: vi.fn().mockResolvedValue([]),
      removeRepeatableByKey: vi.fn().mockResolvedValue(true),
      close: vi.fn().mockResolvedValue(undefined),
    };
  });
  const MockWorker = vi.fn().mockImplementation(() => {
    return {
      on: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    };
  });
  return {
    Queue: MockQueue,
    Worker: MockWorker,
  };
});
