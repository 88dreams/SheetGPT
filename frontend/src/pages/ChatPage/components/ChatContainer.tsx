import React from 'react';
import MessageThread from '../../../components/chat/MessageThread';
import ChatInput from '../../../components/chat/ChatInput';
import { Message } from '../../../utils/api';
import ChatEmptyState from './ChatEmptyState';
import { FileAttachment } from '../../../types/chat';

interface ChatContainerProps {
  chatInputRef: React.RefObject<HTMLDivElement>;
  selectedConversation: string | null;
  messages: Message[];
  isLoading: boolean;
  error: Error | null;
  isPending: boolean;
  onSendMessage: (content: string, structuredFormat?: Record<string, any>, fileAttachment?: FileAttachment) => Promise<void>;
  onRepeatMessage: (content: string) => Promise<void>;
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  chatInputRef,
  selectedConversation,
  messages,
  isLoading,
  error,
  isPending,
  onSendMessage,
  onRepeatMessage
}) => {
  if (!selectedConversation) {
    return <ChatEmptyState />;
  }

  return (
    <>
      {/* Message thread with adjusted padding to make room for fixed input */}
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <MessageThread
          messages={messages}
          isLoading={isLoading}
          error={error}
          onRepeat={onRepeatMessage}
          isWaitingResponse={isPending}
        />
      </div>
      
      {/* Fixed position chat input that aligns with the sidebar */}
      <div 
        className="fixed bottom-0 right-0 bg-white border-t border-gray-200 pt-2 px-4 pb-4 w-full"
        ref={chatInputRef}
      >
        <ChatInput
          onSend={onSendMessage}
          disabled={isPending}
        />
      </div>
    </>
  );
};

export default ChatContainer;