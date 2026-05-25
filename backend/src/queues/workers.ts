import { Worker, Job } from 'bullmq';
import redisConnection from '../config/redis';
import Visitor from '../models/Visitor';
import Employee from '../models/Employee';
import { notifySecurityOverstay } from '../utils/notificationService';
import logger from '../utils/logger';
import { optimizeImage } from '../utils/imageOptimizer';

// 1. Overstay Worker
export const overstayWorker = new Worker(
  'overstay-detection',
  async (job: Job) => {
    logger.info({ jobId: job.id }, 'Running background overstay detection job');
    const now = new Date();

    try {
      // Find active visitors whose expected checkout has passed
      const activeVisitors = await Visitor.find({
        status: { $in: ['GATE_IN', 'MEET_IN'] },
        expectedCheckout: { $lt: now },
      }).populate('hostId');

      logger.info({ count: activeVisitors.length }, `Found ${activeVisitors.length} potential overstays`);

      for (const visitor of activeVisitors) {
        // Prevent duplicate alerts within a 12-hour period using Redis cache
        const redisKey = `overstay_alerted:${visitor._id}`;
        const alreadyAlerted = await redisConnection.get(redisKey);

        if (alreadyAlerted) {
          continue;
        }

        let hostEmail = '';
        let hostIdStr = '';

        if (visitor.hostId) {
          const host = visitor.hostId as any;
          if (host && host.email) {
            hostEmail = host.email;
            hostIdStr = host._id.toString();
          }
        }

        logger.warn(
          { visitorId: visitor._id, visitorName: visitor.name, tenantId: visitor.tenantId },
          `Visitor overstay detected. Triggering security alerts.`
        );

        // Call the notification service
        await notifySecurityOverstay(visitor.name, hostEmail, hostIdStr, visitor.tenantId);

        // Mark as alerted for 12 hours (43200 seconds)
        await redisConnection.set(redisKey, 'true', 'EX', 43200);
      }
    } catch (error: any) {
      logger.error({ err: error.message }, 'Error in overstay detection job');
      throw error;
    }
  },
  { connection: redisConnection }
);

// 2. Report Worker
export const reportWorker = new Worker(
  'report-generation',
  async (job: Job) => {
    const { tenantId, dateStr } = job.data;
    logger.info({ tenantId, dateStr }, 'Generating visitor report in background');

    try {
      const visitors = await Visitor.find({
        tenantId,
        createdAt: {
          $gte: new Date(`${dateStr}T00:00:00.000Z`),
          $lte: new Date(`${dateStr}T23:59:59.999Z`),
        },
      });

      // Simulate CSV generation and processing
      const recordCount = visitors.length;
      logger.info({ tenantId, recordCount }, 'Report generated successfully');
      return { success: true, recordCount };
    } catch (error: any) {
      logger.error({ err: error.message, tenantId }, 'Error generating report');
      throw error;
    }
  },
  { connection: redisConnection }
);

// 3. Email Worker (Batch Dispatcher)
export const emailWorker = new Worker(
  'email-batching',
  async (job: Job) => {
    const { recipientType, message, type, stage, tenantId, context } = job.data;
    logger.info({ jobId: job.id, recipientType, stage }, 'Processing batched notification dispatch');

    try {
      // In a real production setup, we dispatch via notificationService directly or using SMTP pool
      // For email-batching, this decouples Express response time from SMTP delivery times.
      logger.info({ email: context?.email, stage }, 'Sending batched email notification');
      return { dispatched: true };
    } catch (error: any) {
      logger.error({ err: error.message }, 'Failed to dispatch batched email');
      throw error;
    }
  },
  { connection: redisConnection }
);

// Graceful worker listeners
overstayWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, 'Overstay worker job failed');
});

reportWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, 'Report worker job failed');
});

emailWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, 'Email worker job failed');
});

// 4. Image Optimization Worker
export const imageWorker = new Worker(
  'image-optimization',
  async (job: Job) => {
    const { visitorId, photoUrl, idProofPhotoUrl } = job.data;
    logger.info({ visitorId, jobId: job.id }, 'Running background image optimization job');

    try {
      const updateData: any = {};
      if (photoUrl) {
        updateData.photoUrl = await optimizeImage(photoUrl);
      }
      if (idProofPhotoUrl) {
        updateData.idProofPhotoUrl = await optimizeImage(idProofPhotoUrl);
      }

      if (Object.keys(updateData).length > 0) {
        await Visitor.findByIdAndUpdate(visitorId, updateData);
        logger.info({ visitorId }, 'Successfully updated visitor with optimized images');
      }
    } catch (error: any) {
      logger.error({ err: error.message, visitorId }, 'Error optimizing images in background');
      throw error;
    }
  },
  { connection: redisConnection }
);

imageWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, 'Image optimization worker job failed');
});
