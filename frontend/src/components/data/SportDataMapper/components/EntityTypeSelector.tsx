import React from 'react';
import { EntityType, ENTITY_TYPES, getEntityTypeColorClass } from '../../../../utils/sportDataMapper';

interface EntityTypeSelectorProps {
  selectedEntityType: EntityType | null;
  onEntityTypeSelect: (entityType: EntityType) => void;
  suggestedEntityType: EntityType | null;
  leagueAndStadiumExist?: boolean;
}

const EntityTypeSelector: React.FC<EntityTypeSelectorProps> = ({
  selectedEntityType,
  onEntityTypeSelect,
  suggestedEntityType,
  leagueAndStadiumExist = false
}) => {
  const orderedEntityTypes = [...ENTITY_TYPES].sort((a, b) => {
    if (a.id === 'league') return -1;
    if (b.id === 'league') return 1;
    if (a.id === 'stadium') return -1;
    if (b.id === 'stadium') return 1;
    return 0;
  });

  return (
    <div className="mb-4">
      <h4 className="font-medium text-gray-900 mb-2 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
        Select Entity Type
      </h4>
      <div className="grid grid-cols-3 gap-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {orderedEntityTypes.map(entityType => {
          const isDisabled = !leagueAndStadiumExist && 
                            entityType.id !== 'league' && 
                            entityType.id !== 'stadium';
          
          return (
            <button
              key={entityType.id}
              onClick={() => !isDisabled && onEntityTypeSelect(entityType.id as EntityType)}
              className={`p-2 rounded-md border transition-all text-sm h-16 flex flex-col justify-center ${
                selectedEntityType === entityType.id
                  ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                  : isDisabled
                  ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
              disabled={isDisabled}
              title={isDisabled ? "League and Stadium data must be entered first" : ""}
            >
              <div className="flex flex-col items-start">
                <div className="flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-1 ${getEntityTypeColorClass(entityType.id)}`}></span>
                  <span className={`font-medium ${
                    selectedEntityType === entityType.id 
                      ? 'text-indigo-700' 
                      : isDisabled 
                      ? 'text-gray-500' 
                      : 'text-gray-700'
                  }`}>
                    {entityType.name}
                  </span>
                </div>
                <span className="text-xs text-gray-500 mt-1 ml-3">
                  {entityType.requiredFields.length} required fields
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {!leagueAndStadiumExist && (
        <div className="text-sm text-amber-600 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          League and Stadium data must be entered first
        </div>
      )}
    </div>
  );
};

export default EntityTypeSelector; 