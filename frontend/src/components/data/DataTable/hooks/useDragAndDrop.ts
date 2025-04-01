import { useState, useCallback, useEffect, useRef } from 'react';
import { areEqual, fingerprint } from '../../../../utils/fingerprint';

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
    
    // Create stable JSON representation of items for comparison
    const itemsFingerprint = fingerprint(items);
    const previousItemsFingerprint = fingerprint(itemsRef.current);
    
    // Check if storage key has changed - if so, we need to reload from the new storage key
    const storageKeyChanged = storageKey !== previousStorageKey.current;
    
    // Update the previous storage key ref
    if (storageKeyChanged) {
      previousStorageKey.current = storageKey;
      // Reset loaded flag when storage key changes to force reload
      hasLoadedFromStorage.current = false;
    }
    
    // Skip if items array hasn't actually changed (by fingerprint) and storage key is the same
    if (!storageKeyChanged && itemsFingerprint === previousItemsFingerprint) {
      return;
    }
    
    // Update our ref to the new items
    itemsRef.current = [...items];
    
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
          const validItems = [];
          for (const item of parsedOrder) {
            // Find matching item in the current items array by deep equality
            // This is needed because JSON stringification loses reference equality
            const matchingItem = items.find(current => 
              JSON.stringify(current) === JSON.stringify(item)
            );
            if (matchingItem) {
              validItems.push(matchingItem);
            }
          }
          
          // Add any missing items
          const allItems = [...validItems];
          for (const item of items) {
            // Check if item is already in allItems
            const isIncluded = allItems.some(existing => 
              JSON.stringify(existing) === JSON.stringify(item)
            );
            if (!isIncluded) {
              allItems.push(item);
            }
          }
          
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
    
    // Default: use items as is if we couldn't load from storage
    // Only update if the items have actually changed to avoid render loops
    if (itemsFingerprint !== previousItemsFingerprint || reorderedItems.length === 0) {
      setReorderedItems([...items]);
    }
  }, [items, storageKey, reorderedItems.length]);
  
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

  // Handle drop with enhanced object comparison
  const handleDrop = useCallback((e: React.DragEvent, targetItem: T) => {
    e.preventDefault();
    
    // Clear visual state immediately for responsive UI
    setDragOverItem(null);
    
    if (!draggedItem) {
      setDraggedItem(null);
      return;
    }
    
    // Skip if dragging onto itself (compare by fingerprint for object equality)
    if (fingerprint(draggedItem) === fingerprint(targetItem)) {
      setDraggedItem(null);
      return;
    }
    
    // Get indexes from current order - use stringified comparison for objects
    let sourceIndex = -1;
    let targetIndex = -1;
    
    // Find indexes by comparing JSON representations
    for (let i = 0; i < reorderedItems.length; i++) {
      if (JSON.stringify(reorderedItems[i]) === JSON.stringify(draggedItem)) {
        sourceIndex = i;
      }
      if (JSON.stringify(reorderedItems[i]) === JSON.stringify(targetItem)) {
        targetIndex = i;
      }
      
      // Break early if both found
      if (sourceIndex !== -1 && targetIndex !== -1) break;
    }
    
    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      return;
    }
    
    // Create a new array without mutating the original
    const newItems = [...reorderedItems];
    
    // Remove from source position
    const [removed] = newItems.splice(sourceIndex, 1);
    
    // Insert at target position
    newItems.splice(targetIndex, 0, removed);
    
    // Verify the array changed to prevent unnecessary updates
    const oldFingerprint = fingerprint(reorderedItems);
    const newFingerprint = fingerprint(newItems);
    
    if (oldFingerprint !== newFingerprint) {
      console.log('Reordering items after drop');
      // Only update state if the array actually changed
      setReorderedItems(newItems);
    }
    
    // Clear drag state
    setDraggedItem(null);
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