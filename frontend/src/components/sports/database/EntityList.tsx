/**
 * EntityList Component - Displays and manages entity data in a table with bulk operations
 * 
 * This component is designed to work similarly to the DatabaseQuery component for consistency:
 * - Shows entities in a table with column visibility controls
 * - Supports selecting rows for bulk editing
 * - Uses column resizing and sorting
 * - Column visibility is saved per entity type
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSportsDatabase } from './SportsDatabaseContext';
import { useNotification } from '../../../contexts/NotificationContext';
import LoadingSpinner from '../../common/LoadingSpinner';
// Using local BulkEditModal for now until auth issues are fixed
import BulkEditModal from './BulkEditModal';
// @ts-ignore
import { FaTrash, FaEye, FaSortUp, FaSortDown, FaSort, FaPencilAlt, FaCheck, FaTimes, FaEdit, FaFileExport, FaColumns, FaKey, FaArrowsAlt } from 'react-icons/fa';
import SmartEntitySearch from '../../data/EntityUpdate/SmartEntitySearch';
import { EntityCard } from '../../data/EntityUpdate/EntityCard';
// @ts-ignore
import { Modal } from 'antd';
import { Entity, EntityType, BaseEntity, DivisionConference } from '../../../types/sports';
import { useDragAndDrop } from '../../data/DataTable/hooks/useDragAndDrop';

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
  
  // Column visibility and resizing state
  const [columnWidths, setColumnWidths] = useState<{[key: string]: number}>({
    checkbox: 50,
    id: 100,
    name: 300,
    actions: 120
  });

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<{[key: string]: boolean}>({});
  const [showColumnSelector, setShowColumnSelector] = useState<boolean>(false);
  const [showFullUuids, setShowFullUuids] = useState<boolean>(false);
  
  // Column ordering state
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  
  // Initialize useDragAndDrop for column reordering
  const {
    reorderedItems: reorderedColumns,
    draggedItem,
    dragOverItem,
    handleDragStart: handleColumnDragStart,
    handleDragOver: handleColumnDragOver,
    handleDrop: handleColumnDrop,
    handleDragEnd: handleColumnDragEnd
  } = useDragAndDrop<string>({ items: columnOrder });

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
  
  // Update columnOrder when reorderedColumns changes
  useEffect(() => {
    if (reorderedColumns.length > 0) {
      // Prevent unnecessary updates with deep equality check
      const currentOrder = JSON.stringify(columnOrder);
      const newOrder = JSON.stringify(reorderedColumns);
      
      // Only update if the order is actually different
      if (currentOrder !== newOrder) {
        setColumnOrder(reorderedColumns);
      }
    }
  }, [reorderedColumns, columnOrder]);
  
  // Save column order when it changes
  useEffect(() => {
    if (columnOrder.length > 0 && selectedEntityType) {
      localStorage.setItem(`entityList_${selectedEntityType}_columnOrder`, JSON.stringify(columnOrder));
    }
  }, [columnOrder, selectedEntityType]);

  /**
   * Initialize columns based on entity data when entity type or data changes
   */
  useEffect(() => {
    if (!selectedEntityType || !Array.isArray(entities) || entities.length === 0) return;
    
    // Get fields directly from the data
    const availableFields = Object.keys(entities[0]);
    
    // Initialize column visibility - hide UUID-only columns by default
    const newVisibility: {[key: string]: boolean} = {};
    availableFields.forEach(field => {
      // Check if this is a UUID field
      const hasCorrespondingNameField = availableFields.includes(field.replace('_id', '_name'));
      const isUuidField = field === 'id' || (field.endsWith('_id') && !hasCorrespondingNameField);
      
      // Hide all UUID fields by default
      if (isUuidField) {
        newVisibility[field] = false;
      } else {
        newVisibility[field] = true;
      }
    });
    
    // Set up column order - try to load from localStorage first
    const savedOrder = localStorage.getItem(`entityList_${selectedEntityType}_columnOrder`);
    
    if (savedOrder) {
      try {
        const parsedOrder = JSON.parse(savedOrder);
        // Make sure all fields are included (in case new ones were added)
        const updatedOrder = [...parsedOrder];
        availableFields.forEach(field => {
          if (!updatedOrder.includes(field)) {
            updatedOrder.push(field);
          }
        });
        setColumnOrder(updatedOrder);
      } catch (e) {
        console.error('Error parsing saved column order:', e);
        // Fall back to default order
        const coreFields = ['id', 'name', 'created_at', 'updated_at'];
        const newOrder = [
          // Core fields first
          ...coreFields.filter(f => availableFields.includes(f)),
          // Then all remaining fields
          ...availableFields.filter(f => !coreFields.includes(f))
        ];
        setColumnOrder(newOrder);
      }
    } else {
      // No saved order, use default
      const coreFields = ['id', 'name', 'created_at', 'updated_at'];
      const newOrder = [
        // Core fields first
        ...coreFields.filter(f => availableFields.includes(f)),
        // Then all remaining fields
        ...availableFields.filter(f => !coreFields.includes(f))
      ];
      setColumnOrder(newOrder);
    }
    
    // Set visibility state
    setVisibleColumns(newVisibility);
  }, [selectedEntityType, entities]);

  // Load column widths from localStorage
  useEffect(() => {
    const savedWidths = localStorage.getItem('entityListColumnWidths');
    if (savedWidths) {
      try {
        const parsedWidths = JSON.parse(savedWidths);
        setColumnWidths(parsedWidths);
      } catch (e) {
        console.error('Error parsing saved column widths:', e);
      }
    }
  }, []);

  const startEdit = (entity: any) => {
    setEditingId(entity.id);
    
    // For broadcast rights entities, only use the broadcast company name part
    if (selectedEntityType === 'broadcast' && typeof entity.name === 'string' && entity.name.includes(' - ')) {
      setEditValue(entity.name.split(' - ')[0]);
    } else {
      setEditValue(entity.name);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (id: string) => {
    if (editValue.trim()) {
      // For broadcast rights, preserve the territory part if editing existing entity
      if (selectedEntityType === 'broadcast') {
        const entity = filteredEntities.find(e => e.id === id);
        if (entity && typeof entity.name === 'string' && entity.name.includes(' - ')) {
          // Keep the territory part when updating
          const territory = entity.name.split(' - ')[1];
          await handleUpdateEntity(id, { name: `${editValue.trim()} - ${territory}` });
        } else {
          await handleUpdateEntity(id, { name: editValue.trim() });
        }
      } else {
        // Normal case for other entity types
        await handleUpdateEntity(id, { name: editValue.trim() });
      }
      
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

  // Get filtered entities
  const filteredEntities = getSortedEntities() as BaseEntity[];
  const hasActiveFilters = activeFilters && activeFilters.length > 0;
  const selectedCount = Object.values(selectedEntities).filter(Boolean).length;

  // Format cell values, particularly UUIDs
  const formatCellValue = (value: any, field: string) => {
    // Skip if no value
    if (value === null || value === undefined) return 'N/A';
    
    // Special case for name field in broadcast entities - strip out the territory part
    if (field === 'name' && selectedEntityType === 'broadcast' && typeof value === 'string') {
      const parts = value.split(' - ');
      if (parts.length > 1) {
        return parts[0]; // Only show the broadcast company name part
      }
    }
    
    // Format dates
    if (field.includes('date') && value) {
      try {
        return new Date(value).toLocaleDateString();
      } catch (e) {
        return value;
      }
    }
    
    // Check if it's a UUID by format
    if (typeof value === 'string' && 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      
      // Return full UUID if toggle is on, otherwise truncate
      return showFullUuids ? value : `${value.substring(0, 8)}...`;
    }
    
    // For boolean fields
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    // For any other field type
    return String(value);
  };

  // Edit click handler
  const handleEditClick = (entity: BaseEntity) => {
    setSelectedEntity(entity);
    setIsEditModalVisible(true);
  };

  // Search handler
  const handleSearchSelect = (entity: Entity) => {
    setSelectedEntity(entity);
    setIsEditModalVisible(true);
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

  // Loading state
  if (isLoading) {
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

  // Determine whether a field is a relationship field (ID field with corresponding name field)
  const isRelationshipField = (field: string, entity: any): boolean => {
    return field.endsWith('_id') && `${field.replace('_id', '_name')}` in entity;
  };

  // Get display value for a field (handles IDs vs names for relationships)
  const getDisplayValue = (entity: any, field: string): string => {
    // Special case for territory field in broadcast entities
    if (field === 'territory' && selectedEntityType === 'broadcast') {
      // If the territory value is directly in the field, use it
      if (entity.territory) {
        return formatCellValue(entity.territory, field);
      }
      
      // Otherwise try to extract from name if using combined format
      if (entity.name && typeof entity.name === 'string' && entity.name.includes(' - ')) {
        const parts = entity.name.split(' - ');
        if (parts.length > 1) {
          return formatCellValue(parts[1], field); // Return the territory part
        }
      }
    }
    
    // Handle relationship fields (showing names instead of IDs)
    if (isRelationshipField(field, entity) && !showFullUuids) {
      // Show the name instead of the ID when showing names
      return formatCellValue(entity[field.replace('_id', '_name')], field);
    }
    
    // Default case
    return formatCellValue(entity[field], field);
  };

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
              placeholder={`Search ${getEntityTypeName()}`}
              entities={entities as Entity[]}
            />
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => {
                const { handleExportToSheets: exportToSheets } = useSportsDatabase();
                if (exportToSheets) {
                  exportToSheets(entities as any[]);
                } else {
                  showNotification('error', 'Export functionality is not available');
                }
              }}
              className="px-2 py-1 text-sm font-medium rounded flex items-center bg-green-600 hover:bg-green-700 text-white"
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
                // Show all columns that exist in the data
                const allFields = Array.isArray(entities) && entities.length > 0 
                  ? Object.keys(entities[0]) 
                  : [];
                
                const allVisible = allFields.reduce((acc, field) => {
                  acc[field] = true;
                  return acc;
                }, {} as {[key: string]: boolean});
                
                setVisibleColumns(allVisible);
              }}
            >
              <FaCheck className="mr-1" /> Show All
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-1">
            {Object.keys(entities[0] || {})
              .sort((a, b) => {
                // Sort core fields first
                const coreFields = ['id', 'name', 'created_at', 'updated_at'];
                const aIsCore = coreFields.includes(a);
                const bIsCore = coreFields.includes(b);
                
                if (aIsCore && !bIsCore) return -1;
                if (!aIsCore && bIsCore) return 1;
                
                // Then sort alphabetically
                return a.localeCompare(b);
              })
              .map(field => (
                <div key={field} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`col-${field}`}
                    checked={visibleColumns[field] !== false}
                    onChange={() => {
                      setVisibleColumns(prev => ({
                        ...prev,
                        [field]: !prev[field]
                      }));
                    }}
                    className="mr-1"
                  />
                  <label htmlFor={`col-${field}`} className="text-xs text-gray-700 truncate">
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
        
        <table className={`min-w-full divide-y divide-gray-200 table-fixed border-collapse ${resizingColumn ? 'cursor-col-resize' : ''}`}>
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200">
              {/* Checkbox column */}
              <th 
                scope="col" 
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative border-r border-gray-200 hover:bg-gray-100"
                style={{ width: `${columnWidths.checkbox || 50}px`, minWidth: '50px' }}
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
              
              {/* Data columns */}
              {columnOrder
                .filter(field => visibleColumns[field] !== false && entities[0].hasOwnProperty(field))
                .map((field) => (
                  <th 
                    key={field}
                    scope="col" 
                    className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-grab relative border-r border-gray-200 hover:bg-gray-100 ${
                      draggedItem === field ? 'opacity-50 bg-blue-50' : ''
                    } ${dragOverItem === field ? 'bg-blue-100 border-blue-300' : ''}`}
                    onClick={() => handleSort(field)}
                    draggable
                    onDragStart={(e) => handleColumnDragStart(e, field)}
                    onDragOver={(e) => handleColumnDragOver(e, field)}
                    onDrop={(e) => handleColumnDrop(e, field)}
                    onDragEnd={handleColumnDragEnd}
                    style={{ 
                      width: columnWidths[field] || (field === 'name' ? 300 : 120),
                      minWidth: field === 'name' ? '150px' : '100px'
                    }}
                  >
                    <div className="flex items-center">
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
                ))}
              
              {/* Actions column */}
              <th 
                scope="col" 
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative border-r border-gray-200 hover:bg-gray-100"
                style={{ width: `${columnWidths.actions || 120}px`, minWidth: '100px' }}
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
            {filteredEntities.map((entity) => (
              <tr key={entity.id} className="hover:bg-gray-50 border-b border-gray-200">
                {/* Checkbox */}
                <td 
                  className="px-3 py-2 whitespace-nowrap border-r border-gray-200"
                  style={{ width: `${columnWidths.checkbox || 50}px`, minWidth: '50px' }}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={!!selectedEntities[entity.id]}
                      onChange={() => toggleEntitySelection(entity.id)}
                    />
                  </div>
                </td>
                
                {/* Data cells */}
                {columnOrder
                  .filter(field => visibleColumns[field] !== false && entity.hasOwnProperty(field))
                  .map((field) => {
                    // Special handling for name field to support inline editing
                    if (field === 'name') {
                      return (
                        <td 
                          key={field}
                          className="px-3 py-2 whitespace-nowrap border-r border-gray-200"
                          style={{ width: `${columnWidths[field] || 300}px`, minWidth: '150px' }}
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
                                {selectedEntityType === 'broadcast' && typeof entity.name === 'string' && entity.name.includes(' - ')
                                  ? entity.name.split(' - ')[0] // Show just the broadcast company name for broadcast rights
                                  : entity.name
                                }
                                {selectedEntityType === 'league' && entity.nickname && (
                                  <span className="ml-2 text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                                    {entity.nickname}
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
                    
                    // Handle standard cells including relationship fields
                    return (
                      <td 
                        key={field}
                        className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis border-r border-gray-200"
                        style={{ width: `${columnWidths[field] || 120}px`, minWidth: '100px' }}
                      >
                        <div className="text-sm text-gray-700 overflow-hidden text-ellipsis">
                          {getDisplayValue(entity, field)}
                        </div>
                      </td>
                    );
                  })}
                
                {/* Actions */}
                <td 
                  className="px-3 py-2 whitespace-nowrap border-r border-gray-200"
                  style={{ width: `${columnWidths.actions || 120}px`, minWidth: '100px' }}
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
                      onClick={() => navigate(`/sports/${selectedEntityType}/${entity.id}`)}
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
            ))}
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
    </div>
  );
};

export default EntityList;