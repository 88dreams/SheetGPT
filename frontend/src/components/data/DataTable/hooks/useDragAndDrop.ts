import { useState, useCallback, useEffect } from 'react';

interface UseDragAndDropProps<T> {
  items: T[];
}

export function useDragAndDrop<T>({ items }: UseDragAndDropProps<T>) {
  const [reorderedItems, setReorderedItems] = useState<T[]>([]);
  const [draggedItem, setDraggedItem] = useState<T | null>(null);
  const [dragOverItem, setDragOverItem] = useState<T | null>(null);

  // Initialize or update reordered items when original items change
  useEffect(() => {
    // Always update reordered items when source items change
    if (items.length > 0) {
      // Preserve the order of existing items where possible
      if (reorderedItems.length > 0) {
        // For primitive values like strings (our column names), we can use a simpler comparison
        // Compare items using their string representations
        const itemsStr = JSON.stringify([...items].sort());
        const reorderedStr = JSON.stringify([...reorderedItems].sort());
        
        // If they contain the exact same set of items (regardless of order),
        // don't update to avoid unnecessary state changes
        if (itemsStr === reorderedStr) {
          return;
        }
        
        // Create a new array maintaining order of any existing items
        const newOrder: T[] = [];
        
        // First add all items that exist in both arrays in their current order in reorderedItems
        reorderedItems.forEach(item => {
          if (items.includes(item)) {
            newOrder.push(item);
          }
        });
        
        // Then add any new items that weren't in the original reorderedItems
        items.forEach(item => {
          if (!newOrder.includes(item)) {
            newOrder.push(item);
          }
        });
        
        setReorderedItems(newOrder);
      } else {
        // Just set initial items if reorderedItems is empty
        setReorderedItems([...items]);
      }
    }
  }, [items]);

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