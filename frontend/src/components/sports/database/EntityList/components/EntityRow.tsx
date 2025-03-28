import React from 'react';
import { FaTrash, FaEye, FaEdit, FaCheck, FaTimes, FaPencilAlt } from 'react-icons/fa';
import { getDisplayValue } from '../utils/formatters';
import { EntityType } from '../../../../../types/sports';

interface EntityRowProps {
  entity: any;
  columnOrder: string[];
  visibleColumns: {[key: string]: boolean};
  columnWidths: {[key: string]: number};
  selectedEntityType: EntityType;
  showFullUuids: boolean;
  isSelected: boolean;
  toggleEntitySelection: (id: string) => void;
  handleEdit: (entity: any) => void;
  handleDelete: (entityId: string) => void;
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

const EntityRow: React.FC<EntityRowProps> = ({
  entity,
  columnOrder,
  visibleColumns,
  columnWidths,
  selectedEntityType,
  showFullUuids,
  isSelected,
  toggleEntitySelection,
  handleEdit,
  handleDelete,
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
  return (
    <tr 
      key={entity.id} 
      className="hover:bg-gray-50 border-b border-gray-200" 
      data-entity-id={entity.id}
    >
      {/* Checkbox */}
      <td 
        className="px-3 py-2 whitespace-nowrap border-r border-gray-200"
        style={{ width: `${columnWidths.checkbox || 50}px`, minWidth: '50px' }}
      >
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleEntitySelection(entity.id)}
          />
        </div>
      </td>
      
      {/* Data cells */}
      {columnOrder
        .filter(field => {
          // Hide "name" field for broadcast entities (it's redundant with broadcast_company_name)
          if (selectedEntityType === 'broadcast' && field === 'name') {
            return false;
          }
          // Otherwise show fields that are visible and exist in the data
          return visibleColumns[field] !== false && entity.hasOwnProperty(field);
        })
        .map((field) => {
          // Special handling for name field to support inline editing
          if (field === 'name') {
            return (
              <td 
                key={field}
                className="px-3 py-2 whitespace-nowrap border-r border-gray-200"
                style={{ width: `${columnWidths[field] || 300}px`, minWidth: '150px' }}
                data-field="name"
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
                      {selectedEntityType === 'league' && (
                        <>
                          {editingNicknameId === entity.id ? (
                            <span className="ml-2 inline-flex items-center">
                              <input
                                type="text"
                                value={nicknameEditValue}
                                onChange={(e) => setNicknameEditValue(e.target.value)}
                                onKeyDown={(e) => handleNicknameKeyDown(e, entity.id)}
                                className="w-16 px-1 py-0.5 text-xs border border-indigo-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                autoFocus
                                placeholder="Nickname"
                              />
                              <button
                                onClick={() => saveNicknameEdit(entity.id)}
                                className="ml-1 text-green-600 hover:text-green-800"
                                title="Save Nickname"
                              >
                                <FaCheck className="w-3 h-3" />
                              </button>
                              <button
                                onClick={cancelNicknameEdit}
                                className="ml-1 text-red-600 hover:text-red-800"
                                title="Cancel"
                              >
                                <FaTimes className="w-3 h-3" />
                              </button>
                            </span>
                          ) : (
                            <span 
                              className="ml-2 text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full group relative cursor-pointer"
                              onClick={() => startNicknameEdit(entity)}
                            >
                              {entity.nickname || <span className="opacity-60">+ Add nickname</span>}
                              <span className="absolute opacity-0 group-hover:opacity-100 right-0 top-0 translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white rounded-full w-4 h-4 flex items-center justify-center">
                                <FaPencilAlt className="w-2 h-2" />
                              </span>
                            </span>
                          )}
                        </>
                      )}
                      {selectedEntityType === 'division_conference' && (
                        <>
                          {editingNicknameId === entity.id ? (
                            <span className="ml-2 inline-flex items-center">
                              <input
                                type="text"
                                value={nicknameEditValue}
                                onChange={(e) => setNicknameEditValue(e.target.value)}
                                onKeyDown={(e) => handleNicknameKeyDown(e, entity.id)}
                                className="w-16 px-1 py-0.5 text-xs border border-blue-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                autoFocus
                                placeholder="Nickname"
                              />
                              <button
                                onClick={() => saveNicknameEdit(entity.id)}
                                className="ml-1 text-green-600 hover:text-green-800"
                                title="Save Nickname"
                              >
                                <FaCheck className="w-3 h-3" />
                              </button>
                              <button
                                onClick={cancelNicknameEdit}
                                className="ml-1 text-red-600 hover:text-red-800"
                                title="Cancel"
                              >
                                <FaTimes className="w-3 h-3" />
                              </button>
                            </span>
                          ) : (
                            <span 
                              className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full group relative cursor-pointer"
                              onClick={() => startNicknameEdit(entity)}
                            >
                              {entity.nickname || <span className="opacity-60">+ Add nickname</span>}
                              <span className="absolute opacity-0 group-hover:opacity-100 right-0 top-0 translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center">
                                <FaPencilAlt className="w-2 h-2" />
                              </span>
                            </span>
                          )}
                        </>
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
              data-field={field}
            >
              <div className="text-sm text-gray-700 overflow-hidden text-ellipsis">
                {getDisplayValue(entity, field, selectedEntityType, showFullUuids)}
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
            onClick={() => handleEdit(entity)}
            className="text-blue-500 hover:text-blue-700"
            title="Edit"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleDelete(entity.id)}
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
  );
};

export default EntityRow;