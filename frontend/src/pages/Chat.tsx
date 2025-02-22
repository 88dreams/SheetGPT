import React, { useState, useEffect, Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ConversationList from '../components/chat/ConversationList'
import MessageThread from '../components/chat/MessageThread'
import ChatInput from '../components/chat/ChatInput'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../hooks/useAuth'
import { api, type Conversation, type Message } from '../utils/api'

type QueryError = {
  message: string;
} | Error | null;

const Chat: React.FC = () => {
  const { isAuthenticated, isReady, user } = useAuth()
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Conversations query
  const { 
    data: conversations,
    isLoading: isLoadingConversations,
    error: conversationsError,
    isError: isConversationsError,
    refetch: refetchConversations
  } = useQuery<Conversation[], QueryError>({
    queryKey: ['conversations'],
    queryFn: async () => {
      console.log('Fetching conversations...', {
        isAuthenticated,
        isReady,
        hasToken: !!localStorage.getItem('auth_token'),
        timestamp: new Date().toISOString()
      })
      try {
        const result = await api.chat.getConversations()
        // Ensure result is an array
        const conversationsArray = Array.isArray(result) ? result : []
        console.log('Conversations fetched:', {
          count: conversationsArray.length,
          isArray: Array.isArray(conversationsArray),
          timestamp: new Date().toISOString()
        })
        setIsInitialLoad(false)
        return conversationsArray
      } catch (error) {
        console.error('Error fetching conversations:', {
          error,
          timestamp: new Date().toISOString()
        })
        throw error
      }
    },
    retry: 1,
    staleTime: 30000,
    enabled: isAuthenticated && isReady,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    // Ensure we always return an array even if the query fails
    placeholderData: []
  })

  // Messages query
  const {
    data: messages,
    isLoading: isLoadingMessages,
    error: messagesError,
    isError: isMessagesError
  } = useQuery<Message[], Error>({
    queryKey: ['messages', selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return []
      const conversation = await api.chat.getConversation(selectedConversation)
      return conversation.messages
    },
    enabled: !!selectedConversation && isAuthenticated && isReady,
    retry: 1,
    staleTime: 5000
  })

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConversation) throw new Error('No conversation selected')
      return api.chat.sendMessage(selectedConversation, content)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation] })
    },
    onError: (error: Error) => {
      showNotification('error', error.message)
    },
  })

  // Debug mount/unmount with more context
  useEffect(() => {
    console.log('Chat component mounted:', {
      isAuthenticated,
      isReady,
      hasUser: !!user,
      isInitialLoad,
      timestamp: new Date().toISOString()
    })
    return () => {
      console.log('Chat component unmounting:', {
        isAuthenticated,
        isReady,
        hasUser: !!user,
        isInitialLoad,
        timestamp: new Date().toISOString()
      })
    }
  }, [isAuthenticated, isReady, user, isInitialLoad])

  // Reset initial load when auth state changes
  useEffect(() => {
    if (!isAuthenticated) {
      setIsInitialLoad(true)
    }
  }, [isAuthenticated])

  // Track render states
  useEffect(() => {
    console.log('Chat render state:', {
      isAuthenticated,
      isReady,
      isLoading: isLoadingConversations,
      hasError: isConversationsError,
      hasData: !!conversations,
      conversationsCount: conversations?.length,
      timestamp: new Date().toISOString()
    })
  }, [isAuthenticated, isReady, isLoadingConversations, isConversationsError, conversations])

  // Handle errors
  useEffect(() => {
    if (conversationsError) {
      showNotification('error', conversationsError.message || 'Failed to load conversations')
    }
    if (messagesError) {
      showNotification('error', messagesError.message || 'Failed to load messages')
    }
  }, [conversationsError, messagesError, showNotification])

  const handleSendMessage = async (content: string) => {
    await sendMessageMutation.mutateAsync(content)
  }

  // Combined loading state
  const isLoading = isInitialLoad || !isReady || isLoadingConversations

  // Show loading state for any loading condition
  if (isLoading) {
    console.log('Rendering loading state:', {
      isInitialLoad,
      isReady,
      isLoadingConversations,
      timestamp: new Date().toISOString()
    })
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
        <div className="ml-3 text-gray-600">
          {!isReady ? 'Initializing...' : 'Loading conversations...'}
        </div>
      </div>
    )
  }

  // Show unauthenticated state
  if (!isAuthenticated) {
    console.log('Rendering unauthenticated state')
    return (
      <div className="h-screen flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div>Session expired or not authenticated</div>
          <div className="text-sm mt-2">Please log in again</div>
        </div>
      </div>
    )
  }

  // Show error state
  if (isConversationsError && conversationsError) {
    const errorMessage = conversationsError.message || 'Unknown error occurred'
    console.log('Rendering error state:', errorMessage)
    return (
      <div className="h-screen flex items-center justify-center text-red-600">
        <div className="text-center">
          <div>Failed to load conversations</div>
          <div className="text-sm mt-2">{errorMessage}</div>
          <button 
            onClick={() => {
              setIsInitialLoad(true)
              refetchConversations()
            }}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  console.log('Rendering main chat interface')
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-1/4 border-r border-gray-200 p-4">
        <ConversationList
          conversations={Array.isArray(conversations) ? conversations : []}
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
              ) : isMessagesError ? (
                <div className="h-full flex items-center justify-center text-red-600">
                  Failed to load messages. Please try again.
                </div>
              ) : (
                <MessageThread messages={messages ?? []} />
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