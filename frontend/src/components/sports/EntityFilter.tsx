import React, { useState, useEffect } from 'react';
import { EntityType } from '../../services/SportsDatabaseService';
import { FaFilter, FaTimes, FaSearch } from 'react-icons/fa';

export interface FilterConfig {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'startswith' | 'endswith';
  value: string | number | boolean;
}

export interface EntityFilterProps {
  entityType: EntityType;
  onApplyFilters: (filters: FilterConfig[]) => void;
  onClearFilters: () => void;
  initialFilters?: FilterConfig[];
}

// Field options by entity type
const FIELD_OPTIONS: Record<EntityType, { label: string; value: string; type: 'string' | 'number' | 'date' | 'boolean' }[]> = {
  league: [
    { label: 'Name', value: 'name', type: 'string' },
    { label: 'Sport', value: 'sport', type: 'string' },
    { label: 'Country', value: 'country', type: 'string' },
    { label: 'Founded Year', value: 'founded_year', type: 'number' }
  ],
  division_conference: [
    { label: 'Name', value: 'name', type: 'string' },
    { label: 'League ID', value: 'league_id', type: 'string' },
    { label: 'Type', value: 'type', type: 'string' }
  ],
  team: [
    { label: 'Name', value: 'name', type: 'string' },
    { label: 'City', value: 'city', type: 'string' },
    { label: 'State', value: 'state', type: 'string' },
    { label: 'Country', value: 'country', type: 'string' },
    { label: 'Founded Year', value: 'founded_year', type: 'number' }
  ],
  player: [
    { label: 'Name', value: 'name', type: 'string' },
    { label: 'Position', value: 'position', type: 'string' },
    { label: 'Jersey Number', value: 'jersey_number', type: 'number' },
    { label: 'College', value: 'college', type: 'string' }
  ],
  game: [
    { label: 'Name', value: 'name', type: 'string' },
    { label: 'Date', value: 'date', type: 'date' },
    { label: 'Status', value: 'status', type: 'string' },
    { label: 'Season Year', value: 'season_year', type: 'number' },
    { label: 'Season Type', value: 'season_type', type: 'string' }
  ],
  stadium: [
    { label: 'Name', value: 'name', type: 'string' },
    { label: 'City', value: 'city', type: 'string' },
    { label: 'Country', value: 'country', type: 'string' },
    { label: 'Capacity', value: 'capacity', type: 'number' }
  ],
  broadcast: [
    { label: 'Name', value: 'name', type: 'string' },
    { label: 'Territory', value: 'territory', type: 'string' },
    { label: 'Start Date', value: 'start_date', type: 'date' },
    { label: 'End Date', value: 'end_date', type: 'date' },
    { label: 'Is Exclusive', value: 'is_exclusive', type: 'boolean' }
  ],
  production: [
    { label: 'Name', value: 'name', type: 'string' },
    { label: 'Service Type', value: 'service_type', type: 'string' },
    { label: 'Start Date', value: 'start_date', type: 'date' },
    { label: 'End Date', value: 'end_date', type: 'date' }
  ],
  brand: [
    { label: 'Name', value: 'name', type: 'string' },
    { label: 'Industry', value: 'industry', type: 'string' }
  ],
  game_broadcast: [
    { label: 'Name', value: 'name', type: 'string' },
    { label: 'Broadcast Type', value: 'broadcast_type', type: 'string' },
    { label: 'Territory', value: 'territory', type: 'string' }
  ],
  league_executive: [
    { label: 'Name', value: 'name', type: 'string' },
    { label: 'Position', value: 'position', type: 'string' },
    { label: 'Start Date', value: 'start_date', type: 'date' },
    { label: 'End Date', value: 'end_date', type: 'date' }
  ]
};

// Operator options by field type
const OPERATOR_OPTIONS: Record<string, { label: string; value: string }[]> = {
  string: [
    { label: 'Equals', value: 'eq' },
    { label: 'Not Equals', value: 'neq' },
    { label: 'Contains', value: 'contains' },
    { label: 'Starts With', value: 'startswith' },
    { label: 'Ends With', value: 'endswith' }
  ],
  number: [
    { label: 'Equals', value: 'eq' },
    { label: 'Not Equals', value: 'neq' },
    { label: 'Greater Than', value: 'gt' },
    { label: 'Less Than', value: 'lt' }
  ],
  date: [
    { label: 'Equals', value: 'eq' },
    { label: 'Not Equals', value: 'neq' },
    { label: 'After', value: 'gt' },
    { label: 'Before', value: 'lt' }
  ],
  boolean: [
    { label: 'Is True', value: 'eq' },
    { label: 'Is False', value: 'neq' }
  ]
};

