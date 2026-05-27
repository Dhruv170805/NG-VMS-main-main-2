import mongoose from 'mongoose';
import logger from '../utils/logger';

export const connectDB = async (uri: string, maxRetries = 5): Promise<void> => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      await mongoose.connect(uri, {
        maxPoolSize: 20,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      mongoose.connection.setMaxListeners(25);
      logger.info('[NG-VMS] Connected to MongoDB');
      return;
    } catch (err: any) {
      retries++;
      logger.error(`[NG-VMS] MongoDB connection attempt ${retries} failed: ${err.message}`);
      if (retries >= maxRetries) {
        logger.error('[NG-VMS] Max retries reached. Exiting process.');
        process.exit(1);
      }
      const delay = Math.min(2000 * Math.pow(2, retries - 1), 30000);
      logger.info(`[NG-VMS] Retrying connection in ${delay / 1000} seconds...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
};
