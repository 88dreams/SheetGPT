import React, { useState, useRef, useEffect } from 'react';
import { FaSortUp, FaSortDown, FaSort } from 'react-icons/fa';
import EntityRow from './EntityRow';
import { EntityType } from '../../../../../types/sports';

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

  return (
    <div className="overflow-x-auto">
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
              .filter(field => {
                // Hide "name" field for broadcast and production entities
                if ((selectedEntityType === 'broadcast' || selectedEntityType === 'production') && field === 'name') {
                  return false;
                }
                // Otherwise show fields that are visible and exist in the data
                return visibleColumns[field] !== false && entities[0].hasOwnProperty(field);
              })
              .map((field) => (
                <th 
                  key={field}
                  scope="col" 
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer relative border-r border-gray-200 hover:bg-gray-100"
                  onClick={() => handleSort(field)}
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
          {entities.map((entity) => (
            <EntityRow
              key={entity.id}
              entity={entity}
              columnOrder={columnOrder}
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
            />
          ))}
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

export default EntityTable;