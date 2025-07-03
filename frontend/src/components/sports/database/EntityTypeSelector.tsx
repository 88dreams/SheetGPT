import React, { useState } from 'react';
import { useSportsDatabase } from './SportsDatabaseContext';
import { EntityType } from '../../../services/SportsDatabaseService';

// Define the market categories
const MARKETS = ['All', 'SPORTS', 'MUSIC', 'CREATOR', 'CORPORATE'];

// Define the entity types with their descriptions and market tags
const ENTITY_TYPES = [
  { id: 'league', name: 'Leagues', description: 'Sports leagues', markets: ['SPORTS'] },
  { id: 'division_conference', name: 'Divisions/Conferences', description: 'League divisions and conferences', markets: ['SPORTS'] },
  { id: 'team', name: 'Teams', description: 'Sports teams', markets: ['SPORTS'] },
  { id: 'player', name: 'Players', description: 'Team players', markets: ['SPORTS'] },
  { id: 'game', name: 'Games', description: 'Scheduled games', markets: ['SPORTS'] },
  { id: 'stadium', name: 'Stadiums', description: 'Venues and stadiums', markets: ['SPORTS'] },
  { id: 'broadcast', name: 'Broadcast Rights', description: 'Media broadcast rights', markets: ['SPORTS', 'CORPORATE'] },
  { id: 'production_service', name: 'Production Services', description: 'Production services', markets: ['SPORTS', 'MUSIC', 'CREATOR', 'CORPORATE'] },
  { id: 'brand', name: 'Brands', description: 'Companies or products in the sports space', markets: ['SPORTS', 'MUSIC', 'CREATOR', 'CORPORATE'] }
];

interface EntityTypeSelectorProps {
  className?: string;
}

const EntityTypeSelector: React.FC<EntityTypeSelectorProps> = ({ className = '' }) => {
  const { selectedEntityType, setSelectedEntityType } = useSportsDatabase();
  const [activeMarket, setActiveMarket] = useState('All');

  const filteredEntityTypes = ENTITY_TYPES.filter(entityType => {
    if (activeMarket === 'All') {
      return true;
    }
    return entityType.markets.includes(activeMarket);
  });

  return (
    <div className={`bg-white overflow-hidden rounded-lg border border-gray-200 ${className}`}>
      <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between rounded-t-lg">
        <h3 className="text-lg font-medium">Entity Types</h3>
      </div>
      <div className="p-4">
        <div className="mb-4 flex space-x-2">
          {MARKETS.map(market => (
            <button
              key={market}
              onClick={() => setActiveMarket(market)}
              className={`px-3 py-1 text-sm font-medium rounded-full ${
                activeMarket === market
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {market}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filteredEntityTypes.map(entityType => (
            <div
              key={entityType.id}
              className={`p-4 rounded-lg cursor-pointer border ${
                selectedEntityType === entityType.id
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedEntityType(entityType.id as EntityType)}
            >
              <div className="font-medium">{entityType.name}</div>
              <div className="text-sm text-gray-500 mt-1">{entityType.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EntityTypeSelector; 