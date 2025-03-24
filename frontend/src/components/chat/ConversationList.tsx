import React, { useState, useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNotification } from '../../contexts/NotificationContext'
import { api } from '../../utils/api'
import NewConversationModal from './NewConversationModal'
import LoadingSpinner from '../common/LoadingSpinner'
import { format, isThisYear, isToday, isYesterday } from 'date-fns'
import { 
  TrashIcon, 
  PencilIcon, 
  CheckIcon, 
  XMarkIcon, 
  PlusIcon,
  Bars3Icon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarDaysIcon,
  ListBulletIcon
} from '@heroicons/react/24/outline'
import { FaArchive, FaUndo } from 'react-icons/fa'
import type { Conversation } from '../../utils/api'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

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

// Helper function to format dates in a concise, readable format
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  
  if (isToday(date)) {
    return format(date, "'Today' h:mm a");
  } else if (isYesterday(date)) {
    return 'Yesterday';
  } else if (isThisYear(date)) {
    return format(date, 'MMM d');
  } else {
    return format(date, 'MM/dd/yy');
  }
}

const DraggableConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  index,
  selectedId,
  onSelect,
  onStartEdit,
  onArchive,
  onRestore,
  onToggleSelect,
  isSelected,
  editingConversation,
  editTitle,
  handleSaveEdit,
  handleCancelEdit,
  handleKeyDown,
  setEditTitle,
  moveConversation
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const itemType = 'conversation';
  
  const [{ isDragging }, drag] = useDrag({
    type: itemType,
    item: () => {
      console.log(`Starting drag for item at index ${index}: ${conversation.id}`);
      return { id: conversation.id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      if (!monitor.didDrop()) {
        console.log('Drag cancelled - item not dropped on a droppable target');
        return;
      }
      console.log(`Drag ended for item ${item.id} - successfully dropped`);
    }
  });
  
  const [{ isOver }, drop] = useDrop({
    accept: itemType,
    collect: monitor => ({
      isOver: monitor.isOver()
    }),
    drop: (item: DragItem) => {
      console.log(`Drop detected: item from index ${item.index} to index ${index}`);
      
      // Only move if actually dropping on a different position
      if (item.index !== index) {
        console.log(`Calling moveConversation(${item.index}, ${index})`);
        moveConversation(item.index, index);
        return { moved: true };
      } else {
        console.log(`Drop ignored - same position (${index})`);
        return { moved: false };
      }
    },
    hover: (item: DragItem, monitor) => {
      if (!ref.current) {
        return;
      }
      
      const dragIndex = item.index;
      const hoverIndex = index;
      
      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }
      
      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      
      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      
      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      
      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      
      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }
      
      // We're not actually going to move the item on hover anymore
      // This was causing too many API calls and state updates
      // Instead, we'll just update the drag item's index so the drop will work correctly
      
      // console.log(`Hover updating drag item index: ${dragIndex} -> ${hoverIndex}`);
      
      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });
  
  // Initialize drag and drop into ref
  const refConnect = (node: HTMLDivElement | null) => {
    drag(node);
    drop(node);
    if (ref.current !== node) {
      ref.current = node;
    }
  };
  
  const opacity = isDragging ? 0.5 : 1;
  
  return (
    <div
      ref={refConnect}
      className={`relative rounded cursor-pointer transition-colors ${
        selectedId === conversation.id
          ? 'bg-blue-100 hover:bg-blue-200'
          : 'hover:bg-gray-100'
      }${isOver ? ' border-2 border-blue-400' : ''}`}
      onClick={() => onSelect(conversation.id)}
      style={{ opacity, cursor: 'pointer' }}
    >
      <div className="flex items-center px-4 py-2">
        {/* Checkbox */}
        <div className="w-5 mr-4 flex justify-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onToggleSelect(conversation.id, e as any)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
        
        {/* Content */}
        <div className="min-w-0 flex-1">
          {editingConversation === conversation.id ? (
            <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
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
              <div className="flex items-center">
                <h3 className={`font-medium truncate text-sm ${conversation.meta_data?.archived ? 'text-gray-500' : ''}`}>
                  {conversation.title}
                </h3>
                {conversation.meta_data?.archived && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-800 rounded">
                    Archived
                  </span>
                )}
              </div>
              {conversation.description && (
                <p className="text-xs text-gray-600 truncate">
                  {conversation.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {conversation.meta_data?.archived_at 
                    ? `Archived: ${formatDate(conversation.meta_data.archived_at)}`
                    : `Created: ${formatDate(conversation.created_at)}`
                  }
                </p>
                
                {/* Action buttons for selected conversation */}
                {selectedId === conversation.id && (
                  <div className="flex space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingConversation(conversation.id);
                        setEditTitle(conversation.title);
                      }}
                      className="p-1 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded"
                      title="Rename conversation"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                    
                    {conversation.meta_data?.archived ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          restoreConversationMutation.mutate(conversation.id);
                        }}
                        className="p-1 text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 rounded"
                        title="Restore conversation from archive"
                      >
                        <FaUndo className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to archive this conversation?')) {
                            archiveConversationMutation.mutate(conversation.id);
                          }
                        }}
                        className="p-1 text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded"
                        title="Archive conversation"
                      >
                        <FaArchive className="h-3.5 w-3.5" />
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete "${conversation.title}"?`)) {
                          deleteConversationMutation.mutate([conversation.id]);
                        }
                      }}
                      className="p-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded"
                      title="Delete conversation"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Sort types for the ConversationList
type SortField = 'title' | 'date' | 'order';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
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
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  
  // Function to sort conversations based on the current sort config
  const sortConversations = useCallback((convs: Conversation[]): Conversation[] => {
    const sorted = [...convs];
    
    switch (sortConfig.field) {
      case 'title':
        sorted.sort((a, b) => {
          const aTitle = a.title.toLowerCase();
          const bTitle = b.title.toLowerCase();
          return sortConfig.direction === 'asc' 
            ? aTitle.localeCompare(bTitle)
            : bTitle.localeCompare(aTitle);
        });
        break;
        
      case 'date':
        sorted.sort((a, b) => {
          const aDate = new Date(a.created_at).getTime();
          const bDate = new Date(b.created_at).getTime();
          return sortConfig.direction === 'asc' 
            ? aDate - bDate 
            : bDate - aDate;
        });
        break;
        
      case 'order':
      default:
        sorted.sort((a, b) => {
          // If both have order, sort by order
          if (a.order !== undefined && b.order !== undefined) {
            return sortConfig.direction === 'asc'
              ? a.order - b.order
              : b.order - a.order;
          }
          // If only one has order, the one with order comes first
          if (a.order !== undefined) return sortConfig.direction === 'asc' ? -1 : 1;
          if (b.order !== undefined) return sortConfig.direction === 'asc' ? 1 : -1;
          // If neither has order, maintain original order
          return 0;
        });
        break;
    }
    
    return sorted;
  }, [sortConfig]);
  
  // Toggle sort direction or change sort field
  const handleSort = useCallback((field: SortField) => {
    setSortConfig(prevConfig => {
      if (prevConfig.field === field) {
        // Toggle direction if field is the same
        return {
          field,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      } else {
        // Default to ascending for new field
        return {
          field,
          direction: 'asc'
        };
      }
    });
  }, []);
  
  // Initialize local conversations from props
  React.useEffect(() => {
    // Apply current sort configuration
    const sortedConversations = sortConversations(conversations);
    
    // Only update if the IDs or order have changed to prevent infinite loops
    const shouldUpdate = localConversations.length !== sortedConversations.length || 
      localConversations.some((conv, idx) => 
        conv.id !== sortedConversations[idx]?.id || 
        conv.order !== sortedConversations[idx]?.order
      );
      
    if (shouldUpdate) {
      console.log("Updating local conversations from props");
      setLocalConversations(sortedConversations);
    }
  }, [conversations, localConversations, sortConversations])
  
  // Re-sort conversations when sort config changes
  React.useEffect(() => {
    setLocalConversations(sortConversations([...localConversations]));
  }, [sortConfig, sortConversations])
  
  // Function to move a conversation from one position to another
  const updateOrder = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      console.log(`Moving conversation from index ${dragIndex} to ${hoverIndex}`);
      
      // Create a new array with the updated order
      const updatedConversations = [...localConversations];
      const [movedItem] = updatedConversations.splice(dragIndex, 1);
      updatedConversations.splice(hoverIndex, 0, movedItem);
      
      // Immediately update local state for responsive UI
      setLocalConversations(updatedConversations);
      
      // Log the result
      console.log(
        `Reordered conversations:`, 
        updatedConversations.map((c, i) => ({ index: i, id: c.id, title: c.title }))
      );
      
      // Notify parent component about the reorder
      if (onReorder) {
        onReorder(dragIndex, hoverIndex);
      }
    },
    [localConversations, onReorder]
  )
  
  // Drag and drop reordering function
  const moveConversation = useCallback((dragIndex: number, hoverIndex: number) => {
    // First, update the local state immediately for responsive UI
    const updatedConversations = [...localConversations];
    const [movedItem] = updatedConversations.splice(dragIndex, 1);
    updatedConversations.splice(hoverIndex, 0, movedItem);
    
    // Update local state
    setLocalConversations(updatedConversations);
    
    console.log(`Moving conversation from index ${dragIndex} to ${hoverIndex}`);
    console.log(`Reordered conversations:`, 
      updatedConversations.map((c, i) => ({ index: i, id: c.id, title: c.title }))
    );
    
    // Generate order updates for API
    const orderUpdates = updatedConversations.map((conv, index) => ({
      id: conv.id,
      order: index
    }));
    
    // Send API update
    api.chat.updateConversationOrder(orderUpdates)
      .then(() => {
        console.log('Order successfully updated in database');
        
        // Update cache
        queryClient.setQueryData(['conversations'], (old: any) => {
          if (!old?.pages) return old;
          
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              items: page.items.map((c: Conversation) => {
                const orderUpdate = orderUpdates.find(u => u.id === c.id);
                return orderUpdate ? { ...c, order: orderUpdate.order } : c;
              })
            }))
          };
        });
      })
      .catch(error => {
        console.error('Failed to update conversation order:', error);
        showNotification('error', 'Failed to update conversation order');
        // Revert to original state
        queryClient.invalidateQueries(['conversations']);
      });
      
    // Still call the parent's onReorder if provided
    if (onReorder) {
      onReorder(dragIndex, hoverIndex);
    }
  }, [localConversations, onReorder, queryClient, showNotification]);

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
      // Store the new conversation ID in sessionStorage
      sessionStorage.setItem('selectedConversation', newConversation.id);
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
        // Also clear from sessionStorage
        sessionStorage.removeItem('selectedConversation');
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
  
  // Archive conversation mutation
  const archiveConversationMutation = useMutation({
    mutationFn: (id: string) => api.dbManagement.archiveConversation(id),
    onSuccess: (_, conversationId) => {
      // Update the local cache to mark the conversation as archived
      queryClient.setQueryData(['conversations'], (old: any) => {
        if (!old?.pages) return old;
        
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((c: Conversation) => 
              c.id === conversationId 
                ? { 
                    ...c, 
                    meta_data: { 
                      ...c.meta_data, 
                      archived: true, 
                      archived_at: new Date().toISOString() 
                    } 
                  }
                : c
            )
          }))
        }
      });
      
      showNotification('success', 'Conversation archived successfully');
    },
    onError: (error: Error) => {
      showNotification('error', `Failed to archive conversation: ${error.message}`);
    }
  });
  
  // Restore conversation mutation
  const restoreConversationMutation = useMutation({
    mutationFn: (id: string) => api.dbManagement.restoreConversation(id),
    onSuccess: (_, conversationId) => {
      // Update the local cache to mark the conversation as not archived
      queryClient.setQueryData(['conversations'], (old: any) => {
        if (!old?.pages) return old;
        
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((c: Conversation) => 
              c.id === conversationId 
                ? { 
                    ...c, 
                    meta_data: { 
                      ...c.meta_data, 
                      archived: undefined, 
                      archived_at: undefined 
                    } 
                  }
                : c
            )
          }))
        }
      });
      
      showNotification('success', 'Conversation restored successfully');
    },
    onError: (error: Error) => {
      showNotification('error', `Failed to restore conversation: ${error.message}`);
    }
  });

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
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Table header with sort controls */}
        {localConversations.length > 0 && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="w-8 py-2 px-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedConversations.size === localConversations.length}
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
              {localConversations.map((conversation, index) => (
                <tr 
                  key={conversation.id}
                  className={`border-b cursor-pointer ${
                    selectedId === conversation.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onSelect(conversation.id)}
                >
                  <td className="w-8 py-2 px-4 align-top">
                    <input
                      type="checkbox"
                      checked={selectedConversations.has(conversation.id)}
                      onChange={(e) => onToggleSelect(conversation.id, e as any)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2 pr-4">
                    {editingConversation === conversation.id ? (
                      <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
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
                        <div className="flex items-center">
                          <h3 className={`font-medium truncate text-sm ${conversation.meta_data?.archived ? 'text-gray-500' : ''}`}>
                            {conversation.title}
                          </h3>
                          {conversation.meta_data?.archived && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-800 rounded">
                              Archived
                            </span>
                          )}
                        </div>
                        {conversation.description && (
                          <p className="text-xs text-gray-600 truncate">
                            {conversation.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">
                            {conversation.meta_data?.archived_at 
                              ? `Archived: ${formatDate(conversation.meta_data.archived_at)}`
                              : `Created: ${formatDate(conversation.created_at)}`
                            }
                          </p>
                          
                          {/* Action buttons for selected conversation */}
                          {selectedId === conversation.id && (
                            <div className="flex space-x-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingConversation(conversation.id);
                                  setEditTitle(conversation.title);
                                }}
                                className="p-1 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded"
                                title="Rename conversation"
                              >
                                <PencilIcon className="h-3.5 w-3.5" />
                              </button>
                              
                              {conversation.meta_data?.archived ? (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    restoreConversationMutation.mutate(conversation.id);
                                  }}
                                  className="p-1 text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 rounded"
                                  title="Restore conversation from archive"
                                >
                                  <FaUndo className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Are you sure you want to archive this conversation?')) {
                                      archiveConversationMutation.mutate(conversation.id);
                                    }
                                  }}
                                  className="p-1 text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded"
                                  title="Archive conversation"
                                >
                                  <FaArchive className="h-3.5 w-3.5" />
                                </button>
                              )}
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Are you sure you want to delete "${conversation.title}"?`)) {
                                    deleteConversationMutation.mutate([conversation.id]);
                                  }
                                }}
                                className="p-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded"
                                title="Delete conversation"
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
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