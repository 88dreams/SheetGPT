import React from 'react';
import { useSportsDatabase } from './SportsDatabaseContext';
import { EntityType } from '../../../services/SportsDatabaseService';

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

interface EntityTypeSelectorProps {
  className?: string;
}

const EntityTypeSelector: React.FC<EntityTypeSelectorProps> = ({ className = '' }) => {
  const { selectedEntityType, setSelectedEntityType } = useSportsDatabase();

  return (
    <div className={`content-card ${className}`}>
      <div className="content-card-title">Entity Types</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        {ENTITY_TYPES.map(entityType => (
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
  );
};

export default EntityTypeSelector; 