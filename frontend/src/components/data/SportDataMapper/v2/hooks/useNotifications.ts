import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Notification type definition
 */
export interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
  details?: string;
}

/**
 * Custom hook for managing notifications
 * 
 * This hook follows the single responsibility principle and handles
 * displaying and managing notifications with auto-dismissal.
 */
export function useNotifications() {
  const [notification, setNotification] = useState<Notification | null>(null);
  const timerRef = useRef<number | null>(null);
  
  // Clear any existing timers when component unmounts
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);
  
  /**
   * Show a notification message with optional auto-hide
   */
  const showNotification = useCallback((
    type: 'success' | 'error' | 'info', 
    message: string, 
    details?: string,
    autoDismiss: boolean = true
  ) => {
    // Clear any existing timers
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    setNotification({ type, message, details });
    
    // Auto-hide notification after appropriate time based on type
    // 3 seconds for success/info, 30 seconds for errors
    if (autoDismiss || type !== 'error') {
      const timeoutDuration = type === 'error' ? 30000 : 3000;
      timerRef.current = window.setTimeout(() => {
        setNotification(null);
        timerRef.current = null;
      }, timeoutDuration);
    }
  }, []);
  
  /**
   * Clear the current notification manually
   */
  const clearNotification = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setNotification(null);
  }, []);
  
  /**
   * Helper functions for common notification types
   */
  const notifySuccess = useCallback((message: string, details?: string) => {
    showNotification('success', message, details);
  }, [showNotification]);
  
  const notifyError = useCallback((message: string, details?: string, autoDismiss: boolean = false) => {
    showNotification('error', message, details, autoDismiss);
  }, [showNotification]);
  
  const notifyInfo = useCallback((message: string, details?: string) => {
    showNotification('info', message, details);
  }, [showNotification]);
  
  return {
    notification,
    showNotification,
    clearNotification,
    notifySuccess,
    notifyError,
    notifyInfo
  };
}

export default useNotifications;