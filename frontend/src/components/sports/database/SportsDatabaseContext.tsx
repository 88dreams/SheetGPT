import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import { useDataFlow } from '../../../contexts/DataFlowContext';
import { useAuth } from '../../../hooks/useAuth';
import SportsDatabaseService, { EntityType } from '../../../services/SportsDatabaseService';
import { FilterConfig } from '../EntityFilter';

// Define interfaces for our context state
export interface EntitySummary {
  id: string;
  name: string;
  count: number;
  lastUpdated: number;
  entityType: string;
  mostRecentEntity: any;
  [key: string]: any; // Add index signature to allow string indexing
}

export interface EntityField {
  fieldName: string;
  fieldType: string;
  required: boolean;
  description: string;
  name: string;
  type: string;
  [key: string]: any; // Add index signature to allow string indexing
}

interface SportsDatabaseContextType {
  // Entity type selection
  selectedEntityType: EntityType;
  setSelectedEntityType: (type: EntityType) => void;
  
  // Entity data and loading state
  entities: any[];
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
  handleExportToSheets: (allEntities: any[]) => Promise<void>;
  
  // Delete functionality
  isDeleting: boolean;
  showDeleteConfirm: string | null;
  setShowDeleteConfirm: (entityId: string | null) => void;
  handleDeleteEntity: (entityId: string) => Promise<void>;
  
  // Sorting
  sortField: string;
  sortDirection: 'asc' | 'desc';
  handleSort: (field: string) => void;
  getSortedEntities: () => any[];
  renderSortIcon: (field: string) => JSX.Element;
  
  // Filtering
  activeFilters: FilterConfig[];
  handleApplyFilters: (filters: FilterConfig[]) => void;
  handleClearFilters: () => void;
  
  // Entity fields
  getEntityFields: (entityType: EntityType) => EntityField[];
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
  
  // State management
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType>('league');
  const [selectedEntities, setSelectedEntities] = useState<Record<string, boolean>>({});
  const [activeFilters, setActiveFilters] = useState<FilterConfig[]>([]);
  const [includeRelationships, setIncludeRelationships] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'entity' | 'global' | 'fields'>('entity');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Update data flow when component mounts
  useEffect(() => {
    setDestination('sportsdb');
  }, []);

  // Debug: Monitor filter changes
  useEffect(() => {
    console.log('DEBUG: activeFilters changed:', activeFilters);
  }, [activeFilters]);

  // Debug: Monitor sort parameter changes
  useEffect(() => {
    console.log(`DEBUG: Sort parameters changed - field: ${sortField}, direction: ${sortDirection}`);
  }, [sortField, sortDirection]);

