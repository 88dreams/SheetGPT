import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
import usePageTitle from '../../hooks/usePageTitle';
import DataPreviewModal from '../../components/chat/DataPreviewModal';
import { FileAttachment } from '../../types/chat';

// Import hooks
import {
  useResizableSidebar,
  useChatInputPosition,
  useConversations,
  useMessages,
  useSendMessage
} from './hooks';

// Import components
import {
  SidebarWithResizer,
  ChatContainer
} from './components';

const ChatPage: React.FC = () => {
  // Set the page title
  usePageTitle('Chat');
  
  const { isAuthenticated, isReady, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(() => {
    // Initialize from URL params or sessionStorage
    return searchParams.get('conversation') || sessionStorage.getItem('selectedConversation');
  });
  const { showNotification } = useNotification();
  const [isDataPreviewModalOpen, setIsDataPreviewModalOpen] = useState(false);
  const [previewMessageContent, setPreviewMessageContent] = useState('');

  // Use the resizable sidebar hook
  const {
    sidebarWidth,
    containerRef,
    sidebarRef,
    handleDragStart
  } = useResizableSidebar({
    defaultWidth: 25,
    minWidth: 15,
    maxWidth: 50
  });

  // Use the chat input position hook
  const { chatInputRef, updateChatInputPosition } = useChatInputPosition({
    sidebarRef,
    containerRef,
    sidebarWidth
  });

  // Listen for route changes and component re-mounting
  useEffect(() => {
    console.log('Route changed or component re-mounted, updating chat input position');
    updateChatInputPosition();
  }, [location.pathname, updateChatInputPosition]);

  // Use the conversations hook
  const {
    conversations,
    totalConversations,
    isLoading: isLoadingConversations,
    error: conversationsError,
    isError: isConversationsError,
    refetch: refetchConversations,
    hasNextPage,
    isInitialLoad,
    handleLoadMore,
    resetInitialLoad
  } = useConversations({
    enabled: isAuthenticated && isReady
  });

  // Reset initial load when auth state changes
  useEffect(() => {
    if (!isAuthenticated) {
      resetInitialLoad();
    }
  }, [isAuthenticated, resetInitialLoad]);

  // Use the messages hook
  const {
    messages,
    isLoading: isLoadingMessages,
    error: messagesError,
    refetch: refetchMessages
  } = useMessages({
    conversationId: selectedConversation,
    enabled: isAuthenticated && isReady
  });

  // Use the send message hook
  const {
    sendMessage,
    isPending: isSendingMessage
  } = useSendMessage({
    conversationId: selectedConversation,
    onError: (error) => {
      showNotification('error', error.message);
    }
  });

  // Handle selecting a conversation
  const handleSelectConversation = (id: string) => {
    setSelectedConversation(id);
    sessionStorage.setItem('selectedConversation', id);
  };

  // Handle confirming data preview
  const handleConfirmPreview = (data: any) => {
    setIsDataPreviewModalOpen(false);
    // Implementation would go here
    showNotification('success', 'Data sent to Data Management');
  };

  // Update URL when selected conversation changes
  useEffect(() => {
    if (selectedConversation) {
      setSearchParams({ conversation: selectedConversation });
      sessionStorage.setItem('selectedConversation', selectedConversation);
    } else {
      setSearchParams({});
      sessionStorage.removeItem('selectedConversation');
    }
  }, [selectedConversation, setSearchParams]);

  // Handle errors
  useEffect(() => {
    if (conversationsError) {
      showNotification('error', conversationsError.message || 'Failed to load conversations');
    }
    if (messagesError) {
      showNotification('error', messagesError.message || 'Failed to load messages');
    }
  }, [conversationsError, messagesError, showNotification]);

  const handleSendMessage = async (content: string, structuredFormat?: Record<string, any>, fileAttachment?: FileAttachment) => {
    await sendMessage(content, structuredFormat, fileAttachment);
  };

  const handleRepeatMessage = async (content: string) => {
    await handleSendMessage(content);
  };

  // Combined loading state - only show loading on initial load
  const isLoading = !isReady || (isInitialLoad && isLoadingConversations);

  // Show loading state for any loading condition
  if (isLoading) {
    console.log('Rendering loading state:', {
      isInitialLoad,
      isReady,
      isLoadingConversations,
      timestamp: new Date().toISOString()
    });
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
        <div className="ml-3 text-gray-600">
          {!isReady ? 'Initializing...' : 'Loading conversations...'}
        </div>
      </div>
    );
  }

  // Show unauthenticated state
  if (!isAuthenticated) {
    console.log('Rendering unauthenticated state');
    return (
      <div className="h-screen flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div>Session expired or not authenticated</div>
          <div className="text-sm mt-2">Please log in again</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (isConversationsError && conversationsError) {
    const errorMessage = conversationsError.message || 'Unknown error occurred';
    console.log('Rendering error state:', errorMessage);
    return (
      <div className="h-screen flex items-center justify-center text-red-600">
        <div className="text-center">
          <div>Failed to load conversations</div>
          <div className="text-sm mt-2">{errorMessage}</div>
          <button 
            onClick={() => {
              resetInitialLoad();
              refetchConversations();
            }}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  console.log('Rendering main chat interface');
  return (
    <div className="flex h-[calc(100vh-5rem)] overflow-hidden" ref={containerRef}>
      {/* Sidebar with resizer */}
      <SidebarWithResizer
        sidebarRef={sidebarRef}
        sidebarWidth={sidebarWidth}
        conversations={conversations}
        selectedId={selectedConversation}
        onSelect={handleSelectConversation}
        isLoading={isLoadingConversations}
        hasMore={!!hasNextPage}
        onLoadMore={handleLoadMore}
        total={totalConversations}
        onDragStart={handleDragStart}
      />

      {/* Main chat area with dynamic width */}
      <div className="flex-1 flex flex-col relative">
        <ChatContainer
          chatInputRef={chatInputRef}
          selectedConversation={selectedConversation}
          messages={messages}
          isLoading={isLoadingMessages}
          error={messagesError}
          isPending={isSendingMessage}
          onSendMessage={handleSendMessage}
          onRepeatMessage={handleRepeatMessage}
        />
      </div>

      {/* Data preview modal */}
      <DataPreviewModal
        isOpen={isDataPreviewModalOpen}
        onClose={() => setIsDataPreviewModalOpen(false)}
        messageContent={previewMessageContent}
        onConfirm={handleConfirmPreview}
      />
    </div>
  );
};

export default ChatPage;