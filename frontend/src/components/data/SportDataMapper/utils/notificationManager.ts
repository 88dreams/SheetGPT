import { useState, useCallback } from 'react';

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
  
  /**
   * Show a notification message with optional auto-hide
   */
  const showNotification = useCallback((
    type: 'success' | 'error' | 'info', 
    message: string, 
    details?: string,
    autoDismiss: boolean = true
  ) => {
    setNotification({ type, message, details });
    
    // Auto-hide notification after 5 seconds
    if (autoDismiss) {
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }
  }, []);
  
  /**
   * Clear the current notification
   */
  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);
  
  return {
    notification,
    showNotification,
    clearNotification
  };
};