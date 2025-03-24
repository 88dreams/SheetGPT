import React, { useEffect, useState } from 'react';

export interface NotificationType {
  type: 'success' | 'error' | 'info';
  message: string;
  details?: string;
}

interface NotificationProps {
  notification: NotificationType | null;
  onClose?: () => void;
}

const Notification: React.FC<NotificationProps> = ({ notification, onClose }) => {
  const [visible, setVisible] = useState<boolean>(false);
  
  useEffect(() => {
    if (notification) {
      setVisible(true);
      
      // Set timeout for all notifications (3 seconds for non-errors, 30 seconds for errors as fallback)
      const timeoutDuration = notification.type === 'error' ? 30000 : 3000;
      const timer = setTimeout(() => {
        setVisible(false);
      }, timeoutDuration);
      
      return () => clearTimeout(timer);
    }
  }, [notification]);
  
  if (!notification || !visible) return null;
  
  // Determine larger size and positioning for error notifications
  const isError = notification.type === 'error';
  const positionClass = isError 
    ? "fixed top-1/4 left-1/2 transform -translate-x-1/2"  // Centered errors
    : "fixed bottom-4 right-4";  // Regular notifications in bottom-right
  
  const maxWidthClass = isError ? "max-w-lg" : "max-w-md";
  const fontSizeClass = isError ? "text-base" : "text-sm";
  
  // Handle close notification
  const handleClose = () => {
    setVisible(false);
    if (onClose) onClose();
  };
  
  return (
    <div 
      className={`${positionClass} p-4 rounded-md shadow-lg ${maxWidthClass} z-50 animate-fade-in transition-all ${
        notification.type === 'success' ? 'bg-green-50 border border-green-300 text-green-800' :
        notification.type === 'error' ? 'bg-red-50 border-2 border-red-500 text-red-800' :
        'bg-blue-50 border border-blue-300 text-blue-800'
      }`}
    >
      <div className="flex items-start">
        {/* Close button (X) */}
        <button 
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 focus:outline-none" 
          onClick={handleClose}
          aria-label="Close notification"
        >
          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        
        <div className="flex-shrink-0">
          {notification.type === 'success' && (
            <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
          {notification.type === 'error' && (
            <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {notification.type === 'info' && (
            <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="ml-3 flex-1 pr-6">
          <p className={`${fontSizeClass} font-medium ${isError ? 'font-bold' : ''}`}>
            {isError ? 'Error: ' : ''}{notification.message}
          </p>
          {notification.details && (
            <p className={`mt-1 ${isError ? 'text-sm' : 'text-xs'} ${isError ? 'text-red-700' : 'text-gray-600'}`}>
              {notification.details}
            </p>
          )}
          {notification.type === 'info' && notification.message.includes('already exists') && (
            <p className="mt-1 text-xs text-blue-700 italic">
              Automatically proceeding to the next record.
            </p>
          )}
          {isError && (
            <div className="mt-3 text-sm text-red-700">
              {notification.message.includes('Broadcast company') ? (
                // Special guidance for broadcast company errors
                <div>
                  <p className="font-semibold mb-1">To fix this:</p>
                  <ol className="list-decimal pl-5">
                    <li>Go to the <strong>Entities</strong> menu in the main navigation</li>
                    <li>Select <strong>Broadcast Rights</strong> in the Entity Types panel</li>
                    <li>Click <strong>New</strong> to create the company</li>
                    <li>Try your mapping again with the existing company</li>
                  </ol>
                </div>
              ) : notification.message.includes('Brand "') ? (
                // Special guidance for brand errors
                <div>
                  <p className="font-semibold mb-1">To fix this:</p>
                  <ol className="list-decimal pl-5">
                    <li>Go to the <strong>Entities</strong> menu in the main navigation</li>
                    <li>Select <strong>Brand</strong> in the Entity Types panel</li>
                    <li>Click <strong>New</strong> to create the brand</li>
                    <li>Try your mapping again with the existing brand</li>
                  </ol>
                </div>
              ) : notification.message.includes('Division') || notification.message.includes('Conference') ? (
                // Special guidance for division/conference errors
                <div>
                  <p className="font-semibold mb-1">To fix this:</p>
                  <ol className="list-decimal pl-5">
                    <li>Go to the <strong>Entities</strong> menu in the main navigation</li>
                    <li>Select <strong>Divisions/Conferences</strong> in the Entity Types panel</li>
                    <li>Click <strong>New</strong> to create the entity</li>
                    <li>Try your mapping again with the existing entity</li>
                  </ol>
                </div>
              ) : notification.message.includes('UUID validation error') ? (
                // Special guidance for UUID validation errors
                <div>
                  <p className="font-semibold mb-1">To fix this:</p>
                  <ol className="list-decimal pl-5">
                    <li>Make sure all entities (brands, teams, conferences, etc.) exist in the database</li>
                    <li>Go to the <strong>Entities</strong> menu in the main navigation</li>
                    <li>Create any missing entities before trying again</li>
                    <li>If you're unsure which entity is missing, check the error message for clues</li>
                  </ol>
                </div>
              ) : (
                // Default guidance for other errors
                "Please make changes to your data or try a different approach."
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notification; 