const EntityFilter: React.FC<EntityFilterProps> = ({ 
  entityType, 
  onApplyFilters, 
  onClearFilters,
  initialFilters = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterConfig[]>(initialFilters);
  const [newFilter, setNewFilter] = useState<Partial<FilterConfig>>({});
  const [fieldType, setFieldType] = useState<'string' | 'number' | 'date' | 'boolean'>('string');

  useEffect(() => {
    setNewFilter({});
    setFilters(initialFilters);
  }, [entityType, initialFilters]);

  useEffect(() => {
    if (newFilter.field) {
      const fieldOption = FIELD_OPTIONS[entityType]?.find(f => f.value === newFilter.field);
      if (fieldOption) {
        setFieldType(fieldOption.type);
        setNewFilter(prev => ({ field: prev.field }));
      }
    }
  }, [newFilter.field, entityType]);

  const handleAddFilter = () => {
    if (newFilter.field && newFilter.operator && newFilter.value !== undefined) {
      const newFilterConfig = newFilter as FilterConfig;
      setFilters(prev => [...prev, newFilterConfig]);
      setNewFilter({});
    }
  };

  const handleRemoveFilter = (index: number) => {
    setFilters(prev => {
      const updatedFilters = [...prev];
      updatedFilters.splice(index, 1);
      return updatedFilters;
    });
  };

  const handleApplyInternalFilters = () => {
    console.log('EntityFilter: Applying internal filters:', filters);
    
    const filtersCopy = JSON.parse(JSON.stringify(filters));
    const processedFilters = filtersCopy.map((filter: FilterConfig) => {
      const fieldOption = FIELD_OPTIONS[entityType]?.find(f => f.value === filter.field);
      if (!fieldOption) return filter;
      
      switch (fieldOption.type) {
        case 'number': return { ...filter, value: Number(filter.value) };
        case 'boolean': return { ...filter, value: Boolean(filter.value) };
        default: return filter;
      }
    });
    
    onApplyFilters(processedFilters);
    setIsOpen(false);
  };

  const handleClearInternalFilters = () => {
    console.log('EntityFilter: Clearing internal filters and calling context onClearFilters');
    setFilters([]);
    setNewFilter({});
    onClearFilters();
  };

  const renderValueInput = () => {
    if (!newFilter.field || !newFilter.operator) return null;

    switch (fieldType) {
      case 'string':
        return (
          <input
            type="text"
            className="w-full p-2 border rounded"
            value={newFilter.value as string || ''}
            onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
            placeholder="Enter value"
          />
        );
      case 'number':
        return (
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={newFilter.value as number || ''}
            onChange={(e) => setNewFilter({ ...newFilter, value: parseFloat(e.target.value) })}
            placeholder="Enter number"
          />
        );
      case 'date':
        return (
          <input
            type="date"
            className="w-full p-2 border rounded"
            value={newFilter.value as string || ''}
            onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
          />
        );
      case 'boolean':
        return (
          <select
            className="w-full p-2 border rounded"
            value={newFilter.value as string || ''}
            onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value === 'true' })}
          >
            <option value="">Select value</option>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`px-3 py-1 text-sm font-medium rounded flex items-center ${
            isOpen
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <FaFilter className="mr-2" /> {isOpen ? 'Hide Filters' : 'Show Filters'}
        </button>
        
        {filters.length > 0 && (
          <div className="flex items-center">
            <span className="mr-2 text-sm text-gray-600">{filters.length} filter(s) applied</span>
            <button
              onClick={handleClearInternalFilters}
              className="text-red-600 hover:text-red-800"
            >
              <FaTimes className="mr-1" /> Clear All
            </button>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="bg-white p-4 border rounded shadow-sm">
          <h3 className="text-lg font-medium mb-3">Filter {entityType.charAt(0).toUpperCase() + entityType.slice(1)}s</h3>
          
          {filters.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Applied Filters:</h4>
              <div className="space-y-2">
                {filters.map((filter, index) => {
                  const fieldOption = FIELD_OPTIONS[entityType]?.find(f => f.value === filter.field);
                  const currentFieldType = fieldOption ? fieldOption.type : 'string';
                  const operatorOption = OPERATOR_OPTIONS[currentFieldType]?.find(o => o.value === filter.operator);
                  
                  return (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div>
                        <span className="font-medium">{fieldOption?.label || filter.field}</span>
                        <span className="mx-1 text-gray-500">{operatorOption?.label || filter.operator}</span>
                        <span>{filter.value.toString()}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveFilter(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field</label>
              <select
                className="w-full p-2 border rounded"
                value={newFilter.field || ''}
                onChange={(e) => setNewFilter({ field: e.target.value })}
              >
                <option value="">Select field</option>
                {FIELD_OPTIONS[entityType].map((field) => (
                  <option key={field.value} value={field.value}>
                    {field.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
              <select
                className="w-full p-2 border rounded"
                value={newFilter.operator || ''}
                onChange={(e) => setNewFilter({ ...newFilter, operator: e.target.value as any })}
                disabled={!newFilter.field}
              >
                <option value="">Select operator</option>
                {newFilter.field && OPERATOR_OPTIONS[fieldType].map((operator) => (
                  <option key={operator.value} value={operator.value}>
                    {operator.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
              {renderValueInput()}
            </div>
            
            <div className="flex items-end">
              <button
                onClick={handleAddFilter}
                className="w-full px-3 py-1 text-sm font-medium rounded flex items-center justify-center bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                disabled={!newFilter.field || !newFilter.operator || newFilter.value === undefined}
              >
                Add Filter
              </button>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 text-sm font-medium rounded flex items-center bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyInternalFilters}
              className="px-3 py-1 text-sm font-medium rounded flex items-center bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              disabled={filters.length === 0}
            >
              <FaSearch className="mr-2" /> Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntityFilter; 