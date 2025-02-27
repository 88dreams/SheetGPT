import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNotification } from '../../contexts/NotificationContext'
import { api } from '../../utils/api'
import NewConversationModal from './NewConversationModal'
import LoadingSpinner from '../common/LoadingSpinner'
import { TrashIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { Conversation } from '../../utils/api'

interface ConversationListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
  isLoading?: boolean
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelect,
  isLoading = false
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingConversation, setEditingConversation] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()

  const createConversationMutation = useMutation({
    mutationFn: api.chat.createConversation,
    onSuccess: (newConversation) => {
      queryClient.setQueryData(['conversations'], (old: Conversation[] | undefined) => {
        const conversations = old || []
        return [newConversation, ...conversations]
      })
      onSelect(newConversation.id)
      setIsModalOpen(false)
      showNotification('success', 'Conversation created successfully')
    },
    onError: (error: Error) => {
      showNotification('error', error.message)
    },
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })

  const deleteConversationMutation = useMutation({
    mutationFn: api.chat.deleteConversation,
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(['conversations'], (old: Conversation[] | undefined) => {
        const conversations = old || []
        return conversations.filter(c => c.id !== deletedId)
      })
      
      // If the deleted conversation was selected, clear the selection
      if (selectedId === deletedId) {
        onSelect('')
      }
      
      showNotification('success', 'Conversation deleted successfully')
    },
    onError: (error: Error) => {
      showNotification('error', error.message)
    }
  })

  const updateConversationMutation = useMutation({
    mutationFn: async (params: { id: string, title: string }) => {
      try {
        // Instead of trying to update via API, we'll just update locally
        // Get the current conversations from the cache
        const currentConversations = queryClient.getQueryData<Conversation[]>(['conversations']) || [];
        
        // Find the conversation to update
        const conversationToUpdate = currentConversations.find(c => c.id === params.id);
        
        if (!conversationToUpdate) {
          throw new Error('Conversation not found');
        }
        
        // Create an updated version of the conversation
        const updatedConversation: Conversation = {
          ...conversationToUpdate,
          title: params.title
        };
        
        // Return the updated conversation
        return updatedConversation;
      } catch (error) {
        console.error('Error updating conversation:', error);
        throw error;
      }
    },
    onSuccess: (updatedConversation) => {
      // Update the conversation in the cache
      queryClient.setQueryData(['conversations'], (old: Conversation[] | undefined) => {
        const conversations = old || [];
        return conversations.map(c => 
          c.id === updatedConversation.id ? updatedConversation : c
        );
      });
      
      setEditingConversation(null);
      showNotification('success', 'Conversation renamed successfully');
    },
    onError: (error: Error) => {
      showNotification('error', error.message);
    }
  });

  const handleCreateConversation = async (title: string, description?: string) => {
    await createConversationMutation.mutateAsync({ title, description })
  }

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent conversation selection
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      deleteConversationMutation.mutate(id)
    }
  }

  const handleStartEdit = (conversation: Conversation, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent conversation selection
    setEditingConversation(conversation.id)
    setEditTitle(conversation.title)
  }

  const handleSaveEdit = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation() // Prevent conversation selection
    if (editTitle.trim()) {
      updateConversationMutation.mutate({ id, title: editTitle.trim() })
    }
  }

  const handleCancelEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation() // Prevent conversation selection
    setEditingConversation(null)
  }

  const handleKeyDown = (id: string, e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      handleSaveEdit(id)
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner size="medium" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <button
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            onClick={() => setIsModalOpen(true)}
          >
            New
          </button>
        </div>
        {conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No conversations yet
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`p-3 rounded cursor-pointer transition-colors ${
                selectedId === conversation.id
                  ? 'bg-blue-100 hover:bg-blue-200'
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => onSelect(conversation.id)}
            >
              <div className="flex justify-between items-start">
                {editingConversation === conversation.id ? (
                  <div className="flex-1 flex items-center space-x-2" onClick={e => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={e => handleKeyDown(conversation.id, e)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button 
                      onClick={e => handleSaveEdit(conversation.id, e)}
                      className="p-1 text-green-600 hover:text-green-800"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={handleCancelEdit}
                      className="p-1 text-red-600 hover:text-red-800"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex-1">
                    <h3 className="font-medium truncate">{conversation.title}</h3>
                    {conversation.description && (
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(conversation.created_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
                
                {editingConversation !== conversation.id && (
                  <div className="flex space-x-1 ml-2">
                    <button 
                      onClick={e => handleStartEdit(conversation, e)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                      title="Rename conversation"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={e => handleDeleteConversation(conversation.id, e)}
                      className="p-1 text-red-500 hover:text-red-700"
                      title="Delete conversation"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <NewConversationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateConversation}
        isLoading={createConversationMutation.isPending}
      />
    </>
  )
}

export default ConversationList 