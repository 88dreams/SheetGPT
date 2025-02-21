import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ConversationList from '../components/chat/ConversationList'
import MessageThread from '../components/chat/MessageThread'
import ChatInput from '../components/chat/ChatInput'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useNotification } from '../contexts/NotificationContext'

interface Conversation {
  id: string
  title: string
  description?: string
  created_at: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

const Chat: React.FC = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()

  // Fetch conversations
  const { 
    data: conversations,
    isLoading: isLoadingConversations,
    error: conversationsError
  } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await fetch('/api/v1/chat/conversations')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to fetch conversations')
      }
      return response.json()
    }
  })

  // Fetch messages for selected conversation
  const {
    data: messages,
    isLoading: isLoadingMessages,
    error: messagesError
  } = useQuery<Message[]>({
    queryKey: ['messages', selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return []
      const response = await fetch(`/api/v1/chat/conversations/${selectedConversation}/messages`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to fetch messages')
      }
      return response.json()
    },
    enabled: !!selectedConversation
  })

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConversation) throw new Error('No conversation selected')
      const response = await fetch(`/api/v1/chat/conversations/${selectedConversation}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to send message')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation] })
    },
    onError: (error: Error) => {
      showNotification('error', error.message)
    },
  })

  // Handle errors
  useEffect(() => {
    if (conversationsError) {
      showNotification('error', conversationsError instanceof Error ? 
        conversationsError.message : 'Failed to load conversations')
    }
    if (messagesError) {
      showNotification('error', messagesError instanceof Error ? 
        messagesError.message : 'Failed to load messages')
    }
  }, [conversationsError, messagesError, showNotification])

  const handleSendMessage = async (content: string) => {
    await sendMessageMutation.mutateAsync(content)
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-1/4 border-r border-gray-200 p-4">
        <ConversationList
          conversations={conversations || []}
          selectedId={selectedConversation}
          onSelect={setSelectedConversation}
          isLoading={isLoadingConversations}
        />
      </div>
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingMessages ? (
                <div className="h-full flex items-center justify-center">
                  <LoadingSpinner size="medium" />
                </div>
              ) : (
                <MessageThread messages={messages || []} />
              )}
            </div>
            <div className="border-t border-gray-200 p-4">
              <ChatInput 
                onSend={handleSendMessage}
                disabled={sendMessageMutation.isPending}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a conversation or start a new one
          </div>
        )}
      </div>
    </div>
  )
}

export default Chat