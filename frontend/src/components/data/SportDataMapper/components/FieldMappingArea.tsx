import React, { useState, useEffect } from 'react';
import { EntityType, ENTITY_TYPES } from '../../../../utils/sportDataMapper';
import FieldItem from './FieldItem';
import FieldHelpTooltip from './FieldHelpTooltip';
import DroppableField from './DroppableField';
import { useDrop } from 'react-dnd';
import { 
  League, Team, Player, Game, Stadium, 
  BroadcastRights, GameBroadcast, ProductionService, 
  Brand, LeagueExecutive 
} from '../../../../services/SportsDatabaseService';

// Define the ItemType constant for drag and drop
const ItemType = 'FIELD';

// Define drag item interface
interface DragItem {
  type: string;
  field: string;
}

// Define sort direction type
type SortDirection = 'asc' | 'desc' | null;

// Define column type for sorting
type ColumnType = 'field' | 'status' | 'mapping';

// Define column type for source fields sorting
type SourceColumnType = 'name' | 'value';

interface FieldMappingAreaProps {
  selectedEntityType: EntityType | null;
  sourceFields: string[];
  sourceFieldValues: Record<string, any>;
  mappingsByEntityType: Record<string, Record<string, string>>;
  showFieldHelp: string | null;
  onFieldMapping: (sourceField: string, targetField: string) => void;
  onRemoveMapping: (targetField: string) => void;
  onShowFieldHelp: (fieldName: string) => void;
  onHideFieldHelp: () => void;
  // New props for record navigation
  currentRecordIndex: number | null;
  totalRecords: number;
  onPreviousRecord: () => void;
  onNextRecord: () => void;
  onToggleExcludeRecord: () => void;
  isCurrentRecordExcluded: boolean;
}

// Helper function to get all fields for an entity type
const getAllEntityFields = (entityType: EntityType | null): { name: string, required: boolean }[] => {
  if (!entityType) return [];
  
  // Define required fields for each entity type
  const requiredFields: Record<EntityType, string[]> = {
    'league': ['name', 'sport', 'country'],
    'division_conference': ['name', 'league_id', 'type'],
    'team': ['name', 'league_id', 'division_conference_id', 'stadium_id', 'city', 'country'],
    'player': ['name', 'team_id', 'position'],
    'game': ['home_team_id', 'away_team_id', 'date', 'time'],
    'stadium': ['name', 'city', 'country'],
    'broadcast': ['name', 'entity_id', 'entity_type', 'territory', 'start_date', 'end_date'],
    'game_broadcast': ['game_id', 'broadcast_company_id', 'broadcast_type'],
    'production': ['entity_id', 'entity_type', 'service_type'],
    'brand': ['name', 'industry'],
    'league_executive': ['name', 'league_id', 'position']
  };

  // Define all fields for each entity type
  const allFieldsByEntityType: Record<EntityType, string[]> = {
    'league': ['id', 'name', 'nickname', 'sport', 'country', 'founded_year', 'broadcast_start_date', 'broadcast_end_date', 'created_at', 'updated_at'],
    'division_conference': ['id', 'name', 'nickname', 'league_id', 'type', 'region', 'description', 'created_at', 'updated_at'],
    'team': ['id', 'name', 'league_id', 'division_conference_id', 'stadium_id', 'city', 'state', 'country', 'founded_year', 'created_at', 'updated_at'],
    'player': ['id', 'name', 'team_id', 'position', 'jersey_number', 'college', 'created_at', 'updated_at'],
    'game': ['id', 'league_id', 'home_team_id', 'away_team_id', 'stadium_id', 'date', 'time', 'home_score', 'away_score', 'status', 'season_year', 'season_type', 'created_at', 'updated_at'],
    'stadium': ['id', 'name', 'city', 'state', 'country', 'capacity', 'owner', 'naming_rights_holder', 'host_broadcaster', 'host_broadcaster_id', 'created_at', 'updated_at'],
    'broadcast': ['id', 'name', 'broadcast_company_id', 'entity_type', 'entity_id', 'division_conference_id', 'territory', 'start_date', 'end_date', 'is_exclusive', 'created_at', 'updated_at'],
    'game_broadcast': ['id', 'game_id', 'broadcast_company_id', 'production_company_id', 'broadcast_type', 'territory', 'start_time', 'end_time', 'created_at', 'updated_at'],
    'production': ['id', 'production_company_id', 'secondary_brand_id', 'entity_type', 'entity_id', 'service_type', 'start_date', 'end_date', 'created_at', 'updated_at'],
    'brand': ['id', 'name', 'industry', 'company_type', 'country', 'partner', 'partner_relationship', 'created_at', 'updated_at'],
    'league_executive': ['id', 'name', 'league_id', 'position', 'start_date', 'end_date', 'created_at', 'updated_at']
  };

  // Get the fields for the selected entity type
  const fields = allFieldsByEntityType[entityType] || [];
  const required = requiredFields[entityType] || [];

  // Map fields to objects with name and required properties
  return fields.map(field => ({
    name: field,
    required: required.includes(field)
  }));
};

