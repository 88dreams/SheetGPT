import React, { useEffect } from 'react';
import { useDrag, useDrop, DragSourceMonitor, DropTargetMonitor } from 'react-dnd';

export interface FieldItemProps {
  field: string;
  value: any;
  isSource?: boolean;
  onDrop?: (sourceField: string, targetField: string) => void;
  index?: number;
  className?: string;
  id?: string;
  formatValue: (value: any) => string;
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
  canDrop: boolean;
}

const FieldItem: React.FC<FieldItemProps> = ({ field, value, isSource = false, onDrop, index, className = '', id, formatValue }) => {
  // Variables for drag and drop state
  let isDragging = false;
  let dragRef: any = null;
  let isOver = false;
  let canDrop = false;
  let dropRef: any = null;

  // Safely handle drag operations with fallback for when not in DndProvider context
  try {
    // Only use useDrag if this is a source field
    if (isSource) {
      const [{ isDragging: dragging }, ref] = useDrag({
        type: ItemType,
        item: { type: ItemType, field },
        collect: (monitor: DragSourceMonitor) => ({
          isDragging: !!monitor.isDragging(),
        }),
      });
      
      isDragging = dragging;
      dragRef = ref;
    }
  } catch (error) {
    console.error("Error initializing drag in FieldItem:", error);
    // Continue with fallback rendering
  }

  // For target fields (database fields), implement drop functionality
  if (!isSource && onDrop) {
    const [dropState, ref] = useDrop({
      accept: ItemType,
      drop: (item: DragItem) => {
        console.log(`Dropping ${item.field} onto ${field}`);
        if (onDrop) {
          onDrop(item.field, field);
        }
        return { field };
      },
      collect: (monitor: DropTargetMonitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
      }),
      canDrop: (item: DragItem) => {
        const canDropItem = item.field !== field;
        console.log(`Can drop ${item.field} onto ${field}? ${canDropItem}`);
        return canDropItem;
      },
    });
    
    isOver = dropState.isOver;
    canDrop = dropState.canDrop;
    dropRef = ref;
  }

  // Add debug logging for drag and drop
  useEffect(() => {
    if (isDragging) {
      console.log(`Dragging field: ${field}`);
    }
    if (isOver) {
      console.log(`Hovering over field: ${field}, canDrop: ${canDrop}`);
    }
  }, [isDragging, isOver, field, canDrop]);

  // Debug log to check the value
  useEffect(() => {
    console.log(`Field: ${field}, Value:`, value, `isSource: ${isSource}`);
  }, [field, value, isSource]);

  // Determine the appropriate style based on drag and drop state
  const getBorderStyle = () => {
    if (isSource) {
      return isDragging 
        ? 'bg-blue-100 border-blue-300 cursor-move shadow-md' 
        : 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 cursor-move transition-all';
    } else if (isOver && canDrop) {
      return 'bg-green-100 border-green-400 border-2 shadow-md';
    } else if (canDrop) {
      return 'bg-gray-50 border-indigo-200 border-dashed hover:border-indigo-400 transition-all';
    } else {
      return 'bg-gray-50 border-gray-200 hover:bg-gray-100 transition-all';
    }
  };

  // Add drop indicator for target fields
  const renderDropIndicator = () => {
    if (!isSource && isOver && canDrop) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-green-100 bg-opacity-40 rounded">
          <div className="text-green-600 font-medium text-sm">Drop Here</div>
        </div>
      );
    }
    return null;
  };

  // Format the value for display
  const displayValue = value !== undefined && value !== null && value !== "" 
    ? formatValue(value) 
    : "—";

  // Determine which ref to use
  const ref = isSource ? dragRef : dropRef;

  return (
    <div
      id={id}
      ref={ref}
      className={`p-3 mb-2 rounded border relative ${getBorderStyle()} ${isDragging ? 'opacity-50' : 'opacity-100'} ${className}`}
    >
      {renderDropIndicator()}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center">
          <div className="font-medium text-indigo-700 truncate text-sm" title={field}>
            {field}
          </div>
        </div>
        
        {/* Display value in a separate column, left-justified */}
        <div className="flex items-center">
          <div 
            className="text-gray-700 font-medium truncate text-sm"
            title={displayValue}
          >
            {displayValue}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldItem; 