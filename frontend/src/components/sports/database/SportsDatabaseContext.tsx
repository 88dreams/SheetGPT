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
  
  // Core pagination state
  // Using direct state management to avoid hook dependencies
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  
  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  
  // Expose a safe setPageSize that resets to page 1
  const handleSetPageSize = useCallback((newSize: number) => {
    if (newSize !== pageSize) {
      console.log(`SportsDatabaseContext: Setting page size to ${newSize} and resetting to page 1`);
      
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
    
    // We no longer need to manually invalidate cache with the updated React Query config
    // that uses keepPreviousData: true for smooth transitions
    
    // Just update the state directly - React Query will handle the data fetching
    setCurrentPage(page);
    
  }, []);
  
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
    renderSortIcon
  } = useSorting();

  // Fetch entity data using react-query
  // Key is updated when any parameters change
  const queryKey = useMemo(() => [
    'sportsEntities',
    selectedEntityType,
    currentPage,
    pageSize,
    sortField,
    sortDirection,
    JSON.stringify(activeFilters)
  ], [selectedEntityType, currentPage, pageSize, sortField, sortDirection, activeFilters]);
  
  const {
    data: response,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        console.log(`Fetching entities: ${selectedEntityType}, page ${currentPage}, size ${pageSize}`);
        
        const result = await SportsDatabaseService.getEntities({
          entityType: selectedEntityType,
          filters: activeFilters,
          page: currentPage,
          limit: pageSize,
          sortBy: sortField,
          sortDirection: sortDirection
        });
        
        // Update total items count
        if (result && typeof result.total === 'number') {
          setTotalItems(result.total);
        }
        
        return result.items || [];
      } catch (error) {
        console.error('Error fetching entities:', error);
        return [];
      }
    },
    enabled: isAuthenticated && isReady,
    // Use a short staleTime for entity data to ensure it's mostly fresh
    staleTime: 1000 * 30, // 30 seconds
    // Keep data in cache for at least a few minutes to help with pagination
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    // These settings improve pagination UX
    keepPreviousData: true, // Shows previous page data while loading new page
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