// Helper function to format field values for display
const formatFieldValue = (value: any): string => {
  if (value === undefined || value === null) return "—";
  if (typeof value === 'object') return JSON.stringify(value).substring(0, 30) + '...';
  return String(value);
};

const FieldMappingArea: React.FC<FieldMappingAreaProps> = ({
  selectedEntityType,
  sourceFields,
  sourceFieldValues,
  mappingsByEntityType,
  showFieldHelp,
  onFieldMapping,
  onRemoveMapping,
  onShowFieldHelp,
  onHideFieldHelp,
  currentRecordIndex,
  totalRecords,
  onPreviousRecord,
  onNextRecord,
  onToggleExcludeRecord,
  isCurrentRecordExcluded
}) => {
  // Force component to update when sourceFieldValues change
  const [fieldValuesState, setFieldValuesState] = useState<Record<string, any>>({});
  const [forceUpdateFlag, setForceUpdateFlag] = useState(0);
  
  // State for sorting database fields
  const [sortColumn, setSortColumn] = useState<ColumnType | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  // State for sorting source fields
  const [sourceFieldsSortColumn, setSourceFieldsSortColumn] = useState<SourceColumnType | null>(null);
  const [sourceFieldsSortDirection, setSourceFieldsSortDirection] = useState<SortDirection>(null);

  // Force update when record changes
  useEffect(() => {
    console.log('FieldMappingArea: Record changed, updating field values', { 
      currentRecordIndex,
      fieldsCount: Object.keys(sourceFieldValues).length
    });
    
    // Force component to update with the latest values
    setFieldValuesState(sourceFieldValues);
    setForceUpdateFlag(prev => prev + 1);
  }, [currentRecordIndex, sourceFieldValues]);

  // Toggle sort for database fields
  const toggleSort = (column: ColumnType) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  // Toggle sort for source fields
  const toggleSourceFieldsSort = (column: SourceColumnType) => {
    if (sourceFieldsSortColumn === column) {
      if (sourceFieldsSortDirection === 'asc') {
        setSourceFieldsSortDirection('desc');
      } else if (sourceFieldsSortDirection === 'desc') {
        setSourceFieldsSortColumn(null);
        setSourceFieldsSortDirection(null);
      } else {
        setSourceFieldsSortDirection('asc');
      }
    } else {
      setSourceFieldsSortColumn(column);
      setSourceFieldsSortDirection('asc');
    }
  };
  
  // Get the current mappings for the selected entity type
  const mappings = selectedEntityType ? (mappingsByEntityType[selectedEntityType] || {}) : {};
  
  // Get all fields for the selected entity type
  const allFields = getAllEntityFields(selectedEntityType);
  
  // Sort fields based on the selected column and direction
  const sortedFields = [...allFields].sort((a, b) => {
    if (sortColumn === 'field') {
      return sortDirection === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    }
    
    if (sortColumn === 'status') {
      if (a.required === b.required) {
        return sortDirection === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      
      return sortDirection === 'asc'
        ? (a.required ? -1 : 1)
        : (a.required ? 1 : -1);
    }
    
    if (sortColumn === 'mapping') {
      const aIsMapped = !!Object.entries(mappings).find(([_, target]) => target === a.name);
      const bIsMapped = !!Object.entries(mappings).find(([_, target]) => target === b.name);
      
      if (aIsMapped === bIsMapped) {
        return sortDirection === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      
      return sortDirection === 'asc'
        ? (aIsMapped ? -1 : 1)
        : (aIsMapped ? 1 : -1);
    }
    
    return 0;
  });

  // Basic record info logging
  if (currentRecordIndex !== null) {
    console.log(`FieldMappingArea: Displaying record ${currentRecordIndex + 1} of ${totalRecords}`);
  }
  
  // Sort source fields based on the selected column and direction
  const sortedSourceFields = Array.isArray(sourceFields) && sourceFields.length > 0 
    ? [...sourceFields].sort((a, b) => {
        if (sourceFieldsSortColumn === 'name') {
          return sourceFieldsSortDirection === 'asc'
            ? a.localeCompare(b)
            : b.localeCompare(a);
        }
        
        if (sourceFieldsSortColumn === 'value') {
          // Use fieldValuesState to ensure we're using latest values
          const aValue = fieldValuesState[a] ?? sourceFieldValues[a];
          const bValue = fieldValuesState[b] ?? sourceFieldValues[b];
          
          // Handle undefined, null, or empty values
          if (aValue === undefined || aValue === null || aValue === "") {
            return sourceFieldsSortDirection === 'asc' ? 1 : -1;
          }
          if (bValue === undefined || bValue === null || bValue === "") {
            return sourceFieldsSortDirection === 'asc' ? -1 : 1;
          }
          
          // Convert to string for comparison
          const aStr = String(aValue);
          const bStr = String(bValue);
          
          return sourceFieldsSortDirection === 'asc'
            ? aStr.localeCompare(bStr)
            : bStr.localeCompare(aStr);
        }
        
        return 0;
      })
    : [];

  // Render sort icon
  const renderSortIcon = (column: ColumnType | SourceColumnType, currentColumn: ColumnType | SourceColumnType | null, direction: SortDirection) => {
    if (column !== currentColumn || !direction) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    if (direction === 'asc') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    }
    
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-8 gap-6">
      {/* Source Fields - 3/8 width */}
      <div className="md:col-span-3 bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col h-[calc(100vh-350px)] max-h-[400px]">
        <div className="flex justify-between items-center mb-2">
          <div className="text-lg font-semibold text-gray-800">Source Fields</div>
          
          {/* Record Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onPreviousRecord}
              disabled={totalRecords === 0}
              className={`p-1 rounded ${
                totalRecords === 0
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-indigo-600 hover:bg-indigo-50'
              }`}
              title="Previous Record"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="text-sm font-medium text-gray-700">
              {currentRecordIndex !== null ? `${currentRecordIndex + 1}/${totalRecords}` : ''}
            </div>
            
            <button
              onClick={onNextRecord}
              disabled={totalRecords === 0}
              className={`p-1 rounded ${
                totalRecords === 0
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-indigo-600 hover:bg-indigo-50'
              }`}
              title="Next Record"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            <button
              onClick={onToggleExcludeRecord}
              className={`p-1 rounded ${
                isCurrentRecordExcluded 
                  ? 'text-red-500 hover:bg-red-50' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
              title={isCurrentRecordExcluded ? "Include Record" : "Exclude Record"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Source Fields Column Headers */}
        <div className="grid grid-cols-2 gap-4 mb-2 px-3">
          <button 
            onClick={() => toggleSourceFieldsSort('name')}
            className="flex items-center text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
          >
            Field Name
            <span className="ml-1">
              {renderSortIcon('name', sourceFieldsSortColumn, sourceFieldsSortDirection)}
            </span>
          </button>
          
          <button 
            onClick={() => toggleSourceFieldsSort('value')}
            className="flex items-center text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
          >
            Value
            <span className="ml-1">
              {renderSortIcon('value', sourceFieldsSortColumn, sourceFieldsSortDirection)}
            </span>
          </button>
        </div>
        
        <div className="space-y-2 overflow-y-auto pr-2 flex-grow">
          {/* Source fields with array index based value lookup */}
          {sortedSourceFields && sortedSourceFields.length > 0 ? (
            sortedSourceFields.map((field, index) => {
              // Direct property access using fieldValuesState for the latest values
              // Fall back to sourceFieldValues to ensure we always have a value
              // This is the core fix for the production issue
              const fieldValue = fieldValuesState[field] ?? sourceFieldValues[field];
              
              // Add key with currentRecordIndex to force re-render when records change
              const uniqueKey = `source-${field}-${currentRecordIndex}-${forceUpdateFlag}`;
              
              // Log the values in production to help debug
              if (field === 'League Full Name' || field === 'League Acronym' || field === 'Sport') {
                console.log(`Field ${field} value for record ${currentRecordIndex}:`, fieldValue);
              }
              
              return (
                <FieldItem
                  key={uniqueKey}
                  field={field}
                  value={fieldValue}
                  isSource={true}
                  formatValue={formatFieldValue}
                  id={`source-field-${field}`}
                />
              );
            })
          ) : (
            <div className="text-center py-4 text-gray-500">
              No source fields available. {sourceFields?.length || 0} fields in props.
            </div>
          )}
        </div>
      </div>
      
      {/* Database Fields - 3/8 width */}
      <div className="md:col-span-3 bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col h-[calc(100vh-350px)] max-h-[400px]">
        <div className="text-lg font-semibold text-gray-800 mb-2">Database Fields</div>
        
        {/* Database Fields Column Headers */}
        <div className="grid grid-cols-12 gap-2 mb-2 px-2">
          <button 
            onClick={() => toggleSort('field')}
            className="col-span-5 flex items-center text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
          >
            Field Name
            <span className="ml-1">
              {renderSortIcon('field', sortColumn, sortDirection)}
            </span>
          </button>
          
          <button 
            onClick={() => toggleSort('status')}
            className="col-span-3 flex items-center text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
          >
            Status
            <span className="ml-1">
              {renderSortIcon('status', sortColumn, sortDirection)}
            </span>
          </button>
          
          <button 
            onClick={() => toggleSort('mapping')}
            className="col-span-4 flex items-center text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
          >
            Mapping
            <span className="ml-1">
              {renderSortIcon('mapping', sortColumn, sortDirection)}
            </span>
          </button>
        </div>
        
        <div className="space-y-2 overflow-y-auto pr-2 flex-grow">
          {sortedFields.map((field) => {
            // Look up source field using target field as key
            const sourceField = mappings[field.name];
            const isMapped = !!sourceField;
            
            return (
              <DroppableField
                key={`${field.name}-${currentRecordIndex}-${forceUpdateFlag}`}
                field={field}
                sourceField={sourceField}
                isMapped={isMapped}
                onFieldMapping={(source, target) => {
                  // Store mapping with target as key and source as value
                  const newMapping = { [target]: source };
                  onFieldMapping(source, target);
                }}
                onRemoveMapping={onRemoveMapping}
                onShowFieldHelp={onShowFieldHelp}
                sourceFieldValues={fieldValuesState}
                sourceFields={sourceFields}
                formatFieldValue={formatFieldValue}
              />
            );
          })}
        </div>
      </div>
      
      {/* Connection Lines - 2/8 width */}
      <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col h-[calc(100vh-350px)] max-h-[400px]">
        <div className="text-lg font-semibold text-gray-800 mb-2">Connections</div>
        
        <div className="space-y-1 overflow-y-auto pr-2 flex-grow">
          {Object.entries(mappings).length > 0 ? (
            Object.entries(mappings).map(([target, source]) => (
              <div key={`${source}-${target}-${forceUpdateFlag}`} className="mb-1 p-2 bg-indigo-50 rounded-md border border-indigo-200 relative">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-indigo-700 truncate max-w-[40%] text-sm" title={source}>
                    {source}
                  </div>
                  <div className="flex-shrink-0 mx-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h10m-4-4l4 4-4 4" />
                    </svg>
                  </div>
                  <div className="font-medium text-blue-700 truncate max-w-[40%] text-sm" title={target}>
                    {target}
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Removing mapping for target field:', target);
                      onRemoveMapping(target);
                    }}
                    className="ml-1 text-red-500 hover:text-red-700 flex-shrink-0 p-1 rounded-full hover:bg-red-50"
                    title="Remove mapping"
                    type="button"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 italic py-4 text-sm">
              No fields mapped yet. Drag fields from Source to Database.
            </div>
          )}
        </div>
      </div>
      
      {/* Field Help Tooltip */}
      {showFieldHelp && (
        <FieldHelpTooltip
          fieldName={showFieldHelp}
          onClose={onHideFieldHelp}
        />
      )}
    </div>
  );
};

export default FieldMappingArea;