import React from 'react';
import { FaCheck } from 'react-icons/fa';
import { EntityType } from '../../../../../types/sports';

interface ColumnSelectorProps {
  entities: any[];
  visibleColumns: {[key: string]: boolean};
  toggleColumnVisibility: (field: string) => void;
  showAllColumns: () => void;
  selectedEntityType: EntityType;
}

const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  entities,
  visibleColumns,
  toggleColumnVisibility,
  showAllColumns,
  selectedEntityType
}) => {
  if (!Array.isArray(entities) || entities.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-2 border-b border-gray-200 shadow-md">
      <div className="flex justify-between items-center mb-1">
        <button 
          className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
          onClick={showAllColumns}
        >
          <FaCheck className="mr-1" /> Show All
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-1">
        {Object.keys(entities[0] || {})
          // Filter out the name field for broadcast rights and production services
          .filter(field => !(
            (selectedEntityType === 'broadcast_rights' && field === 'name') || 
            (selectedEntityType === 'production_service' && field === 'name')
          ))
          .sort((a, b) => {
            // Sort core fields first
            const coreFields = ['id', 'name', 'created_at', 'updated_at'];
            const aIsCore = coreFields.includes(a);
            const bIsCore = coreFields.includes(b);
            
            if (aIsCore && !bIsCore) return -1;
            if (!aIsCore && bIsCore) return 1;
            
            // Then sort alphabetically
            return a.localeCompare(b);
          })
          .map(field => (
            <div key={field} className="flex items-center">
              <input
                type="checkbox"
                id={`col-${field}`}
                checked={visibleColumns[field] !== false}
                onChange={() => toggleColumnVisibility(field)}
                className="mr-1"
              />
              <label htmlFor={`col-${field}`} className="text-xs text-gray-700 truncate">
                {field.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
              </label>
            </div>
          ))
        }
      </div>
    </div>
  );
};

export default ColumnSelector;