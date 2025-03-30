import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FaSortUp, FaSortDown, FaSort, FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import { useVirtualizer } from '@tanstack/react-virtual';
import { fingerprint, createMemoEqualityFn } from '../../../../../utils/fingerprint';
import EntityRow from './EntityRow';
import { EntityType } from '../../../../../types/sports';
import { getDisplayValue } from '../utils/formatters';

interface EntityTableProps {
  entities: any[];
  columnOrder: string[];
  visibleColumns: {[key: string]: boolean};
  selectedEntityType: EntityType;
  showFullUuids: boolean;
  selectedEntities: Record<string, boolean>;
  toggleEntitySelection: (entityId: string) => void;
  selectAllEntities: () => void;
  deselectAllEntities: () => void;
  handleSort: (field: string) => void;
  sortField: string;
  sortDirection: 'asc' | 'desc' | 'none';
  handleEditClick: (entity: any) => void;
  showDeleteConfirm: string | null;
  setShowDeleteConfirm: (entityId: string | null) => void;
  handleDeleteEntity: (entityId: string) => void;
  handleView: (entityId: string) => void;
  searchQuery?: string; // Added search query for highlighting
  
  // Column drag and drop props
  draggedHeader: string | null;
  dragOverHeader: string | null;
  handleColumnDragStart: (e: React.DragEvent, header: string) => void;
  handleColumnDragOver: (e: React.DragEvent, header: string) => void;
  handleColumnDrop: (e: React.DragEvent, header: string) => void;
  handleColumnDragEnd: () => void;
  
  // Inline editing props
  editingId: string | null;
  editValue: string;
  setEditValue: (value: string) => void;
  startEdit: (entity: any) => void;
  saveEdit: (id: string) => void;
  cancelEdit: () => void;
  handleKeyDown: (e: React.KeyboardEvent, id: string) => void;
  
  // Nickname editing props
  editingNicknameId: string | null;
  nicknameEditValue: string;
  setNicknameEditValue: (value: string) => void;
  startNicknameEdit: (entity: any) => void;
  saveNicknameEdit: (id: string) => void;
  cancelNicknameEdit: () => void;
  handleNicknameKeyDown: (e: React.KeyboardEvent, id: string) => void;
}

