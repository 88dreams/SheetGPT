import { useState, useCallback } from 'react';
import { fingerprint } from '../../../../utils/fingerprint';

interface UseDragAndDropProps<T> {
  items: T[];
  onReorder: (reorderedItems: T[]) => void;
}

/**
 * Custom hook for handling drag and drop reordering of items.
 * This is a controlled hook; it does not maintain its own state for the item order.
 */
export function useDragAndDrop<T>({ items, onReorder }: UseDragAndDropProps<T>) {
  // State for tracking drag and drop operations
  const [draggedItem, setDraggedItem] = useState<T | null>(null);
  const [dragOverItem, setDragOverItem] = useState<T | null>(null);

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, item: T) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItem(item);
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent, item: T) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedItem !== item) {
      setDragOverItem(item);
    }
  }, [draggedItem]);

  // Handle drop with enhanced object comparison
  const handleDrop = useCallback((e: React.DragEvent, targetItem: T) => {
    e.preventDefault();
    
    // Clear visual state immediately for responsive UI
    setDragOverItem(null);
    
    if (!draggedItem) {
      setDraggedItem(null);
      return;
    }
    
    // Skip if dragging onto itself
    if (fingerprint(draggedItem) === fingerprint(targetItem)) {
      setDraggedItem(null);
      return;
    }
    
    // Get indexes from the current items prop
    const sourceIndex = items.findIndex(item => fingerprint(item) === fingerprint(draggedItem));
    const targetIndex = items.findIndex(item => fingerprint(item) === fingerprint(targetItem));
    
    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      return;
    }
    
    // Create a new array without mutating the original
    const newItems = [...items];
    
    // Remove from source position
    const [removed] = newItems.splice(sourceIndex, 1);
    
    // Insert at target position
    newItems.splice(targetIndex, 0, removed);
    
    // Call the onReorder callback with the new list
    onReorder(newItems);
    
    // Clear drag state
    setDraggedItem(null);
  }, [draggedItem, items, onReorder]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOverItem(null);
  }, []);

  return {
    draggedItem,
    dragOverItem,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd
  };
}

export default useDragAndDrop;