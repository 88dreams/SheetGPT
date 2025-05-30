import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { fingerprint } from '../../../../utils/fingerprint';
import { useNavigate } from 'react-router-dom';
import { Modal } from 'antd';
import { useSportsDatabase, EntityField } from '../SportsDatabaseContext';
import { FilterConfig } from '../../EntityFilter';
// import LoadingSpinner from '../../../common/LoadingSpinner'; // Keep commented if not used directly
import BulkEditModal from '../../../common/BulkEditModal'; // Restore import
import { EntityCard } from '../../../data/EntityUpdate/EntityCard'; // Restore import
import { Entity, EntityType, BaseEntity } from '../../../../types/sports';
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
    return fields.map(field => ({
      key: field.fieldName,
      label: field.name || field.fieldName,
      type: field.type,
      isSortable: true,
    }));
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

  // useEntityExport Hook
  const {
    showExportDialog: isExportDialogOpen, // Rename for clarity if used directly as prop
    setShowExportDialog: setIsExportDialogOpen,
    exportFileName,
    setExportFileName,
    // exportType, // Manage within ExportDialog or pass if needed
    // setExportType,
    // includeRelationships, // Manage within ExportDialog or pass if needed
    // setIncludeRelationships,
    selectedFolderName,
    // setSelectedFolderName, // Managed by hook's handleFolderSelection
    openExportDialog: triggerOpenExportDialog, // Rename to avoid conflict if EntityListHeader also has openExportDialog
    handleCsvExport: actualCsvExportHandler, // Rename to avoid conflict
    handleSheetsExport: actualSheetsExportHandler, // Rename to avoid conflict
    handleFolderSelection: actualFolderSelectionHandler // Rename to avoid conflict
  } = useEntityExport({ selectedEntityType, handleExportToSheets });

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
    if (!Array.isArray(entities) || entities.length === 0) return [];
    const availableFields = Object.keys(entities[0]);
    let coreFields = ['id', 'name', 'created_at', 'updated_at'];
    if (selectedEntityType === 'broadcast') {
      coreFields = ['broadcast_company_id', 'entity_id', 'division_conference_id', 'entity_type', 'territory', 'league_name', 'id', 'created_at', 'updated_at'];
    }
    if (selectedEntityType === 'production') {
      coreFields = ['production_company_name', 'entity_name', 'entity_type', 'service_type', 'id', 'created_at', 'updated_at'];
    }
    let filteredFields = [...availableFields];
    if (selectedEntityType === 'broadcast' || selectedEntityType === 'production') {
      const nameIndex = filteredFields.indexOf('name');
      if (nameIndex !== -1) filteredFields.splice(nameIndex, 1);
      }
    return [...coreFields.filter(f => filteredFields.includes(f)), ...filteredFields.filter(f => !coreFields.includes(f))];
  };
  
  const entitiesFingerprint = useMemo(() => 
    entities && entities.length > 0 ? fingerprint(entities[0], { depth: 1 }) : 'empty',
    [entities]
  );
  
  const initialColumnOrder = useMemo(
    () => getInitialColumnOrder(), 
    [entitiesFingerprint, selectedEntityType]
  );
  
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
    storageKey: selectedEntityType ? `entityList_${selectedEntityType}_columnOrder` : undefined
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
        openExportDialog={triggerOpenExportDialog}
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
        showExportDialog={isExportDialogOpen}
        setShowExportDialog={setIsExportDialogOpen}
        exportFileName={exportFileName}
        setExportFileName={setExportFileName}
        selectedFolderName={selectedFolderName}
        handleFolderSelection={actualFolderSelectionHandler}
        handleCsvExport={actualCsvExportHandler}
        handleSheetsExport={actualSheetsExportHandler}
        entities={entities}
        visibleColumns={columnOrder.filter(col => 
          visibleColumns[col] !== false && (entities.length > 0 ? entities[0].hasOwnProperty(col) : true)
        )}
      />
    </div>
  );
};

export default EntityList;