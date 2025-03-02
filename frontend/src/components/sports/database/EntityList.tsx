import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSportsDatabase } from './SportsDatabaseContext';
import LoadingSpinner from '../../common/LoadingSpinner';
// @ts-ignore
import { FaTrash, FaEye, FaSortUp, FaSortDown, FaSort } from 'react-icons/fa';

interface EntityListProps {
  className?: string;
}

const EntityList: React.FC<EntityListProps> = ({ className = '' }) => {
  const navigate = useNavigate();
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
    isDeleting,
    activeFilters
  } = useSportsDatabase();

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
    return entityTypes.find(e => e.id === selectedEntityType)?.name || 'Entities';
  };

  // Get filtered entities
  const filteredEntities = getSortedEntities();
  const hasActiveFilters = activeFilters && activeFilters.length > 0;

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
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {hasActiveFilters && (
        <div className="bg-blue-50 p-3 border-b border-blue-100">
          <p className="text-blue-700 text-sm">
            Filters applied: Showing {filteredEntities.length} {selectedEntityType}(s) matching your filters.
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
            <th 
              scope="col" 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('relationships')}
            >
              <div className="flex items-center">
                Relationships
                {renderSortIcon('relationships')}
              </div>
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {getSortedEntities().map((entity) => (
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
                <div className="text-sm font-medium text-gray-900">{entity.name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">
                  {new Date(entity.created_at).toLocaleDateString()}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">
                  {entity.relationships && (
                    <div className="flex flex-wrap gap-1">
                      {entity.relationships.teams && entity.relationships.teams.length > 0 && (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {entity.relationships.teams.length} Teams
                        </span>
                      )}
                      {entity.relationships.players && entity.relationships.players.length > 0 && (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          {entity.relationships.players.length} Players
                        </span>
                      )}
                      {entity.relationships.games && entity.relationships.games.length > 0 && (
                        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                          {entity.relationships.games.length} Games
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowDeleteConfirm(entity.id)}
                    className="text-red-500 hover:text-red-700"
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                  <button
                    onClick={() => {
                      // Navigate to entity detail view
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
  );
};

export default EntityList; 