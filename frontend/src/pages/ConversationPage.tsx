import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../utils/api'
import DataExtractor from '../components/data/DataExtractor'
import MessageItem from '../components/chat/MessageItem'
import LoadingSpinner from '../components/common/LoadingSpinner'

const ConversationPage: React.FC = () => {
  const { id: conversationId } = useParams<{ id: string }>()
  const [showDataExtractor, setShowDataExtractor] = useState(false)
  
  // Fetch conversation data
  const { data: conversation, isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => api.chat.getConversation(conversationId!),
    enabled: !!conversationId
  })
  
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-none p-4 border-b flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">{conversation?.title || 'Loading...'}</h1>
          {conversation?.description && (
            <p className="text-sm text-gray-500">{conversation.description}</p>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowDataExtractor(true)}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center space-x-1"
          >
            <span className="material-icons text-sm">table_chart</span>
            <span>Extract Data</span>
          </button>
        </div>
      </div>
      
      <div className="flex-grow overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <LoadingSpinner size="medium" />
          </div>
        ) : (
          <div className="space-y-4">
            {conversation?.messages.map((message, index) => (
              <MessageItem 
                key={message.id} 
                message={message} 
                isLast={index === conversation.messages.length - 1}
                conversationTitle={conversation.title}
              />
            ))}
          </div>
        )}
      </div>
      
      <DataExtractor
        isOpen={showDataExtractor}
        onClose={() => setShowDataExtractor(false)}
        conversationId={conversationId}
      />
    </div>
  )
}

export default ConversationPage 