import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import Notification, { NotificationType } from '../components/common/Notification'

interface NotificationOptions {
  title?: string;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
  showIcon?: boolean;
}

interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
  showIcon?: boolean;
}

interface NotificationContextType {
  showNotification: (type: NotificationType, message: string, options?: NotificationOptions) => string;
  hideNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode;
  maxNotifications?: number;
}

/**
 * NotificationProvider - Context provider for managing application notifications
 * 
 * @param children - React children
 * @param maxNotifications - Maximum number of notifications to show at once (defaults to 3)
 */
export const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children,
  maxNotifications = 3
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  // Generate unique ID for notifications
  const generateId = useCallback(() => {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Show a new notification
  const showNotification = useCallback((
    type: NotificationType, 
    message: string, 
    options?: NotificationOptions
  ): string => {
    const id = generateId();
    
    setNotifications(current => {
      // Limit the number of notifications
      const limitedNotifications = current.length >= maxNotifications 
        ? current.slice(0, maxNotifications - 1) 
        : current;
        
      return [
        { id, type, message, ...options }, 
        ...limitedNotifications
      ];
    });
    
    return id;
  }, [generateId, maxNotifications]);

  // Hide a specific notification by ID
  const hideNotification = useCallback((id: string) => {
    setNotifications(current => current.filter(notification => notification.id !== id));
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification, clearAllNotifications }}>
      {children}
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          type={notification.type}
          message={notification.message}
          title={notification.title}
          duration={notification.duration}
          position={notification.position}
          showIcon={notification.showIcon}
          onClose={() => hideNotification(notification.id)}
        />
      ))}
    </NotificationContext.Provider>
  )
}

/**
 * useNotification - Hook for accessing notification functionality
 * 
 * @returns Methods for showing and hiding notifications
 * @throws Error if used outside NotificationProvider
 */
export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
} 