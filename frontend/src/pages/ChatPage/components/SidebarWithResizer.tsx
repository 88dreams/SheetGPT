import React from 'react';
import ConversationList from '../../../components/chat/ConversationList';
import { Conversation } from '../../../utils/api';

interface SidebarWithResizerProps {
  sidebarRef: React.RefObject<HTMLDivElement>;
  sidebarWidth: number;
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  total: number;
  onDragStart: (e: React.MouseEvent) => void;
}

const SidebarWithResizer: React.FC<SidebarWithResizerProps> = ({
  sidebarRef,
  sidebarWidth,
  conversations,
  selectedId,
  onSelect,
  isLoading,
  hasMore,
  onLoadMore,
  total,
  onDragStart
}) => {
  return (
    <>
      {/* Sidebar with dynamic width */}
      <div 
        className="bg-gray-50 border-r border-gray-200 px-1 py-4 overflow-y-auto"
        style={{ width: `${sidebarWidth}%` }}
        ref={sidebarRef}
      >
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={onSelect}
          isLoading={isLoading}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          total={total}
          onReorder={(dragIndex, hoverIndex) => {
            // We're now handling the API call directly in the ConversationList component
            // This is just a backup to keep the parent informed of the changes
            console.log(`Parent received reorder event: ${dragIndex} -> ${hoverIndex}`);
          }}
        />
      </div>

      {/* Resizer handle */}
      <div 
        className="w-1 hover:w-1.5 bg-gray-200 hover:bg-blue-500 cursor-col-resize active:bg-blue-600 transition-all flex items-center justify-center"
        onMouseDown={onDragStart}
      >
        <div className="h-12 w-0.5 bg-gray-400 rounded-full opacity-50 hover:opacity-80"></div>
      </div>
    </>
  );
};

export default SidebarWithResizer;