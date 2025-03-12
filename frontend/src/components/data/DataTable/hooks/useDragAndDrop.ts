import { useState, useCallback, useEffect } from 'react';

interface UseDragAndDropProps<T> {
  items: T[];
}

export function useDragAndDrop<T>({ items }: UseDragAndDropProps<T>) {
  const [reorderedItems, setReorderedItems] = useState<T[]>([]);
  const [draggedItem, setDraggedItem] = useState<T | null>(null);
  const [dragOverItem, setDragOverItem] = useState<T | null>(null);

  // Initialize reordered items when original items change
  useEffect(() => {
    if (items.length > 0 && reorderedItems.length === 0) {
      setReorderedItems([...items]);
    }
  }, [items, reorderedItems.length]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, item: T) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItem(item);
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent, item: T) => {
    e.preventDefault();
    if (draggedItem && draggedItem !== item) {
      setDragOverItem(item);
    }
  }, [draggedItem]);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent, targetItem: T) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetItem) return;
    
    const sourceIndex = reorderedItems.indexOf(draggedItem);
    const targetIndex = reorderedItems.indexOf(targetItem);
    
    if (sourceIndex !== -1 && targetIndex !== -1) {
      const newItems = [...reorderedItems];
      newItems.splice(sourceIndex, 1);
      newItems.splice(targetIndex, 0, draggedItem);
      
      setReorderedItems(newItems);
    }
    
    setDraggedItem(null);
    setDragOverItem(null);
  }, [draggedItem, reorderedItems]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOverItem(null);
  }, []);

  return {
    reorderedItems,
    draggedItem,
    dragOverItem,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd
  };
}

export default useDragAndDrop;