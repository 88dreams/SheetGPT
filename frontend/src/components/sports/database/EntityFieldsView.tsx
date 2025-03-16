import React, { useMemo } from 'react';
import { useSportsDatabase } from './SportsDatabaseContext';
import { EntityField } from './SportsDatabaseContext';

interface EntityFieldsViewProps {
  className?: string;
}

const EntityFieldsView: React.FC<EntityFieldsViewProps> = ({ className = '' }) => {
  const { 
    selectedEntityType, 
    getEntityFields, 
    handleSort, 
    sortField, 
    renderSortIcon 
  } = useSportsDatabase();

  // Get entity type name for display - memoized to avoid recreating on each render
  const entityTypeName = useMemo(() => {
    const entityTypes = [
      { id: 'league', name: 'Leagues' },
      { id: 'division_conference', name: 'Divisions/Conferences' },
      { id: 'team', name: 'Teams' },
      { id: 'player', name: 'Players' },
      { id: 'game', name: 'Games' },
      { id: 'stadium', name: 'Stadiums' },
      { id: 'broadcast', name: 'Broadcast Rights' },
      { id: 'production', name: 'Production Services' },
      { id: 'brand', name: 'Brand Relationships' }
    ];
    return entityTypes.find(e => e.id === selectedEntityType)?.name || selectedEntityType;
  }, [selectedEntityType]);

  // Get fields and convert to EntityField format - memoized to avoid recalculating on every render
  const fields = useMemo(() => getEntityFields(selectedEntityType).map(field => ({
    fieldName: field.name,
    fieldType: field.type,
    required: field.required,
    description: field.description,
    name: field.name,
    type: field.type
  })), [selectedEntityType, getEntityFields]);

  // Sort fields based on current sort field and direction - memoized to avoid sorting on every render
  const sortedFields = useMemo(() => [...fields].sort((a: EntityField, b: EntityField) => {
    const aValue = a[sortField as keyof EntityField] ?? '';
    const bValue = b[sortField as keyof EntityField] ?? '';
    
    if (aValue < bValue) return -1;
    if (aValue > bValue) return 1;
    return 0;
  }), [fields, sortField]);

  return (
    <div className={`border rounded-lg p-4 ${className}`}>
      <h4 className="font-medium text-gray-900 mb-3">Fields for {entityTypeName}</h4>
      <div className="overflow-y-auto max-h-[500px]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th 
                scope="col" 
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('fieldName')}
              >
                <div className="flex items-center">
                  Field Name
                  {renderSortIcon('fieldName')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('fieldType')}
              >
                <div className="flex items-center">
                  Type
                  {renderSortIcon('fieldType')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('required')}
              >
                <div className="flex items-center">
                  Required
                  {renderSortIcon('required')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('description')}
              >
                <div className="flex items-center">
                  Description
                  {renderSortIcon('description')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedFields.map((field) => (
              <tr key={field.name} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  {field.name}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    field.type === 'string' ? 'bg-blue-100 text-blue-800' :
                    field.type === 'number' ? 'bg-green-100 text-green-800' :
                    field.type === 'boolean' ? 'bg-yellow-100 text-yellow-800' :
                    field.type === 'date' || field.type === 'datetime' || field.type === 'time' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {field.type}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                  {field.required ? (
                    <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Required</span>
                  ) : (
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Optional</span>
                  )}
                </td>
                <td className="px-3 py-2 text-sm text-gray-600">
                  {field.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EntityFieldsView; 