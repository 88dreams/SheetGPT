import React, { useEffect, useMemo } from 'react'
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  InformationCircleIcon, 
  ExclamationCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline'

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationProps {
  type: NotificationType;
  message: string;
  title?: string;
  onClose: () => void;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
  showIcon?: boolean;
}

/**
 * Notification component for displaying alerts and messages
 */
const Notification: React.FC<NotificationProps> = ({
  type,
  message,
  title,
  onClose,
  duration = 5000,
  position = 'top-right',
  showIcon = true,
}) => {
  // Auto-dismiss notification after duration
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  // Memoize styles to avoid recalculation on each render
  const styles = useMemo(() => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-green-50 border-green-400 text-green-700',
          icon: <CheckCircleIcon className="h-5 w-5 text-green-500" />
        };
      case 'error':
        return {
          container: 'bg-red-50 border-red-400 text-red-700',
          icon: <XCircleIcon className="h-5 w-5 text-red-500" />
        };
      case 'info':
        return {
          container: 'bg-blue-50 border-blue-400 text-blue-700',
          icon: <InformationCircleIcon className="h-5 w-5 text-blue-500" />
        };
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-400 text-yellow-700',
          icon: <ExclamationCircleIcon className="h-5 w-5 text-yellow-500" />
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-400 text-gray-700',
          icon: <InformationCircleIcon className="h-5 w-5 text-gray-500" />
        };
    }
  }, [type]);

  // Position classes
  const positionClasses = useMemo(() => {
    switch (position) {
      case 'top-right': return 'top-4 right-4';
      case 'top-left': return 'top-4 left-4';
      case 'bottom-right': return 'bottom-4 right-4';
      case 'bottom-left': return 'bottom-4 left-4';
      case 'top-center': return 'top-4 left-1/2 transform -translate-x-1/2';
      default: return 'top-4 right-4';
    }
  }, [position]);

  return (
    <div
      className={`fixed z-50 w-96 border px-4 py-3 rounded-lg shadow-lg ${styles.container} ${positionClasses} animate-fadeIn`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start">
        {showIcon && (
          <div className="flex-shrink-0 mr-3 mt-0.5">
            {styles.icon}
          </div>
        )}
        <div className="flex-1">
          {title && (
            <p className="font-medium mb-1">{title}</p>
          )}
          <p className="text-sm">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 ml-2 text-current hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded"
          aria-label="Close notification"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default React.memo(Notification); 