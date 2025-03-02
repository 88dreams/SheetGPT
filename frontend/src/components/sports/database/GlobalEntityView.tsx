import React from 'react';
import { useSportsDatabase } from './SportsDatabaseContext';
import LoadingSpinner from '../../common/LoadingSpinner';
import { EntitySummary } from './SportsDatabaseContext';

// Define the entity types with their descriptions
const ENTITY_TYPES = [
  { id: 'league', name: 'Leagues', description: 'Sports leagues' },
  { id: 'team', name: 'Teams', description: 'Sports teams' },
  { id: 'player', name: 'Players', description: 'Team players' },
  { id: 'game', name: 'Games', description: 'Scheduled games' },
  { id: 'stadium', name: 'Stadiums', description: 'Venues and stadiums' },
  { id: 'broadcast', name: 'Broadcast Rights', description: 'Media broadcast rights' },
  { id: 'production', name: 'Production Services', description: 'Production services' },
  { id: 'brand', name: 'Brand Relationships', description: 'Sponsorships and partnerships' }
];

interface GlobalEntityViewProps {
  className?: string;
}

const GlobalEntityView: React.FC<GlobalEntityViewProps> = ({ className = '' }) => {
  const { 
    selectedEntityType, 
    setSelectedEntityType, 
    entities, 
    isLoading, 
    handleSort, 
    sortField, 
    sortDirection, 
    renderSortIcon 
  } = useSportsDatabase();

  // Generate summary data for all entity types
  const generateEntitySummaries = () => {
    return ENTITY_TYPES.map(entityType => {
      // Get entities of this type
      const entitiesOfType = entities && selectedEntityType === entityType.id ? entities : [];
      const count = entitiesOfType?.length || 0;
      
      // Get the most recently updated entity
      const mostRecentEntity = entitiesOfType?.length > 0 
        ? entitiesOfType.reduce((latest, current) => {
            return new Date(current.updated_at) > new Date(latest.updated_at) ? current : latest;
          }, entitiesOfType[0])
        : null;
      
      return {
        id: entityType.id,
        name: entityType.name,
        count: count,
        lastUpdated: mostRecentEntity ? new Date(mostRecentEntity.updated_at).getTime() : 0,
        entityType: entityType.name,
        mostRecentEntity
      };
    });
  };

  // Sort entity summaries
  const sortedSummaries = generateEntitySummaries().sort((a: EntitySummary, b: EntitySummary) => {
    const aValue = a[sortField as keyof EntitySummary] ?? '';
    const bValue = b[sortField as keyof EntitySummary] ?? '';
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className={`border rounded-lg p-4 ${className}`}>
      <h4 className="font-medium text-gray-900 mb-3">Global View of All Entities</h4>
      <div className="overflow-y-auto max-h-[500px]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th 
                scope="col" 
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('entityType')}
              >
                <div className="flex items-center">
                  Entity Type
                  {renderSortIcon('entityType')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('count')}
              >
                <div className="flex items-center">
                  Count
                  {renderSortIcon('count')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('lastUpdated')}
              >
                <div className="flex items-center">
                  Last Updated
                  {renderSortIcon('lastUpdated')}
                </div>
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-3 py-4">
                  <div className="flex justify-center items-center">
                    <LoadingSpinner size="small" />
                    <span className="ml-2 text-gray-600">Loading entities...</span>
                  </div>
                </td>
              </tr>
            ) : (
              sortedSummaries.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {item.name}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                    {selectedEntityType === item.id ? item.count : '—'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                    {item.mostRecentEntity ? new Date(item.mostRecentEntity.updated_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">
                    <button
                      className="text-indigo-600 hover:text-indigo-800"
                      onClick={() => setSelectedEntityType(item.id as any)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GlobalEntityView; 