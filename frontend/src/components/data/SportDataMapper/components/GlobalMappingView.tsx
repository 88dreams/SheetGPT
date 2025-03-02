import React from 'react';
import { EntityType, ENTITY_TYPES, getEntityTypeColorClass } from '../../../../utils/sportDataMapper';

interface GlobalMappingViewProps {
  mappingsByEntityType: Record<string, Record<string, string>>;
}

const GlobalMappingView: React.FC<GlobalMappingViewProps> = ({
  mappingsByEntityType
}) => {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
        </svg>
        Global Field Mappings Across All Entities
      </h4>
      
      {/* Entity Totals Summary */}
      <div className="mb-4 bg-gray-50 p-4 rounded-md border border-gray-200">
        <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
            <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
          </svg>
          Entity Mapping Totals
        </h5>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {ENTITY_TYPES.map(entityType => {
            const mappingCount = Object.keys(mappingsByEntityType[entityType.id] || {}).length;
            const totalFields = entityType.requiredFields.length;
            const percentComplete = totalFields > 0 ? Math.round((mappingCount / totalFields) * 100) : 0;
            
            return (
              <div 
                key={entityType.id} 
                className={`p-3 rounded-md border transition-all ${
                  mappingCount > 0 
                    ? percentComplete === 100
                      ? 'bg-green-50 border-green-200 text-green-800' 
                      : 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}
              >
                <div className="font-medium text-sm">{entityType.name}</div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs">{mappingCount} of {totalFields}</span>
                  <span className="text-xs font-medium">{percentComplete}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div 
                    className={`h-1.5 rounded-full ${
                      percentComplete === 100 
                        ? 'bg-green-500' 
                        : percentComplete > 50 
                          ? 'bg-blue-500' 
                          : percentComplete > 0 
                            ? 'bg-yellow-500' 
                            : 'bg-gray-300'
                    }`} 
                    style={{ width: `${percentComplete}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Mappings by Entity Type */}
      <div className="space-y-4">
        {ENTITY_TYPES.map(entityType => {
          const mappings = mappingsByEntityType[entityType.id] || {};
          const mappingEntries = Object.entries(mappings);
          
          if (mappingEntries.length === 0) return null;
          
          return (
            <div key={entityType.id} className="border rounded-md p-4 bg-white shadow-sm hover:shadow transition-all">
              <h5 className="font-medium text-gray-800 mb-3 flex items-center">
                <span className={`w-2 h-2 rounded-full mr-2 ${getEntityTypeColorClass(entityType.id)}`}></span>
                {entityType.name}
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {mappingEntries.length} mappings
                </span>
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mappingEntries.map(([sourceField, targetField]) => (
                  <div 
                    key={`${sourceField}-${targetField}`} 
                    className="flex items-center p-3 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-all"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-blue-600 text-sm">{sourceField}</div>
                      <div className="text-xs text-gray-500">Source Field</div>
                    </div>
                    <div className="mx-2 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-indigo-600 text-sm">{targetField}</div>
                      <div className="text-xs text-gray-500">Database Field</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GlobalMappingView; 