const NEXT_PUBLIC_API_URL = '/api/v1';
const base = NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
const API_CONFIG = { ENDPOINTS: { AUTH: `${base}/auth` } };
console.log(`${API_CONFIG.ENDPOINTS.AUTH}/login`);
