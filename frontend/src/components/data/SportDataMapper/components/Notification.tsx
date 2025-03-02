import React from 'react';

export interface NotificationType {
  type: 'success' | 'error' | 'info';
  message: string;
  details?: string;
}

interface NotificationProps {
  notification: NotificationType | null;
}

const Notification: React.FC<NotificationProps> = ({ notification }) => {
  if (!notification) return null;
  
  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-md shadow-lg max-w-md animate-fade-in transition-all ${
      notification.type === 'success' ? 'bg-green-50 border border-green-300 text-green-800' :
      notification.type === 'error' ? 'bg-red-50 border border-red-300 text-red-800' :
      'bg-blue-50 border border-blue-300 text-blue-800'
    }`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {notification.type === 'success' && (
            <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
          {notification.type === 'error' && (
            <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {notification.type === 'info' && (
            <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">
            {notification.message}
          </p>
          {notification.details && (
            <p className="mt-1 text-xs text-gray-600">
              {notification.details}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notification; 