import { useState, useCallback, useMemo } from 'react';

/**
 * Interface for useSelection hook parameters
 */
interface UseSelectionProps<T> {
  items?: T[];
  getItemId?: (item: T) => string;
  initialSelectedItems?: Record<string, boolean>;
}

/**
 * Interface for useSelection hook return values
 */
interface UseSelectionResult {
  selectedItems: Record<string, boolean>;
  setSelectedItems: (items: Record<string, boolean>) => void;
  toggleItemSelection: (id: string) => void;
  selectAllItems: (ids: string[]) => void;
  deselectAllItems: () => void;
  isItemSelected: (id: string) => boolean;
  areAllItemsSelected: (ids: string[]) => boolean;
  getSelectedCount: () => number;
  getSelectedIds: () => string[];
}

/**
 * A custom hook for managing selected items in lists or tables
 * 
 * @param items - Optional items array
 * @param getItemId - Optional function to extract ID from an item
 * @param initialSelectedItems - Optional initial selection state
 * @returns Selection state and handlers
 */
export function useSelection<T>({
  items,
  getItemId,
  initialSelectedItems = {}
}: UseSelectionProps<T> = {}): UseSelectionResult {
  // Selection state
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>(initialSelectedItems);

  /**
   * Default ID getter if one isn't provided
   */
  const defaultGetItemId = useCallback((item: any): string => {
    return item?.id || item?.key || String(item);
  }, []);

  /**
   * Toggle selection state of a single item
   */
  const toggleItemSelection = useCallback((id: string) => {
    setSelectedItems(prev => {
      const newState = { ...prev };
      
      if (prev[id]) {
        // Unselect if already selected
        delete newState[id];
      } else {
        // Select if not already selected
        newState[id] = true;
      }
      
      return newState;
    });
  }, []);

  /**
   * Select all items in the provided ID list
   */
  const selectAllItems = useCallback((ids: string[]) => {
    setSelectedItems(prev => {
      const newState = { ...prev };
      
      ids.forEach(id => {
        newState[id] = true;
      });
      
      return newState;
    });
  }, []);

  /**
   * Deselect all items
   */
  const deselectAllItems = useCallback(() => {
    setSelectedItems({});
  }, []);

  /**
   * Check if a specific item is selected
   */
  const isItemSelected = useCallback((id: string): boolean => {
    return !!selectedItems[id];
  }, [selectedItems]);

  /**
   * Check if all items in the provided ID list are selected
   */
  const areAllItemsSelected = useCallback((ids: string[]): boolean => {
    if (ids.length === 0) return false;
    return ids.every(id => !!selectedItems[id]);
  }, [selectedItems]);

  /**
   * Get count of selected items
   */
  const getSelectedCount = useCallback((): number => {
    return Object.keys(selectedItems).length;
  }, [selectedItems]);

  /**
   * Get array of selected item IDs
   */
  const getSelectedIds = useCallback((): string[] => {
    return Object.keys(selectedItems);
  }, [selectedItems]);

  /**
   * Memoized array of selected items (if items array is provided)
   */
  const selectedItemsList = useMemo(() => {
    if (!items || !getItemId) return [];
    
    const idGetter = getItemId || defaultGetItemId;
    return items.filter(item => {
      const id = idGetter(item);
      return !!selectedItems[id];
    });
  }, [items, getItemId, defaultGetItemId, selectedItems]);

  return {
    selectedItems,
    setSelectedItems,
    toggleItemSelection,
    selectAllItems,
    deselectAllItems,
    isItemSelected,
    areAllItemsSelected,
    getSelectedCount,
    getSelectedIds
  };
}

export default useSelection;