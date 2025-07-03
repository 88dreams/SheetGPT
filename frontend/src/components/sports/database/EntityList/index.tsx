import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { fingerprint } from '../../../../utils/fingerprint';
import { useNavigate } from 'react-router-dom';
import { Modal } from 'antd';
import { useSportsDatabase, EntityField } from '../SportsDatabaseContext';
import { FilterConfig } from '../../EntityFilter';
// import LoadingSpinner from '../../../common/LoadingSpinner'; // Keep commented if not used directly
import BulkEditModal from '../../../common/BulkEditModal'; // Restore import
import { EntityCard } from '../../../data/EntityUpdate/EntityCard'; // Restore import
import { Entity, BaseEntity } from '../../../../types/sports';
import { EntityType } from '../../../../services/SportsDatabaseService';
import { useDragAndDrop } from '../../../data/DataTable/hooks/useDragAndDrop';

// Restore Child Component imports
import {
  EntityListHeader,
  ColumnSelector,
  ExportDialog,
  EntityTable,
  BulkActionBar
} from './components';
import Pagination from './components/Pagination';

// Custom Hook imports
import {
  useColumnVisibility,
  useInlineEdit,
  useEntityExport
} from './hooks';

// Helper function (lodash.debounce is a common choice for production)
// You can replace this with an import if you have lodash or a similar utility
const debounce = (func: (...args: any[]) => void, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Define ColumnConfig based on what useColumnVisibility and the table might need
// This is an assumption; adjust if ColumnConfig is more complex or defined elsewhere
interface ColumnConfig {
  key: string;      // fieldName
  label: string;    // display name
  type: string;     // data type
  isSortable?: boolean;
  // other properties as needed by useColumnVisibility or your table lib
}

interface EntityListProps {
  className?: string;
  // entityType, columnsConfig, onEdit will now be sourced from context or generated internally
}

const EntityList: React.FC<EntityListProps> = ({ className = '' }) => {
  const {
    selectedEntityType,
    getEntityFields,
    entities,
    isLoading,
    error,
    activeFilters,
    handleApplyFilters,
    handleClearFilters,
    handleUpdateEntity,
    currentPage,
    setCurrentPage,
    refetch,
    deselectAllEntities,
    handleExportToSheets,
    sortField,
    sortDirection,
    selectedEntities,
    totalItems,
    totalPages,
    pageSize,
    setPageSize,
    toggleEntitySelection,
    selectAllEntities,
    handleSort,
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleDeleteEntity,
    handleBulkDelete,
    isDeleting,
  } = useSportsDatabase();

  const navigate = useNavigate();

  // Add state for column selector panel visibility
  const [isColumnSelectorPanelVisible, setIsColumnSelectorPanelVisible] = useState<boolean>(false);

  const generatedColumnsArray = useMemo(() => {
    if (!selectedEntityType) return [];
    const fields = getEntityFields(selectedEntityType);
    if (!fields) return [];
    
    // Manually add our new "MARKET" column definition
    const marketColumn = {
      key: 'tags',
      label: 'MARKET',
      type: 'tags', // Custom type for rendering
      isSortable: true,
    };

    const entityFields = fields.map(field => ({
      key: field.fieldName,
      label: field.name || field.fieldName,
      type: field.type,
      isSortable: true,
    }));

    return [marketColumn, ...entityFields];
  }, [selectedEntityType, getEntityFields]);
  
  const generatedColumnsConfigMap = useMemo(() => {
    const map: Record<string, ColumnConfig> = {};
    generatedColumnsArray.forEach(col => {
      map[col.key] = col;
    });
    return map;
  }, [generatedColumnsArray]);

  const { 
    visibleColumns, 
    setVisibleColumns 
  } = useColumnVisibility(
    selectedEntityType, 
    generatedColumnsArray 
  );

  const [searchInputValue, setSearchInputValue] = useState('');
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingEntity, setEditingEntity] = useState<any | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // useEntityExport Hook
  const {
    exportState,
    handleCsvExport,
    handleSheetsExport,
  } = useEntityExport({ selectedEntityType });

  // Inline Edit Hook (Corrected call and destructuring)
  const {
    editingId,
    editValue,
    setEditValue, // Provided by hook
    editingNicknameId,
    nicknameEditValue,
    setNicknameEditValue, // Provided by hook
    startEdit,
    cancelEdit,
    saveEdit,
    handleKeyDown,
    startNicknameEdit,
    cancelNicknameEdit,
    saveNicknameEdit,
    handleNicknameKeyDown
  } = useInlineEdit({ selectedEntityType, handleUpdateEntity });

  const getInitialColumnOrder = () => {
    // Use generatedColumnsArray (from useEntitySchema) as the source of truth for available field keys
    const schemaAvailableFields = generatedColumnsArray.map(col => col.key);

    if (schemaAvailableFields.length === 0) {
      // Fallback if schema fields aren't ready, though less ideal
      if (!Array.isArray(entities) || entities.length === 0) return [];
      return Object.keys(entities[0] || {});
    }

    let coreFields = ['tags', 'id', 'name', 'created_at', 'updated_at', 'deleted_at']; // Default general core fields

    if (selectedEntityType === 'broadcast') {
      coreFields = [
        'tags', 'broadcast_company_name', 'entity_name', 'league_name', 'league_sport', 
        'territory', 'start_date', 'end_date'
      ];
    } else if (selectedEntityType === 'production_service') { 
      coreFields = [
        'tags', 'production_company_name', 'service_type', 'league_name', 'entity_name', 
        'secondary_brand_name', 'start_date', 'end_date'
      ];
    } else if (selectedEntityType === 'team') {
      coreFields = [
        'tags', 'name', 'league_sport', 'league_name', 'division_conference_name', 
        'stadium_name', 'city', 'state', 'founded_year'
      ];
    } else if (selectedEntityType === 'brand') {
      coreFields = [
        'tags', 'name', 'company_type', 'partner', 'partner_relationship', 'country'
      ];
    }
    
    let displayableSchemaFields = [...schemaAvailableFields];
    // For broadcast and production_service, optionally refine 'name' field removal
    if (selectedEntityType === 'broadcast' || selectedEntityType === 'production_service') {
      if (coreFields.includes('broadcast_company_name') || coreFields.includes('production_company_name') || coreFields.includes('entity_name')) {
        const nameIndex = displayableSchemaFields.indexOf('name');
        if (nameIndex > -1) {
             displayableSchemaFields.splice(nameIndex, 1);
        }
      }
    }
    
    const validCoreFields = coreFields.filter(f => displayableSchemaFields.includes(f));
    const remainingFields = displayableSchemaFields.filter(f => !validCoreFields.includes(f));
    
    return [...validCoreFields, ...remainingFields];
  };
  
  const entitiesFingerprint = useMemo(() => 
    entities && entities.length > 0 ? fingerprint(entities[0], { depth: 1 }) : 'empty',
    [entities]
  );
  
  const initialColumnOrder = useMemo(
    () => getInitialColumnOrder(), 
    [entitiesFingerprint, selectedEntityType]
  );
  
  const [columnOrder, setColumnOrder] = useState(initialColumnOrder);

  useEffect(() => {
    setColumnOrder(initialColumnOrder);
  }, [initialColumnOrder]);

  const {
    draggedItem,
    dragOverItem,
    handleDragStart: handleColumnDragStart,
    handleDragOver: handleColumnDragOver,
    handleDrop: handleColumnDrop,
    handleDragEnd: handleColumnDragEnd
  } = useDragAndDrop<string>({
    items: columnOrder,
    onReorder: setColumnOrder
  });
  
  const scrollPositionRef = useRef<number>(0);
  useEffect(() => {
    const handleScroll = () => { scrollPositionRef.current = window.scrollY; };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const originalHandleSearchSelect = useCallback((query: string) => {
    if (!query || query.length === 0) {
      const otherFilters = (activeFilters || []).filter(f => 
        !(f.field.startsWith('search_columns:') && f.operator === 'contains') &&
        !(f.field === 'name' && f.operator === 'contains')
      );
      handleApplyFilters(otherFilters);
      setSearchInputValue('');
      return;
    }
    setSearchInputValue(query);
    
    console.log('[SearchDebug] Query:', query);
    console.log('[SearchDebug] columnOrder:', columnOrder);
    console.log('[SearchDebug] visibleColumns:', visibleColumns);
    console.log('[SearchDebug] generatedColumnsConfigMap:', generatedColumnsConfigMap);

    if (query.length > 0 && columnOrder) {
      const searchableVisibleColumns = columnOrder.filter(colId =>
        visibleColumns[colId] &&
        generatedColumnsConfigMap[colId] &&
        (generatedColumnsConfigMap[colId].type === 'string' || generatedColumnsConfigMap[colId].type === 'text') &&
        colId !== 'id' && !colId.endsWith('_id') &&
        colId !== 'created_at' && colId !== 'updated_at' && colId !== 'deleted_at'
      );

      console.log('[SearchDebug] searchableVisibleColumns:', searchableVisibleColumns);

      let newSearchFilter: FilterConfig | null = null;
      if (searchableVisibleColumns.length > 0) {
        newSearchFilter = {
          field: `search_columns:${searchableVisibleColumns.join(',')}`,
          operator: 'contains',
          value: query
        };
      }
      console.log('[SearchDebug] newSearchFilter:', newSearchFilter);

      const otherFilters = (activeFilters || []).filter(f => 
        !(f.field.startsWith('search_columns:') && f.operator === 'contains') &&
        !(f.field === 'name' && f.operator === 'contains')
      );
      const filtersToApply = newSearchFilter ? [...otherFilters, newSearchFilter] : otherFilters;
      handleApplyFilters(filtersToApply);
      setCurrentPage(1);
    }
  }, [columnOrder, visibleColumns, generatedColumnsConfigMap, activeFilters, handleApplyFilters, setCurrentPage, selectedEntityType]);

  const debouncedSearch = useMemo(() => debounce(originalHandleSearchSelect, 300), [originalHandleSearchSelect]);

  const handleSearchInputChange = (query: string) => {
    setSearchInputValue(query);
    debouncedSearch(query);
  };
  
  const onEdit = (entity: any) => {
    setEditingEntity(entity);
    setIsEditModalVisible(true);
  };

  const [selectedEntity, setSelectedEntity] = useState<BaseEntity | null>(null);
  const [isBulkEditModalVisible, setIsBulkEditModalVisible] = useState(false);

  const handleEditModalClose = useCallback(() => {
    setSelectedEntity(null);
    setIsEditModalVisible(false);
  }, []);

  const handleEntityUpdate = useCallback((updatedEntity: Entity) => {
    const { id, created_at, updated_at, ...updates } = updatedEntity;
    handleUpdateEntity(id, updates as Record<string, unknown>);
    setSelectedEntity(null);
    setIsEditModalVisible(false);
  }, [handleUpdateEntity]);
  
  const handleBulkEditModalCancel = useCallback(() => { setIsBulkEditModalVisible(false) }, []);
  const handleBulkEditModalSuccess = useCallback(() => {
    setIsBulkEditModalVisible(false);
    refetch(); 
    deselectAllEntities(); 
  }, [refetch, deselectAllEntities]);

  const sortStateFingerprint = useMemo(() => 
    fingerprint({ field: sortField, direction: sortDirection }),
    [sortField, sortDirection]
  );
  const selectedEntitiesFingerprint = useMemo(() => 
    fingerprint(selectedEntities, { depth: 1 }),
    [selectedEntities]
  );
  const filteredEntities = useMemo(() => {
    return entities as BaseEntity[];
  }, [entities]);
  const selectedCount = useMemo(
    () => Object.values(selectedEntities).filter(Boolean).length,
    [selectedEntitiesFingerprint]
  );

  const hasNoEntities = !entities || entities.length === 0;
  const hasActiveSearchOrFilters = (activeFilters && activeFilters.length > 0) || (searchInputValue && searchInputValue.length > 0);
  const shouldShowEmptyState = hasNoEntities && !hasActiveSearchOrFilters;

  const handleShowAllColumns = useCallback(() => {
    const allVisible = Object.fromEntries(generatedColumnsArray.map(col => [col.key, true]));
    setVisibleColumns(allVisible);
  }, [generatedColumnsArray, setVisibleColumns]);

  if (isLoading) {
    return (
      <div className={`flex justify-center items-center h-64 ${className}`}>
        <p>Loading...</p>
      </div>
    );
  }

  if (shouldShowEmptyState) {
    return (
      <div className={`flex justify-center items-center h-64 border rounded-lg bg-gray-50 ${className}`}>
        <div className="text-center text-gray-500">
          <p>No {selectedEntityType} entities found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <EntityListHeader
        selectedEntityType={selectedEntityType}
        showColumnSelector={isColumnSelectorPanelVisible}
        setShowColumnSelector={setIsColumnSelectorPanelVisible}
        showFullUuids={false}
        setShowFullUuids={(show) => {}}
        openExportDialog={() => setShowExportDialog(true)}
        onSearch={handleSearchInputChange}
        searchValue={searchInputValue}
      />
      
      {isColumnSelectorPanelVisible && (
        <ColumnSelector
          entities={entities}
          visibleColumns={visibleColumns}
          toggleColumnVisibility={(colId) => {
            setVisibleColumns(prev => ({ ...prev, [colId]: !prev[colId] }));
          }}
          showAllColumns={handleShowAllColumns}
          selectedEntityType={selectedEntityType}
        />
      )}

      <BulkActionBar
        selectedCount={selectedCount}
        deselectAllEntities={deselectAllEntities}
        setBulkEditModalVisible={setIsBulkEditModalVisible}
        handleBulkDelete={handleBulkDelete}
        isDeleting={isDeleting}
      />

      {activeFilters && activeFilters.length > 0 && (
        <div className="bg-blue-50 p-3 border-b border-blue-100">
          <p className="text-blue-700 text-sm">
            {totalItems} {selectedEntityType}(s) matching your filters.
          </p>
        </div>
      )}
      
      <EntityTable
        entities={filteredEntities}
        columnOrder={columnOrder}
        visibleColumns={visibleColumns}
        selectedEntityType={selectedEntityType}
        showFullUuids={false}
        selectedEntities={selectedEntities}
        toggleEntitySelection={toggleEntitySelection}
        selectAllEntities={selectAllEntities}
        deselectAllEntities={deselectAllEntities}
        handleSort={handleSort}
        sortField={sortField}
        sortDirection={sortDirection}
        handleEditClick={onEdit}
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
        handleDeleteEntity={handleDeleteEntity}
        handleView={(entityId) => navigate(`/sports/${selectedEntityType}/${entityId}`)}
        searchQuery={searchInputValue}
        isLoading={isLoading}
        draggedHeader={draggedItem}
        dragOverHeader={dragOverItem}
        handleColumnDragStart={handleColumnDragStart}
        handleColumnDragOver={handleColumnDragOver}
        handleColumnDrop={handleColumnDrop}
        handleColumnDragEnd={handleColumnDragEnd}
        editingId={editingId}
        editValue={editValue}
        setEditValue={setEditValue}
        startEdit={startEdit}
        saveEdit={saveEdit}
        cancelEdit={cancelEdit}
        handleKeyDown={handleKeyDown}
        editingNicknameId={editingNicknameId}
        nicknameEditValue={nicknameEditValue}
        setNicknameEditValue={setNicknameEditValue}
        startNicknameEdit={startNicknameEdit}
        saveNicknameEdit={saveNicknameEdit}
        cancelNicknameEdit={cancelNicknameEdit}
        handleNicknameKeyDown={handleNicknameKeyDown}
      />
      
      <Pagination 
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        setPageSize={setPageSize}
        totalItems={totalItems}
        isLoading={isLoading}
        filteredCount={null}
        searchQuery={searchInputValue}
      />

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

      <BulkEditModal 
        open={isBulkEditModalVisible}
        onCancel={handleBulkEditModalCancel}
        entityType={selectedEntityType}
        selectedIds={Object.keys(selectedEntities).filter(id => selectedEntities[id])}
        onSuccess={handleBulkEditModalSuccess}
      />
      
      <ExportDialog
        show={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExportCsv={handleCsvExport}
        onExportSheets={handleSheetsExport}
        isExporting={exportState !== 'idle'}
      />
    </div>
  );
};

export default EntityList;