import React, { useState, useEffect, Suspense, useRef, useLayoutEffect } from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery, InfiniteData } from '@tanstack/react-query'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import ConversationList from '../components/chat/ConversationList'
import MessageThread from '../components/chat/MessageThread'
import ChatInput from '../components/chat/ChatInput'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../hooks/useAuth'
import { api, type Conversation, type Message, PaginatedResponse } from '../utils/api'
import DataPreviewModal from '../components/chat/DataPreviewModal'

type QueryError = {
  message: string;
} | Error | null;

interface MessageThreadProps {
  messages: Message[];
  isLoading?: boolean;
  error?: Error | null;
}

interface ConversationPage extends PaginatedResponse<Conversation> {}

const CONVERSATIONS_PER_PAGE = 20

const Chat: React.FC = () => {
  const { isAuthenticated, isReady, user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    searchParams.get('conversation')
  )
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isDataPreviewModalOpen, setIsDataPreviewModalOpen] = useState(false)
  const [previewMessageContent, setPreviewMessageContent] = useState('')
  const [page, setPage] = useState(0)
  
  // Add state for sidebar width
  const [sidebarWidth, setSidebarWidth] = useState(25) // Default 25% width
  const isDraggingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLDivElement>(null)

  // Function to update chat input position based on sidebar's actual width
  const updateChatInputPosition = () => {
    if (sidebarRef.current && chatInputRef.current && containerRef.current) {
      // Get the sidebar and divider elements
      const sidebarElement = sidebarRef.current;
      const dividerElement = sidebarElement.nextElementSibling as HTMLElement;
      
      if (dividerElement) {
        // Get the right edge of the divider
        const dividerRect = dividerElement.getBoundingClientRect();
        
        // Set the chat input position to align with the right edge of the divider
        chatInputRef.current.style.left = `${dividerRect.right}px`;
        chatInputRef.current.style.width = `calc(100% - ${dividerRect.right}px)`;
      }
    }
  };

  // Update chat input position whenever sidebar width changes
  useEffect(() => {
    updateChatInputPosition();
  }, [sidebarWidth]);

  // Use layout effect to ensure positioning happens after DOM measurements are available
  useLayoutEffect(() => {
    // Initial position update
    updateChatInputPosition();
    
    // Add a small delay to ensure all DOM elements are properly sized
    const timeoutId = setTimeout(() => {
      updateChatInputPosition();
    }, 100);
    
    // Set up a MutationObserver to detect DOM changes
    if (containerRef.current) {
      const observer = new MutationObserver(() => {
        updateChatInputPosition();
      });
      
      observer.observe(containerRef.current, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
      
      return () => {
        clearTimeout(timeoutId);
        observer.disconnect();
      };
    }
    
    return () => clearTimeout(timeoutId);
  }, []);

  // Also update on window resize
  useEffect(() => {
    window.addEventListener('resize', updateChatInputPosition);
    
    // Run once after first render to ensure correct positioning
    const timeoutId = setTimeout(updateChatInputPosition, 50);
    
    return () => {
      window.removeEventListener('resize', updateChatInputPosition);
      clearTimeout(timeoutId);
    };
  }, []);

  // Add an effect to update position when the component is fully mounted
  useEffect(() => {
    // Run immediately
    updateChatInputPosition();
    
    // And again after a short delay to catch any late layout adjustments
    const timeoutId1 = setTimeout(updateChatInputPosition, 50);
    const timeoutId2 = setTimeout(updateChatInputPosition, 200);
    const timeoutId3 = setTimeout(updateChatInputPosition, 500);
    
    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
    };
  }, []);

  // Listen for route changes and component re-mounting
  useEffect(() => {
    console.log('Route changed or component re-mounted, updating chat input position');
    
    // Update immediately
    updateChatInputPosition();
    
    // And with progressive delays to catch any layout changes
    const timeouts = [
      setTimeout(updateChatInputPosition, 50),
      setTimeout(updateChatInputPosition, 150),
      setTimeout(updateChatInputPosition, 300),
      setTimeout(updateChatInputPosition, 600),
      setTimeout(updateChatInputPosition, 1200)
    ];
    
    // Also set up a periodic check for the first few seconds
    // This helps with cases where the layout takes longer to stabilize
    let count = 0;
    const intervalId = setInterval(() => {
      updateChatInputPosition();
      count++;
      if (count >= 5) clearInterval(intervalId);
    }, 500);
    
    return () => {
      timeouts.forEach(clearTimeout);
      clearInterval(intervalId);
    };
  }, [location.pathname]);

  // Handle selecting a conversation
  const handleSelectConversation = (id: string) => {
    setSelectedConversation(id);
  };

  // Handle confirming data preview
  const handleConfirmPreview = (data: any) => {
    setIsDataPreviewModalOpen(false);
    // Implementation would go here
    showNotification('success', 'Data sent to Data Management');
  };

  // Add handlers for resizing
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    document.addEventListener('mousemove', handleDrag)
    document.addEventListener('mouseup', handleDragEnd)
    // Add a class to the body to change cursor during resize
    document.body.classList.add('resizing')
  }

  const handleDrag = (e: MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return
    
    const containerRect = containerRef.current.getBoundingClientRect()
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100
    
    // Limit the sidebar width between 15% and 50%
    if (newWidth >= 15 && newWidth <= 50) {
      setSidebarWidth(newWidth)
      // Update chat input position during drag
      requestAnimationFrame(updateChatInputPosition);
    }
  }

  const handleDragEnd = () => {
    isDraggingRef.current = false
    document.removeEventListener('mousemove', handleDrag)
    document.removeEventListener('mouseup', handleDragEnd)
    // Remove the resizing class
    document.body.classList.remove('resizing')
  }

  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDrag)
      document.removeEventListener('mouseup', handleDragEnd)
      document.body.classList.remove('resizing')
    }
  }, [])

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

  // Conversations query with pagination
  const { 
    data: conversationsData,
    isLoading: isLoadingConversations,
    error: conversationsError,
    isError: isConversationsError,
    refetch: refetchConversations,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useInfiniteQuery<ConversationPage, Error, InfiniteData<ConversationPage>, string[], number>({
    queryKey: ['conversations'],
    queryFn: async ({ pageParam }) => {
      console.log('Fetching conversations page:', pageParam)
      try {
        const response = await api.chat.getConversations(
          pageParam * CONVERSATIONS_PER_PAGE,
          CONVERSATIONS_PER_PAGE
        )
        return response
      } catch (error) {
        console.error('Error fetching conversations:', error)
        throw error
      }
    },
    getNextPageParam: (lastPage: ConversationPage, allPages: ConversationPage[]) => {
      if (lastPage.items.length < CONVERSATIONS_PER_PAGE) return undefined
      return allPages.length
    },
    initialPageParam: 0,
    enabled: isAuthenticated && isReady,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true
  })

  // Flatten conversations from all pages
  const conversations = conversationsData?.pages.flatMap(page => page.items) || []
  const totalConversations = conversationsData?.pages[0]?.total || 0

  // Load more conversations
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      setPage(prev => prev + 1)
      fetchNextPage()
    }
  }

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
    isError: isMessagesError,
    refetch: refetchMessages
  } = useQuery<Message[], Error>({
    queryKey: ['messages', selectedConversation],
    queryFn: async () => {
      console.log('Fetching messages for conversation:', {
        conversationId: selectedConversation,
        timestamp: new Date().toISOString()
      })
      if (!selectedConversation) return []
      const conversation = await api.chat.getConversation(selectedConversation)
      const messages = conversation.messages
      console.log('Messages fetched:', {
        conversationId: selectedConversation,
        messageCount: messages.length,
        timestamp: new Date().toISOString()
      })
      return messages
    },
    enabled: !!selectedConversation && isAuthenticated && isReady,
    retry: 2,
    staleTime: 1000 * 60, // Consider data fresh for 1 minute
    gcTime: 1000 * 60 * 60, // Cache for 60 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Disable automatic refetch on window focus
    refetchOnReconnect: false, // Disable automatic refetch on reconnect
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
    
    // When a conversation is selected, update the chat input position
    // with multiple attempts to ensure proper rendering
    if (selectedConversation) {
      // Immediate update
      updateChatInputPosition();
      
      // Series of delayed updates to catch any layout changes
      const timeouts = [
        setTimeout(updateChatInputPosition, 50),
        setTimeout(updateChatInputPosition, 100),
        setTimeout(updateChatInputPosition, 300),
        setTimeout(updateChatInputPosition, 500),
        setTimeout(updateChatInputPosition, 1000)
      ];
      
      return () => {
        timeouts.forEach(clearTimeout);
      };
    }
  }, [selectedConversation, searchParams])

  // Add visibility change listener to handle tab switching
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, updating chat input position');
        // Update immediately and with delays when page becomes visible again
        updateChatInputPosition();
        setTimeout(updateChatInputPosition, 100);
        setTimeout(updateChatInputPosition, 300);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (params: { content: string; structuredFormat?: Record<string, any> }) => {
      if (!selectedConversation) throw new Error('No conversation selected')
      
      console.log('Sending message:', {
        conversationId: selectedConversation,
        content: params.content,
        hasStructuredFormat: !!params.structuredFormat,
        timestamp: new Date().toISOString()
      })
      
      // Get current messages from the cache
      const currentMessages = queryClient.getQueryData(['messages', selectedConversation]) as Message[] || []
      
      // Create a temporary message ID for optimistic updates
      const tempMessageId = crypto.randomUUID()
      const userMessage = {
        id: tempMessageId,
        role: 'user',
        content: params.content,
        created_at: new Date().toISOString(),
        conversation_id: selectedConversation,
        meta_data: params.structuredFormat ? { structuredFormat: params.structuredFormat } : {}
      }
      
      // Create a temporary message for the assistant's response
      const assistantMessageId = crypto.randomUUID()
      const assistantMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
        conversation_id: selectedConversation,
        meta_data: {}
      }
      
      // Update the cache with both messages
      const updatedMessages = [...currentMessages, userMessage, assistantMessage]
      queryClient.setQueryData(['messages', selectedConversation], updatedMessages)

      try {
        // Send the message and handle streaming response
        const response = await api.chat.sendMessage(
          selectedConversation,
          params.content,
          params.structuredFormat,
          (chunk) => {
            queryClient.setQueryData(['messages', selectedConversation], (old: Message[] | undefined) => {
              const messages = old || []
              return messages.map(msg => {
                if (msg.id === assistantMessageId) {
                  // Append the new chunk to the existing content
                  return { ...msg, content: (msg.content || '') + chunk }
                }
                return msg
              })
            })
          }
        )
        
        // We'll skip the automatic refetch after streaming is complete
        // This prevents the screen from jumping around after the message is complete
        // The data we have in cache from streaming is sufficient
        
        return response
      } catch (error) {
        // On error, rollback the optimistic update
        queryClient.setQueryData(['messages', selectedConversation], currentMessages)
        throw error
      }
    },
    onSuccess: async () => {
      // Invalidate conversations to update last message
      await queryClient.invalidateQueries({ queryKey: ['conversations'] })
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

  const handleRepeatMessage = async (content: string) => {
    await handleSendMessage(content)
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
    <div className="flex h-screen overflow-hidden" ref={containerRef}>
      {/* Sidebar with dynamic width */}
      <div 
        className="bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto"
        style={{ width: `${sidebarWidth}%` }}
        ref={sidebarRef}
      >
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversation}
          onSelect={handleSelectConversation}
          isLoading={isLoadingConversations}
          hasMore={!!hasNextPage}
          onLoadMore={handleLoadMore}
          total={totalConversations}
        />
      </div>

      {/* Resizer handle */}
      <div 
        className="w-1 hover:w-1.5 bg-gray-200 hover:bg-blue-500 cursor-col-resize active:bg-blue-600 transition-all flex items-center justify-center"
        onMouseDown={handleDragStart}
      >
        <div className="h-12 w-0.5 bg-gray-400 rounded-full opacity-50 hover:opacity-80"></div>
      </div>

      {/* Main chat area with dynamic width */}
      <div className="flex-1 flex flex-col relative">
        {selectedConversation ? (
          <>
            {/* Message thread with adjusted padding to make room for fixed input */}
            <div className="flex-1 overflow-y-auto p-4 pb-32">
              <MessageThread
                messages={messages || []}
                isLoading={isLoadingMessages}
                error={messagesError}
                onRepeat={handleRepeatMessage}
                isWaitingResponse={sendMessageMutation.isPending}
              />
            </div>
            
            {/* Fixed position chat input that aligns with the sidebar */}
            <div 
              className="fixed bottom-0 bg-white border-t border-gray-200 p-4"
              ref={chatInputRef}
            >
              <ChatInput
                onSend={handleSendMessage}
                disabled={sendMessageMutation.isPending}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-700">Select a conversation or create a new one</h2>
              <p className="text-gray-500 mt-2">Choose from the sidebar or click "New" to start a conversation</p>
            </div>
          </div>
        )}
      </div>

      {/* Data preview modal */}
      <DataPreviewModal
        isOpen={isDataPreviewModalOpen}
        onClose={() => setIsDataPreviewModalOpen(false)}
        messageContent={previewMessageContent}
        onConfirm={handleConfirmPreview}
      />
    </div>
  )
}

export default Chat