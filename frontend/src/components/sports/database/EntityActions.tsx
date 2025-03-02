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
    includeRelationships,
    setIncludeRelationships,
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
      <div className="flex items-center">
        <label className="flex items-center text-sm text-gray-600 mr-4">
          <input
            type="checkbox"
            checked={includeRelationships}
            onChange={(e) => setIncludeRelationships(e.target.checked)}
            className="mr-2"
          />
          Include relationships in export
        </label>
        <button
          onClick={() => handleExportToSheets(entities as any[])}
          disabled={getSelectedEntityCount() === 0 || isExporting}
          className={`px-4 py-2 rounded text-sm font-medium flex items-center ${
            getSelectedEntityCount() > 0 && !isExporting
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          <FaFileExport className="mr-2" />
          {isExporting ? 'Exporting...' : 'Export to Sheets'}
        </button>
      </div>
    </div>
  );
};

export default EntityActions; 