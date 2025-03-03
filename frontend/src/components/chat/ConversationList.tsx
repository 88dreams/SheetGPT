import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNotification } from '../../contexts/NotificationContext'
import { api } from '../../utils/api'
import NewConversationModal from './NewConversationModal'
import LoadingSpinner from '../common/LoadingSpinner'
import { TrashIcon, PencilIcon, CheckIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
import type { Conversation } from '../../utils/api'

interface ConversationListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
  isLoading?: boolean
  hasMore: boolean
  onLoadMore: () => void
  total: number
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelect,
  isLoading = false,
  hasMore,
  onLoadMore,
  total
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingConversation, setEditingConversation] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: api.chat.createConversation,
    onSuccess: (newConversation) => {
      queryClient.setQueryData(['conversations'], (old: any) => {
        if (!old?.pages) return old;
        
        // Update the total count
        const newTotal = (old.total || 0) + 1;
        
        // Add the new conversation to the first page
        return {
          ...old,
          total: newTotal,
          pages: old.pages.map((page: any, index: number) => {
            if (index === 0) {
              return {
                ...page,
                total: newTotal,
                items: [newConversation, ...page.items]
              };
            }
            return {
              ...page,
              total: newTotal
            };
          })
        };
      });
      onSelect(newConversation.id);
      setIsModalOpen(false);
      showNotification('success', 'Conversation created successfully');
    },
    onError: (error: Error) => {
      showNotification('error', error.message);
    }
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const deletedIds = [];
      const errors = [];
      
      // Delete conversations sequentially
      for (const id of ids) {
        try {
          await api.chat.deleteConversation(id);
          deletedIds.push(id);
        } catch (error) {
          console.error(`Failed to delete conversation ${id}:`, error);
          errors.push({ id, error });
        }
      }
      
      if (errors.length > 0) {
        throw new Error(`Failed to delete ${errors.length} conversation(s)`);
      }
      
      return deletedIds;
    },
    onSuccess: (deletedIds) => {
      // Update the cache to remove deleted conversations
      queryClient.setQueryData(['conversations'], (old: any) => {
        if (!old?.pages) return old;
        
        // Calculate new total after deletion
        const newTotal = old.total - deletedIds.length;
        
        return {
          ...old,
          total: newTotal,
          pages: old.pages.map((page: any) => ({
            ...page,
            total: newTotal, // Update total in each page
            items: page.items.filter((c: Conversation) => !deletedIds.includes(c.id))
          }))
        }
      });
      
      // If the deleted conversation was selected, clear the selection
      if (selectedId && deletedIds.includes(selectedId)) {
        onSelect('');
      }
      
      // Clear selected conversations
      setSelectedConversations(new Set());
      
      showNotification('success', `Successfully deleted ${deletedIds.length} conversation(s)`);
    },
    onError: (error: Error) => {
      showNotification('error', error.message);
      // Clear selected conversations on error to prevent stuck state
      setSelectedConversations(new Set());
    }
  });

  // Update conversation mutation
  const updateConversationMutation = useMutation({
    mutationFn: async (params: { id: string, title: string }) => {
      return api.chat.updateConversation(params.id, { title: params.title })
    },
    onSuccess: (updatedConversation) => {
      queryClient.setQueryData(['conversations'], (old: Conversation[] | undefined) => {
        const conversations = old || []
        return conversations.map(c => 
          c.id === updatedConversation.id ? updatedConversation : c
        )
      })
      
      setEditingConversation(null)
      showNotification('success', 'Conversation renamed successfully')
    },
    onError: (error: Error) => {
      showNotification('error', error.message)
    }
  })

  const handleCreateConversation = async (title: string, description?: string) => {
    await createConversationMutation.mutateAsync({ title, description })
  }

  const handleDeleteSelected = () => {
    if (selectedConversations.size === 0) return
    
    if (window.confirm(`Are you sure you want to delete ${selectedConversations.size} conversation(s)?`)) {
      deleteConversationMutation.mutate(Array.from(selectedConversations))
    }
  }

  const handleStartEdit = (conversation: Conversation, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingConversation(conversation.id)
    setEditTitle(conversation.title)
  }

  const handleSaveEdit = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (editTitle.trim()) {
      updateConversationMutation.mutate({ id, title: editTitle.trim() })
    }
  }

  const handleCancelEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
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

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedConversations(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleToggleSelectAll = () => {
    setSelectedConversations(prev => {
      if (prev.size === conversations.length) {
        return new Set()
      }
      return new Set(conversations.map(c => c.id))
    })
  }

  if (isLoading && !conversations.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner size="medium" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold">Conversations ({total})</h2>
        <div className="flex items-center space-x-2">
          {selectedConversations.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-100"
              title="Delete selected"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length > 0 && (
          <div className="p-4 border-b">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedConversations.size === conversations.length}
                onChange={handleToggleSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">
                {selectedConversations.size === conversations.length
                  ? 'Deselect all'
                  : 'Select all'}
              </span>
            </label>
          </div>
        )}

        <div className="space-y-1 p-4">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`py-2 px-3 rounded cursor-pointer transition-colors ${
                selectedId === conversation.id
                  ? 'bg-blue-100 hover:bg-blue-200'
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => onSelect(conversation.id)}
            >
              <div className="flex justify-between items-start space-x-2">
                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedConversations.has(conversation.id)}
                    onChange={(e) => handleToggleSelect(conversation.id, e as any)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
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
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate text-sm">{conversation.title}</h3>
                      {conversation.description && (
                        <p className="text-xs text-gray-600 truncate">
                          {conversation.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {new Date(conversation.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
                
                {editingConversation !== conversation.id && (
                  <div className="flex space-x-1 ml-2">
                    <button 
                      onClick={e => handleStartEdit(conversation, e)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                      title="Rename conversation"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {hasMore && (
          <div className="p-4 text-center">
            <button
              onClick={onLoadMore}
              disabled={isLoading}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
            >
              {isLoading ? (
                <LoadingSpinner size="small" />
              ) : (
                'Load More'
              )}
            </button>
          </div>
        )}
      </div>

      <NewConversationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateConversation}
        isLoading={createConversationMutation.isPending}
      />
    </div>
  )
}

export default ConversationList 