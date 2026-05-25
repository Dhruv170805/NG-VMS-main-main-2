import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import logger from '../utils/logger';

export const overstayQueue = new Queue('overstay-detection', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 1000,
  },
});

export const reportQueue = new Queue('report-generation', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 1000,
  },
});

export const emailQueue = new Queue('email-batching', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 1000,
  },
});

export const imageQueue = new Queue('image-optimization', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 1000,
  },
});

// Import workers to ensure they are loaded and listening to queues
import './workers';

export const initQueues = async () => {
  try {
    // Clean up existing repeatable jobs to avoid duplicates
    const repeatableJobs = await overstayQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await overstayQueue.removeRepeatableByKey(job.key);
    }

    // Add repeatable job to run every hour
    await overstayQueue.add(
      'hourly-scan',
      {},
      {
        repeat: {
          pattern: '0 * * * *', // every hour
        },
      }
    );

    // Run an immediate scan on server start
    await overstayQueue.add('startup-scan', {});
    logger.info('[QUEUES] Overstay background scanner scheduled');
  } catch (error: any) {
    logger.error({ err: error.message }, '[QUEUES] Failed to initialize queues');
  }
};
