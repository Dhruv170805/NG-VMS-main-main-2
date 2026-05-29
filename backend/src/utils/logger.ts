import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'password', 'token', 'refreshToken', 'authorization', 'email', 
      'phone', 'idProofNumber', 'photoUrl', 'idProofPhotoUrl', 
      'encryptedIdProofPreview', 'visitor.email', 'visitor.phone', 
      'visitor.idProofNumber', 'host.email', 'host.phone'
    ],
    censor: '[REDACTED_PII]',
  },
  transport: !isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

export default logger;
