import React from 'react';
import { EntityType, ENTITY_TYPES, getEntityTypeColorClass } from '../../../../utils/sportDataMapper';

interface FieldViewProps {
  mappingsByEntityType: Record<string, Record<string, string>>;
  sourceFields: string[];
  sourceFieldValues: Record<string, any>;
}

const FieldView: React.FC<FieldViewProps> = ({
  mappingsByEntityType,
  sourceFields,
  sourceFieldValues
}) => {
  // Create an inverted mapping from database fields to source fields
  const getDatabaseToSourceMapping = () => {
    const result: Record<string, string[]> = {};
    
    // Process all entity types
    Object.entries(mappingsByEntityType).forEach(([entityTypeId, mappings]) => {
      // Process all field mappings for this entity type
      Object.entries(mappings).forEach(([sourceField, databaseField]) => {
        if (!result[databaseField]) {
          result[databaseField] = [];
        }
        // Add the source field with entity type context
        result[databaseField].push(`${sourceField} (${entityTypeId})`);
      });
    });
    
    return result;
  };
  
  const invertedMappings = getDatabaseToSourceMapping();
  const databaseFields = Object.keys(invertedMappings).sort();
  
  // Calculate field usage statistics
  const getFieldUsageStats = () => {
    // Count how many entity types are using each database field
    const fieldUsageCount: Record<string, Record<string, boolean>> = {};
    
    Object.entries(mappingsByEntityType).forEach(([entityTypeId, mappings]) => {
      Object.values(mappings).forEach((databaseField) => {
        if (!fieldUsageCount[databaseField]) {
          fieldUsageCount[databaseField] = {};
        }
        fieldUsageCount[databaseField][entityTypeId] = true;
      });
    });
    
    return Object.fromEntries(
      Object.entries(fieldUsageCount).map(([field, entities]) => [
        field, 
        {
          count: Object.keys(entities).length,
          entities: Object.keys(entities)
        }
      ])
    );
  };
  
  const fieldUsageStats = getFieldUsageStats();
  
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
        </svg>
        Database Field Mappings View
      </h4>
      
      {/* Field Usage Statistics */}
      <div className="mb-4 bg-gray-50 p-4 rounded-md border border-gray-200">
        <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
            <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
          </svg>
          Field Usage Statistics
        </h5>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {databaseFields.map(field => {
            const usage = fieldUsageStats[field] || { count: 0, entities: [] };
            return (
              <div 
                key={field} 
                className="p-3 rounded-md border border-gray-200 bg-white hover:shadow-sm transition-all"
              >
                <div className="font-medium text-blue-600 text-sm">{field}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Used in {usage.count} entity type{usage.count !== 1 ? 's' : ''}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {usage.entities.map(entityId => {
                    const entityType = ENTITY_TYPES.find(e => e.id === entityId);
                    return (
                      <span 
                        key={entityId}
                        className={`px-2 py-0.5 rounded-full text-xs ${getEntityTypeColorClass(entityId)} bg-opacity-10`}
                      >
                        {entityType?.name || entityId}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Database Field Mappings */}
      <div className="space-y-4">
        {databaseFields.map(databaseField => {
          const sourceFieldsForDbField = invertedMappings[databaseField] || [];
          
          if (sourceFieldsForDbField.length === 0) return null;
          
          return (
            <div key={databaseField} className="border rounded-md p-4 bg-white shadow-sm hover:shadow transition-all">
              <h5 className="font-medium text-gray-800 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                {databaseField}
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {sourceFieldsForDbField.length} {sourceFieldsForDbField.length === 1 ? 'mapping' : 'mappings'}
                </span>
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sourceFieldsForDbField.map((sourceFieldWithType) => {
                  // Extract entity type from the source field string
                  const match = sourceFieldWithType.match(/^(.*) \((.*)\)$/);
                  if (!match) return null;
                  
                  const [_, sourceField, entityTypeId] = match;
                  const entityType = ENTITY_TYPES.find(e => e.id === entityTypeId);
                  
                  return (
                    <div 
                      key={`${sourceField}-${entityTypeId}`} 
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
                        <div className={`font-medium text-sm ${getEntityTypeColorClass(entityTypeId)}`}>
                          {entityType?.name || entityTypeId}
                        </div>
                        <div className="text-xs text-gray-500">Entity Type</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FieldView;