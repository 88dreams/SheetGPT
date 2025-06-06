import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { fingerprint } from '../utils/fingerprint';
import { useDragAndDrop } from '../components/data/DataTable/hooks/useDragAndDrop';

export interface ColumnManagerProps {
    queryResults: any[]; // Data needed to determine available columns
    queryIdentifier: string; // Unique ID for this query type (e.g., hash of columns) for storage
}

// Define the structure for Sort Config
interface SortConfig {
    column: string;
    direction: 'asc' | 'desc';
}

export interface ColumnManagerState {
    // State
    visibleColumns: { [key: string]: boolean };
    showColumnSelector: boolean;
    showFullUuids: boolean;
    columnOrder: string[];
    sortConfig: SortConfig | null;
    reorderedColumns: string[]; // Columns in the current display order after drag/drop
    draggedItem: string | null;
    dragOverItem: string | null;
    // Handlers
    setShowColumnSelector: React.Dispatch<React.SetStateAction<boolean>>;
    setShowFullUuids: React.Dispatch<React.SetStateAction<boolean>>;
    toggleColumnVisibility: (column: string) => void;
    showAllColumns: () => void;
    handleSort: (column: string) => void;
    applyColumnTemplate: (columns: string[], visibility: Record<string, boolean>) => void;
    handleColumnDragStart: Function;
    handleColumnDragOver: Function;
    handleColumnDrop: Function;
    handleColumnDragEnd: Function;
}

