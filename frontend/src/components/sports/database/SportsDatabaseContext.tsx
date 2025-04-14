import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import { useDataFlow } from '../../../contexts/DataFlowContext';
import { useAuth } from '../../../hooks/useAuth';
import SportsDatabaseService, { EntityType } from '../../../services/SportsDatabaseService';
import { FilterConfig } from '../EntityFilter';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import { 
  useEntitySelection, 
  useEntityOperations, 
  useEntityView, 
  useSorting,
  useFiltering,
  useEntitySchema
} from './hooks';

// Define interfaces for shared state
export interface EntitySummary {
  id: string;
  name: string;
  count: number;
  lastUpdated: number;
  entityType: string;
  mostRecentEntity: Record<string, unknown>;
  [key: string]: unknown;
}

export interface EntityField {
  fieldName: string;
  fieldType: string;
  required: boolean;
  description: string;
  name: string;
  type: string;
  [key: string]: any;
}

// Main context type that consolidates all the sub-contexts
interface SportsDatabaseContextType {
  // Entity type selection
  selectedEntityType: EntityType;
  setSelectedEntityType: (type: EntityType) => void;
  
  // Entity data and loading state
  entities: Record<string, unknown>[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  
  // Entity selection
  selectedEntities: Record<string, boolean>;
  toggleEntitySelection: (entityId: string) => void;
  selectAllEntities: () => void;
  deselectAllEntities: () => void;
  getSelectedEntityCount: () => number;
  getSelectedEntityIds: () => string[];
  
  // View mode
  viewMode: 'entity' | 'global' | 'fields';
  setViewMode: (mode: 'entity' | 'global' | 'fields') => void;
  
  // Export functionality
  includeRelationships: boolean;
  setIncludeRelationships: (include: boolean) => void;
  isExporting: boolean;
  handleExportToSheets: (allEntities: Record<string, unknown>[]) => Promise<void>;
  
  // Delete functionality
  isDeleting: boolean;
  showDeleteConfirm: string | null;
  setShowDeleteConfirm: (entityId: string | null) => void;
  handleDeleteEntity: (entityId: string) => Promise<void>;
  handleBulkDelete: () => Promise<void>;
  
  // Sorting
  sortField: string;
  sortDirection: 'asc' | 'desc' | 'none';
  handleSort: (field: string) => void;
  getSortedEntities: (entities?: Record<string, unknown>[]) => Record<string, unknown>[];
  renderSortIcon: (field: string) => JSX.Element;
  
  // Filtering
  activeFilters: FilterConfig[];
  handleApplyFilters: (filters: FilterConfig[]) => void;
  handleClearFilters: () => void;
  
  // Entity fields
  getEntityFields: (entityType: EntityType) => EntityField[];
  
  // Entity update
  handleUpdateEntity: (entityId: string, updates: Record<string, unknown>) => Promise<void>;
  
  // Pagination
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalItems: number;
  
  // Entity counts
  entityCounts: Record<EntityType, number>;
  fetchEntityCounts: () => Promise<void>;
}

// Create the context with a default undefined value
const SportsDatabaseContext = createContext<SportsDatabaseContextType | undefined>(undefined);

// Define the props for our provider component
interface SportsDatabaseProviderProps {
  children: ReactNode;
}

// Create a provider component
export const SportsDatabaseProvider: React.FC<SportsDatabaseProviderProps> = ({ children }) => {
  const { isAuthenticated, isReady } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { setDestination } = useDataFlow();
  const queryClient = useQueryClient();
  
  // Core entity type state - use localStorage to persist the selected entity type
  const storedEntityType = localStorage.getItem('selectedEntityType');
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType>(
    (storedEntityType as EntityType) || 'league'
  );
  
  // Core pagination state with localStorage persistence
  // Using direct state management to avoid hook dependencies
  const storedPageSize = localStorage.getItem('entityListPageSize');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(storedPageSize ? parseInt(storedPageSize, 10) : 10);
  const [totalItems, setTotalItems] = useState(0);
  
  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  
  // Expose a safe setPageSize that resets to page 1 and persists to localStorage
  const handleSetPageSize = useCallback((newSize: number) => {
    if (newSize !== pageSize) {
      console.log(`SportsDatabaseContext: Setting page size to ${newSize} and resetting to page 1`);
      
      // Store the page size in localStorage for persistence
      localStorage.setItem('entityListPageSize', newSize.toString());
      
      // Update both values in a single render cycle to avoid stale state issues
      // React batches these updates in React 18+
      setPageSize(newSize);
      setCurrentPage(1);
      
      // Notify QueryClient about the change to ensure proper refetching
      // This helps the query system know that we've made an important parameter change
      if (queryClient) {
        queryClient.invalidateQueries({
          queryKey: ['sportsEntities', selectedEntityType],
          // Don't refetch immediately - let the effect of state changes trigger that
          refetchType: 'none'
        });
      }
    }
  }, [pageSize, queryClient, selectedEntityType]);
  
  // Create a proper page change handler that works with optimized caching
  const handleSetCurrentPage = useCallback((page: number) => {
    console.log(`SportsDatabaseContext: Setting current page to ${page}`);
    
    // Don't do anything if we're already on this page
    if (page === currentPage) {
      console.log(`Already on page ${page}, skipping redundant update`);
      return;
    }
    
    // We need to explicitly invalidate the query cache for the current entity type
    // This ensures a fresh fetch when navigating between pages
    queryClient.invalidateQueries({
      queryKey: ['sportsEntities', selectedEntityType]
    });
    
    // Then update the page state AFTER the invalidation is complete
    setTimeout(() => {
      setCurrentPage(page);
      // Log that we're expecting a data fetch
      console.log(`SportsDatabaseContext: Data fetch should trigger for ${selectedEntityType}, page ${page}`);
    }, 0);
  }, [queryClient, selectedEntityType, currentPage]);
  
  // Update data flow when component mounts
  useEffect(() => {
    setDestination('sportsdb');
  }, [setDestination]);

  // Redirect if not authenticated
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      navigate('/login');
    }
  }, [isReady, isAuthenticated, navigate]);

  // Use a ref to track whether we've already reset to page 1 for this entity type
  const entityTypeChangeTracker = useRef<Record<string, boolean>>({});
  
  // Reset to first page when entity type changes
  useEffect(() => {
    // Only reset if we haven't done so for this entity type
    if (!entityTypeChangeTracker.current[selectedEntityType]) {
      setCurrentPage(1);
      entityTypeChangeTracker.current[selectedEntityType] = true;
    }
  }, [selectedEntityType]);

  // Set up view mode state
  const {
    viewMode,
    setViewMode,
    entityCounts,
    setEntityCounts,
    fetchEntityCounts
  } = useEntityView(selectedEntityType);

  // Set up filtering state and functions
  const {
    activeFilters,
    setActiveFilters,
    handleApplyFilters,
    handleClearFilters
  } = useFiltering(selectedEntityType);

  // Set up sorting state and functions
  const {
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    handleSort,
    getSortedEntities,
    renderSortIcon,
    registerResetPagination
  } = useSorting();
  
  // Register a function to reset pagination when sort changes
  useEffect(() => {
    // Define the reset function
    const resetToFirstPage = () => {
      console.log('Resetting to page 1 due to sort change');
      
      // Reset to page 1
      setCurrentPage(1);
      
      // Force invalidation of the current queries to ensure fresh data with new sort
      if (queryClient) {
        console.log('Invalidating queries for new sort order');
        queryClient.invalidateQueries(['sportsEntities', selectedEntityType]);
      }
    };
    
    // Register it with the sorting hook
    registerResetPagination(resetToFirstPage);
  }, [registerResetPagination, queryClient, selectedEntityType]);

  // Fetch entity data using react-query
  // Key is updated when any parameters change
  const queryKey = useMemo(() => [
    'sportsEntities',
    selectedEntityType,
    currentPage,
    pageSize,
    sortField,
    sortDirection,
    JSON.stringify(activeFilters),
    // Add timestamp to force refetching for all entity types
    // This ensures consistent behavior across all entities
    Date.now()
  ], [selectedEntityType, currentPage, pageSize, sortField, sortDirection, activeFilters]);
  
  // Add debugging output for query key changes that highlights sorting parameters
  useEffect(() => {
    console.log('QueryKey updated with sort parameters:', {
      entityType: selectedEntityType,
      sortField,
      sortDirection,
      page: currentPage
    });
    
    // Whenever sort parameters change, make sure we properly invalidate the cache
    // This ensures that when user sorts, they get freshly sorted data from the server
    if (queryClient) {
      console.log('Sort parameters changed, invalidating entity queries');
      queryClient.invalidateQueries({
        queryKey: ['sportsEntities', selectedEntityType],
        refetchType: 'active'  // Only refetch active queries
      });
    }
  }, [selectedEntityType, sortField, sortDirection, queryClient]);
  
  const {
    data: response,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: async () => {
      // Add a unique request ID for tracing
      const requestId = Math.random().toString(36).substring(2, 9);
      
      try {
        console.log(`[${requestId}] Fetching ${selectedEntityType} entities, page ${currentPage}, size ${pageSize}, cacheBuster: ${new Date().toISOString()}`);
        
        // Start timer for performance logging
        const startTime = performance.now();
        
        // Ensure we always send valid sort parameters to the API
        // Default to id sorting if no field is selected, and use asc if direction is none
        const effectiveSortField = sortField || 'id'; 
        const effectiveSortDirection = sortDirection === 'none' ? 'asc' : sortDirection;
        
        console.log(`Effective sort parameters: field=${effectiveSortField}, direction=${effectiveSortDirection}`);
        
        const result = await SportsDatabaseService.getEntities({
          entityType: selectedEntityType,
          filters: activeFilters,
          page: currentPage,
          limit: pageSize,
          sortBy: effectiveSortField,
          sortDirection: effectiveSortDirection
        });
        
        // Log success and timing information
        const endTime = performance.now();
        console.log(`[${requestId}] Fetch complete for ${selectedEntityType}, page ${currentPage}: ${Math.round(endTime - startTime)}ms, items: ${result.items?.length || 0}, total: ${result.total || 0}`);
        
        // Update total items count
        if (result && typeof result.total === 'number') {
          setTotalItems(result.total);
        }
        
        // For production services, add extra logging
        if (selectedEntityType === 'production' || selectedEntityType === 'broadcast') {
          console.log(`[${requestId}] Entity details:`, {
            type: selectedEntityType,
            page: currentPage,
            totalPages: Math.ceil((result.total || 0) / pageSize),
            itemsCount: result.items?.length || 0,
            firstItemId: result.items?.[0]?.id || 'none'
          });
        }
        
        return result.items || [];
      } catch (error) {
        console.error(`[${requestId}] Error fetching ${selectedEntityType} entities:`, error);
        return [];
      }
    },
    enabled: isAuthenticated && isReady,
    // Use a minimal staleTime for all entity types to ensure data is always fresh 
    staleTime: 0, // No stale time - always refetch when requested
    // Keep data in cache briefly to improve navigation performance within the same session
    gcTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: false,
    // Always refetch when mounting or page changes to ensure consistent data
    refetchOnMount: true,
    // Debug key to track API requests and their triggers
    meta: { debug: `${selectedEntityType}_page_${currentPage}` },
    // No automatic refetch interval for any entity type
    refetchInterval: undefined,
    // Keep previous data during fetching for all entity types to reduce UI flicker
    keepPreviousData: true,
    // Enable force retry for all entity types for consistent behavior
    refetchForceRetry: true,
    useErrorBoundary: false // Handle errors gracefully
  });

  const entities = response || [];

  // Set up entity selection state and functions
  const { 
    selectedEntities, 
    toggleEntitySelection, 
    selectAllEntities, 
    deselectAllEntities, 
    getSelectedEntityCount, 
    getSelectedEntityIds 
  } = useEntitySelection(entities);

  // Set up entity operations (export, delete, update)
  const { 
    isExporting, 
    isDeleting, 
    showDeleteConfirm, 
    setShowDeleteConfirm, 
    includeRelationships, 
    setIncludeRelationships, 
    handleExportToSheets, 
    handleDeleteEntity, 
    handleBulkDelete, 
    handleUpdateEntity 
  } = useEntityOperations(
    selectedEntityType, 
    entities, 
    getSelectedEntityIds, 
    refetch, 
    showNotification, 
    deselectAllEntities
  );

  // Get field information for entity types
  const { getEntityFields } = useEntitySchema();

  // Track whether we've already fetched counts for this view mode
  const fetchedCountsForViewMode = useRef<Record<string, boolean>>({});
  
  // Fetch counts when view mode changes to global, but only once
  useEffect(() => {
    if (viewMode === 'global' && !fetchedCountsForViewMode.current[viewMode]) {
      fetchEntityCounts();
      fetchedCountsForViewMode.current[viewMode] = true;
    }
  }, [viewMode, fetchEntityCounts]);

  // Custom setter that updates localStorage
  const handleSetSelectedEntityType = useCallback((type: EntityType) => {
    localStorage.setItem('selectedEntityType', type);
    setSelectedEntityType(type);
  }, []);

  // Create the context value object (memoized to prevent unnecessary re-renders)
  const contextValue = useMemo<SportsDatabaseContextType>(() => ({
    selectedEntityType,
    setSelectedEntityType: handleSetSelectedEntityType,
    entities,
    isLoading,
    error,
    refetch,
    selectedEntities,
    toggleEntitySelection,
    selectAllEntities,
    deselectAllEntities,
    getSelectedEntityCount,
    getSelectedEntityIds,
    viewMode,
    setViewMode,
    includeRelationships,
    setIncludeRelationships,
    isExporting,
    handleExportToSheets,
    isDeleting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleDeleteEntity,
    handleBulkDelete,
    sortField,
    sortDirection,
    handleSort,
    getSortedEntities: (entitiesToSort) => getSortedEntities(entitiesToSort || entities),
    renderSortIcon,
    activeFilters,
    handleApplyFilters,
    handleClearFilters,
    getEntityFields,
    handleUpdateEntity,
    currentPage,
    setCurrentPage: handleSetCurrentPage,
    totalPages,
    pageSize,
    setPageSize: handleSetPageSize,
    totalItems,
    entityCounts,
    fetchEntityCounts,
  }), [
    selectedEntityType,
    handleSetSelectedEntityType,
    entities,
    isLoading,
    error,
    refetch,
    selectedEntities,
    toggleEntitySelection,
    selectAllEntities,
    deselectAllEntities,
    getSelectedEntityCount,
    getSelectedEntityIds,
    viewMode,
    setViewMode,
    includeRelationships,
    setIncludeRelationships,
    isExporting,
    handleExportToSheets,
    isDeleting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleDeleteEntity,
    handleBulkDelete,
    sortField,
    sortDirection,
    handleSort,
    getSortedEntities,
    renderSortIcon,
    activeFilters,
    handleApplyFilters,
    handleClearFilters,
    getEntityFields,
    handleUpdateEntity,
    currentPage,
    handleSetCurrentPage,
    totalPages,
    pageSize,
    handleSetPageSize,
    totalItems,
    entityCounts,
    fetchEntityCounts
  ]);

  return (
    <SportsDatabaseContext.Provider value={contextValue}>
      {children}
    </SportsDatabaseContext.Provider>
  );
};

// Create a custom hook to use the context
export const useSportsDatabase = () => {
  const context = useContext(SportsDatabaseContext);
  if (context === undefined) {
    throw new Error('useSportsDatabase must be used within a SportsDatabaseProvider');
  }
  return context;
};