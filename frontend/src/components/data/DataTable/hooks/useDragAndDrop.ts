import { useState, useCallback, useEffect, useRef } from 'react';

interface UseDragAndDropProps<T> {
  items: T[];
  storageKey?: string; // Optional storage key for persisting order
}

/**
 * Custom hook for handling drag and drop reordering of items
 * 
 * This is a completely rewritten version to avoid circular dependencies
 * and infinite render loops in React components
 */
export function useDragAndDrop<T>({ items, storageKey }: UseDragAndDropProps<T>) {
  // Use a ref to track the original items for comparison
  const itemsRef = useRef<T[]>([]);
  
  // State for tracking reordered items
  const [reorderedItems, setReorderedItems] = useState<T[]>([]);
  
  // State for tracking drag and drop operations
  const [draggedItem, setDraggedItem] = useState<T | null>(null);
  const [dragOverItem, setDragOverItem] = useState<T | null>(null);
  
  // Track if we've loaded data from localStorage
  const hasLoadedFromStorage = useRef(false);

  // Initialize or update when items change
  useEffect(() => {
    // Skip empty items
    if (!items || items.length === 0) return;
    
    // Skip if items array hasn't actually changed
    // This prevents unnecessary re-renders
    if (
      itemsRef.current.length === items.length && 
      JSON.stringify(itemsRef.current.sort()) === JSON.stringify([...items].sort())
    ) {
      return;
    }
    
    // Update our ref to the new items
    itemsRef.current = [...items];
    
    // Skip loading from localStorage if we've already done it
    // and items still match what we have in storage
    if (
      hasLoadedFromStorage.current && 
      reorderedItems.length > 0 && 
      // Check if all our items are in the reordered array already
      items.every(item => reorderedItems.includes(item))
    ) {
      // Make sure all new items get added
      const newItems = items.filter(item => !reorderedItems.includes(item));
      if (newItems.length > 0) {
        setReorderedItems(prev => [...prev, ...newItems]);
      }
      return;
    }
    
    // Try to load from localStorage
    if (storageKey && !hasLoadedFromStorage.current) {
      try {
        const savedOrder = localStorage.getItem(storageKey);
        if (savedOrder) {
          const parsedOrder = JSON.parse(savedOrder);
          
          // Filter to include only valid items from the current items array
          const validItems = parsedOrder.filter((item: any) => 
            items.includes(item)
          );
          
          // Add any missing items
          const allItems = [...validItems];
          items.forEach(item => {
            if (!allItems.includes(item)) {
              allItems.push(item);
            }
          });
          
          if (allItems.length > 0) {
            setReorderedItems(allItems);
            hasLoadedFromStorage.current = true;
            return;
          }
        }
      } catch (error) {
        console.error(`Error loading persisted order for ${storageKey}:`, error);
      }
    }
    
    // Default: use items as is
    setReorderedItems([...items]);
  }, [items, storageKey]);
  
  // Save to localStorage whenever order changes
  // This is separate from the items initialization effect
  const persistToStorage = useCallback(() => {
    if (storageKey && reorderedItems.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(reorderedItems));
    }
  }, [reorderedItems, storageKey]);
  
  useEffect(() => {
    if (reorderedItems.length > 0) {
      persistToStorage();
    }
  }, [reorderedItems, persistToStorage]);

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

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent, targetItem: T) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem === targetItem) {
      return;
    }
    
    // Get indexes from current order
    const sourceIndex = reorderedItems.indexOf(draggedItem);
    const targetIndex = reorderedItems.indexOf(targetItem);
    
    if (sourceIndex === -1 || targetIndex === -1) {
      return;
    }
    
    // Create a new array without mutating the original
    const newItems = [...reorderedItems];
    
    // Remove from source position
    newItems.splice(sourceIndex, 1);
    
    // Insert at target position
    newItems.splice(targetIndex, 0, draggedItem);
    
    // Update state
    setReorderedItems(newItems);
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