/**
 * Auth Refresh Service
 * Handles automatic token refresh and permission sync
 */

import { getToken, storeToken, shouldRefreshToken, isTokenExpired, getTimeUntilExpiry } from './token-manager';
import { getUserData, storeUserData, isPermissionCacheValid, clearPermissionCache } from './permission-manager';
import apiCall from './api';

interface RefreshResponse {
  status: string;
  message: string;
  data: {
    token: string;
    user: any;
  };
}

let refreshPromise: Promise<string> | null = null;
let refreshTimer: NodeJS.Timeout | null = null;
let permissionSyncTimer: NodeJS.Timeout | null = null;

/**
 * Refresh the authentication token
 * Returns a promise that resolves to the new token
 */
export async function refreshAuthToken(): Promise<string> {
  // If a refresh is already in progress, return that promise
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const currentToken = getToken();
      if (!currentToken) {
        throw new Error('No token to refresh');
      }

      const userData = getUserData();
      if (!userData?.id) {
        // No user data available, return current token
        return currentToken;
      }

      // Call the users endpoint to verify the token is still valid
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/users/${userData.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      // If the API returns a new token, store it
      // Otherwise, the token is still valid (Sanctum tokens don't expire by default)
      if (data.data?.token) {
        storeToken(data.data.token);
        return data.data.token;
      }

      // If no new token, the current one is still valid
      return currentToken;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Token refresh skipped:', error);
      }
      // Return current token on failure - background refresh shouldn't break the app
      const currentToken = getToken();
      if (currentToken) return currentToken;
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Sync permissions from the server
 * Note: This is a background sync feature - errors are silenced to not disrupt the user experience
 */
export async function syncPermissions(): Promise<void> {
  try {
    const userData = getUserData();
    if (!userData || !userData.id) return;

    // Fetch fresh user data including permissions using the users endpoint
    const response = await apiCall<RefreshResponse>(`/users/${userData.id}`, 'GET', undefined, true);

    if (response.status === 'success' && response.data?.user) {
      // Update user data with fresh permissions
      storeUserData(response.data.user);
    }
  } catch (error) {
    // Silently fail - this is a background sync feature
    // The user can continue using the app with cached permissions
    if (process.env.NODE_ENV === 'development') {
      console.debug('Permission sync skipped:', error);
    }
  }
}

/**
 * Start automatic token refresh
 * Monitors token expiration and refreshes proactively
 */
export function startTokenRefreshMonitor(): void {
  // Clear any existing timer
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  const checkAndRefresh = async () => {
    try {
      // If token is expired, trigger logout (handled by auth context)
      if (isTokenExpired()) {
        stopTokenRefreshMonitor();
        return;
      }

      // If token should be refreshed (within threshold), refresh it
      if (shouldRefreshToken()) {
        await refreshAuthToken();
      }
    } catch (error) {
      console.error('Token refresh check failed:', error);
    }
  };

  // Check every 2 minutes
  refreshTimer = setInterval(checkAndRefresh, 2 * 60 * 1000);

  // Also check immediately
  checkAndRefresh();
}

/**
 * Stop automatic token refresh
 */
export function stopTokenRefreshMonitor(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

/**
 * Start automatic permission sync
 * Keeps permissions fresh without disrupting user experience
 */
export function startPermissionSync(): void {
  // Clear any existing timer
  if (permissionSyncTimer) {
    clearInterval(permissionSyncTimer);
  }

  const checkAndSync = async () => {
    try {
      const userData = getUserData();
      if (!userData) return;

      // If permission cache is invalid, sync permissions
      if (!isPermissionCacheValid(userData.id)) {
        await syncPermissions();
      }
    } catch (error) {
      console.error('Permission sync check failed:', error);
    }
  };

  // Sync every 10 minutes
  permissionSyncTimer = setInterval(checkAndSync, 10 * 60 * 1000);

  // Also check immediately if cache is invalid
  checkAndSync();
}

/**
 * Stop automatic permission sync
 */
export function stopPermissionSync(): void {
  if (permissionSyncTimer) {
    clearInterval(permissionSyncTimer);
    permissionSyncTimer = null;
  }
}

/**
 * Initialize auth monitoring (token refresh + permission sync)
 * Call this when user logs in
 */
export function initializeAuthMonitoring(): void {
  startTokenRefreshMonitor();
  startPermissionSync();
}

/**
 * Cleanup auth monitoring
 * Call this when user logs out
 */
export function cleanupAuthMonitoring(): void {
  stopTokenRefreshMonitor();
  stopPermissionSync();
  clearPermissionCache();
}

/**
 * Get authentication status for debugging
 */
export function getAuthStatus() {
  return {
    tokenExpired: isTokenExpired(),
    shouldRefresh: shouldRefreshToken(),
    timeUntilExpiry: getTimeUntilExpiry(),
    hasToken: !!getToken(),
    hasUserData: !!getUserData(),
    monitoringActive: !!refreshTimer,
    syncActive: !!permissionSyncTimer,
  };
}
