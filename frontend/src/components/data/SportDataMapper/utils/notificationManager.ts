import { useState, useCallback, useRef, useEffect } from 'react';

export interface NotificationType {
  type: 'success' | 'error' | 'info';
  message: string;
  details?: string;
}

/**
 * Custom hook for managing notifications
 */
export const useNotificationManager = () => {
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const timerRef = useRef<number | null>(null);
  
  // Clear any existing timers when component unmounts
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
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
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    setNotification({ type, message, details });
    
    // Auto-hide notification after appropriate time
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
   * Clear the current notification
   */
  const clearNotification = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setNotification(null);
  }, []);
  
  return {
    notification,
    showNotification,
    clearNotification
  };
};