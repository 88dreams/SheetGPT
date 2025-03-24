import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSportsDatabase } from './SportsDatabaseContext';
import LoadingSpinner from '../../common/LoadingSpinner';
// @ts-ignore
import { FaTrash, FaEye, FaSortUp, FaSortDown, FaSort, FaPencilAlt, FaCheck, FaTimes, FaEdit, FaFileExport } from 'react-icons/fa';
import SmartEntitySearch from '../../data/EntityUpdate/SmartEntitySearch';
import { EntityCard } from '../../data/EntityUpdate/EntityCard';
// @ts-ignore
import { Modal } from 'antd';
import { Entity, EntityType, BaseEntity, DivisionConference } from '../../../types/sports';

// Import the original EntityList component without column resizing
const EntityList: React.FC<{ className?: string }> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<BaseEntity | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  
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

  // Get complete entity data
  const getCompleteEntity = (entityId: string) => {
    return entities.find(e => e.id === entityId);
  };

  // Get entity type name
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
      { id: 'brand', name: 'Brand Relationships' }
    ];
    return entityTypes.find(e => e.id === selectedEntityType)?.name || selectedEntityType;
  };

  const filteredEntities = getSortedEntities().map(entity => ({
    id: String(entity.id),
    name: String(entity.name),
    created_at: entity.created_at,
    updated_at: entity.updated_at
  })) as BaseEntity[];

  const hasActiveFilters = activeFilters && activeFilters.length > 0;
  const selectedCount = Object.values(selectedEntities).filter(Boolean).length;

  if (isLoading) {
    return (
      <div className={`flex justify-center items-center h-64 ${className}`}>
        <LoadingSpinner size="medium" />
        <span className="ml-2 text-gray-600">Loading entities...</span>
      </div>
    );
  }

  if (\!entities || entities.length === 0) {
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
    <div className="p-4 bg-white border border-gray-200 rounded-lg">
      <div className="overflow-x-auto">
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
              {selectedEntityType === 'division_conference' && (
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <div className="flex items-center">
                    League
                  </div>
                </th>
              )}
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
                      checked={\!\!selectedEntities[entity.id]}
                      onChange={() => toggleEntitySelection(entity.id)}
                    />
                  </div>
                </td>
                {selectedEntityType === 'division_conference' && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {(getCompleteEntity(entity.id) as DivisionConference)?.league_name || 'N/A'}
                    </div>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{entity.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {entity.created_at ? new Date(entity.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    <button className="text-blue-500 hover:text-blue-700">
                      <FaEdit />
                    </button>
                    <button className="text-red-500 hover:text-red-700">
                      <FaTrash />
                    </button>
                    <button className="text-blue-500 hover:text-blue-700">
                      <FaEye />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EntityList;