export const useColumnManager = ({
    queryResults,
    queryIdentifier, // Used for localStorage keys
}: ColumnManagerProps): ColumnManagerState => {

    const initialColumns = useMemo(() => queryResults.length > 0 ? Object.keys(queryResults[0]) : [], [queryResults]);
    
    const visibilityStorageKey = `queryColumnsVisibility_${queryIdentifier}`;
    const orderStorageKey = `queryColumnsOrder_${queryIdentifier}`;

    // === STATE ===
    const [visibleColumns, setVisibleColumns] = useState<{ [key: string]: boolean }>({});
    const [showColumnSelector, setShowColumnSelector] = useState<boolean>(false);
    const [showFullUuids, setShowFullUuids] = useState<boolean>(false); // Defaulting to false (show names)
    const [columnOrder, setColumnOrder] = useState<string[]>(initialColumns);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

    // === Drag & Drop Setup ===
    const handleReorder = useCallback((newOrder: string[]) => {
        setColumnOrder(newOrder);
    }, []);

    const {
        draggedItem,
        dragOverItem,
        handleDragStart,
        handleDragOver,
        handleDrop,
        handleDragEnd
    } = useDragAndDrop<string>({
        items: columnOrder,
        onReorder: handleReorder
    });

    // === EFFECTS ===

    // Define initializeDefaultVisibility *before* it's used in useEffect
    const initializeDefaultVisibility = useCallback(() => {
        const defaultVisibility: { [key: string]: boolean } = {};
        initialColumns.forEach(column => {
            // Default to hiding UUID fields
            const isUuidField = column === 'id' || (column.endsWith('_id')); // Simplified check
            defaultVisibility[column] = !isUuidField;
        });
        setVisibleColumns(defaultVisibility);
         // Persist defaults immediately
        localStorage.setItem(visibilityStorageKey, JSON.stringify(defaultVisibility));
    }, [initialColumns, visibilityStorageKey]);

    // Initialize / Load from localStorage
    useEffect(() => {
        if (initialColumns.length > 0) {
            // Load Visibility
            const savedVisibility = localStorage.getItem(visibilityStorageKey);
            if (savedVisibility) {
                try {
                    const parsedVisibility = JSON.parse(savedVisibility);
                    // Ensure all current columns are present in the loaded visibility
                    const updatedVisibility = { ...parsedVisibility };
                    let changed = false;
                    initialColumns.forEach(col => {
                        if (!(col in updatedVisibility)) {
                           // Default new columns based on UUID pattern, matching original logic
                            const isUuidField = col === 'id' || (col.endsWith('_id')); // Simplified check
                            updatedVisibility[col] = !isUuidField;
                            changed = true;
                        }
                    });
                    setVisibleColumns(updatedVisibility);
                    if(changed) {
                        localStorage.setItem(visibilityStorageKey, JSON.stringify(updatedVisibility));
                    }
                } catch (e) {
                    console.error('Error parsing saved column visibility:', e);
                    initializeDefaultVisibility(); // Now defined above
                }
            } else {
                initializeDefaultVisibility(); // Now defined above
            }

            // Load Order
            const savedOrder = localStorage.getItem(orderStorageKey);
            if (savedOrder) {
                try {
                    const parsedOrder = JSON.parse(savedOrder);
                    // Ensure all current columns exist in the saved order, add new ones to the end
                    const currentSet = new Set(initialColumns);
                    const loadedSet = new Set(parsedOrder);
                    const finalOrder = [...parsedOrder.filter((col: string) => currentSet.has(col))]; // Keep existing valid cols
                    initialColumns.forEach(col => { // Add new cols
                        if (!loadedSet.has(col)) {
                            finalOrder.push(col);
                        }
                    });
                    setColumnOrder(finalOrder);
                } catch (e) {
                    console.error('Error parsing saved column order:', e);
                    setColumnOrder([...initialColumns]); // Fallback to initial order
                }
            } else {
                 setColumnOrder([...initialColumns]); // Use initial order if nothing saved
            }
             // Load showFullUuids preference (example - could use localStorage too)
            const savedUuidPref = sessionStorage.getItem('showFullUuids');
            setShowFullUuids(savedUuidPref === 'true');

        } else {
             // Reset if no results
             setVisibleColumns({});
             setColumnOrder([]);
             setSortConfig(null);
        }
        // Dependencies: run when the query identifier changes or results provide new initial columns
    }, [initialColumns, queryIdentifier, visibilityStorageKey, orderStorageKey, initializeDefaultVisibility]);

    // Save Visibility to localStorage
    useEffect(() => {
        if (initialColumns.length > 0 && Object.keys(visibleColumns).length > 0) {
            localStorage.setItem(visibilityStorageKey, JSON.stringify(visibleColumns));
        }
    }, [visibleColumns, visibilityStorageKey, initialColumns]);

    // Save Order to localStorage
    useEffect(() => {
        if (initialColumns.length > 0 && columnOrder.length > 0) {
            localStorage.setItem(orderStorageKey, JSON.stringify(columnOrder));
        }
    }, [columnOrder, orderStorageKey, initialColumns]);

     // Save showFullUuids preference
    useEffect(() => {
        sessionStorage.setItem('showFullUuids', String(showFullUuids));
    }, [showFullUuids]);

    // Update internal columnOrder when drag/drop finishes
    // Use ref to prevent circular dependencies if reorderedColumnsInternal was used directly in dragDropItems
    const prevReorderedColumnsRef = useRef<string[]>([]);
    useEffect(() => {
        if (columnOrder.length > 0) {
            const currentOrderFp = fingerprint(columnOrder);
            const newOrderFp = fingerprint(columnOrder);
            const prevReorderedFp = fingerprint(prevReorderedColumnsRef.current);

            if (currentOrderFp !== newOrderFp && prevReorderedFp !== newOrderFp) {
                prevReorderedColumnsRef.current = [...columnOrder];
                setColumnOrder([...columnOrder]);
            }
        }
    }, [columnOrder]); // Watch internal D&D state

    // === Handlers ===

    const toggleColumnVisibility = useCallback((column: string) => {
        setVisibleColumns(prev => {
            const updated = { ...prev, [column]: !prev[column] };
            // Persist inside setter to ensure it uses the updated value
            // localStorage.setItem(visibilityStorageKey, JSON.stringify(updated)); // Persistence handled by separate useEffect
            return updated;
        });
    }, []);

    const showAllColumns = useCallback(() => {
        const allVisible: { [key: string]: boolean } = {};
        initialColumns.forEach(col => { allVisible[col] = true; });
        setVisibleColumns(allVisible);
    }, [initialColumns]);

    const applyColumnTemplate = useCallback((templateColumns: string[], templateVisibility: Record<string, boolean>) => {
        // Directly set the column order and visibility from the template
        setColumnOrder(templateColumns);
        setVisibleColumns(templateVisibility);
    }, []);

    const handleSort = useCallback((column: string) => {
        setSortConfig(prev => {
            if (!prev || prev.column !== column) {
                return { column, direction: 'asc' };
            }
            if (prev.direction === 'asc') {
                return { column, direction: 'desc' };
            }
            return null; // Third click clears sort
        });
    }, []);

    return {
        // State
        visibleColumns,
        showColumnSelector,
        showFullUuids,
        columnOrder, // The managed order state
        sortConfig,
        reorderedColumns: columnOrder, // Return the managed columnOrder as the display order
        draggedItem,
        dragOverItem,
        // Handlers
        setShowColumnSelector,
        setShowFullUuids,
        toggleColumnVisibility,
        showAllColumns,
        handleSort,
        applyColumnTemplate,
        handleColumnDragStart: handleDragStart,
        handleColumnDragOver: handleDragOver,
        handleColumnDrop: handleDrop,
        handleColumnDragEnd: handleDragEnd
    };
}; 