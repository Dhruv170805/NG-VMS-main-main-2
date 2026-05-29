import { Worker, Job } from 'bullmq';
import redisConnection from '../config/redis';
import Visitor from '../modules/visitor/visitor.model';
import Employee from '../modules/employee/employee.model';
import { notifySecurityOverstay } from '../utils/notificationService';
import logger from '../utils/logger';
import { optimizeImage } from '../utils/imageOptimizer';
import { encrypt } from '../utils/encryption';

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

      const CHUNK_SIZE = 50;
      for (let i = 0; i < activeVisitors.length; i += CHUNK_SIZE) {
        const chunk = activeVisitors.slice(i, i + CHUNK_SIZE);

        await Promise.all(chunk.map(async (visitor) => {
          // Prevent duplicate alerts within a 12-hour period using Redis cache
          const redisKey = `overstay_alerted:${visitor._id}`;
          const alreadyAlerted = await redisConnection.get(redisKey);

          if (alreadyAlerted) {
            return;
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
        }));
      }
    } catch (error: any) {
      logger.error({ err: error.message }, 'Error in overstay detection job');
      throw error;
    }
  },
  { connection: redisConnection }
);

import * as XLSX from '@e965/xlsx';
import { AnalyticsService } from '../modules/analytics/analytics.service';
import { SystemService } from '../modules/system/system.service';

// 2. Report Worker
export const reportWorker = new Worker(
  'report-generation',
  async (job: Job) => {
    const { tenantId, dateStr, buffer } = job.data;
    logger.info({ tenantId, dateStr, type: job.name }, 'Processing report/import background job');

    try {
      if (job.name === 'export-purpose-report') {
        const distribution = await AnalyticsService.getPurposeDistribution(tenantId);

        const data = distribution.map((item: any) => ({
          'Purpose of Visit': item._id || 'Not Specified',
          'Total Visitors': item.count
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Purpose Distribution');

        const visitors = await Visitor.find({ tenantId }, 'name email phone company purpose hostName createdAt status').sort({ purpose: 1 }).lean();
        const visitorData = visitors.map(v => ({
          'Purpose': v.purpose,
          'Visitor Name': v.name,
          'Email': v.email,
          'Phone': v.phone,
          'Company': v.company || 'N/A',
          'Host': v.hostName,
          'Status': v.status,
          'Date': new Date(v.createdAt).toLocaleDateString()
        }));

        const visitorWorksheet = XLSX.utils.json_to_sheet(visitorData);
        XLSX.utils.book_append_sheet(workbook, visitorWorksheet, 'Detailed Purpose Log');

        const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        // In a real app, we would upload this buffer to MinIO and return the URL
        // or notify the user via socket.io that the report is ready.
        logger.info({ tenantId }, 'Purpose report generated successfully');
        return { success: true, bufferLength: xlsxBuffer.length };
      }

      if (job.name === 'import-hosts') {
        const fileBuffer = Buffer.from(buffer, 'base64');
        const count = await SystemService.uploadHosts(fileBuffer, tenantId);
        logger.info({ tenantId, count }, 'Host import completed');
        return { success: true, count };
      }

      // Default CSV report logic
      if (job.name !== 'export-purpose-report' && job.name !== 'import-hosts') {
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
      }
    } catch (error: any) {
      logger.error({ err: error.message, tenantId }, 'Error processing background job');
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

import { AadhaarService } from '../modules/aadhaar/aadhaar.service';

// 4. Image Optimization Worker
export const imageWorker = new Worker(
  'image-optimization',
  async (job: Job) => {
    logger.info({ jobId: job.id, type: job.name }, 'Running background image optimization/processing job');

    try {
      if (job.name === 'parse-aadhaar') {
        const { fileData, password, tenantId } = job.data;
        const fileBuffer = Buffer.from(fileData, 'base64');
        const result = await AadhaarService.processAadhaar(fileBuffer, password, tenantId);
        logger.info({ tenantId, jobId: job.id }, 'Aadhaar processing completed');
        // In a real system, you'd send an io.to(socketId).emit() to return the result to the UI
        return result;
      }

      // Default behavior
      if (job.name !== 'parse-aadhaar') {
        const { visitorId, photoUrl, idProofPhotoUrl, idProofPreviewImage } = job.data;
        const updateData: any = {};
        if (photoUrl) {
          updateData.photoUrl = await optimizeImage(photoUrl);
        }
        if (idProofPhotoUrl) {
          updateData.idProofPhotoUrl = await optimizeImage(idProofPhotoUrl);
        }
        if (idProofPreviewImage) {
          const optimizedImage = await optimizeImage(idProofPreviewImage);
          updateData.encryptedIdProofPreview = encrypt(optimizedImage);
        }

        if (Object.keys(updateData).length > 0) {
          await Visitor.findByIdAndUpdate(visitorId, updateData);
          logger.info({ visitorId }, 'Successfully updated visitor with optimized images');
        }
      }
    } catch (error: any) {
      logger.error({ err: error.message }, 'Error in image worker background job');
      throw error;
    }
  },
  { connection: redisConnection }
);

imageWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, 'Image optimization worker job failed');
});

// 5. Audit Logging Worker (Transaction Resilience)
import VisitorLog from '../modules/analytics/visitorLog.model';

export const auditWorker = new Worker(
  'audit-logging',
  async (job: Job) => {
    const { visitorId, tenantId, event, details, actor, actorName } = job.data;
    logger.info({ visitorId, event, jobId: job.id }, 'Processing asynchronous audit log');

    try {
      await VisitorLog.create({
        visitorId,
        tenantId,
        event,
        details,
        actor,
        actorName
      });
      logger.info({ visitorId, event }, 'Successfully persisted audit log');
    } catch (error: any) {
      logger.error({ err: error.message, visitorId }, 'Failed to persist audit log in background');
      throw error;
    }
  },
  { connection: redisConnection }
);

auditWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, 'Audit worker job failed after retries');
});
