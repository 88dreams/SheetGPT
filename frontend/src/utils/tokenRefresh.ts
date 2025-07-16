import axios from 'axios';

// Avoid circular dependency by not importing from apiClient.ts
// Instead, access token directly from localStorage
const TOKEN_KEY = 'auth_token';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Time window (in seconds) before token expiry to attempt refresh
const REFRESH_WINDOW = 120; // Refresh token 2 minutes before expiry

interface JwtToken {
  exp: number; // Expiration timestamp
  sub: string; // User ID
  iat: number; // Issued at timestamp
}

/**
 * Check if token is expired or will expire soon.
 */
export function isTokenExpiredOrExpiringSoon(): boolean {
  const token = getToken();
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now + REFRESH_WINDOW;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true; // Treat as expired on decode failure
  }
}

/**
 * Decode a JWT token.
 */
export function decodeToken(token: string): JwtToken | null {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

/**
 * Calculate remaining token lifetime in minutes.
 */
export function getTokenExpiryMinutes(): number | null {
  const token = getToken();
  if (!token) return null;
  const payload = decodeToken(token);
  if (!payload) return null;

  const now = Math.floor(Date.now() / 1000);
  const expiryInSeconds = payload.exp - now;
  return Math.max(0, Math.floor(expiryInSeconds / 60));
}

/**
 * Determine the base API URL for the current environment.
 */
function getApiUrl(): string {
  // Browser environment – use relative path so that requests target
  // the same origin as the site itself (handles Netlify sub-path deploys).
  if (typeof window !== 'undefined') {
    return '';
  }

  // Non-browser contexts (SSR, tests)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) {
    return (import.meta as any).env.VITE_API_URL as string;
  }

  // Fallback
  return 'http://localhost:8000';
}

/**
 * Attempt to refresh the auth token.
 * Returns true when a new token is received and stored.
 */
export async function refreshAuthToken(): Promise<boolean> {
  const existingToken = getToken();
  if (!existingToken) return false;

  try {
    const API_URL = getApiUrl();
    const API_PREFIX = '/api/v1';

    const response = await axios.post(`${API_URL}${API_PREFIX}/auth/refresh`, null, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${existingToken}`,
      },
    });

    if (response.data?.access_token) {
      setToken(response.data.access_token);
      return true;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }

  return false;
}

/**
 * Ensure there is a valid token, refreshing it if necessary.
 */
export async function ensureValidToken(): Promise<boolean> {
  if (isTokenExpiredOrExpiringSoon()) {
    return refreshAuthToken();
  }
  return true;
}

// Rewriting file to remove potential BOM