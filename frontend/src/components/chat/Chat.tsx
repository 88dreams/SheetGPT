import React, { useState } from 'react';
import { useChatContext } from '../../contexts/ChatContext';
import MessageThread from './MessageThread';
import { Message } from '../../types/chat';
// ... other imports

const Chat: React.FC = () => {
  const { 
    isProcessingLongTask, 
    currentTaskDescription,
    startLongTask,
    endLongTask,
    setTaskDescription,
    isDataVisible,
    toggleDataVisibility
  } = useChatContext();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // ... other state and hooks

  const handleSendMessage = async (message: string) => {
    if (isProcessingLongTask) {
      return; // Prevent sending new messages while processing
    }

    try {
      if (message.toLowerCase().includes('list all') || 
          message.toLowerCase().includes('search for') ||
          message.toLowerCase().includes('find all')) {
        startLongTask();
        setTaskDescription('Gathering and structuring data...');
      }

      // ... existing message sending logic

    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b">
        <h1 className="text-xl font-semibold">Chat</h1>
        <button
          onClick={toggleDataVisibility}
          className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
        >
          {isDataVisible ? 'Hide Data' : 'View Data'}
        </button>
      </div>
      
      <MessageThread
        messages={messages}
        isLoading={isLoading}
        error={error}
        isProcessingLongTask={isProcessingLongTask}
      />
      
      {currentTaskDescription && (
        <div className="bg-blue-50 p-4 border-t border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
              <span className="text-sm text-blue-600">{currentTaskDescription}</span>
            </div>
            <button
              onClick={endLongTask}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* ... message input component */}
    </div>
  );
}; 