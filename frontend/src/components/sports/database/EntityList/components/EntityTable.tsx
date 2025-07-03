import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import { useVirtualizer } from '@tanstack/react-virtual';
import { fingerprint, createMemoEqualityFn } from '../../../../../utils/fingerprint';
import EntityRow from './EntityRow';
import SmartColumn from './SmartColumn';
import ContactColumn from './ContactColumn';
import { EntityType } from '../../../../../services/SportsDatabaseService';
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
  isLoading?: boolean; // Added loading state
  onFilteredCountChange?: (count: number) => void; // Callback to report filtered count
  
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
  isLoading = false, // Default to not loading
  onFilteredCountChange,
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

  // Removed renderSortIcon as it's now handled in SmartColumn

  // Function to check if an entity matches the search query in any visible column
  const entityMatchesSearch = (entity: any): boolean => {
    if (!searchQuery || searchQuery.length < 3) return true; // Show all rows if search is empty or too short
    
    // Get all fields that are visible in the table
    const fieldsToSearch = visibleColumnsArray.filter(field => visibleColumns[field] !== false);
    
    // Check each visible field to see if it contains the search query
    for (const field of fieldsToSearch) {
      const value = entity[field];
      
      // Skip null/undefined values and non-string/non-number values
      if (value === null || value === undefined) continue;
      
      // Convert to string for comparison
      const stringValue = String(value).toLowerCase();
      
      // Check if the value contains the search query
      if (stringValue.includes(searchQuery)) {
        return true;
      }
    }
    
    // If we didn't find a match in any visible field, return false
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
      if ((selectedEntityType === 'broadcast' || selectedEntityType === 'production_service') && field === 'name') {
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
    
    // Since we're no longer filtering client-side, just report the total number of entities
    // as they have already been filtered by the server
    const filteredCount = entities.length;
    
    // DO NOT Report the filtered count back to the parent component from here
    // if (onFilteredCountChange) {
    //   onFilteredCountChange(filteredCount);
    // }
    
    return filteredCount;
  }, [searchQuery, entities]); // onFilteredCountChange removed from dependencies here

  // useEffect to report the filtered count back to the parent component
  const prevReportedCountRef = useRef<number | undefined>();
  useEffect(() => {
    if (searchQuery && searchQuery.length >= 3) {
      if (onFilteredCountChange && matchingEntitiesCount !== prevReportedCountRef.current) {
        onFilteredCountChange(matchingEntitiesCount);
        prevReportedCountRef.current = matchingEntitiesCount;
      }
    } else {
      // If search query is cleared or too short, and we had previously reported a count,
      // signal to clear it in the parent (e.g., by passing null or a specific value)
      // Parent (EntityList) is expected to handle this specific reset logic if needed via its own effects.
      // However, to be more direct, if onFilteredCountChange is present and a count was previously reported:
      if (onFilteredCountChange && prevReportedCountRef.current !== undefined && prevReportedCountRef.current !== null) {
        // Assuming EntityList expects null to clear the count display
        onFilteredCountChange(0); // Or perhaps null, depending on parent expectation
        prevReportedCountRef.current = 0; // Or null
      }
    }
  }, [matchingEntitiesCount, searchQuery, onFilteredCountChange]); // Keep onFilteredCountChange if its stability is unsure, or remove if stable

  return (
    <div className="overflow-auto border border-gray-200 rounded-md relative">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-60 z-20 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-blue-600 text-sm font-medium">Loading data...</p>
          </div>
        </div>
      )}
      
      {searchQuery && searchQuery.length >= 3 && (
        <div className="py-2 px-4 bg-blue-50 border-b border-blue-100">
          <p className="text-blue-700 text-sm">
            Found {matchingEntitiesCount} {selectedEntityType}(s) matching "{searchQuery}".
            {matchingEntitiesCount === 0 && " No results found."}
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
                  aria-label="Select all rows"
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
              <SmartColumn
                key={field}
                field={field}
                sortField={sortField}
                sortDirection={sortDirection}
                handleSort={handleSort}
                entities={entities}
                selectedEntityType={selectedEntityType}
                handleResizeStart={handleResizeStart}
                columnWidth={columnWidths[field] || (field === 'name' ? 300 : 120)}
                draggedHeader={draggedHeader}
                dragOverHeader={dragOverHeader}
                handleColumnDragStart={handleColumnDragStart}
                handleColumnDragOver={handleColumnDragOver}
                handleColumnDrop={handleColumnDrop}
                handleColumnDragEnd={handleColumnDragEnd}
              />
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
              className="hover:bg-gray-50 border-b border-gray-200"
            >
              {/* Checkbox */}
              <td 
                className="px-3 py-2 whitespace-nowrap border-r border-gray-200"
                style={{ width: `${columnWidths.checkbox || 50}px`, minWidth: '50px' }}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    aria-label={`Select row for ${entity.name || entity.id}`}
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
                  ) : field === 'linkedin_connections' ? (
                    <ContactColumn
                      entities={entities}
                      selectedEntityType={selectedEntityType}
                      entityId={entity.id}
                    />
                  ) : field === 'tags' ? (
                    <div className="flex flex-wrap gap-1">
                      {(entity.tags || []).map((tag: string, index: number) => (
                        <span key={index} className="px-2 py-1 text-xs font-semibold text-white bg-blue-500 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-700 overflow-hidden text-ellipsis">
                      {/* Diagnostic Log Removed */}
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