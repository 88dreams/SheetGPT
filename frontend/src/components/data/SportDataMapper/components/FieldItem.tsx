import React, { useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';

export interface FieldItemProps {
  field: string;
  value: any;
  isSource?: boolean;
  onDrop?: (sourceField: string, targetField: string) => void;
}

const ItemType = 'FIELD';

// Define drag item interface
interface DragItem {
  type: string;
  field: string;
}

// Define collected props interfaces
interface DragCollectedProps {
  isDragging: boolean;
}

interface DropCollectedProps {
  isOver: boolean;
  canDrop?: boolean;
}

const FieldItem: React.FC<FieldItemProps> = ({ field, value, isSource = false, onDrop }) => {
  // @ts-ignore - Ignoring type errors for react-dnd hooks
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemType,
    item: { field },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    canDrag: isSource,
  }));

  // For target fields (database fields), implement drop functionality
  const [{ isOver, canDrop }, drop] = useDrop<DragItem, void, DropCollectedProps>({
    accept: ItemType,
    drop: (item) => {
      if (onDrop) {
        onDrop(item.field, field);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
    canDrop: (item) => !isSource && item.field !== field,
  });

  // Add debug logging for drag and drop
  useEffect(() => {
    if (isDragging) {
      console.log(`Dragging field: ${field}`);
    }
    if (isOver) {
      console.log(`Hovering over field: ${field}`);
    }
  }, [isDragging, isOver, field]);

  // Determine the appropriate style based on drag and drop state
  const getBorderStyle = () => {
    if (isSource) {
      return isDragging 
        ? 'bg-blue-100 border-blue-300 cursor-move' 
        : 'bg-blue-50 border-blue-200 cursor-move';
    } else if (isOver && canDrop) {
      return 'bg-green-100 border-green-400 border-2';
    } else if (canDrop) {
      return 'bg-gray-50 border-indigo-200 border-dashed';
    } else {
      return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div
      ref={isSource ? drag : drop}
      className={`p-2 mb-2 rounded border ${getBorderStyle()} ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      <div className="font-medium">{field}</div>
      {value !== undefined && (
        <div className="text-sm text-gray-500 truncate">
          {typeof value === 'object' ? JSON.stringify(value).substring(0, 30) + '...' : String(value)}
        </div>
      )}
    </div>
  );
};

export default FieldItem; 