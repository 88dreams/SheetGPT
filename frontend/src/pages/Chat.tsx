import React, { useState, useEffect, Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    searchParams.get('conversation')
  )
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Update URL when selected conversation changes
  useEffect(() => {
    if (selectedConversation) {
      setSearchParams({ conversation: selectedConversation })
    } else {
      setSearchParams({})
    }
  }, [selectedConversation, setSearchParams])

  // Reset initial load when auth state changes
  useEffect(() => {
    if (!isAuthenticated) {
      setIsInitialLoad(true)
    }
  }, [isAuthenticated])

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
        // Add retry logic for fetching conversations
        let attempts = 0;
        const maxAttempts = 3;
        let lastError: any = null;
        
        while (attempts < maxAttempts) {
          try {
            console.log(`Attempt ${attempts + 1} to fetch conversations`);
            const result = await api.chat.getConversations();
            
            // Ensure result is an array
            const conversationsArray = Array.isArray(result) ? result : [];
            
            console.log('Conversations fetched successfully:', {
              count: conversationsArray.length,
              isArray: Array.isArray(conversationsArray),
              timestamp: new Date().toISOString(),
              sampleIds: conversationsArray.slice(0, 3).map(c => c.id)
            });
            
            // Only set initial load to false if we have data or explicitly got an empty array
            if (result !== undefined) {
              setIsInitialLoad(false);
            }
            
            // Store conversation IDs in localStorage for debugging
            try {
              localStorage.setItem('last_conversation_ids', 
                JSON.stringify(conversationsArray.map(c => ({ id: c.id, title: c.title })))
              );
              localStorage.setItem('last_conversation_fetch', new Date().toISOString());
            } catch (e) {
              console.error('Failed to store conversation IDs in localStorage:', e);
            }
            
            return conversationsArray;
          } catch (error) {
            console.error(`Attempt ${attempts + 1} failed:`, error);
            lastError = error;
            attempts++;
            
            if (attempts < maxAttempts) {
              // Wait before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
          }
        }
        
        // If we get here, all attempts failed
        throw lastError || new Error('Failed to fetch conversations after multiple attempts');
      } catch (error) {
        console.error('Error fetching conversations:', {
          error,
          timestamp: new Date().toISOString()
        });
        
        // Check if there are any cached conversation IDs in localStorage
        try {
          const cachedIds = localStorage.getItem('last_conversation_ids');
          if (cachedIds) {
            console.log('Found cached conversation IDs:', cachedIds);
          }
        } catch (e) {
          console.error('Failed to check cached conversation IDs:', e);
        }
        
        throw error;
      }
    },
    retry: 2, // Increase retry attempts
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000), // Exponential backoff with max 30s
    staleTime: 60000, // Reduce stale time to 1 minute to refresh more often
    gcTime: 1000 * 60 * 30, // Cache for 30 minutes
    enabled: isAuthenticated && isReady,
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnReconnect: true, // Refetch when reconnecting
    // Ensure we always return an array even if the query fails
    placeholderData: []
  })

  // Track render states with more detail
  useEffect(() => {
    console.log('Chat component state update:', {
      isAuthenticated,
      isReady,
      isInitialLoad,
      isLoadingConversations,
      hasUser: !!user,
      hasError: isConversationsError,
      errorMessage: conversationsError?.message,
      timestamp: new Date().toISOString()
    })
  }, [isAuthenticated, isReady, isInitialLoad, isLoadingConversations, user, isConversationsError, conversationsError])

  // Messages query
  const {
    data: messages,
    isLoading: isLoadingMessages,
    error: messagesError,
    isError: isMessagesError
  } = useQuery<Message[], Error>({
    queryKey: ['messages', selectedConversation],
    queryFn: async () => {
      console.log('Fetching messages for conversation:', {
        conversationId: selectedConversation,
        timestamp: new Date().toISOString()
      })
      if (!selectedConversation) return []
      const conversation = await api.chat.getConversation(selectedConversation)
      console.log('Messages fetched:', {
        conversationId: selectedConversation,
        messageCount: conversation.messages.length,
        timestamp: new Date().toISOString()
      })
      return conversation.messages
    },
    enabled: !!selectedConversation && isAuthenticated && isReady,
    retry: 1,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30, // Cache for 30 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  })

  // Add component mount/unmount tracking
  useEffect(() => {
    console.log('Chat component mounted/updated:', {
      selectedConversation,
      hasMessages: messages?.length ?? 0,
      isAuthenticated,
      isReady,
      timestamp: new Date().toISOString()
    })
  }, [selectedConversation, messages, isAuthenticated, isReady])

  // Track conversation selection changes
  useEffect(() => {
    console.log('Selected conversation changed:', {
      selectedConversation,
      urlParam: searchParams.get('conversation'),
      timestamp: new Date().toISOString()
    })
  }, [selectedConversation, searchParams])

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (params: { content: string; structuredFormat?: Record<string, any> }) => {
      if (!selectedConversation) throw new Error('No conversation selected')
      
      // Create a temporary message ID for optimistic updates
      const tempMessageId = crypto.randomUUID()
      
      // Add user message to the UI immediately
      queryClient.setQueryData(['messages', selectedConversation], (old: Message[] | undefined) => {
        const messages = old || []
        return [...messages, {
          id: tempMessageId,
          role: 'user',
          content: params.content,
          created_at: new Date().toISOString(),
          conversation_id: selectedConversation,
          meta_data: {}
        }]
      })

      // Create a temporary message for the assistant's response
      const assistantMessageId = crypto.randomUUID()
      queryClient.setQueryData(['messages', selectedConversation], (old: Message[] | undefined) => {
        const messages = old || []
        return [...messages, {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          created_at: new Date().toISOString(),
          conversation_id: selectedConversation,
          meta_data: {}
        }]
      })

      // Send the message and handle streaming response
      return api.chat.sendMessage(
        selectedConversation,
        params.content,
        params.structuredFormat,
        (chunk) => {
          // Update the assistant's message as chunks arrive
          queryClient.setQueryData(['messages', selectedConversation], (old: Message[] | undefined) => {
            const messages = old || []
            return messages.map(msg => 
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          })
        }
      )
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

  // Handle errors
  useEffect(() => {
    if (conversationsError) {
      showNotification('error', conversationsError.message || 'Failed to load conversations')
    }
    if (messagesError) {
      showNotification('error', messagesError.message || 'Failed to load messages')
    }
  }, [conversationsError, messagesError, showNotification])

  const handleSendMessage = async (content: string, structuredFormat?: Record<string, any>) => {
    await sendMessageMutation.mutateAsync({ content, structuredFormat })
  }

  // Combined loading state - only show loading on initial load
  const isLoading = !isReady || (isInitialLoad && isLoadingConversations)

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