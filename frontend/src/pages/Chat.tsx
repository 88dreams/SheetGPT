import React, { useState, useEffect, Suspense, useRef, useLayoutEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import ConversationList from '../components/chat/ConversationList'
import MessageThread from '../components/chat/MessageThread'
import ChatInput from '../components/chat/ChatInput'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../hooks/useAuth'
import { api, type Conversation, type Message } from '../utils/api'
import DataPreviewModal from '../components/chat/DataPreviewModal'

type QueryError = {
  message: string;
} | Error | null;

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
    staleTime: 1000 * 60 * 15, // Increase stale time to 15 minutes
    gcTime: 1000 * 60 * 60, // Cache for 60 minutes
    enabled: isAuthenticated && isReady,
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: false, // Disable refetch on window focus to prevent data loss
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
    retry: 2,
    staleTime: 1000 * 60 * 15, // Increase stale time to 15 minutes
    gcTime: 1000 * 60 * 60, // Cache for 60 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Disable refetch on window focus to prevent data loss
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
    <div className="flex h-screen overflow-hidden" ref={containerRef}>
      {/* Sidebar with dynamic width */}
      <div 
        className="bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto"
        style={{ width: `${sidebarWidth}%` }}
        ref={sidebarRef}
      >
        <ConversationList
          conversations={conversations || []}
          selectedId={selectedConversation}
          onSelect={handleSelectConversation}
          isLoading={isLoadingConversations}
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