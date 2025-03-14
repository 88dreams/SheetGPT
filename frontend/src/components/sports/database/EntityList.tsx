/**
 * EntityList Component - Displays and manages entity data in a table with bulk operations
 * 
 * This component is designed to work similarly to the DatabaseQuery component for consistency:
 * - Shows entities in a table with column visibility controls
 * - Supports selecting rows for bulk editing
 * - Uses column resizing and sorting
 * - Column visibility is saved per entity type
 * 
 * Both the EntityList and DatabaseQuery should display similar fields and provide 
 * similar bulk edit functionality when working with the same entity types.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSportsDatabase } from './SportsDatabaseContext';
import { useNotification } from '../../../contexts/NotificationContext';
import LoadingSpinner from '../../common/LoadingSpinner';
// Using local BulkEditModal for now until auth issues are fixed
import BulkEditModal from './BulkEditModal';
// @ts-ignore
import { FaTrash, FaEye, FaSortUp, FaSortDown, FaSort, FaPencilAlt, FaCheck, FaTimes, FaEdit, FaFileExport, FaColumns, FaKey } from 'react-icons/fa';
import SmartEntitySearch from '../../data/EntityUpdate/SmartEntitySearch';
import { EntityCard } from '../../data/EntityUpdate/EntityCard';
// @ts-ignore
import { Modal } from 'antd';
import { Entity, EntityType, BaseEntity, DivisionConference } from '../../../types/sports';

interface EntityListProps {
  className?: string;
}

const EntityList: React.FC<EntityListProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<BaseEntity | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isBulkEditModalVisible, setIsBulkEditModalVisible] = useState(false);
  const [includeRelationships, setIncludeRelationships] = useState(false);

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
    renderSortIcon,
    getSortedEntities,
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleDeleteEntity,
    handleBulkDelete,
    isDeleting,
    activeFilters,
    handleUpdateEntity,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    setPageSize,
    totalItems,
    refetch,
    getEntityFields
  } = useSportsDatabase();
  
  // Get all available fields for the current entity type
  const getAvailableFields = (): string[] => {
    if (!selectedEntityType || !getEntityFields) return [];
    
    const fields = getEntityFields(selectedEntityType);
    
    // Extract field names
    return fields.map(field => field.fieldName);
  };

  // Column visibility and resizing state
  const [columnWidths, setColumnWidths] = useState<{[key: string]: number}>({
    checkbox: 50,
    id: 100,
    league: 150,
    name: 300,
    city: 120,
    state: 100,
    division: 150,
    sport: 120,
    nickname: 120,
    type: 120,
    created: 150,
    actions: 120
  });

  // Column visibility state - initialize with defaults to prevent blank screen
  const [visibleColumns, setVisibleColumns] = useState<{[key: string]: boolean}>({
    id: true,
    name: true,
    created_at: true
  });
  const [showColumnSelector, setShowColumnSelector] = useState<boolean>(false);
  const [showFullUuids, setShowFullUuids] = useState<boolean>(false);

  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);

  // Save column widths to localStorage
  useEffect(() => {
    if (Object.keys(columnWidths).length > 0) {
      localStorage.setItem('entityListColumnWidths', JSON.stringify(columnWidths));
    }
  }, [columnWidths]);
  
  // Save column visibility to localStorage
  useEffect(() => {
    if (Object.keys(visibleColumns).length > 0 && selectedEntityType) {
      localStorage.setItem(`entityList_${selectedEntityType}_columns`, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns, selectedEntityType]);

  // Load column widths and visibility from localStorage
  useEffect(() => {
    // Only proceed if we have a valid selectedEntityType
    if (!selectedEntityType) return;
    
    // Load column widths
    const savedWidths = localStorage.getItem('entityListColumnWidths');
    if (savedWidths) {
      try {
        const parsedWidths = JSON.parse(savedWidths);
        setColumnWidths(parsedWidths);
      } catch (e) {
        console.error('Error parsing saved column widths:', e);
      }
    }
    
    // Initialize with all columns visible
    const defaultVisibility: Record<string, boolean> = {
      id: true,
      name: true,
      created_at: true,
      updated_at: true
    };
    
    // Get all available fields and set all to visible
    if (getEntityFields) {
      const fields = getEntityFields(selectedEntityType);
      
      // Set ALL fields visible by default
      fields.forEach(field => {
        defaultVisibility[field.fieldName] = true;
      });
    }
    
    // ALWAYS show all columns by default regardless of what's in localStorage
    setVisibleColumns(defaultVisibility);
    
    // Save this full visibility setting to localStorage to persist it
    localStorage.setItem(`entityList_${selectedEntityType}_columns`, JSON.stringify(defaultVisibility));
  }, [selectedEntityType]);

  const startEdit = (entity: any) => {
    setEditingId(entity.id);
    setEditValue(entity.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (id: string) => {
    if (editValue.trim()) {
      await handleUpdateEntity(id, { name: editValue.trim() });
      setEditingId(null);
      setEditValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      saveEdit(id);
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  // Get entity type name for display
  const getEntityTypeName = () => {
    const entityTypes = [
      { id: 'league', name: 'Leagues' },
      { id: 'division_conference', name: 'Divisions/Conferences' },
      { id: 'team', name: 'Teams' },
      { id: 'player', name: 'Players' },
      { id: 'game', name: 'Games' },
      { id: 'stadium', name: 'Stadiums' },
      { id: 'broadcast', name: 'Broadcast Rights' },
      { id: 'production', name: 'Production Services' },
      { id: 'brand', name: 'Brand Relationships' },
      { id: 'game_broadcast', name: 'Game Broadcasts' },
      { id: 'league_executive', name: 'League Executives' }
    ];
    return entityTypes.find(e => e.id === selectedEntityType)?.name || selectedEntityType;
  };

  // Get filtered entities - using the complete entities directly instead of limiting to a few fields
  // This ensures we have all fields available for display and editing
  const filteredEntities = getSortedEntities() as BaseEntity[];

  const hasActiveFilters = activeFilters && activeFilters.length > 0;

  // Get selected count
  const selectedCount = Object.values(selectedEntities).filter(Boolean).length;

  // Add a function to get the complete entity data
  const getCompleteEntity = (entityId: string) => {
    return entities.find(e => e.id === entityId);
  };
  
  // Format cell values, particularly UUIDs
  const formatCellValue = (value: any, field: string) => {
    // Skip if no value
    if (value === null || value === undefined) return 'N/A';
    
    // Check if it's a UUID by format
    if (typeof value === 'string' && 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      
      // For the main ID field, always show UUID unless toggle is off
      if (field === 'id') {
        return showFullUuids ? value : `${value.substring(0, 8)}...`;
      }
      
      // For any other UUID field (likely ends with _id)
      if (field.endsWith('_id')) {
        return showFullUuids ? value : `${value.substring(0, 8)}...`;
      }
    }
    
    // For any other field type
    return String(value);
  };

  // Update the edit click handler
  const handleEditClick = (entity: BaseEntity) => {
    const completeEntity = getCompleteEntity(entity.id);
    if (completeEntity) {
      setSelectedEntity(completeEntity as Entity);
      setIsEditModalVisible(true);
    }
  };

  // Update the search handler
  const handleSearchSelect = (entity: Entity) => {
    const completeEntity = getCompleteEntity(entity.id);
    if (completeEntity) {
      setSelectedEntity(completeEntity as Entity);
      setIsEditModalVisible(true);
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

  const handleExportToSheets = (entities: BaseEntity[]) => {
    const { handleExportToSheets: exportToSheets } = useSportsDatabase();
    if (exportToSheets) {
      exportToSheets(entities);
    } else {
      showNotification('error', 'Export functionality is not available');
    }
  };

  // Column resizing handlers
  const handleResizeStart = (e: React.MouseEvent, columnName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnName);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = columnWidths[columnName] || 100;

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizingColumn) return;

    const delta = e.clientX - resizeStartX.current;
    const newWidth = Math.max(50, resizeStartWidth.current + delta);

    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn]: newWidth
    }));
  };

  const handleResizeEnd = () => {
    setResizingColumn(null);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, []);

  if (isLoading) {
    return (
      <div className={`flex justify-center items-center h-64 ${className}`}>
        <LoadingSpinner size="medium" />
        <span className="ml-2 text-gray-600">Loading entities...</span>
      </div>
    );
  }

  // Handle any errors safely
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
      {/* Search bar and export button row */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center space-x-4">
          <h2 className="text-lg font-semibold min-w-[100px]">
            {getEntityTypeName()}
          </h2>
          <div className="flex-grow max-w-xl">
            <SmartEntitySearch
              entityTypes={[selectedEntityType as EntityType]}
              onEntitySelect={handleSearchSelect}
              placeholder="Update Stadium, League, or Team"
              entities={entities as Entity[]}
            />
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => handleExportToSheets(entities as any[])}
              disabled={selectedCount === 0 || isDeleting}
              className={`px-2 py-1 text-sm font-medium rounded flex items-center ${
                selectedCount > 0 && !isDeleting
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-200 text-gray-700 cursor-not-allowed'
              }`}
            >
              <FaFileExport className="mr-1" />
              Export
            </button>
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className={`px-2 py-1 text-sm font-medium rounded flex items-center ${
                showColumnSelector
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-600 bg-opacity-90 text-white hover:bg-blue-700'
              }`}
            >
              <FaColumns className="mr-1" />
              Columns
            </button>
            <button
              onClick={() => setShowFullUuids(!showFullUuids)}
              className={`px-2 py-1 text-sm font-medium rounded flex items-center ${
                showFullUuids
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-600 bg-opacity-90 text-white hover:bg-indigo-700'
              }`}
            >
              <FaKey className="mr-1" />
              {showFullUuids ? 'IDs' : 'Names'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Column selector dropdown */}
      {showColumnSelector && (
        <div className="bg-white p-2 border-b border-gray-200 shadow-md">
          <div className="flex justify-between items-center mb-1">
            <button 
              className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
              onClick={() => {
                // Show all columns using dynamic field list from entity schema
                const allColumns: {[key: string]: boolean} = {};
                
                // Get all available fields for this entity type
                const availableFields = getAvailableFields();
                
                // Set all fields to visible
                availableFields.forEach(col => {
                  allColumns[col] = true;
                });
                
                // Always include base columns
                ['id', 'name', 'created_at', 'updated_at'].forEach(col => {
                  allColumns[col] = true;
                });
                
                setVisibleColumns(allColumns);
              }}
            >
              <FaCheck className="mr-1" /> Show All
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-1">
            {/* Common base columns */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="col-id"
                checked={visibleColumns['id'] !== false}
                onChange={() => setVisibleColumns(prev => ({...prev, id: !prev['id']}))}
                className="mr-1"
              />
              <label htmlFor="col-id" className="text-xs text-gray-700 truncate">ID</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="col-name"
                checked={visibleColumns['name'] !== false}
                onChange={() => setVisibleColumns(prev => ({...prev, name: !prev['name']}))}
                className="mr-1"
              />
              <label htmlFor="col-name" className="text-xs text-gray-700 truncate">Name</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="col-created_at"
                checked={visibleColumns['created_at'] !== false}
                onChange={() => setVisibleColumns(prev => ({...prev, created_at: !prev['created_at']}))}
                className="mr-1"
              />
              <label htmlFor="col-created_at" className="text-xs text-gray-700 truncate">Created</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="col-updated_at"
                checked={visibleColumns['updated_at'] !== false}
                onChange={() => setVisibleColumns(prev => ({...prev, updated_at: !prev['updated_at']}))}
                className="mr-1"
              />
              <label htmlFor="col-updated_at" className="text-xs text-gray-700 truncate">Updated</label>
            </div>
            
            {/* Dynamically generated entity-specific columns */}
            {getAvailableFields()
              .filter(field => !['id', 'name', 'created_at', 'updated_at'].includes(field))
              .map(field => (
                <div key={field} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`col-${field}`}
                    checked={visibleColumns[field] !== false}
                    onChange={() => setVisibleColumns(prev => ({...prev, [field]: !prev[field]}))}
                    className="mr-1"
                  />
                  <label htmlFor={`col-${field}`} className="text-xs text-gray-700 truncate">
                    {/* Display proper labels for fields */}
                    {field.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                  </label>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Add bulk actions bar when items are selected */}
      {selectedCount > 0 && (
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => deselectAllEntities()}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
            >
              Clear Selection
            </button>
            <button
              onClick={() => setIsBulkEditModalVisible(true)}
              className="px-3 py-1 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded"
            >
              Bulk Edit {selectedCount} Items
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete ${selectedCount} selected ${selectedEntityType}(s)?`)) {
                  handleBulkDelete();
                }
              }}
              disabled={isDeleting}
              className="px-3 py-1 text-sm text-white bg-red-500 hover:bg-red-600 rounded disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : `Delete ${selectedCount} Selected`}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        {hasActiveFilters && (
          <div className="bg-blue-50 p-3 border-b border-blue-100">
            <p className="text-blue-700 text-sm">
              Filters applied: Showing {totalItems} {selectedEntityType}(s) matching your filters.
            </p>
          </div>
        )}
        {/* Add CSS class to show when resizing is happening */}
        <table className={`min-w-full divide-y divide-gray-200 table-fixed border-collapse ${resizingColumn ? 'cursor-col-resize' : ''}`}>
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200">
              {/* Checkbox column */}
              <th 
                scope="col" 
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative border-r border-gray-200"
                style={{ width: `${columnWidths.checkbox}px`, minWidth: '50px' }}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={Array.isArray(entities) && entities.length > 0 &&
                      Object.values(selectedEntities).filter(Boolean).length === entities.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        selectAllEntities();
                      } else {
                        deselectAllEntities();
                      }
                    }}
                  />
                  <div 
                    className="absolute top-0 right-0 h-full w-4 cursor-col-resize z-20"
                    onMouseDown={(e) => handleResizeStart(e, 'checkbox')}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="h-full w-0 mx-auto hover:bg-blue-500 hover:w-2 transition-all"></div>
                  </div>
                </div>
              </th>
              
              {/* Dynamic column generation for all fields */}
              {Object.entries(visibleColumns)
                .filter(([field, isVisible]) => isVisible !== false && field !== 'actions')
                .map(([field]) => (
                  <th 
                    key={field}
                    scope="col" 
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer relative border-r border-gray-200"
                    onClick={() => handleSort(field)}
                    style={{ 
                      width: columnWidths[field] || 120,
                      minWidth: field === 'name' ? '150px' : '100px'
                    }}
                  >
                    <div className="flex items-center">
                      {/* Format field name for display */}
                      {field.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                      {renderSortIcon(field)}
                      <div 
                        className="absolute top-0 right-0 h-full w-4 cursor-col-resize z-20"
                        onMouseDown={(e) => handleResizeStart(e, field)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="h-full w-0 mx-auto hover:bg-blue-500 hover:w-2 transition-all"></div>
                      </div>
                    </div>
                  </th>
                ))
              }
              
              {/* Actions column */}
              <th 
                scope="col" 
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative border-r border-gray-200"
                style={{ width: `${columnWidths.actions}px`, minWidth: '100px' }}
              >
                <div className="flex items-center">
                  Actions
                  <div 
                    className="absolute top-0 right-0 h-full w-4 cursor-col-resize z-20"
                    onMouseDown={(e) => handleResizeStart(e, 'actions')}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="h-full w-0 mx-auto hover:bg-blue-500 hover:w-2 transition-all"></div>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEntities.map((entity) => {
              // Get the complete entity data to access all fields
              const completeEntity = getCompleteEntity(entity.id);
              
              return (
                <tr key={entity.id} className="hover:bg-gray-50 border-b border-gray-200">
                  {/* Checkbox */}
                  <td 
                    className="px-3 py-2 whitespace-nowrap border-r border-gray-200"
                    style={{ width: `${columnWidths.checkbox}px`, minWidth: '50px' }}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={!!selectedEntities[entity.id]}
                        onChange={() => toggleEntitySelection(entity.id)}
                      />
                    </div>
                  </td>
                  
                  {/* Dynamically generate cells for visible columns */}
                  {Object.entries(visibleColumns)
                    .filter(([field, isVisible]) => isVisible !== false && field !== 'actions')
                    .map(([field]) => {
                      // Special case for name field with editing capability
                      if (field === 'name') {
                        return (
                          <td 
                            key={field}
                            className="px-3 py-2 whitespace-nowrap border-r border-gray-200"
                            style={{ width: `${columnWidths[field] || 150}px`, minWidth: '150px' }}
                          >
                            {editingId === entity.id ? (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, entity.id)}
                                  className="flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => saveEdit(entity.id)}
                                  className="text-green-600 hover:text-green-800"
                                  title="Save"
                                >
                                  <FaCheck className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="text-red-600 hover:text-red-800"
                                  title="Cancel"
                                >
                                  <FaTimes className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2 overflow-hidden text-ellipsis">
                                <div className="text-sm font-medium text-gray-900 overflow-hidden text-ellipsis">
                                  {entity.name}
                                  {selectedEntityType === 'league' && completeEntity?.nickname && (
                                    <span className="ml-2 text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                                      {completeEntity.nickname}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => startEdit(entity)}
                                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                                  title="Edit name"
                                >
                                  <FaPencilAlt className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        );
                      }
                      
                      // Handle date fields
                      if (field === 'created_at' || field === 'updated_at' || field.includes('date')) {
                        return (
                          <td 
                            key={field}
                            className="px-3 py-2 whitespace-nowrap border-r border-gray-200"
                            style={{ width: `${columnWidths[field] || 120}px`, minWidth: '100px' }}
                          >
                            <div className="text-sm text-gray-500">
                              {completeEntity && completeEntity[field] 
                                ? new Date(completeEntity[field]).toLocaleDateString() 
                                : 'N/A'}
                            </div>
                          </td>
                        );
                      }
                      
                      // Handle special relationship fields with display names
                      if (field === 'division_conference_id') {
                        return (
                          <td 
                            key={field}
                            className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis border-r border-gray-200"
                            style={{ width: `${columnWidths[field] || 120}px`, minWidth: '100px' }}
                          >
                            <div className="text-sm text-gray-700 overflow-hidden text-ellipsis">
                              {showFullUuids 
                                ? completeEntity?.division_conference_id 
                                : completeEntity?.division_conference_name || 'N/A'}
                            </div>
                          </td>
                        );
                      }
                      
                      if (field === 'league_id') {
                        return (
                          <td 
                            key={field}
                            className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis border-r border-gray-200"
                            style={{ width: `${columnWidths[field] || 120}px`, minWidth: '100px' }}
                          >
                            <div className="text-sm text-gray-700 overflow-hidden text-ellipsis">
                              {showFullUuids 
                                ? completeEntity?.league_id 
                                : completeEntity?.league_name || 'N/A'}
                            </div>
                          </td>
                        );
                      }
                      
                      if (field === 'team_id') {
                        return (
                          <td 
                            key={field}
                            className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis border-r border-gray-200"
                            style={{ width: `${columnWidths[field] || 120}px`, minWidth: '100px' }}
                          >
                            <div className="text-sm text-gray-700 overflow-hidden text-ellipsis">
                              {showFullUuids 
                                ? completeEntity?.team_id 
                                : completeEntity?.team_name || 'N/A'}
                            </div>
                          </td>
                        );
                      }
                      
                      if (field === 'stadium_id') {
                        return (
                          <td 
                            key={field}
                            className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis border-r border-gray-200"
                            style={{ width: `${columnWidths[field] || 120}px`, minWidth: '100px' }}
                          >
                            <div className="text-sm text-gray-700 overflow-hidden text-ellipsis">
                              {showFullUuids 
                                ? completeEntity?.stadium_id 
                                : completeEntity?.stadium_name || 'N/A'}
                            </div>
                          </td>
                        );
                      }
                      
                      // Regular field
                      return (
                        <td 
                          key={field}
                          className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis border-r border-gray-200"
                          style={{ width: `${columnWidths[field] || 120}px`, minWidth: '100px' }}
                        >
                          <div className="text-sm text-gray-700 overflow-hidden text-ellipsis">
                            {completeEntity && completeEntity[field] !== undefined
                              ? formatCellValue(completeEntity[field], field)
                              : 'N/A'}
                          </div>
                        </td>
                      );
                    })
                  }
                  
                  {/* Actions */}
                  <td 
                    className="px-3 py-2 whitespace-nowrap border-r border-gray-200"
                    style={{ width: `${columnWidths.actions}px`, minWidth: '100px' }}
                  >
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditClick(entity)}
                        className="text-blue-500 hover:text-blue-700"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(entity.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                      <button
                        onClick={() => {
                          navigate(`/sports/${selectedEntityType}/${entity.id}`);
                        }}
                        className="text-blue-500 hover:text-blue-700"
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                    </div>
                    {showDeleteConfirm === entity.id && (
                      <div className="absolute z-10 mt-2 p-3 bg-white rounded-md shadow-lg border border-gray-200">
                        <p className="text-sm text-gray-700 mb-2">Are you sure you want to delete this {selectedEntityType}?</p>
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDeleteEntity(entity.id)}
                            className="px-2 py-1 text-xs text-white bg-red-500 hover:bg-red-600 rounded"
                            disabled={isDeleting}
                          >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="px-4 py-3 border-t border-gray-200 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-sm text-gray-700">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} results
            </span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="ml-4 border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Last
            </button>
          </div>
        </div>
      </div>

      {/* Add the edit modal */}
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
      {/* TODO: Replace with the unified BulkEditModal from components/common/BulkEditModal.tsx
         once authentication issues are resolved. The unified component supports both
         entity-based and query-based bulk editing but has authentication issues in the entity context. */}
      <BulkEditModal 
        visible={isBulkEditModalVisible}
        onCancel={() => setIsBulkEditModalVisible(false)}
        entityType={selectedEntityType}
        selectedIds={Object.keys(selectedEntities).filter(id => selectedEntities[id])}
        onSuccess={() => {
          setIsBulkEditModalVisible(false); // Make sure to close the modal
          refetch();
          deselectAllEntities();
        }}
      />

    </div>
  );
};

export default EntityList;
