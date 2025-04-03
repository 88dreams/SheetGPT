import React, { useState, useMemo, useRef, useEffect } from 'react';
import { fingerprint } from '../../../../utils/fingerprint';
import { useNavigate } from 'react-router-dom';
import { Modal } from 'antd';
import { useSportsDatabase } from '../SportsDatabaseContext';
import LoadingSpinner from '../../../common/LoadingSpinner';
import BulkEditModal from '../../../common/BulkEditModal';
import { EntityCard } from '../../../data/EntityUpdate/EntityCard';
import { Entity, EntityType, BaseEntity } from '../../../../types/sports';
import { useDragAndDrop } from '../../../data/DataTable/hooks/useDragAndDrop';

// Import components
import {
  EntityListHeader,
  ColumnSelector,
  ExportDialog,
  EntityTable,
  BulkActionBar
} from './components';

// Direct import for pagination to ensure we use our new version
import Pagination from './components/Pagination';

// Import hooks
import {
  useColumnVisibility,
  useInlineEdit,
  useEntityExport
} from './hooks';

interface EntityListProps {
  className?: string;
}

/**
 * EntityList Component - Displays and manages entity data in a table with bulk operations
 */
const EntityList: React.FC<EntityListProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  
  // Get context data first
  const {
    selectedEntityType,
    entities,
    isLoading,
    selectedEntities,
    toggleEntitySelection,
    selectAllEntities,
    deselectAllEntities,
    handleSort,
    sortField,
    sortDirection,
    getSortedEntities,
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleDeleteEntity,
    handleBulkDelete,
    isDeleting,
    activeFilters,
    handleApplyFilters,
    handleClearFilters,
    handleUpdateEntity,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    setPageSize,
    totalItems,
    refetch,
    handleExportToSheets
  } = useSportsDatabase();

  // State for edit entity modal
  const [selectedEntity, setSelectedEntity] = useState<BaseEntity | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isBulkEditModalVisible, setIsBulkEditModalVisible] = useState(false);

  // Generate initial column order based on entity data
  const getInitialColumnOrder = () => {
    if (!Array.isArray(entities) || entities.length === 0) return [];
    
    // Get fields directly from the data
    const availableFields = Object.keys(entities[0]);
    
    // Set up default column order
    let coreFields = ['id', 'name', 'created_at', 'updated_at'];
    
    // Special handling for broadcast rights
    if (selectedEntityType === 'broadcast') {
      coreFields = ['broadcast_company_name', 'entity_name', 'entity_type', 'territory', 'league_name', 'id', 'created_at', 'updated_at'];
    }
    
    // For production services, prioritize production_company_name, entity_name and entity_type
    if (selectedEntityType === 'production') {
      coreFields = ['production_company_name', 'entity_name', 'entity_type', 'service_type', 'id', 'created_at', 'updated_at'];
    }
    
    // Filter available fields to remove 'name' for broadcast and production entities
    let filteredFields = [...availableFields];
    if (selectedEntityType === 'broadcast' || selectedEntityType === 'production') {
      const nameIndex = filteredFields.indexOf('name');
      if (nameIndex !== -1) {
        filteredFields.splice(nameIndex, 1);
      }
    }
    
    return [
      // Core fields first
      ...coreFields.filter(f => filteredFields.includes(f)),
      // Then all remaining fields
      ...filteredFields.filter(f => !coreFields.includes(f))
    ];
  };
  
  // Generate entity fingerprint for dependency tracking
  const entitiesFingerprint = useMemo(() => 
    entities && entities.length > 0 ? fingerprint(entities[0], { depth: 1 }) : 'empty',
    [entities]
  );
  
  // Generate a memo of field order to prevent recalculation on every render
  const initialColumnOrder = useMemo(
    () => getInitialColumnOrder(), 
    [entitiesFingerprint, selectedEntityType]
  );
  
  // Initialize useDragAndDrop for column reordering with localStorage persistence
  const {
    reorderedItems: columnOrder,
    draggedItem,
    dragOverItem,
    handleDragStart: handleColumnDragStart,
    handleDragOver: handleColumnDragOver,
    handleDrop: handleColumnDrop,
    handleDragEnd: handleColumnDragEnd
  } = useDragAndDrop<string>({
    items: initialColumnOrder,
    // Always include entity type in the storage key for persistence between navigation
    storageKey: selectedEntityType ? `entityList_${selectedEntityType}_columnOrder` : undefined
  });
  
  // Track scroll position for preserving it when changing pages
  const scrollPositionRef = useRef<number>(0);
  
  // Remember the scroll position before any state updates
  useEffect(() => {
    const handleScroll = () => {
      scrollPositionRef.current = window.scrollY;
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Initialize column visibility hook
  const {
    visibleColumns,
    showColumnSelector,
    setShowColumnSelector,
    showFullUuids,
    setShowFullUuids,
    toggleColumnVisibility,
    showAllColumns
  } = useColumnVisibility(selectedEntityType, entities);

  // Initialize inline editing hook
  const inlineEditHook = useInlineEdit({
    selectedEntityType,
    handleUpdateEntity
  });

  // Initialize export hook
  const exportHook = useEntityExport({
    selectedEntityType,
    handleExportToSheets
  });

  // Edit click handler
  const handleEditClick = (entity: BaseEntity) => {
    setSelectedEntity(entity);
    setIsEditModalVisible(true);
  };

  // Add state for search query to highlight matching rows
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Search handler - search across all records via API and highlight matched rows in the UI
  const handleSearchSelect = (query: string) => {
    // Store the search query for UI highlighting
    setSearchQuery(query.toLowerCase());
    
    // Check if we have a non-empty search query with at least 3 characters
    if (query && query.length >= 3) {
      // Create a search filter to send to the backend
      // This will search all records, not just the current page
      const searchFilters = [
        {
          field: 'name',
          operator: 'contains',
          value: query
        }
      ];
      
      console.log(`Searching for: ${query} - applying global search filter`);
      handleApplyFilters(searchFilters);
    } else if (query.length === 0) {
      // Clear filters if search is empty
      console.log('Search cleared - removing filters');
      handleClearFilters();
    }
  };

  const handleEditModalClose = () => {
    setSelectedEntity(null);
    setIsEditModalVisible(false);
  };

  const handleEntityUpdate = (updatedEntity: Entity) => {
    const { id, created_at, updated_at, ...updates } = updatedEntity;
    handleUpdateEntity(id, updates as Record<string, unknown>);
    setIsEditModalVisible(false);
  };

  // Memoize sort state for dependency tracking
  const sortStateFingerprint = useMemo(() => 
    fingerprint({ field: sortField, direction: sortDirection }),
    [sortField, sortDirection]
  );
  
  // Memoize selected entities state for dependency tracking
  const selectedEntitiesFingerprint = useMemo(() => 
    fingerprint(selectedEntities, { depth: 1 }),
    [selectedEntities]
  );

  // Use server-side sorting exclusively
  // This ensures consistent sorting behavior across pages
  const filteredEntities = useMemo(() => {
    // NOTE: Relationship fields (*_name) might not sort correctly on the backend
    // This is a limitation in the backend implementation that should be fixed
    console.log(`Using server-sorted data for ${selectedEntityType}, page ${currentPage}, sort: ${sortField} ${sortDirection}`);
    
    // Rely entirely on the server's sorting
    return entities as BaseEntity[];
  }, [entities, selectedEntityType, currentPage, sortField, sortDirection]);
  
  const hasActiveFilters = activeFilters && activeFilters.length > 0;
  const selectedCount = useMemo(
    () => Object.values(selectedEntities).filter(Boolean).length,
    [selectedEntitiesFingerprint]
  );

  // Loading state - only show full loading screen on initial load (when no entities data)
  if (isLoading && (!entities || entities.length === 0)) {
    return (
      <div className={`flex justify-center items-center h-64 ${className}`}>
        <LoadingSpinner size="medium" />
        <span className="ml-2 text-gray-600">Loading entities...</span>
      </div>
    );
  }

  // Error state - no entity type selected
  if (!selectedEntityType) {
    return (
      <div className={`flex justify-center items-center h-64 border rounded-lg bg-gray-50 ${className}`}>
        <div className="text-center text-gray-500">
          <p>No entity type selected</p>
          <p className="text-sm mt-2">Please select an entity type to view data</p>
        </div>
      </div>
    );
  }

  // Empty state - no entities found
  if (!entities || entities.length === 0) {
    return (
      <div className={`flex justify-center items-center h-64 border rounded-lg bg-gray-50 ${className}`}>
        <div className="text-center text-gray-500">
          <p>No {selectedEntityType} entities found</p>
          <p className="text-sm mt-2">Try selecting a different entity type or adding new entities</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header with search and export buttons */}
      <EntityListHeader
        selectedEntityType={selectedEntityType}
        showColumnSelector={showColumnSelector}
        setShowColumnSelector={setShowColumnSelector}
        showFullUuids={showFullUuids}
        setShowFullUuids={setShowFullUuids}
        openExportDialog={exportHook.openExportDialog}
        onSearch={handleSearchSelect}
      />
      
      {/* Column selector dropdown */}
      {showColumnSelector && (
        <ColumnSelector
          entities={entities}
          visibleColumns={visibleColumns}
          toggleColumnVisibility={toggleColumnVisibility}
          showAllColumns={showAllColumns}
          selectedEntityType={selectedEntityType}
        />
      )}

      {/* Bulk actions bar when items are selected */}
      <BulkActionBar
        selectedCount={selectedCount}
        deselectAllEntities={deselectAllEntities}
        setBulkEditModalVisible={setIsBulkEditModalVisible}
        handleBulkDelete={handleBulkDelete}
        isDeleting={isDeleting}
      />

      {/* Filter status */}
      {hasActiveFilters && (
        <div className="bg-blue-50 p-3 border-b border-blue-100">
          <p className="text-blue-700 text-sm">
            Filters applied: Showing {totalItems} {selectedEntityType}(s) matching your filters.
          </p>
        </div>
      )}
      
      {/* Data table */}
      <EntityTable
        entities={filteredEntities}
        columnOrder={columnOrder}
        visibleColumns={visibleColumns}
        selectedEntityType={selectedEntityType}
        showFullUuids={showFullUuids}
        selectedEntities={selectedEntities}
        toggleEntitySelection={toggleEntitySelection}
        selectAllEntities={selectAllEntities}
        deselectAllEntities={deselectAllEntities}
        handleSort={handleSort}
        sortField={sortField}
        sortDirection={sortDirection}
        handleEditClick={handleEditClick}
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
        handleDeleteEntity={handleDeleteEntity}
        handleView={(entityId) => navigate(`/sports/${selectedEntityType}/${entityId}`)}
        searchQuery={searchQuery} // Pass the search query for highlighting
        isLoading={isLoading} // Pass loading state to show loading overlay
        // Column drag and drop props
        draggedHeader={draggedItem}
        dragOverHeader={dragOverItem}
        handleColumnDragStart={handleColumnDragStart}
        handleColumnDragOver={handleColumnDragOver}
        handleColumnDrop={handleColumnDrop}
        handleColumnDragEnd={handleColumnDragEnd}
        // Inline editing props
        {...inlineEditHook}
      />
      
      {/* Pagination Controls - with all props explicitly passed */}
      <Pagination 
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        setPageSize={setPageSize}
        totalItems={totalItems}
        isLoading={isLoading}
      />

      {/* Entity Edit Modal */}
      <Modal
        title="Entity Edit"
        open={isEditModalVisible}
        onCancel={handleEditModalClose}
        footer={null}
        width={800}
      >
        {selectedEntity && (
          <EntityCard
            key={selectedEntity.id}
            entity={selectedEntity as Entity}
            entityType={selectedEntityType as EntityType}
            onUpdate={handleEntityUpdate}
          />
        )}
      </Modal>

      {/* Bulk Edit Modal */}
      <BulkEditModal 
        visible={isBulkEditModalVisible}
        onCancel={() => setIsBulkEditModalVisible(false)}
        entityType={selectedEntityType}
        selectedIds={Object.keys(selectedEntities).filter(id => selectedEntities[id])}
        onSuccess={() => {
          setIsBulkEditModalVisible(false);
          refetch();
          deselectAllEntities();
        }}
      />
      
      {/* Export Dialog */}
      <ExportDialog
        showExportDialog={exportHook.showExportDialog}
        setShowExportDialog={exportHook.setShowExportDialog}
        exportFileName={exportHook.exportFileName}
        setExportFileName={exportHook.setExportFileName}
        selectedFolderName={exportHook.selectedFolderName}
        handleFolderSelection={exportHook.handleFolderSelection}
        handleCsvExport={exportHook.handleCsvExport}
        handleSheetsExport={exportHook.handleSheetsExport}
        entities={entities}
        visibleColumns={columnOrder.filter(col => 
          visibleColumns[col] !== false && entities[0]?.hasOwnProperty(col)
        )}
      />
    </div>
  );
};

export default EntityList;