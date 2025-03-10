import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Message } from '../../utils/api'
import { transformToStandardFormat } from '../../utils/dataTransformer'
import MessageItem from './MessageItem'

export interface MessageThreadProps {
  messages: Message[];
  isLoading?: boolean;
  error?: Error | null;
  isProcessingLongTask?: boolean;
  onRepeat?: (content: string) => void;
  isWaitingResponse?: boolean;
}

const MessageThread: React.FC<MessageThreadProps> = ({ 
  messages, 
  isLoading, 
  error,
  isProcessingLongTask,
  onRepeat,
  isWaitingResponse
}) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const previousMessagesLength = useRef<number>(0)
  const [hasStreamingMessage, setHasStreamingMessage] = useState(false)

  const handleDataPreview = async (data: any) => {
    return transformToStandardFormat(data);
  };
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages]);

  // Check if we need to auto-scroll when messages update
  useEffect(() => {
    // Only auto-scroll if new messages were added
    if (messages.length > previousMessagesLength.current) {
      scrollToBottom()
    }
    previousMessagesLength.current = messages.length
    
    // Also set up a small delay to catch streaming text updates
    const intervalId = setInterval(() => {
      if (isWaitingResponse || hasStreamingMessage) {
        scrollToBottom()
      }
    }, 300)
    
    return () => clearInterval(intervalId)
  }, [messages, isWaitingResponse, hasStreamingMessage]);
  
  // Handle streaming state changes from child components
  const handleStreamingStateChange = (isStreaming: boolean) => {
    const wasStreaming = hasStreamingMessage;
    setHasStreamingMessage(isStreaming)
    
    if (isStreaming) {
      // When streaming starts, scroll to bottom
      scrollToBottom()
    } else if (wasStreaming && !isStreaming) {
      // When streaming ends, scroll to bottom with a delay to ensure everything is rendered
      setTimeout(() => {
        scrollToBottom();
      }, 500);
    }
  };
  
  // Function to scroll to bottom
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  };

  // We'll show a loading indicator but keep the messages visible
  // This way the user can see the response being streamed in
  
  if (isLoading) {
    return (
      <div className="flex-1 p-4">
        Loading messages...
      </div>
    )
  }

  if (error) {
    return <div className="flex-1 p-4 text-red-500">Error loading messages: {error.message}</div>
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white" ref={messagesContainerRef}>
      <div className="flex flex-col gap-4 p-4">
        {messages.map((message, index) => (
          <MessageItem
            key={message.id || index}
            message={message}
            onDataPreview={handleDataPreview}
            isLastMessage={index === messages.length - 1}
            onRepeat={onRepeat}
            onStreamingStateChange={handleStreamingStateChange}
          />
        ))}
        {/* This empty div serves as a marker to scroll to */}
        <div ref={messagesEndRef} />
        
        {/* Loading indicator when waiting for response */}
        {isWaitingResponse && (
          <div className="flex justify-center items-center p-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            <div className="ml-2 text-gray-600 text-sm">Assistant is typing...</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageThread 