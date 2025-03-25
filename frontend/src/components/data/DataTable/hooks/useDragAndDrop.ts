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
  
  // Keep track of the previous storage key
  const previousStorageKey = useRef<string | undefined>(storageKey);

  // Initialize or update when items change or storage key changes
  useEffect(() => {
    // Skip empty items
    if (!items || items.length === 0) return;
    
    // Check if storage key has changed - if so, we need to reload from the new storage key
    const storageKeyChanged = storageKey !== previousStorageKey.current;
    
    // Update the previous storage key ref
    if (storageKeyChanged) {
      previousStorageKey.current = storageKey;
      // Reset loaded flag when storage key changes to force reload
      hasLoadedFromStorage.current = false;
    }
    
    // Skip if items array hasn't actually changed and storage key is the same
    // This prevents unnecessary re-renders
    if (
      !storageKeyChanged &&
      itemsRef.current.length === items.length && 
      JSON.stringify(itemsRef.current.sort()) === JSON.stringify([...items].sort())
    ) {
      return;
    }
    
    // Update our ref to the new items
    itemsRef.current = [...items];
    
    // Skip loading from localStorage if we've already done it with this key,
    // storage key hasn't changed, and items still match what we have in storage
    if (
      !storageKeyChanged &&
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
    
    // Try to load from localStorage or sessionStorage when:
    // 1. We have a storage key, and
    // 2. Either we haven't loaded yet, or the storage key has changed
    if (storageKey && (!hasLoadedFromStorage.current || storageKeyChanged)) {
      try {
        // First try sessionStorage for faster access within the current session
        let savedOrder = sessionStorage.getItem(storageKey);
        
        // If not in sessionStorage, try localStorage for persistence across sessions
        if (!savedOrder) {
          savedOrder = localStorage.getItem(storageKey);
        }
        
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
  
  // Save to both localStorage and sessionStorage whenever order changes
  // This is separate from the items initialization effect
  const persistToStorage = useCallback(() => {
    if (storageKey && reorderedItems.length > 0) {
      // Save to localStorage for persistence across sessions
      localStorage.setItem(storageKey, JSON.stringify(reorderedItems));
      // Also save to sessionStorage for quick access within the current session
      sessionStorage.setItem(storageKey, JSON.stringify(reorderedItems));
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