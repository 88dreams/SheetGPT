import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Message } from '../../utils/api'
import { transformToStandardFormat } from '../../utils/dataTransformer'
import MessageItem from './MessageItem'

export interface MessageThreadProps {
  messages: Message[];
  isLoading?: boolean;
  error?: Error | null;
}

const MessageThread: React.FC<MessageThreadProps> = ({ messages, isLoading, error }) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleDataPreview = async (data: any) => {
    return transformToStandardFormat(data);
  };

  if (isLoading) {
    return <div className="flex-1 p-4">Loading messages...</div>
  }

  if (error) {
    return <div className="flex-1 p-4 text-red-500">Error loading messages: {error.message}</div>
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="flex flex-col gap-4 p-4">
        {messages.map((message, index) => (
          <MessageItem
            key={message.id || index}
            message={message}
            onDataPreview={handleDataPreview}
          />
        ))}
      </div>
    </div>
  )
}

export default MessageThread 