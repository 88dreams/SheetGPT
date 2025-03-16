import { useState, useCallback, useEffect, useMemo } from 'react';

interface UseDragAndDropProps<T> {
  items: T[];
}

export function useDragAndDrop<T>({ items }: UseDragAndDropProps<T>) {
  const [reorderedItems, setReorderedItems] = useState<T[]>([]);
  const [draggedItem, setDraggedItem] = useState<T | null>(null);
  const [dragOverItem, setDragOverItem] = useState<T | null>(null);

  // Create a memoized fingerprint of items for efficient comparison
  const itemsFingerprint = useMemo(() => {
    if (items.length === 0) return '';
    // We need a stable representation of items that doesn't depend on order
    // This creates a unique fingerprint of the items collection
    return JSON.stringify([...items].sort());
  }, [items]);

  // Initialize or update reordered items when original items change
  useEffect(() => {
    // Skip processing for empty items
    if (items.length === 0) return;
    
    // Initialize reordered items if empty
    if (reorderedItems.length === 0) {
      setReorderedItems([...items]);
      return;
    }
    
    // Generate fingerprint of current reordered items for comparison
    const reorderedFingerprint = JSON.stringify([...reorderedItems].sort());
    
    // If items collection hasn't actually changed (just reordered), preserve current order
    if (itemsFingerprint === reorderedFingerprint) return;
    
    // Items have changed - maintain existing order where possible
    // Create a new order preserving existing items and adding new ones
    const newOrder: T[] = [];
    
    // Add existing items in their current order
    reorderedItems.forEach(item => {
      if (items.includes(item)) {
        newOrder.push(item);
      }
    });
    
    // Add any new items that weren't in reordered items
    items.forEach(item => {
      if (!newOrder.includes(item)) {
        newOrder.push(item);
      }
    });
    
    // Update state with new order
    setReorderedItems(newOrder);
  }, [items, reorderedItems, itemsFingerprint]);

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