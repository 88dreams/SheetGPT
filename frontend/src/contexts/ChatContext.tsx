import React, { createContext, useContext, useState, useCallback } from 'react';

interface ChatContextType {
  isProcessingLongTask: boolean;
  startLongTask: () => void;
  endLongTask: () => void;
  currentTaskDescription: string | null;
  setTaskDescription: (description: string | null) => void;
  isDataVisible: boolean;
  toggleDataVisibility: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isProcessingLongTask, setIsProcessingLongTask] = useState(false);
  const [currentTaskDescription, setCurrentTaskDescription] = useState<string | null>(null);
  const [isDataVisible, setIsDataVisible] = useState(false);

  const startLongTask = useCallback(() => {
    setIsProcessingLongTask(true);
  }, []);

  const endLongTask = useCallback(() => {
    setIsProcessingLongTask(false);
    setCurrentTaskDescription(null);
  }, []);

  const setTaskDescription = useCallback((description: string | null) => {
    setCurrentTaskDescription(description);
  }, []);

  const toggleDataVisibility = useCallback(() => {
    setIsDataVisible(prev => !prev);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        isProcessingLongTask,
        startLongTask,
        endLongTask,
        currentTaskDescription,
        setTaskDescription,
        isDataVisible,
        toggleDataVisibility,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}; 