import React, { useEffect, useMemo, useCallback } from 'react';
import { useDrag, useDrop, DragSourceMonitor, DropTargetMonitor } from 'react-dnd';
import { withRowMemo } from '../../../../utils/memoization';
import { createMemoEqualityFn } from '../../../../utils/fingerprint';

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

// Simple equality check that ensures source fields always update
const fieldItemPropsAreEqual = (prevProps: FieldItemProps, nextProps: FieldItemProps) => {  
  // Source fields should always re-render to ensure they show current data
  if (prevProps.isSource || nextProps.isSource) {
    return false;
  }
  
  // For non-source fields (database fields), basic comparison
  return (
    prevProps.field === nextProps.field &&
    prevProps.className === nextProps.className &&
    prevProps.id === nextProps.id
  );
};

const FieldItem: React.FC<FieldItemProps> = ({ 
  field, 
  value, 
  isSource = false, 
  onDrop, 
  index, 
  className = '', 
  id, 
  formatValue 
}) => {
  // Memoize the onDrop callback to prevent needless rerenders
  const memoizedOnDrop = useCallback((sourceField: string, targetField: string) => {
    console.log(`Dropping ${sourceField} onto ${targetField}`);
    if (onDrop) {
      onDrop(sourceField, targetField);
    }
  }, [onDrop]);

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
        memoizedOnDrop(item.field, field);
        return { field };
      },
      collect: (monitor: DropTargetMonitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
      }),
      canDrop: (item: DragItem) => {
        const canDropItem = item.field !== field;
        return canDropItem;
      },
    });
    
    isOver = dropState.isOver;
    canDrop = dropState.canDrop;
    dropRef = ref;
  }

  // Memoize the border style to prevent recalculation
  const borderStyle = useMemo(() => {
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
  }, [isSource, isDragging, isOver, canDrop]);

  // Add drop indicator for target fields
  const dropIndicator = useMemo(() => {
    if (!isSource && isOver && canDrop) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-green-100 bg-opacity-40 rounded">
          <div className="text-green-600 font-medium text-sm">Drop Here</div>
        </div>
      );
    }
    return null;
  }, [isSource, isOver, canDrop]);

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
      className={`p-3 mb-2 rounded border relative ${borderStyle} ${isDragging ? 'opacity-50' : 'opacity-100'} ${className}`}
    >
      {dropIndicator}
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

// Use withRowMemo HOC with custom props equality function
export default withRowMemo<FieldItemProps>(FieldItem, fieldItemPropsAreEqual);