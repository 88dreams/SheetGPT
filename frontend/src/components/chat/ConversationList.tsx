import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNotification } from '../../contexts/NotificationContext'
import { api } from '../../utils/api'
import NewConversationModal from './NewConversationModal'
import LoadingSpinner from '../common/LoadingSpinner'
import { 
  TrashIcon, 
  PencilIcon, 
  CheckIcon, 
  XMarkIcon, 
  PlusIcon,
  Bars3Icon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline'
import { FaArchive, FaUndo, FaEdit } from 'react-icons/fa'
import type { Conversation } from '../../utils/api'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import DraggableConversationItem from './DraggableConversationItem'

interface ConversationListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
  isLoading?: boolean
  hasMore: boolean
  onLoadMore: () => void
  total: number
  onReorder?: (dragIndex: number, hoverIndex: number) => void
}

// Market categories
const MARKETS = ['SPORTS', 'MUSIC', 'CREATOR', 'CORPORATE'];

// Sort types for the ConversationList
type SortField = 'title' | 'date' | 'order'
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  field: SortField
  direction: SortDirection
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelect,
  isLoading = false,
  hasMore,
  onLoadMore,
  total,
  onReorder
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingConversation, setEditingConversation] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set())
  const [localConversations, setLocalConversations] = useState<Conversation[]>([])
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'order', direction: 'asc' })
  const [activeMarket, setActiveMarket] = useState('All');
  const [editingTags, setEditingTags] = useState<string | null>(null);
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  
  useEffect(() => {
    if (editingTags) {
      setEditingTags(null);
    }
  }, [selectedId]);
  
  const sortConversations = useCallback((convs: Conversation[]): Conversation[] => {
    const sorted = [...convs]
    switch (sortConfig.field) {
      case 'title':
        sorted.sort((a, b) => {
          const aTitle = a.title.toLowerCase()
          const bTitle = b.title.toLowerCase()
          return sortConfig.direction === 'asc' 
            ? aTitle.localeCompare(bTitle)
            : bTitle.localeCompare(aTitle)
        })
        break
      case 'date':
        sorted.sort((a, b) => {
          const aDate = new Date(a.created_at).getTime()
          const bDate = new Date(b.created_at).getTime()
          return sortConfig.direction === 'asc' 
            ? aDate - bDate 
            : bDate - aDate
        })
        break
      case 'order':
      default:
        sorted.sort((a, b) => {
          if (a.order !== undefined && b.order !== undefined) {
            return sortConfig.direction === 'asc'
              ? a.order - b.order
              : b.order - a.order
          }
          if (a.order !== undefined) return sortConfig.direction === 'asc' ? -1 : 1
          if (b.order !== undefined) return sortConfig.direction === 'asc' ? 1 : -1
          return 0
        })
        break
    }
    return sorted
  }, [sortConfig])
  
  const handleSort = useCallback((field: SortField) => {
    setSortConfig(prevConfig => {
      if (prevConfig.field === field) {
        return { field, direction: prevConfig.direction === 'asc' ? 'desc' : 'asc' }
      } else {
        return { field, direction: 'asc' }
      }
    })
  }, [])
  
  React.useEffect(() => {
    const sortedConversations = sortConversations(conversations)
    setLocalConversations(sortedConversations)
  }, [conversations, sortConversations])
  
  React.useEffect(() => {
    setLocalConversations(prev => sortConversations([...prev]))
  }, [sortConfig, sortConversations])
  
  const updateOrder = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const updatedConversations = [...localConversations]
      const [movedItem] = updatedConversations.splice(dragIndex, 1)
      updatedConversations.splice(hoverIndex, 0, movedItem)
      setLocalConversations(updatedConversations)
      if (onReorder) {
        onReorder(dragIndex, hoverIndex)
      }
    },
    [localConversations, onReorder]
  )
  
  const moveConversation = useCallback((dragIndex: number, hoverIndex: number) => {
    const currentConversations = [...localConversations]
    const [movedItem] = currentConversations.splice(dragIndex, 1)
    currentConversations.splice(hoverIndex, 0, movedItem)
    setLocalConversations(currentConversations)

    const orderUpdates = currentConversations.map((conv, index) => ({ id: conv.id, order: index }))
    api.chat.updateConversationOrder(orderUpdates)
      .then(() => {
        queryClient.setQueryData(['conversations'], (old: any) => {
          if (!old?.pages) return old
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              items: page.items.map((c: Conversation) => {
                const orderUpdate = orderUpdates.find(u => u.id === c.id)
                return orderUpdate ? { ...c, order: orderUpdate.order } : c
              })
            }))
          }
        })
      })
      .catch(error => {
        console.error('Failed to update conversation order:', error)
        showNotification('error', 'Failed to update conversation order')
        queryClient.invalidateQueries(['conversations'])
      })
      if (onReorder) {
        onReorder(dragIndex, hoverIndex)
      }
  }, [localConversations, onReorder, queryClient, showNotification])

  const createConversationMutation = useMutation({
    mutationFn: api.chat.createConversation,
    onSuccess: (newConversation) => {
      queryClient.setQueryData(['conversations'], (old: any) => {
        if (!old?.pages) return old
        const newTotal = (old.total || 0) + 1
        return {
          ...old,
          total: newTotal,
          pages: old.pages.map((page: any, index: number) => {
            if (index === 0) {
              return { ...page, total: newTotal, items: [newConversation, ...page.items] }
            }
            return { ...page, total: newTotal }
          })
        }
      })
      onSelect(String(newConversation.id))
      sessionStorage.setItem('selectedConversation', String(newConversation.id))
      setIsModalOpen(false)
      showNotification('success', 'Conversation created successfully')
    },
    onError: (error: Error) => {
      let displayMessage = 'Failed to create conversation.'
      if (error && error.message) displayMessage = error.message
      showNotification('error', displayMessage)
    }
  })

  const deleteConversationMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const deletedIds = []
      const errors = []
      for (const id of ids) {
        try { await api.chat.deleteConversation(id); deletedIds.push(id) }
        catch (error) { errors.push({ id, error }) }
      }
      if (errors.length > 0) throw new Error(`Failed to delete ${errors.length} conversation(s)`)
      return deletedIds
    },
    onSuccess: (deletedIds) => {
      queryClient.setQueryData(['conversations'], (old: any) => {
        if (!old?.pages) return old
        const newTotal = old.total - deletedIds.length
        return {
          ...old, total: newTotal,
          pages: old.pages.map((page: any) => ({ ...page, total: newTotal, items: page.items.filter((c: Conversation) => !deletedIds.includes(c.id)) }))
        }
      })
      if (selectedId && deletedIds.includes(selectedId)) {
        onSelect('')
        sessionStorage.removeItem('selectedConversation')
      }
      setSelectedConversations(new Set())
      showNotification('success', `Successfully deleted ${deletedIds.length} conversation(s)`)
    },
    onError: (error: Error) => {
      showNotification('error', error.message)
      setSelectedConversations(new Set())
    }
  })

  const updateConversationMutation = useMutation({
    mutationFn: async (params: { id: string, title?: string, tags?: string[] }) => api.chat.updateConversation(params.id, { title: params.title, tags: params.tags }),
    onSuccess: (updatedConversation) => {
      setLocalConversations(prev =>
        prev.map(c => c.id === updatedConversation.id ? { ...c, ...updatedConversation } : c)
      );

      queryClient.setQueryData(['conversations'], (old: any) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((c: Conversation) => 
              c.id === updatedConversation.id ? { ...c, ...updatedConversation } : c
            )
          }))
        }
      })
      setEditingConversation(null)
      showNotification('success', 'Conversation updated successfully')
    },
    onError: (error: Error) => showNotification('error', error.message)
  })
  
  const archiveConversationMutation = useMutation({
    mutationFn: (id: string) => api.dbManagement.archiveConversation(id),
    onSuccess: (_, conversationId) => {
      queryClient.setQueryData(['conversations'], (old: any) => {
        if (!old?.pages) return old
        return { ...old, pages: old.pages.map((page: any) => ({ ...page, items: page.items.map((c: Conversation) => c.id === conversationId ? { ...c, meta_data: { ...c.meta_data, archived: true, archived_at: new Date().toISOString() } } : c) })) }
      })
      showNotification('success', 'Conversation archived successfully')
    },
    onError: (error: Error) => showNotification('error', `Failed to archive conversation: ${error.message}`)
  })
  
  const restoreConversationMutation = useMutation({
    mutationFn: (id: string) => api.dbManagement.restoreConversation(id),
    onSuccess: (_, conversationId) => {
      queryClient.setQueryData(['conversations'], (old: any) => {
        if (!old?.pages) return old
        return { ...old, pages: old.pages.map((page: any) => ({ ...page, items: page.items.map((c: Conversation) => c.id === conversationId ? { ...c, meta_data: { ...c.meta_data, archived: undefined, archived_at: undefined } } : c) })) }
      })
      showNotification('success', 'Conversation restored successfully')
    },
    onError: (error: Error) => showNotification('error', `Failed to restore conversation: ${error.message}`)
  })

  const handleCreateConversation = async (title: string, description?: string) => {
    console.log('handleCreateConversation called. Active market:', activeMarket);
    const tags = activeMarket === 'All' ? [] : [activeMarket];
    console.log('Creating conversation with tags:', tags);
    await createConversationMutation.mutateAsync({ title, description, tags });
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
  
  const handleArchiveConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to archive this conversation?')) {
      archiveConversationMutation.mutate(id)
    }
  }
  
  const handleRestoreConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    restoreConversationMutation.mutate(id)
  }

  const handleToggleSelect = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
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
      if (prev.size === localConversations.length && localConversations.length > 0) return new Set()
      return new Set(localConversations.map(c => c.id))
    })
  }

  const handleMarketToggle = (conversationId: string, market: string) => {
    const conversation = localConversations.find(c => c.id === conversationId);
    if (!conversation) return;

    const newTags = conversation.tags?.includes(market)
      ? conversation.tags.filter(t => t !== market)
      : [...(conversation.tags || []), market];

    updateConversationMutation.mutate({ id: conversationId, tags: newTags });
  };

  const filteredConversations = localConversations.filter(conversation => {
    if (activeMarket === 'All') return true;
    return conversation.tags?.some(tag => tag.toLowerCase() === activeMarket.toLowerCase());
  });

  if (isLoading && localConversations.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner size="medium" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b">
        <div className="flex justify-between items-center p-4">
          <h2 className="text-lg font-semibold">Conversations ({total})</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
              title="New conversation"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="px-4 pb-2 border-b">
          <div className="flex space-x-2">
            {['All', ...MARKETS].map(market => (
              <button
                key={market}
                onClick={() => setActiveMarket(market)}
                className={`px-3 py-1 text-sm font-medium rounded-full ${
                  activeMarket === market
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {market}
              </button>
            ))}
          </div>
        </div>
      </div>

      <DndProvider backend={HTML5Backend}>
        <div className="flex-1 overflow-y-auto">
          {localConversations.length > 0 && (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="w-8 py-2 px-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedConversations.size === localConversations.length && localConversations.length > 0}
                      onChange={handleToggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      title={selectedConversations.size === localConversations.length ? "Deselect all" : "Select all"}
                    />
                  </th>
                  <th className="py-2 text-left">
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-6">
                        <button 
                          onClick={() => handleSort('title')}
                          className="flex items-center text-sm text-gray-600 hover:text-blue-700"
                          title={`Sort by title ${sortConfig.field === 'title' && sortConfig.direction === 'asc' ? '(Z-A)' : '(A-Z)'}`}
                        >
                          <span className="mr-1">Name</span>
                          {sortConfig.field === 'title' ? (
                            sortConfig.direction === 'asc' 
                              ? <ArrowUpIcon className="h-3.5 w-3.5 text-blue-600" /> 
                              : <ArrowDownIcon className="h-3.5 w-3.5 text-blue-600" />
                          ) : (
                            <ArrowUpIcon className="h-3.5 w-3.5 text-gray-400" />
                          )}
                        </button>
                        
                        <button 
                          onClick={() => handleSort('date')}
                          className="flex items-center text-sm text-gray-600 hover:text-blue-700"
                          title={`Sort by date ${sortConfig.field === 'date' && sortConfig.direction === 'asc' ? '(newest first)' : '(oldest first)'}`}
                        >
                          <span className="mr-1">Date</span>
                          {sortConfig.field === 'date' ? (
                            sortConfig.direction === 'asc' 
                              ? <ArrowUpIcon className="h-3.5 w-3.5 text-blue-600" /> 
                              : <ArrowDownIcon className="h-3.5 w-3.5 text-blue-600" />
                          ) : (
                            <ArrowUpIcon className="h-3.5 w-3.5 text-gray-400" />
                          )}
                        </button>
                        
                        <button 
                          onClick={() => handleSort('order')}
                          className="flex items-center text-sm text-gray-600 hover:text-blue-700"
                          title="Sort by manual order (reordered by drag-and-drop)"
                        >
                          <span className="mr-1">Order</span>
                          {sortConfig.field === 'order' ? (
                            sortConfig.direction === 'asc' 
                              ? <ArrowUpIcon className="h-3.5 w-3.5 text-blue-600" /> 
                              : <ArrowDownIcon className="h-3.5 w-3.5 text-blue-600" />
                          ) : (
                            <ArrowUpIcon className="h-3.5 w-3.5 text-gray-400" />
                          )}
                        </button>
                      </div>
                      
                      {selectedConversations.size > 0 && (
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                          {selectedConversations.size} selected
                        </span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredConversations.map((conversation, index) => (
                  <DraggableConversationItem
                    key={conversation.id}
                    index={index}
                    conversation={conversation}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    onStartEdit={handleStartEdit}
                    onArchive={handleArchiveConversation}
                    onRestore={handleRestoreConversation}
                    onDelete={(id, title, e) => {
                      e.stopPropagation()
                      if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
                        deleteConversationMutation.mutate([id])
                      }
                    }}                  
                    onToggleSelect={handleToggleSelect}
                    isSelected={selectedConversations.has(conversation.id)}
                    editingConversation={editingConversation}
                    editTitle={editTitle}
                    setEditTitle={setEditTitle}
                    setEditingConversation={setEditingConversation}
                    handleSaveEdit={handleSaveEdit}
                    handleCancelEdit={handleCancelEdit}
                    handleKeyDown={handleKeyDown}
                    moveConversation={moveConversation}
                    archiveConversationMutation={archiveConversationMutation}
                    restoreConversationMutation={restoreConversationMutation}
                    deleteConversationMutation={deleteConversationMutation}
                    onMarketToggle={handleMarketToggle}
                    isEditingTags={editingTags === conversation.id}
                    onToggleTagsEdit={(e) => {
                      e.stopPropagation();
                      setEditingTags(prev => prev === conversation.id ? null : conversation.id);
                    }}
                    availableMarkets={MARKETS}
                  />
                ))}
              </tbody>
            </table>
          )}
          
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
      </DndProvider>

      <NewConversationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateConversation}
        isLoading={createConversationMutation.isLoading}
      />
    </div>
  )
}

export default ConversationList