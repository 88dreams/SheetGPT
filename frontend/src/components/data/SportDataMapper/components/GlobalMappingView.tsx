import React from 'react';
import { EntityType } from '../../../../types/sports';
import { ENTITY_TYPES } from '../../../../components/data/SportDataMapper/utils/importUtils';
import { getEntityTypeColorClass } from '../../../../utils/sportDataMapper/uiUtils';

interface GlobalMappingViewProps {
  mappingsByEntityType: Record<string, Record<string, string>>;
}

const GlobalMappingView: React.FC<GlobalMappingViewProps> = ({ mappingsByEntityType }) => {
  // Helper to count the number of mapped fields for an entity type
  const getMappedFieldCount = (entityType: EntityType) => {
    return Object.keys(mappingsByEntityType[entityType] || {}).length;
  };

  // Get a list of all entity types and their mapping status
  const mappingStatus = ENTITY_TYPES.map(entityType => ({
    ...entityType,
    mappedFieldCount: getMappedFieldCount(entityType.id)
  }));

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mappingStatus.map(entityType => (
          <div 
            key={entityType.id} 
            className={`border-l-4 rounded-r-lg p-3 shadow-sm ${getEntityTypeColorClass(entityType.id)}`}
          >
            <div className="flex justify-between items-center">
              <div className="font-semibold text-gray-800">{entityType.name}</div>
              <div className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                entityType.mappedFieldCount > 0 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {entityType.mappedFieldCount} mapped
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">{entityType.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GlobalMappingView; 