import React from 'react';
import { useSportsDatabase } from './SportsDatabaseContext';
// @ts-ignore
import { FaFileExport } from 'react-icons/fa';

interface EntityActionsProps {
  className?: string;
}

const EntityActions: React.FC<EntityActionsProps> = ({ className = '' }) => {
  const { 
    selectedEntityType,
    entities,
    getSelectedEntityCount,
    isExporting,
    handleExportToSheets
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

  return (
    <div className={`flex justify-between items-center mb-4 ${className}`}>
      <h2 className="text-lg font-semibold">
        {getEntityTypeName()}
      </h2>
    </div>
  );
};

export default EntityActions; 