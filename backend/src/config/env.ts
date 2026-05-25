import dotenv from 'dotenv';

// Load environment variables from .env file
const result = dotenv.config();

const requiredEnv = ['MONGODB_URI', 'JWT_SECRET'];
const requiredInProd = ['LICENSE_SECRET', 'ENCRYPTION_KEY'];

export const validateEnv = () => {
  const missing = requiredEnv.filter(key => {
    const val = process.env[key];
    return !val || val.trim() === '';
  });
  
  if (missing.length > 0) {
    console.error('-------------------------------------------------');
    console.error('❌ CRITICAL ERROR: Missing Environment Variables');
    console.error('-------------------------------------------------');
    missing.forEach(key => console.error(` - ${key}`));
    console.error('\nCheck your .env file or environment configuration.');
    console.error('-------------------------------------------------\n');
    process.exit(1);
  }

  // Production-only required vars
  if (process.env.NODE_ENV === 'production') {
    const missingProd = requiredInProd.filter(key => {
      const val = process.env[key];
      return !val || val.trim() === '';
    });
    if (missingProd.length > 0) {
      console.error('❌ CRITICAL: Missing production-required variables:');
      missingProd.forEach(key => console.error(` - ${key}`));
      process.exit(1);
    }
  } else {
    // Warn in dev if security keys are missing
    requiredInProd.forEach(key => {
      if (!process.env[key]) {
        console.warn(`[ENV] WARNING: ${key} not set — using insecure default. Set this in production.`);
      }
    });
  }
};