  // Fetch entities based on selected type
  const {
    data: entities = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['sportsEntities', selectedEntityType, sortField, sortDirection],
    queryFn: async () => {
      console.log('Fetching entities with:', {
        entityType: selectedEntityType,
        filters: activeFilters,
        sortField,
        sortDirection
      });
      
      try {
        // Always fetch all entities without filters
        const result = await SportsDatabaseService.getEntities({
          entityType: selectedEntityType,
          filters: [],
          sortBy: sortField,
          sortDirection: sortDirection
        });
        
        console.log('Fetched entities result:', {
          count: result?.length || 0,
          sample: result?.length > 0 ? result[0] : null
        });
        
        return result || [];
      } catch (error) {
        console.error('Error fetching entities:', error);
        return []; // Return empty array on error
      }
    },
    enabled: isAuthenticated && isReady,
    staleTime: 0, // Don't cache results
    refetchOnWindowFocus: false // Don't refetch when window regains focus
  });

  // Handle entity selection
  const toggleEntitySelection = (entityId: string) => {
    setSelectedEntities(prev => ({
      ...prev,
      [entityId]: !prev[entityId]
    }));
  };

  // Select all entities
  const selectAllEntities = () => {
    const newSelection: Record<string, boolean> = {};
    if (Array.isArray(entities)) {
      entities.forEach((entity: any) => {
        newSelection[entity.id] = true;
      });
    }
    setSelectedEntities(newSelection);
  };

  // Deselect all entities
  const deselectAllEntities = () => {
    setSelectedEntities({});
  };

  // Get selected entity count
  const getSelectedEntityCount = () => {
    return Object.values(selectedEntities).filter(Boolean).length;
  };

  // Get selected entity IDs
  const getSelectedEntityIds = () => {
    return Object.entries(selectedEntities)
      .filter(([_, isSelected]) => isSelected)
      .map(([id, _]) => id);
  };

  // Handle export to Google Sheets
  const handleExportToSheets = async (allEntities: any[]) => {
    try {
      setIsExporting(true);
      
      // Get selected entity IDs
      const selectedIds = getSelectedEntityIds();
      
      // Determine which entities to export (selected or all)
      const entitiesToExport = selectedIds.length > 0
        ? entities.filter(entity => selectedIds.includes(entity.id))
        : allEntities;
      
      if (entitiesToExport.length === 0) {
        showNotification('info', 'No entities selected for export');
        setIsExporting(false);
        return;
      }

      // Use the actual API endpoint for exporting
      // Since SportsDatabaseService doesn't have exportToSheets or exportEntities,
      // let's use a more generic approach
      const result = await fetch(`/api/v1/sports/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity_type: selectedEntityType,
          entity_ids: entitiesToExport.map(entity => entity.id),
          include_relationships: includeRelationships
        }),
      });

      if (!result.ok) {
        throw new Error(`Export failed: ${result.statusText}`);
      }

      const data = await result.json();
      showNotification('success', 'Export successful!');
      
      // If there's a URL in the response, open it
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error exporting to Google Sheets:', error);
      
      // Show error notification
      showNotification('error', `Failed to export ${selectedEntityType} entities to Google Sheets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle entity deletion
  const handleDeleteEntity = async (entityId: string) => {
    try {
      setIsDeleting(true);
      
      await SportsDatabaseService.deleteEntity(selectedEntityType, entityId);
      
      // Show success notification
      showNotification('success', `Successfully deleted ${selectedEntityType} entity`);
      
      // Remove from selected entities if it was selected
      setSelectedEntities(prev => ({
        ...prev,
        [entityId]: false
      }));
      
      // Refresh the entity list
      refetch();
    } catch (error) {
      console.error(`Error deleting ${selectedEntityType}:`, error);
      
      // Show error notification
      showNotification('error', `Failed to delete ${selectedEntityType} entity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(null);
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      navigate('/login');
    }
  }, [isReady, isAuthenticated, navigate]);

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
      console.log(`Sorting by ${field} in ${newDirection} order`);
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
      console.log(`Sorting by ${field} in asc order`);
    }
    
    // Force refetch with a slight delay to ensure state is updated
    setTimeout(() => {
      console.log('Triggering refetch after sort change');
      refetch();
    }, 100);
  };

  // Get sorted entities
  const getSortedEntities = () => {
    console.log('Getting sorted entities, current entities:', entities?.length || 0);
    if (!entities || entities.length === 0) return [];
    
    // Apply client-side filtering if there are active filters
    if (activeFilters && activeFilters.length > 0) {
      console.log('Applying client-side filtering for', activeFilters.length, 'filters');
      
      // Apply each filter
      const filteredEntities = entities.filter(entity => {
        // Entity must match all filters (AND logic)
        return activeFilters.every(filter => {
          const { field, operator, value } = filter;
          const entityValue = entity[field];
          
          console.log(`Checking if entity[${field}]=${entityValue} ${operator} ${value}`);
          
          // Skip if the field doesn't exist on the entity
          if (entityValue === undefined) return false;
          
          // Apply the operator
          switch (operator) {
            case 'eq':
              return entityValue === value;
            case 'neq':
              return entityValue !== value;
            case 'gt':
              return entityValue > value;
            case 'lt':
              return entityValue < value;
            case 'contains':
              return String(entityValue).toLowerCase().includes(String(value).toLowerCase());
            case 'startswith':
              return String(entityValue).toLowerCase().startsWith(String(value).toLowerCase());
            case 'endswith':
              return String(entityValue).toLowerCase().endsWith(String(value).toLowerCase());
            default:
              return false;
          }
        });
      });
      
      console.log(`Filtered ${entities.length} entities down to ${filteredEntities.length}`);
      return filteredEntities;
    }
    
    // Return the entities directly if no filters are active
    return entities;
  };

  // Render sort icon
  const renderSortIcon = (field: string) => {
    if (sortField !== field) return <span className="ml-1 text-gray-400">⇅</span>;
    return sortDirection === 'asc' ? 
      <span className="ml-1 text-indigo-600">↑</span> : 
      <span className="ml-1 text-indigo-600">↓</span>;
  };

  // Add handlers for filters
  const handleApplyFilters = (filters: FilterConfig[]) => {
    console.log('SportsDatabaseContext: Applying filters:', filters);
    
    // Debug log to show the filter value
    if (filters.length > 0) {
      console.log('SportsDatabaseContext: First filter field:', filters[0].field);
      console.log('SportsDatabaseContext: First filter operator:', filters[0].operator);
      console.log('SportsDatabaseContext: First filter value:', filters[0].value);
      console.log('SportsDatabaseContext: First filter value type:', typeof filters[0].value);
    }
    
    // Make a deep copy of the filters to ensure we're not passing references
    const filtersCopy = JSON.parse(JSON.stringify(filters));
    
    // Set the active filters
    setActiveFilters(filtersCopy);
    
    // Save filters to localStorage for persistence
    localStorage.setItem(`${selectedEntityType}_filters`, JSON.stringify(filtersCopy));
    
    // Force refetch immediately
    console.log('SportsDatabaseContext: Triggering immediate refetch after applying filters');
    refetch();
  };

  const handleClearFilters = () => {
    console.log('SportsDatabaseContext: Clearing filters');
    
    // Clear the active filters
    setActiveFilters([]);
    
    // Clear filters from localStorage
    localStorage.removeItem(`${selectedEntityType}_filters`);
    
    // Force refetch immediately
    console.log('SportsDatabaseContext: Triggering immediate refetch after clearing filters');
    refetch();
  };

  // Load saved filters when entity type changes
  useEffect(() => {
    const savedFilters = localStorage.getItem(`${selectedEntityType}_filters`);
    if (savedFilters) {
      try {
        setActiveFilters(JSON.parse(savedFilters));
      } catch (e) {
        console.error('Error parsing saved filters:', e);
        setActiveFilters([]);
      }
    } else {
      setActiveFilters([]);
    }
  }, [selectedEntityType]);

  // Get field information for an entity type
  const getEntityFields = (entityType: EntityType): EntityField[] => {
    // Define a type for the field data
    interface FieldData {
      name: string;
      type: string;
      required: boolean;
      description: string;
    }

    // Get the fields for the selected entity type
    // Since SportsDatabaseService doesn't have getEntityFields, we'll define our own
    const getEntityFieldsData = (entityType: EntityType): FieldData[] => {
      const fields: FieldData[] = [];
      
      // Common fields for all entities
      fields.push(
        { name: 'id', required: false, type: 'string', description: 'Unique identifier (auto-generated)' },
        { name: 'name', required: true, type: 'string', description: 'Name of the entity' },
        { name: 'created_at', required: false, type: 'datetime', description: 'Creation timestamp (auto-generated)' },
        { name: 'updated_at', required: false, type: 'datetime', description: 'Last update timestamp (auto-generated)' }
      );
      
      // Entity-specific fields
      switch (entityType) {
        case 'league':
          fields.push(
            { name: 'sport', required: true, type: 'string', description: 'Sport type (e.g., Football, Basketball)' },
            { name: 'country', required: true, type: 'string', description: 'Country where the league operates' },
            { name: 'founded_year', required: true, type: 'number', description: 'Year the league was founded' },
            { name: 'broadcast_start_date', required: false, type: 'date', description: 'Start date of broadcast rights' },
            { name: 'broadcast_end_date', required: false, type: 'date', description: 'End date of broadcast rights' }
          );
          break;
          
        // Add other entity types as needed...
        default:
          // No additional fields for unknown entity types
          break;
      }
      
      return fields;
    };
    
    // Get the fields data
    const fieldsData = getEntityFieldsData(entityType);
    
    // Convert the fields to the EntityField format
    return fieldsData.map((field: FieldData) => ({
      fieldName: field.name,
      fieldType: field.type,
      required: field.required,
      description: field.description,
      name: field.name,
      type: field.type
    }));
  };

  // Create the context value object
  const contextValue: SportsDatabaseContextType = {
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
    sortField,
    sortDirection,
    handleSort,
    getSortedEntities,
    renderSortIcon,
    activeFilters,
    handleApplyFilters,
    handleClearFilters,
    getEntityFields
  };

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