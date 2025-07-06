import React, { useState, useEffect } from 'react';
import { useSportsDatabase } from './SportsDatabaseContext';
import { EntityType } from '../../../services/SportsDatabaseService';
import { FaEdit } from 'react-icons/fa';

// Define the market categories
const MARKETS = ['SPORTS', 'MUSIC', 'CREATOR', 'CORPORATE'];

// Define the initial entity types with their descriptions and market tags
const INITIAL_ENTITY_TYPES = [
  { id: 'league', name: 'Leagues', description: 'Sports leagues', markets: ['SPORTS'] },
  { id: 'division_conference', name: 'Divisions/Conferences', description: 'League divisions and conferences', markets: ['SPORTS'] },
  { id: 'team', name: 'Teams', description: 'Sports teams', markets: ['SPORTS'] },
  { id: 'player', name: 'Players', description: 'Team players', markets: ['SPORTS'] },
  { id: 'game', name: 'Games', description: 'Scheduled games', markets: ['SPORTS'] },
  { id: 'stadium', name: 'Venues', description: 'Venues and stadiums', markets: ['SPORTS'] },
  { id: 'broadcast', name: 'Broadcast Rights', description: 'Media broadcast rights', markets: ['SPORTS', 'CORPORATE'] },
  { id: 'production_service', name: 'Production Services', description: 'Production services', markets: ['SPORTS', 'MUSIC', 'CREATOR', 'CORPORATE'] },
  { id: 'brand', name: 'Brands', description: 'Companies/products connected to markets', markets: ['SPORTS', 'MUSIC', 'CREATOR', 'CORPORATE'] },
  { id: 'creator', name: 'Creators', description: 'Content creators', markets: ['CREATOR'] },
  { id: 'management', name: 'Management', description: 'Creator or artist management', markets: ['CREATOR', 'MUSIC'] }
];

interface EntityTypeSelectorProps {
  className?: string;
}

const EntityTypeSelector: React.FC<EntityTypeSelectorProps> = ({ className = '' }) => {
  const { selectedEntityType, setSelectedEntityType } = useSportsDatabase();
  const [activeMarket, setActiveMarket] = useState('All');
  const [entityTypes, setEntityTypes] = useState(INITIAL_ENTITY_TYPES);
  const [editingEntityTypeId, setEditingEntityTypeId] = useState<string | null>(null);

  useEffect(() => {
    const savedEntityTypesJSON = localStorage.getItem('entityTypeMarkets');
    if (savedEntityTypesJSON) {
      const savedEntityTypes = JSON.parse(savedEntityTypesJSON);
      const updatedEntityTypes = INITIAL_ENTITY_TYPES.map(initialEntity => {
        const savedEntity = savedEntityTypes.find((saved: any) => saved.id === initialEntity.id);
        return savedEntity ? { ...initialEntity, markets: savedEntity.markets } : initialEntity;
      });
      setEntityTypes(updatedEntityTypes);
    }
  }, []);

  const handleMarketToggle = (entityId: string, market: string) => {
    const updatedEntityTypes = entityTypes.map(entity => {
      if (entity.id === entityId) {
        const newMarkets = entity.markets.includes(market)
          ? entity.markets.filter(m => m !== market)
          : [...entity.markets, market];
        return { ...entity, markets: newMarkets };
      }
      return entity;
    });
    setEntityTypes(updatedEntityTypes);
    localStorage.setItem('entityTypeMarkets', JSON.stringify(updatedEntityTypes));
  };

  const filteredEntityTypes = entityTypes.filter(entityType => {
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
          {['All', ...MARKETS].map(market => (
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
              className={`p-4 rounded-lg cursor-pointer border relative ${
                selectedEntityType === entityType.id
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedEntityType(entityType.id as EntityType)}
            >
              <div className="font-medium">{entityType.name}</div>
              <div className="text-sm text-gray-500 mt-1">{entityType.description}</div>
              <button
                title="Edit Markets"
                aria-label={`Edit markets for ${entityType.name}`}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingEntityTypeId(editingEntityTypeId === entityType.id ? null : entityType.id);
                }}
              >
                <FaEdit />
              </button>
              {editingEntityTypeId === entityType.id && (
                <div className="absolute top-10 right-2 bg-white border rounded shadow-lg p-2 z-10">
                  <p className="text-xs font-semibold mb-1">Assign Markets:</p>
                  {MARKETS.map(market => (
                    <label key={market} className="flex items-center space-x-2 text-xs">
                      <input
                        type="checkbox"
                        checked={entityType.markets.includes(market)}
                        onChange={() => handleMarketToggle(entityType.id, market)}
                      />
                      <span>{market}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EntityTypeSelector; 