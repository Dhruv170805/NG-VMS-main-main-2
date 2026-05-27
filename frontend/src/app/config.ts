/**
 * NG-VMS API Configuration
 * ─────────────────────────────────────────────────────────────
 * Handles 3 deployment environments automatically:
 *   1. .env override  → NEXT_PUBLIC_API_URL (highest priority)
 *   2. Local dev      → any localhost/LAN port → backend on configured port
 *   3. Production/IIS → same origin as frontend (reverse proxy)
 * ─────────────────────────────────────────────────────────────
 */

const isBrowser = typeof window !== 'undefined';

// ── Configuration Variables (Configurable via env vars, with defaults) ──────
const BACKEND_PORT = process.env.NEXT_PUBLIC_BACKEND_PORT || '5000';
const API_PATH = process.env.NEXT_PUBLIC_API_PATH || '/api/v1';

/**
 * Checks if the hostname represents a local development host or LAN IP.
 */
const isLocalHostname = (hostname: string): boolean => {
  // Loopback and standard dev hosts
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]'
  ) {
    return true;
  }

  // Local/Private domain extensions
  if (
    hostname.endsWith('.local') ||
    hostname.endsWith('.lan') ||
    hostname.endsWith('.home') ||
    hostname.endsWith('.internal')
  ) {
    return true;
  }

  // IPv4 Private Networks:
  // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
  const ipv4Pattern = /^(?:10|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d+\.\d+\.\d+$/;
  if (ipv4Pattern.test(hostname)) {
    return true;
  }

  // IPv6 Link-Local / Unique Local (ULA)
  const ipv6Pattern = /^(?:[fF][eE]80|[fF][cCdD][0-9a-fA-F]{2}):/;
  if (ipv6Pattern.test(hostname)) {
    return true;
  }

  return false;
};

/**
 * Returns the base API URL. Safe to call during SSR and in browser.
 */
const getApiUrl = (): string => {
  // ── 1. Explicit env override (Docker, CI, cloud deployments) ──────────────
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // ── 2. SSR fallback (Next.js server render — no window) ───────────────────
  if (!isBrowser) {
    return `http://localhost:${BACKEND_PORT}${API_PATH}`;
  }

  const { hostname } = window.location;

  // ── 3. Local development (any port on localhost or LAN) ────────────────────
  if (isLocalHostname(hostname)) {
    return `http://${hostname}:${BACKEND_PORT}${API_PATH}`;
  }

  // ── 4. Production / LAN / IIS deployment ──────────────────────────────────
  // Backend is reverse-proxied through the same host (IIS ARR / Caddy / Nginx)
  return `${window.location.origin}${API_PATH}`;
};

/**
 * Returns the WebSocket URL. Mirrors the API URL logic.
 */
const getSocketUrl = (): string => {
  // ── 1. Explicit env override ───────────────────────────────────────────────
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }

  // ── 2. SSR fallback ───────────────────────────────────────────────────────
  if (!isBrowser) {
    return `http://localhost:${BACKEND_PORT}`;
  }

  const { hostname } = window.location;

  // ── 3. Local development ───────────────────────────────────────────────────
  if (isLocalHostname(hostname)) {
    return `http://${hostname}:${BACKEND_PORT}`;
  }

  // ── 4. Production / LAN ───────────────────────────────────────────────────
  return window.location.origin;
};

// Resolved at module load time. Since getApiUrl() always returns a valid
// URL base, API_BASE_URL will NEVER be undefined.
const API_BASE_URL = getApiUrl();
const SOCKET_URL = getSocketUrl();

/**
 * Resolves the pathname of the base API URL (e.g. "/api/v1").
 */
const getBasePathname = (): string => {
  if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
    try {
      return new URL(API_BASE_URL).pathname.replace(/\/+$/, '');
    } catch (e) {
      return API_PATH;
    }
  }
  return API_BASE_URL.replace(/\/+$/, '');
};

/**
 * Safely builds a full API URL with optional query parameters.
 *
 * Resolves the path relative to the base URL or the current window location
 * if the base URL is relative. Safe to call during SSR and in browser.
 */
export const buildUrl = (
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined | null>
): string => {
  let resolvedUrl: string;

  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    resolvedUrl = endpoint;
  } else {
    const base = API_BASE_URL.replace(/\/+$/, '');
    const basePathname = getBasePathname();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    let path: string;
    if (basePathname && cleanEndpoint.startsWith(basePathname)) {
      if (base.startsWith('http://') || base.startsWith('https://')) {
        try {
          const origin = new URL(base).origin;
          path = `${origin}${cleanEndpoint}`;
        } catch (e) {
          path = cleanEndpoint;
        }
      } else {
        path = cleanEndpoint;
      }
    } else {
      path = `${base}${cleanEndpoint}`;
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
      resolvedUrl = path;
    } else {
      const origin = typeof window !== 'undefined' ? window.location.origin : `http://localhost:${BACKEND_PORT}`;
      resolvedUrl = `${origin.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
    }
  }

  const url = new URL(resolvedUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
};

// ── Exported configuration object ────────────────────────────────────────────
export const API_CONFIG = {
  /** Base API base URL (e.g. http://localhost:5000/api/v1) */
  BASE_URL: API_BASE_URL,

  /** WebSocket server URL */
  SOCKET_URL: SOCKET_URL,

  /** Pre-built endpoint strings — resolved base paths, ready to use in fetch() */
  ENDPOINTS: {
    VISITORS:  `${API_BASE_URL}/visitors`,
    SYSTEM:    `${API_BASE_URL}/system`,
    AUTH:      `${API_BASE_URL}/auth`,
    ANALYTICS: `${API_BASE_URL}/analytics`,
    EMPLOYEES: `${API_BASE_URL}/employees`,
    GATE:      `${API_BASE_URL}/gate`,
    HANDOVER:  `${API_BASE_URL}/handover`,
    BLACKLIST: `${API_BASE_URL}/blacklist`,
    AADHAAR:   `${API_BASE_URL}/aadhaar`,
  },
} as const;
