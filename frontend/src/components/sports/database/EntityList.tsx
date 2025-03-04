import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSportsDatabase } from './SportsDatabaseContext';
import LoadingSpinner from '../../common/LoadingSpinner';
// @ts-ignore
import { FaTrash, FaEye, FaSortUp, FaSortDown, FaSort, FaPencilAlt, FaCheck, FaTimes, FaEdit } from 'react-icons/fa';
import SmartEntitySearch from '../../data/EntityUpdate/SmartEntitySearch';
import { EntityCard } from '../../data/EntityUpdate/EntityCard';
// @ts-ignore
import { Modal } from 'antd';
import { Entity, EntityType, BaseEntity } from '../../../types/sports';

interface EntityListProps {
  className?: string;
}

const EntityList: React.FC<EntityListProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<BaseEntity | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [includeRelationships, setIncludeRelationships] = useState(false);
  
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
    totalItems
  } = useSportsDatabase();

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
      { id: 'team', name: 'Teams' },
      { id: 'player', name: 'Players' },
      { id: 'game', name: 'Games' },
      { id: 'stadium', name: 'Stadiums' },
      { id: 'broadcast', name: 'Broadcast Rights' },
      { id: 'production', name: 'Production Services' },
      { id: 'brand', name: 'Brand Relationships' }
    ];
    return entityTypes.find(e => e.id === selectedEntityType)?.name || selectedEntityType;
  };

  // Get filtered entities
  const filteredEntities = getSortedEntities().map(entity => ({
    id: String(entity.id),
    name: String(entity.name),
    created_at: entity.created_at,
    updated_at: entity.updated_at
  })) as BaseEntity[];

  const hasActiveFilters = activeFilters && activeFilters.length > 0;

  // Get selected count
  const selectedCount = Object.values(selectedEntities).filter(Boolean).length;

  // Add a function to get the complete entity data
  const getCompleteEntity = (entityId: string) => {
    return entities.find(e => e.id === entityId);
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
    // Implementation of handleExportToSheets function
  };

  if (isLoading) {
    return (
      <div className={`flex justify-center items-center h-64 ${className}`}>
        <LoadingSpinner size="medium" />
        <span className="ml-2 text-gray-600">Loading entities...</span>
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
      {/* Add search bar in the header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">{getEntityTypeName()}</h2>
          <div className="w-80">
            <SmartEntitySearch
              entityTypes={[selectedEntityType as EntityType]}
              onEntitySelect={handleSearchSelect}
              placeholder="Update Stadium, League, or Team"
              entities={entities as Entity[]}
            />
          </div>
        </div>
      </div>

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
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="w-12 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Name
                  {renderSortIcon('name')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center">
                  Created
                  {renderSortIcon('created_at')}
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEntities.map((entity) => (
              <tr key={entity.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={!!selectedEntities[entity.id]}
                      onChange={() => toggleEntitySelection(entity.id)}
                    />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
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
                    <div className="flex items-center space-x-2">
                      <div className="text-sm font-medium text-gray-900">{entity.name}</div>
                      <button
                        onClick={() => startEdit(entity)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Edit name"
                      >
                        <FaPencilAlt className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {entity.created_at ? new Date(entity.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
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
    </div>
  );
};

export default EntityList; 