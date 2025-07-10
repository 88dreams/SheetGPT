import React, { useEffect, useState } from 'react';
import { useSportsDatabase } from './SportsDatabaseContext';
import LoadingSpinner from '../../common/LoadingSpinner';
import { EntitySummary } from './SportsDatabaseContext';
import { EyeIcon } from '@heroicons/react/24/outline';
import SportsDatabaseService from '../../../services/SportsDatabaseService';
import { EntityType } from '../../../types/sports';
import { Tabs } from 'antd';
import FieldView from '../../data/SportDataMapper/components/FieldView';
import EntityList from './EntityList';

interface Entity {
  id: string;
  name: string;
  updated_at: string;
  [key: string]: unknown;
}

interface EntityMetadata {
  count: number;
  lastUpdated: string | null;
}

// Define the entity types with their descriptions
const ENTITY_TYPES: Array<{ id: EntityType; name: string; description: string }> = [
  { id: 'league', name: 'Leagues', description: 'Sports leagues' },
  { id: 'division_conference', name: 'Divisions/Conferences', description: 'Divisions and conferences within leagues' },
  { id: 'team', name: 'Teams', description: 'Sports teams' },
  { id: 'player', name: 'Players', description: 'Team players' },
  { id: 'game', name: 'Games', description: 'Scheduled games' },
  { id: 'stadium', name: 'Stadiums', description: 'Venues and stadiums' },
  { id: 'broadcast_rights', name: 'Broadcast Rights', description: 'Media broadcast rights' },
  { name: 'Production Services', id: 'production_service', description: 'Production services' },
  { id: 'brand', name: 'Brands', description: 'Brand information' },
  { id: 'game_broadcast', name: 'Game Broadcasts', description: 'Game broadcast details' },
  { id: 'league_executive', name: 'League Executives', description: 'League executive personnel' }
];

interface GlobalEntityViewProps {
  className?: string;
}

const GlobalEntityView: React.FC<GlobalEntityViewProps> = ({ className = '' }) => {
  const [entityMetadata, setEntityMetadata] = useState<Record<string, EntityMetadata>>({});
  const { 
    selectedEntityType, 
    setSelectedEntityType, 
    isLoading, 
    handleSort, 
    sortField, 
    sortDirection, 
    renderSortIcon,
    entityCounts,
    fetchEntityCounts,
    setViewMode
  } = useSportsDatabase();

  // Fetch entity counts and last updated timestamps when component mounts
  useEffect(() => {
    const fetchAllEntityMetadata = async () => {
      try {
        console.log("GlobalEntityView: Fetching entity metadata");
        const counts = await fetchEntityCounts();
        if (!counts) return; // Exit if fetching counts failed
        
        const metadata: Record<string, EntityMetadata> = {};
        
        for (const entityType of ENTITY_TYPES) {
          const result = await SportsDatabaseService.getEntities({
            entityType: entityType.id,
            page: 1,
            limit: 1,
            sortBy: 'updated_at',
            sortDirection: 'desc'
          });
          
          metadata[entityType.id] = {
            count: counts[entityType.id as keyof typeof counts] || 0,
            lastUpdated: result.items?.[0]?.updated_at || null
          };
        }
        
        setEntityMetadata(metadata);
        console.log("GlobalEntityView: Entity metadata updated");
      } catch (error) {
        console.error('Error fetching entity metadata:', error);
      }
    };

    fetchAllEntityMetadata();
  }, [fetchEntityCounts]); // Rerun when the function is available

  // Handle view change
  const handleViewEntity = (entityId: EntityType) => {
    setSelectedEntityType(entityId);
    setViewMode('entity');
  };

  // Generate summary data for all entity types - memoize to prevent recalculation on every render
  const generateEntitySummaries = React.useMemo(() => {
    console.log("GlobalEntityView: Generating entity summaries");
    return ENTITY_TYPES.map(entityType => {
      const metadata = entityMetadata[entityType.id] || { count: 0, lastUpdated: null };
      
      return {
        id: entityType.id as EntityType,
        name: entityType.name,
        count: entityCounts[entityType.id as keyof typeof entityCounts] || 0,
        lastUpdated: metadata.lastUpdated,
        entityType: entityType.name
      };
    });
  }, [entityMetadata, entityCounts]);

  // Sort entity summaries - also memoize the sorting operation
  const sortedSummaries = React.useMemo(() => {
    return [...generateEntitySummaries].sort((a, b) => {
      const aValue = a[sortField as keyof typeof a] ?? '';
      const bValue = b[sortField as keyof typeof b] ?? '';
      
      if (sortField === 'lastUpdated') {
        const aDate = aValue ? new Date(aValue).getTime() : 0;
        const bDate = bValue ? new Date(bValue).getTime() : 0;
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [generateEntitySummaries, sortField, sortDirection]);

  return (
    <div className={`p-4 ${className}`}>
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
                    {item.count}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                    {item.lastUpdated ? new Date(item.lastUpdated).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">
                    <button
                      className="text-indigo-600 hover:text-indigo-800 p-1 rounded-full hover:bg-indigo-50"
                      onClick={() => handleViewEntity(item.id as EntityType)}
                      title="View details"
                    >
                      <EyeIcon className="h-5 w-5" />
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