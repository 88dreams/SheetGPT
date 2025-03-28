import { useState, useCallback, useEffect } from 'react';
import { loadGoogleDrivePickerApi, openGoogleDrivePicker } from '../utils/drivePickerUtils';
import { api } from '../utils/api';

// Google API configuration
// In a real app, these would come from environment variables
const GOOGLE_API_KEY = 'your-google-api-key'; // Should be replaced with actual API key from environment

interface GoogleDriveState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useGoogleDrive() {
  const [state, setState] = useState<GoogleDriveState>({
    isAuthenticated: false,
    isLoading: true,
    error: null
  });
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isPickerLoaded, setIsPickerLoaded] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthentication();
  }, []);

  // Load picker API when needed
  const loadPicker = useCallback(async () => {
    if (isPickerLoaded) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      await loadGoogleDrivePickerApi(GOOGLE_API_KEY);
      setIsPickerLoaded(true);
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('Failed to load Google Drive Picker API:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Failed to load Google Drive Picker API'
      }));
    }
  }, [isPickerLoaded]);

  // Check if user is authenticated with Google
  const checkAuthentication = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const result = await api.export.getAuthStatus();
      setState(prev => ({ 
        ...prev, 
        isAuthenticated: result.authenticated, 
        isLoading: false 
      }));

      // If authenticated, load the picker
      if (result.authenticated) {
        await loadPicker();
      }
    } catch (error) {
      console.error('Failed to check Google authentication:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Failed to check Google authentication status'
      }));
    }
  }, [loadPicker]);

  // Initiate Google authentication
  const authenticate = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const result = await api.export.getAuthUrl();
      
      // Open the auth URL in a new window
      window.open(result.url, '_blank', 'width=800,height=600');
      
      // Poll for authentication status
      const checkAuthInterval = setInterval(async () => {
        const status = await api.export.getAuthStatus();
        if (status.authenticated) {
          clearInterval(checkAuthInterval);
          setState(prev => ({ ...prev, isAuthenticated: true, isLoading: false }));
          
          // Load picker after authentication
          await loadPicker();
        }
      }, 2000);
      
      // Clear interval after 2 minutes (timeout)
      setTimeout(() => {
        clearInterval(checkAuthInterval);
        if (!state.isAuthenticated) {
          setState(prev => ({ 
            ...prev, 
            isLoading: false, 
            error: 'Authentication timed out. Please try again.'
          }));
        }
      }, 120000);
    } catch (error) {
      console.error('Failed to initiate Google authentication:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Failed to initiate Google authentication'
      }));
    }
  }, [state.isAuthenticated, loadPicker]);

  // Open the Google Drive Picker
  const openPicker = useCallback((callback: (folderId: string, folderName: string) => void) => {
    if (!state.isAuthenticated) {
      setState(prev => ({ ...prev, error: 'Not authenticated with Google Drive' }));
      return;
    }

    if (!isPickerLoaded) {
      setState(prev => ({ ...prev, error: 'Google Drive Picker not loaded yet' }));
      return;
    }

    if (!accessToken) {
      setState(prev => ({ ...prev, error: 'No access token available' }));
      return;
    }

    openGoogleDrivePicker(GOOGLE_API_KEY, accessToken, callback);
  }, [state.isAuthenticated, isPickerLoaded, accessToken]);

  return {
    ...state,
    authenticate,
    openPicker,
    checkAuthentication
  };
}

export default useGoogleDrive;