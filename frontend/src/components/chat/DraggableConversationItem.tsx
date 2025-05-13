import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Conversation } from '../../utils/api'; // Adjust path as needed
import { format, isThisYear, isToday, isYesterday } from 'date-fns'; // Added date-fns imports
import {
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { FaArchive, FaUndo } from 'react-icons/fa';

// Helper function to format dates (duplicated from ConversationList.tsx for now)
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

// Define DragItem type (if not already in a shared types file)
interface DragItem {
  id: string;
  index: number;
}

// Define props for the item component
export interface ConversationItemProps { // Exporting if used by parent for type checking
  conversation: Conversation;
  index: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onStartEdit: (conversation: Conversation, e: React.MouseEvent) => void;
  onArchive: (id: string, e: React.MouseEvent) => void;
  onRestore: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string, title: string, e: React.MouseEvent) => void;
  onToggleSelect: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  isSelected: boolean;
  editingConversation: string | null;
  editTitle: string;
  handleSaveEdit: (id: string, e?: React.MouseEvent) => void;
  handleCancelEdit: (e?: React.MouseEvent) => void;
  handleKeyDown: (id: string, e: React.KeyboardEvent) => void;
  setEditTitle: React.Dispatch<React.SetStateAction<string>>;
  setEditingConversation: React.Dispatch<React.SetStateAction<string | null>>;
  moveConversation: (dragIndex: number, hoverIndex: number) => void;
  // Pass mutation objects or their relevant functions
  archiveConversationMutation: { mutate: (id: string) => void }; 
  restoreConversationMutation: { mutate: (id: string) => void };
  deleteConversationMutation: { mutate: (ids: string[]) => void };
}

const DraggableConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  index,
  selectedId,
  onSelect,
  onStartEdit,
  onArchive,
  onRestore,
  onDelete,
  onToggleSelect,
  isSelected,
  editingConversation,
  editTitle,
  handleSaveEdit,
  handleCancelEdit,
  handleKeyDown,
  setEditTitle,
  setEditingConversation,
  moveConversation,
  archiveConversationMutation,
  restoreConversationMutation,
  deleteConversationMutation
}) => {
  const ref = useRef<HTMLTableRowElement>(null);
  const itemType = 'conversation'; // Consistent item type
  
  const [{ isDragging }, dragRef] = useDrag({
    type: itemType,
    item: () => ({ id: conversation.id, index }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: (item, monitor) => {
      if (!monitor.didDrop()) {
        console.log('Drag cancelled - item not dropped on a droppable target');
        return;
      }
      console.log(`Drag ended for item ${item.id} - successfully dropped`);
    }
  });
  
  const [{ isOver }, dropRef] = useDrop({
    accept: itemType,
    collect: monitor => ({ isOver: monitor.isOver() }),
    drop: (item: DragItem) => {
      if (item.index !== index) {
        moveConversation(item.index, index);
        return { moved: true };
      }
      return { moved: false };
    },
    hover: (item: DragItem, monitor) => {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
      item.index = hoverIndex;
    },
  });
  
  // @ts-expect-error TS2349: Known react-dnd typing issue with refs
  dropRef(ref);
  // @ts-expect-error TS2349: Known react-dnd typing issue with refs
  dragRef(ref);
  
  const opacity = isDragging ? 0.5 : 1;
  
  return (
    <tr
      ref={ref}
      className={`relative cursor-pointer transition-colors border-b border-gray-200 ${
        selectedId === conversation.id
          ? 'bg-blue-50 hover:bg-blue-100'
          : 'hover:bg-gray-50'
      }${isOver ? ' border-2 border-blue-400' : ''}`}
      onClick={() => onSelect(String(conversation.id))} 
      style={{ opacity, cursor: 'pointer' }}
    >
      <td className="w-8 py-2 px-4 align-top">
        <div className="flex justify-center items-center h-full">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onToggleSelect(conversation.id, e)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
      </td>
      <td className="py-2 pr-4 align-top">
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
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-2">
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
                  <p className="text-xs text-gray-400 mt-1">
                    {conversation.meta_data?.archived_at 
                      ? `Archived: ${formatDate(String(conversation.meta_data.archived_at))}`
                      : `Created: ${formatDate(conversation.created_at)}`
                    }
                  </p>
                </div>
                {selectedId === conversation.id && (
                  <div className="flex space-x-1 flex-shrink-0">
                    <button
                      onClick={(e) => onStartEdit(conversation, e)}                       
                      className="p-1 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded"
                      title="Rename conversation"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                    {conversation.meta_data?.archived ? (
                      <button 
                        onClick={(e) => onRestore(conversation.id, e)}
                        className="p-1 text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 rounded"
                        title="Restore conversation from archive"
                      >
                        <FaUndo className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => onArchive(conversation.id, e)}
                        className="p-1 text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded"
                        title="Archive conversation"
                      >
                        <FaArchive className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => onDelete(conversation.id, conversation.title, e)}
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
      </td>
    </tr>
  );
};

export default DraggableConversationItem; 