import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/**/*.spec.ts', 'src/tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/ng-vms-test?directConnection=true',
      JWT_SECRET: 'test-jwt-secret-key-that-is-very-long-and-secure',
      REDIS_URL: 'redis://127.0.0.1:6379',
      SKIP_HW_LOCK: 'true',
    }
  },
});
