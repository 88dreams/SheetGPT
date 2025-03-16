import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  useEntityPagination,
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
  
  // Core entity type state
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType>('league');
  
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

  // Set up pagination with default values
  const paginationHook = useEntityPagination(10);
  const { 
    currentPage, 
    setCurrentPage, 
    pageSize, 
    setPageSize, 
    totalItems, 
    setTotalItems, 
    totalPages 
  } = paginationHook;

  // Reset to first page when entity type changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEntityType, setCurrentPage]);

  // Set up view mode state
  const viewHook = useEntityView(selectedEntityType);
  const { 
    viewMode, 
    setViewMode, 
    entityCounts, 
    setEntityCounts, 
    fetchEntityCounts 
  } = viewHook;

  // Set up filtering state and functions
  const filteringHook = useFiltering(selectedEntityType);
  const { 
    activeFilters, 
    setActiveFilters, 
    handleApplyFilters, 
    handleClearFilters 
  } = filteringHook;

  // Set up sorting state and functions
  const sortingHook = useSorting();
  const { 
    sortField, 
    setSortField, 
    sortDirection, 
    setSortDirection, 
    handleSort, 
    getSortedEntities, 
    renderSortIcon 
  } = sortingHook;

  // Fetch entities based on selected type
  const {
    data: response,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['sportsEntities', selectedEntityType, sortField, sortDirection, currentPage, pageSize, activeFilters],
    queryFn: async () => {
      try {
        const result = await SportsDatabaseService.getEntities({
          entityType: selectedEntityType,
          filters: activeFilters,
          page: currentPage,
          limit: pageSize,
          sortBy: sortField,
          sortDirection: sortDirection
        });
        
        // Update total items count
        setTotalItems(result.total || 0);
        
        return result.items || [];
      } catch (error) {
        console.error('Error fetching entities:', error);
        return [];
      }
    },
    enabled: isAuthenticated && isReady,
    staleTime: 0,
    refetchOnWindowFocus: false
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

  // Fetch counts when component mounts and when view mode changes to global
  useEffect(() => {
    if (viewMode === 'global') {
      fetchEntityCounts();
    }
  }, [viewMode, fetchEntityCounts]);

  // Create the context value object (memoized to prevent unnecessary re-renders)
  const contextValue = useMemo<SportsDatabaseContextType>(() => ({
    selectedEntityType,
    setSelectedEntityType,
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
    getSortedEntities: function(entitiesToSort) { return getSortedEntities(entitiesToSort || entities); },
    renderSortIcon,
    activeFilters,
    handleApplyFilters,
    handleClearFilters,
    getEntityFields,
    handleUpdateEntity,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    setPageSize,
    totalItems,
    entityCounts,
    fetchEntityCounts,
  }), [
    selectedEntityType,
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
    setCurrentPage,
    totalPages,
    pageSize,
    setPageSize,
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