const EntityTable: React.FC<EntityTableProps> = ({
  entities,
  columnOrder,
  visibleColumns,
  selectedEntityType,
  showFullUuids,
  selectedEntities,
  toggleEntitySelection,
  selectAllEntities,
  deselectAllEntities,
  handleSort,
  sortField,
  sortDirection,
  handleEditClick,
  showDeleteConfirm,
  setShowDeleteConfirm,
  handleDeleteEntity,
  handleView,
  searchQuery = '', // Default to empty string
  // Column drag and drop props
  draggedHeader,
  dragOverHeader,
  handleColumnDragStart,
  handleColumnDragOver,
  handleColumnDrop,
  handleColumnDragEnd,
  // Inline editing props
  editingId,
  editValue,
  setEditValue,
  startEdit,
  saveEdit,
  cancelEdit,
  handleKeyDown,
  editingNicknameId,
  nicknameEditValue,
  setNicknameEditValue,
  startNicknameEdit,
  saveNicknameEdit,
  cancelNicknameEdit,
  handleNicknameKeyDown
}) => {
  // Column width state
  const [columnWidths, setColumnWidths] = useState<{[key: string]: number}>({
    checkbox: 50,
    id: 100,
    name: 300,
    actions: 120
  });

  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);

  // Load column widths from storage
  useEffect(() => {
    // Try sessionStorage first for faster access
    let savedWidths = sessionStorage.getItem('entityListColumnWidths');
    
    // If not in sessionStorage, try localStorage
    if (!savedWidths) {
      savedWidths = localStorage.getItem('entityListColumnWidths');
    }
    
    if (savedWidths) {
      try {
        const parsedWidths = JSON.parse(savedWidths);
        setColumnWidths(parsedWidths);
      } catch (e) {
        console.error('Error parsing saved column widths:', e);
      }
    }
  }, []);

  // Save column widths to storage
  useEffect(() => {
    if (Object.keys(columnWidths).length > 0) {
      // Save to localStorage for persistence across sessions
      localStorage.setItem('entityListColumnWidths', JSON.stringify(columnWidths));
      // Also save to sessionStorage for quick access within the current session
      sessionStorage.setItem('entityListColumnWidths', JSON.stringify(columnWidths));
    }
  }, [columnWidths]);

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

  // Render sort icon
  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <FaSort className="ml-1 text-gray-400" />;
    }
    return sortDirection === 'asc' ? (
      <FaSortUp className="ml-1 text-blue-500" />
    ) : (
      <FaSortDown className="ml-1 text-blue-500" />
    );
  };

  // Function to check if an entity matches the search query
  const entityMatchesSearch = (entity: any): boolean => {
    if (!searchQuery || searchQuery.length < 3) return false; // Don't highlight if query is too short
    
    // Check name field first
    if (entity.name && entity.name.toLowerCase().includes(searchQuery)) {
      return true;
    }
    
    // For production and broadcast, also check entity_name and company_name fields
    if (selectedEntityType === 'production' && entity.production_company_name && 
        entity.production_company_name.toLowerCase().includes(searchQuery)) {
      return true;
    }
    
    if (selectedEntityType === 'broadcast' && entity.broadcast_company_name && 
        entity.broadcast_company_name.toLowerCase().includes(searchQuery)) {
      return true;
    }
    
    // Check entity_name field if it exists
    if (entity.entity_name && entity.entity_name.toLowerCase().includes(searchQuery)) {
      return true;
    }
    
    // Check in other common fields
    const commonFields = ['description', 'city', 'service_type', 'territory', 'sport'];
    for (const field of commonFields) {
      if (entity[field] && typeof entity[field] === 'string' && 
          entity[field].toLowerCase().includes(searchQuery)) {
        return true;
      }
    }
    
    return false;
  };

  // Generate memoized fingerprints for complex dependencies
  const entitiesFingerprint = useMemo(() => 
    fingerprint(entities, { depth: 1 }), 
    [entities]
  );
  
  const columnOrderFingerprint = useMemo(() => 
    fingerprint(columnOrder), 
    [columnOrder]
  );
  
  const visibleColumnsFingerprint = useMemo(() => 
    fingerprint(visibleColumns), 
    [visibleColumns]
  );
  
  const selectedEntitiesFingerprint = useMemo(() =>
    fingerprint(selectedEntities, { depth: 1 }),
    [selectedEntities]
  );
  
  // Calculate visible columns once based on the column order and visibility settings
  const visibleColumnsArray = useMemo(() => 
    columnOrder.filter(field => {
      // Hide "name" field for broadcast and production entities
      if ((selectedEntityType === 'broadcast' || selectedEntityType === 'production') && field === 'name') {
        return false;
      }
      // Otherwise show fields that are visible and exist in the data
      return visibleColumns[field] !== false && 
        entities.length > 0 && 
        entities[0].hasOwnProperty(field);
    }), 
    [columnOrderFingerprint, visibleColumnsFingerprint, selectedEntityType, entitiesFingerprint]
  );
  
  // Count matches for the search query
  const matchingEntitiesCount = useMemo(() => {
    if (!searchQuery || searchQuery.length < 3) return 0;
    return entities.filter(entity => entityMatchesSearch(entity)).length;
  }, [searchQuery, entities]);

  return (
    <div className="overflow-auto border border-gray-200 rounded-md">
      {searchQuery && searchQuery.length >= 3 && (
        <div className="py-2 px-4 bg-blue-50 border-b border-blue-100">
          <p className="text-blue-700 text-sm">
            Found {matchingEntitiesCount} {selectedEntityType}(s) matching "{searchQuery}".
            {matchingEntitiesCount > 0 && " Matching rows are highlighted."}
          </p>
        </div>
      )}
      <table className="min-w-full divide-y divide-gray-200 table-fixed border-collapse">
        <thead className="bg-gray-50 sticky top-0 z-10">
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
            {visibleColumnsArray.map((field) => (
              <th 
                key={field}
                scope="col" 
                className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer relative border-r border-gray-200 hover:bg-gray-100 ${
                  dragOverHeader === field ? 'bg-blue-100' : ''
                }`}
                onClick={() => handleSort(field)}
                style={{ 
                  width: columnWidths[field] || (field === 'name' ? 300 : 120),
                  minWidth: field === 'name' ? '150px' : '100px'
                }}
                draggable="true"
                onDragStart={(e) => handleColumnDragStart(e, field)}
                onDragOver={(e) => handleColumnDragOver(e, field)}
                onDrop={(e) => handleColumnDrop(e, field)}
                onDragEnd={handleColumnDragEnd}
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
          {entities.map(entity => (
            <tr 
              key={entity.id}
              className={`hover:bg-gray-50 border-b border-gray-200 ${
                entityMatchesSearch(entity) ? 'bg-yellow-50' : ''
              }`}
            >
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
              {visibleColumnsArray.map((field) => (
                <td 
                  key={field}
                  className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis border-r border-gray-200"
                  style={{ 
                    width: columnWidths[field] || (field === 'name' ? 300 : 120),
                    minWidth: field === 'name' ? '150px' : '100px'
                  }}
                >
                  {field === 'name' ? (
                    <EntityRow
                      entity={entity}
                      columnOrder={[field]}
                      visibleColumns={visibleColumns}
                      columnWidths={columnWidths}
                      selectedEntityType={selectedEntityType}
                      showFullUuids={showFullUuids}
                      isSelected={!!selectedEntities[entity.id]}
                      toggleEntitySelection={toggleEntitySelection}
                      handleEdit={handleEditClick}
                      handleDelete={(entityId) => setShowDeleteConfirm(entityId)}
                      handleView={handleView}
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
                      renderNameFieldOnly={true}
                    />
                  ) : (
                    <div className="text-sm text-gray-700 overflow-hidden text-ellipsis">
                      {getDisplayValue(entity, field, selectedEntityType, showFullUuids)}
                    </div>
                  )}
                </td>
              ))}
              
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
                    onClick={() => handleView(entity.id)}
                    className="text-blue-500 hover:text-blue-700"
                    title="View Details"
                  >
                    <FaEye />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          
          {/* Add empty row if no entities */}
          {entities.length === 0 && (
            <tr>
              <td colSpan={visibleColumnsArray.length + 2} className="py-4 text-center text-gray-500">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Delete confirmation modal - separate from row for improved UX */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-md">
            <p className="text-sm text-gray-700 mb-3">Are you sure you want to delete this {selectedEntityType}?</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showDeleteConfirm) {
                    handleDeleteEntity(showDeleteConfirm);
                  }
                }}
                className="px-2 py-1 text-xs text-white bg-red-500 hover:bg-red-600 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Optimize with React.memo and fingerprinting equality function
export default React.memo(EntityTable, createMemoEqualityFn({
  // Use shallow comparison for arrays of entities to avoid deep comparison of large datasets
  customHandlers: {
    // Custom handler for entities array - only compare length and reference
    Array: (value) => {
      if (Array.isArray(value)) {
        return `Array:length=${value.length}`;
      }
      return fingerprint(value, { depth: 1 });
    }
  },
  // Use an appropriate depth to balance accuracy vs performance
  depth: 2,
  // Skip undefined values
  skipUndefined: true
}));