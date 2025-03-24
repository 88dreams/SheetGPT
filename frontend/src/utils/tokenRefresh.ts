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
 * Check if token is expired or will expire soon
 */
export function isTokenExpiredOrExpiringSoon(): boolean {
  const token = getToken();
  if (!token) return true;
  
  try {
    // Decode JWT token (simple decode, not validation)
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Current time in seconds
    const now = Math.floor(Date.now() / 1000);
    
    // Check if token is expired or will expire soon
    return payload.exp < (now + REFRESH_WINDOW);
  } catch (error) {
    console.error('Error checking token expiration:', error);
    // If we can't decode the token, consider it expired
    return true;
  }
}

/**
 * Decode JWT token to get information
 */
export function decodeToken(token: string): JwtToken | null {
  if (!token) return null;
  
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

/**
 * Calculate token expiry time in minutes
 */
export function getTokenExpiryMinutes(): number | null {
  const token = getToken();
  if (!token) return null;
  
  try {
    const payload = decodeToken(token);
    if (!payload) return null;
    
    const now = Math.floor(Date.now() / 1000);
    const expiryInSeconds = payload.exp - now;
    
    return Math.max(0, Math.floor(expiryInSeconds / 60));
  } catch (error) {
    console.error('Error calculating token expiry:', error);
    return null;
  }
}

/**
 * Get API URL safely across different environments
 */
function getApiUrl(): string {
  // Handle both browser and test environments safely
  let apiUrl = 'http://localhost:8000'; // Default value
  
  try {
    // Only attempt to access import.meta in a browser environment
    if (typeof window !== 'undefined') {
      try {
        // Using direct property access instead of optional chaining
        const envUrl = import.meta.env.VITE_API_URL;
        if (envUrl) {
          apiUrl = envUrl;
        }
      } catch (innerError) {
        // This is a safe fallback if import.meta is not available
        console.log('Import.meta not available in tokenRefresh, using default API URL');
      }
    }
  } catch (error) {
    console.log('Running in non-browser environment, using default API URL');
  }
  
  return apiUrl;
}

/**
 * Refresh auth token
 * Returns a promise that resolves to true if refresh was successful
 */
export async function refreshAuthToken(): Promise<boolean> {
  try {
    // Only try to refresh if we have an existing token
    const existingToken = getToken();
    if (!existingToken) {
      console.log('No token to refresh');
      return false;
    }
    
    console.log('Attempting to refresh auth token');
    
    // Get API URL safely
    const API_URL = getApiUrl();
      
    const response = await axios({
      method: 'post',
      url: `${API_URL}/api/v1/auth/refresh`,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${existingToken}`
      }
    });
    
    if (response.data && response.data.access_token) {
      console.log('Token refresh successful');
      setToken(response.data.access_token);
      return true;
    } else {
      console.warn('Token refresh response missing access_token');
      return false;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    // Remove invalid token
    removeToken();
    return false;
  }
}

/**
 * Check token status and refresh if needed before a critical operation
 * Returns true if token is valid (either existing or newly refreshed)
 */
export async function ensureValidToken(): Promise<boolean> {
  // Check if token is missing or expiring soon
  if (isTokenExpiredOrExpiringSoon()) {
    console.log('Token expired or expiring soon, attempting refresh');
    return await refreshAuthToken();
  }
  
  // Token is valid and not expiring soon
  return true;
}