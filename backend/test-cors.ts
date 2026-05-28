import dotenv from 'dotenv';
dotenv.config();

const origin = 'http://www.vms.rc2:1708';
const EXTRA_ALLOWED_ORIGINS = origin;
const extraOrigins = EXTRA_ALLOWED_ORIGINS ? EXTRA_ALLOWED_ORIGINS.split(',') : [];

const allowedOrigins = new Set(
  [
    'http://localhost:3000',
    ...extraOrigins,
  ].filter(Boolean)
);

console.log("Allowed Origins:", Array.from(allowedOrigins));
console.log("Has origin?", allowedOrigins.has(origin));
