import React, { useState } from 'react';
import { EntityType, ENTITY_TYPES } from '../../../../utils/sportDataMapper';
import FieldItem from './FieldItem';
import FieldHelpTooltip from './FieldHelpTooltip';
import { useDrop } from 'react-dnd';
import { 
  League, Team, Player, Game, Stadium, 
  BroadcastRights, GameBroadcast, ProductionService, 
  Brand, BrandRelationship, LeagueExecutive 
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

// Create a DroppableField component to handle the drag and drop functionality
interface DroppableFieldProps {
  field: { name: string, required: boolean };
  sourceField: string | undefined;
  isMapped: boolean;
  onFieldMapping: (sourceField: string, targetField: string) => void;
  onRemoveMapping: (targetField: string) => void;
  onShowFieldHelp: (fieldName: string) => void;
  sourceFieldValues: Record<string, any>;
  formatFieldValue: (value: any) => string;
}

const DroppableField: React.FC<DroppableFieldProps> = ({
  field,
  sourceField,
  isMapped,
  onFieldMapping,
  onRemoveMapping,
  onShowFieldHelp,
  sourceFieldValues,
  formatFieldValue
}) => {
  try {
    // Use the useDrop hook to make this component a drop target
    const [{ isOver, canDrop }, drop] = useDrop({
      accept: ItemType,
      drop: (item: DragItem) => {
        console.log(`Dropping ${item.field} onto ${field.name}`);
        onFieldMapping(item.field, field.name);
        return { field: field.name };
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
      }),
      canDrop: (item: DragItem) => item.field !== field.name,
    });

    // Determine the appropriate style based on drag and drop state
    const getBorderStyle = () => {
      if (isOver && canDrop) {
        return 'bg-green-100 border-green-400 border-2 shadow-md';
      } else if (isMapped) {
        return 'bg-indigo-50 border-indigo-200';
      } else {
        return 'bg-white border-gray-200 hover:bg-gray-50 transition-all';
      }
    };

    return (
      <div 
        ref={drop}
        className={`mb-2 p-2 rounded-md border relative ${getBorderStyle()}`}
      >
        {/* Drop indicator */}
        {isOver && canDrop && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-100 bg-opacity-40 rounded">
            <div className="text-green-600 font-medium text-sm">Drop Here</div>
          </div>
        )}
        
        <div className="grid grid-cols-12 gap-2 items-center">
          {/* Field Name */}
          <div className="col-span-5 flex items-center">
            <div className="font-medium text-indigo-700 text-sm">{field.name}</div>
            {field.required && (
              <span className="ml-1 text-red-500">*</span>
            )}
            <button
              onClick={() => onShowFieldHelp(field.name)}
              className="ml-1 text-gray-400 hover:text-indigo-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          
          {/* Required/Optional Status */}
          <div className="col-span-3">
            <span className={`text-sm px-2 py-1 rounded-full ${field.required ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {field.required ? 'Required' : 'Optional'}
            </span>
          </div>
          
          {/* Mapping Status */}
          <div className="col-span-4 flex items-center justify-between">
            {isMapped ? (
              <div className="flex items-center">
                <span className="w-5 h-5 flex items-center justify-center bg-green-100 text-green-700 rounded-full mr-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-sm text-gray-600 truncate" title={sourceField}>
                  {sourceField}
                </span>
              </div>
            ) : (
              <span className="text-sm text-gray-500">Not mapped</span>
            )}
            
            {isMapped && (
              <button
                onClick={() => onRemoveMapping(field.name)}
                className="text-red-400 hover:text-red-600 transition-colors"
                title="Remove Mapping"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        {/* Show mapped value if exists */}
        {isMapped && sourceField && sourceFieldValues[sourceField] !== undefined && (
          <div className="mt-2 text-sm font-semibold text-gray-800 bg-white p-2 rounded border border-indigo-100">
            {formatFieldValue(sourceFieldValues[sourceField])}
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("Error rendering DroppableField:", error);
    // Fallback rendering without drag and drop
    return (
      <div className="mb-2 p-2 rounded-md border bg-white border-gray-200">
        <div className="grid grid-cols-12 gap-2 items-center">
          <div className="col-span-5 flex items-center">
            <div className="font-medium text-indigo-700 text-sm">{field.name}</div>
            {field.required && <span className="ml-1 text-red-500">*</span>}
          </div>
          <div className="col-span-3">
            <span className={`text-sm px-2 py-1 rounded-full ${field.required ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {field.required ? 'Required' : 'Optional'}
            </span>
          </div>
          <div className="col-span-4">
            <span className="text-sm text-gray-500">Not mapped</span>
          </div>
        </div>
      </div>
    );
  }
};

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
    'team': ['name', 'league_id'],
    'player': ['name', 'team_id', 'position'],
    'game': ['home_team_id', 'away_team_id', 'date', 'time'],
    'stadium': ['name', 'city', 'country'],
    'broadcast': ['entity_id', 'entity_type', 'territory', 'start_date', 'end_date'],
    'game_broadcast': ['game_id', 'broadcast_company_id', 'broadcast_type'],
    'production': ['entity_id', 'entity_type', 'service_type'],
    'brand': ['name', 'industry'],
    'brand_relationship': ['brand_id', 'entity_id', 'entity_type', 'relationship_type'],
    'league_executive': ['name', 'league_id', 'position']
  };

  // Define all fields for each entity type
  const allFieldsByEntityType: Record<EntityType, string[]> = {
    'league': ['id', 'name', 'sport', 'country', 'founded_year', 'broadcast_start_date', 'broadcast_end_date', 'created_at', 'updated_at'],
    'team': ['id', 'name', 'league_id', 'stadium_id', 'city', 'state', 'country', 'founded_year', 'created_at', 'updated_at'],
    'player': ['id', 'name', 'team_id', 'position', 'jersey_number', 'college', 'created_at', 'updated_at'],
    'game': ['id', 'league_id', 'home_team_id', 'away_team_id', 'stadium_id', 'date', 'time', 'home_score', 'away_score', 'status', 'season_year', 'season_type', 'created_at', 'updated_at'],
    'stadium': ['id', 'name', 'city', 'state', 'country', 'capacity', 'owner', 'naming_rights_holder', 'host_broadcaster_id', 'created_at', 'updated_at'],
    'broadcast': ['id', 'broadcast_company_id', 'entity_type', 'entity_id', 'territory', 'start_date', 'end_date', 'is_exclusive', 'created_at', 'updated_at'],
    'game_broadcast': ['id', 'game_id', 'broadcast_company_id', 'production_company_id', 'broadcast_type', 'territory', 'start_time', 'end_time', 'created_at', 'updated_at'],
    'production': ['id', 'production_company_id', 'entity_type', 'entity_id', 'service_type', 'start_date', 'end_date', 'created_at', 'updated_at'],
    'brand': ['id', 'name', 'industry', 'created_at', 'updated_at'],
    'brand_relationship': ['id', 'brand_id', 'entity_type', 'entity_id', 'relationship_type', 'start_date', 'end_date', 'created_at', 'updated_at'],
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
  // State for sorting database fields
  const [sortColumn, setSortColumn] = useState<ColumnType | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  // State for sorting source fields
  const [sourceFieldsSortColumn, setSourceFieldsSortColumn] = useState<SourceColumnType | null>(null);
  const [sourceFieldsSortDirection, setSourceFieldsSortDirection] = useState<SortDirection>(null);

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

  // Get all fields for the selected entity type
  const allFields = getAllEntityFields(selectedEntityType);
  
  // Get mappings for the selected entity type
  const mappings = selectedEntityType ? mappingsByEntityType[selectedEntityType] || {} : {};
  
  // Sort database fields
  const sortedFields = [...allFields].sort((a, b) => {
    if (!sortColumn || !sortDirection) return 0;
    
    if (sortColumn === 'field') {
      return sortDirection === 'asc' 
        ? a.name.localeCompare(b.name) 
        : b.name.localeCompare(a.name);
    }
    
    if (sortColumn === 'status') {
      if (sortDirection === 'asc') {
        return a.required === b.required ? 0 : a.required ? -1 : 1;
      } else {
        return a.required === b.required ? 0 : a.required ? 1 : -1;
      }
    }
    
    if (sortColumn === 'mapping') {
      const aIsMapped = Object.values(mappings).includes(a.name);
      const bIsMapped = Object.values(mappings).includes(b.name);
      
      return sortDirection === 'asc'
        ? (aIsMapped === bIsMapped ? 0 : aIsMapped ? -1 : 1)
        : (aIsMapped === bIsMapped ? 0 : aIsMapped ? 1 : -1);
    }
    
    return 0;
  });
  
  // Sort source fields
  const sortedSourceFields = [...sourceFields].sort((a, b) => {
    if (!sourceFieldsSortColumn || !sourceFieldsSortDirection) return 0;
    
    if (sourceFieldsSortColumn === 'name') {
      return sourceFieldsSortDirection === 'asc'
        ? a.localeCompare(b)
        : b.localeCompare(a);
    }
    
    if (sourceFieldsSortColumn === 'value') {
      const aValue = sourceFieldValues[a];
      const bValue = sourceFieldValues[b];
      
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
  });

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
    <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
      {/* Source Fields - 2/6 width */}
      <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="text-lg font-semibold text-gray-800">Source Fields</div>
          
          {/* Record Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onPreviousRecord}
              disabled={currentRecordIndex === 0}
              className={`p-1 rounded ${
                currentRecordIndex === 0 
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
              disabled={currentRecordIndex === totalRecords - 1}
              className={`p-1 rounded ${
                currentRecordIndex === totalRecords - 1 
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
        
        <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
          {sortedSourceFields.map((field) => (
            <FieldItem
              key={field}
              field={field}
              value={sourceFieldValues[field]}
              isSource={true}
              formatValue={formatFieldValue}
            />
          ))}
        </div>
      </div>
      
      {/* Connection Lines - 2/6 width */}
      <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="text-lg font-semibold text-gray-800 mb-4">Connections</div>
        
        <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
          {Object.entries(mappings).length > 0 ? (
            Object.entries(mappings).map(([targetField, sourceField]) => (
              <div key={`${sourceField}-${targetField}`} className="mb-2 p-3 bg-indigo-50 rounded-md border border-indigo-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-indigo-700 truncate max-w-[40%] text-sm" title={sourceField}>
                    {sourceField}
                  </div>
                  <div className="flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h10m-4-4l4 4-4 4" />
                    </svg>
                  </div>
                  <div className="font-medium text-indigo-700 truncate max-w-[40%] text-sm" title={targetField}>
                    {targetField}
                  </div>
                </div>
                
                {/* Remove mapping button */}
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => onRemoveMapping(targetField)}
                    className="text-sm text-red-500 hover:text-red-700 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Remove
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 italic py-8 text-sm">
              No fields mapped yet. Drag fields from Source to Database.
            </div>
          )}
        </div>
      </div>
      
      {/* Database Fields - 2/6 width */}
      <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="text-lg font-semibold text-gray-800 mb-4">Database Fields</div>
        
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
        
        <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
          {sortedFields.map((field) => {
            const sourceField = Object.entries(mappings).find(([_, target]) => target === field.name)?.[0];
            const isMapped = !!sourceField;
            
            return (
              <DroppableField
                key={field.name}
                field={field}
                sourceField={sourceField}
                isMapped={isMapped}
                onFieldMapping={onFieldMapping}
                onRemoveMapping={onRemoveMapping}
                onShowFieldHelp={onShowFieldHelp}
                sourceFieldValues={sourceFieldValues}
                formatFieldValue={formatFieldValue}
              />
            );
          })}
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