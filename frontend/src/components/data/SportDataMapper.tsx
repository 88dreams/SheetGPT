import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { QuestionMarkCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import sportsDatabaseService, { EntityType as DbEntityType } from '../../services/SportsDatabaseService';
import { useNotification } from '../../contexts/NotificationContext';
import { api } from '../../utils/api';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
// @ts-ignore - Ignore uuid module error
import { v4 as uuidv4 } from 'uuid';

// Define the interface for the component props
interface SportDataMapperProps {
  isOpen: boolean;
  onClose: () => void;
  structuredData: any;
}

// Define entity types
type EntityType = 
  | 'league' 
  | 'team' 
  | 'player' 
  | 'game' 
  | 'stadium' 
  | 'broadcast' 
  | 'production' 
  | 'brand'
  | 'game_broadcast'
  | 'league_executive'
  | 'brand_relationship';

// Define the entity types available for mapping
const ENTITY_TYPES = [
  { id: 'league', name: 'League', description: 'Sports leagues (e.g., NFL, NBA, MLB)', requiredFields: ['name', 'sport', 'country'] },
  { id: 'team', name: 'Team', description: 'Sports teams within leagues', requiredFields: ['name', 'league_id', 'stadium_id', 'city', 'country'] },
  { id: 'player', name: 'Player', description: 'Athletes who play for teams', requiredFields: ['name', 'team_id', 'position'] },
  { id: 'game', name: 'Game', description: 'Individual games between teams', requiredFields: ['name', 'league_id', 'home_team_id', 'away_team_id', 'stadium_id', 'date', 'season_year', 'season_type'] },
  { id: 'stadium', name: 'Stadium', description: 'Venues where games are played', requiredFields: ['name', 'city', 'country'] },
  { id: 'broadcast', name: 'Broadcast Rights', description: 'Media rights for leagues, teams, or games', requiredFields: ['name', 'broadcast_company_id', 'entity_type', 'entity_id', 'territory', 'start_date', 'end_date'] },
  { id: 'production', name: 'Production Service', description: 'Production services for broadcasts', requiredFields: ['name', 'production_company_id', 'entity_type', 'entity_id', 'service_type', 'start_date'] },
  { id: 'brand', name: 'Brand', description: 'Brand information', requiredFields: ['name', 'industry'] },
  { id: 'brand_relationship', name: 'Brand Relationship', description: 'Sponsorship and partnership relationships', requiredFields: ['name', 'brand_id', 'entity_type', 'entity_id', 'relationship_type', 'start_date'] },
  { id: 'game_broadcast', name: 'Game Broadcast', description: 'Broadcast information for specific games', requiredFields: ['name', 'game_id', 'broadcast_company_id', 'broadcast_type', 'territory'] },
  { id: 'league_executive', name: 'League Executive', description: 'Executive personnel for leagues', requiredFields: ['name', 'league_id', 'position', 'start_date'] }
] as const;

// Define the field mapping item component for drag and drop
interface FieldItemProps {
  field: string;
  value: any;
  isSource?: boolean;
  onDrop?: (sourceField: string, targetField: string) => void;
}

const ItemType = 'FIELD';

// Define drag item interface
interface DragItem {
  type: string;
  field: string;
}

// Define collected props interfaces
interface DragCollectedProps {
  isDragging: boolean;
}

interface DropCollectedProps {
  isOver: boolean;
  canDrop?: boolean;
}

// Modify the FieldItem component to handle the onDrop correctly
const FieldItem: React.FC<FieldItemProps> = ({ field, value, isSource = false, onDrop }) => {
  // @ts-ignore - Ignoring type errors for react-dnd hooks
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemType,
    item: { field },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    canDrag: isSource,
  }));

  // For target fields (database fields), implement drop functionality
  const [{ isOver, canDrop }, drop] = useDrop<DragItem, void, DropCollectedProps>({
    accept: ItemType,
    drop: (item) => {
      if (onDrop) {
        onDrop(item.field, field);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
    canDrop: (item) => !isSource && item.field !== field,
  });

  // Add debug logging for drag and drop
  useEffect(() => {
    if (isDragging) {
      console.log(`Dragging field: ${field}`);
    }
    if (isOver) {
      console.log(`Hovering over field: ${field}`);
    }
  }, [isDragging, isOver, field]);

  // Determine the appropriate style based on drag and drop state
  const getBorderStyle = () => {
    if (isSource) {
      return isDragging 
        ? 'bg-blue-100 border-blue-300 cursor-move' 
        : 'bg-blue-50 border-blue-200 cursor-move';
    } else if (isOver && canDrop) {
      return 'bg-green-100 border-green-400 border-2';
    } else if (canDrop) {
      return 'bg-gray-50 border-indigo-200 border-dashed';
    } else {
      return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div
      ref={isSource ? drag : drop}
      className={`p-2 mb-2 rounded border ${getBorderStyle()} ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      <div className="font-medium">{field}</div>
      {value !== undefined && (
        <div className="text-sm text-gray-500 truncate">
          {typeof value === 'object' ? JSON.stringify(value).substring(0, 30) + '...' : String(value)}
        </div>
      )}
    </div>
  );
};

// Main component
const SportDataMapper: React.FC<SportDataMapperProps> = ({ isOpen, onClose, structuredData }) => {
  // Early check for invalid structuredData
  const validStructuredData = React.useMemo(() => {
    if (!structuredData) {
      console.error('SportDataMapper: structuredData is null or undefined');
      return { headers: ['Sample'], rows: [['No data']] };
    }
    
    if (typeof structuredData !== 'object') {
      console.error('SportDataMapper: structuredData is not an object:', structuredData);
      return { headers: ['Sample'], rows: [['Invalid data']] };
    }
    
    return structuredData;
  }, [structuredData]);
  
  // State for the selected entity type
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType | null>(null);
  
  // State for the fields of the selected entity
  const [entityFields, setEntityFields] = useState<string[]>([]);
  
  // State for the source fields from the structured data
  const [sourceFields, setSourceFields] = useState<string[]>([]);
  
  // State to store source field values for detection
  const [sourceFieldValues, setSourceFieldValues] = useState<Record<string, any>>({});
  
  // State for the field mappings by entity type
  const [mappingsByEntityType, setMappingsByEntityType] = useState<Record<string, Record<string, string>>>({});
  
  // State for the mapped data for the current entity
  const [mappedData, setMappedData] = useState<Record<string, any>>({});
  
  // State for saving status
  const [isSaving, setIsSaving] = useState(false);
  
  // State for tracking the current record index when dealing with arrays
  const [currentRecordIndex, setCurrentRecordIndex] = useState(0);
  
  // State for tracking excluded records
  const [excludedRecords, setExcludedRecords] = useState<Set<number>>(new Set());
  
  // State for tracking import progress
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  
  // State for tracking if import is completed
  const [importCompleted, setImportCompleted] = useState(false);
  
  // State for data to import and total records - moved from constants to state
  const [dataToImport, setDataToImport] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  
  // State for view mode (entity or global)
  const [viewMode, setViewMode] = useState<'entity' | 'global' | 'preview'>('entity');
  
  // Get the notification context
  const { showNotification } = useNotification();
  
  // State for showing the guided walkthrough
  const [showGuidedWalkthrough, setShowGuidedWalkthrough] = useState(false);
  
  // State for the current step in the guided walkthrough
  const [guidedStep, setGuidedStep] = useState(1);
  
  // State for showing field help tooltips
  const [showFieldHelp, setShowFieldHelp] = useState<string | null>(null);
  
  // Debug logging for component rendering
  console.log('%c SportDataMapper RENDERING ', 'background: #00ff00; color: #000000; font-size: 16px;');
  console.log('SportDataMapper rendering with structured data:', validStructuredData);
  
  // Function to extract source fields from structured data
  const extractSourceFields = (data: any) => {
    if (!data) {
      console.warn('SportDataMapper: No data provided to extractSourceFields');
      setSourceFields([]);
      setSourceFieldValues({});
      return;
    }
    
    try {
      let fields: string[] = [];
      let fieldValues: Record<string, any> = {};
      
      // Handle array of objects
      if (Array.isArray(data)) {
        if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
          fields = Object.keys(data[0]);
          fieldValues = { ...data[0] };
          console.log('SportDataMapper: Extracted fields from array of objects:', fields);
        } else {
          console.warn('SportDataMapper: Empty array or non-object items in array');
        }
      } 
      // Handle data with headers and rows
      else if (data.headers && Array.isArray(data.headers)) {
        fields = data.headers;
        
        // Create sample values from first row if available
        if (data.rows && data.rows.length > 0) {
          data.headers.forEach((header: string, index: number) => {
            fieldValues[header] = data.rows[0][index];
          });
        }
        
        console.log('SportDataMapper: Using header values as source fields:', fields);
      }
      // Handle single object
      else if (typeof data === 'object' && data !== null) {
        fields = Object.keys(data).filter(key => !key.startsWith('_') && key !== 'meta_data');
        
        // Store field values
        fields.forEach(field => {
          fieldValues[field] = data[field];
        });
        
        console.log('SportDataMapper: Extracted fields from single object:', fields);
      } else {
        console.warn('SportDataMapper: Unrecognized data format', data);
      }
      
      console.log('SportDataMapper: Extracted source fields', fields);
      console.log('SportDataMapper: Source field values', fieldValues);
      setSourceFields(fields);
      setSourceFieldValues(fieldValues);
    } catch (error) {
      console.error('SportDataMapper: Error extracting source fields', error);
      setSourceFields([]);
      setSourceFieldValues({});
    }
  };
  
  // Reset component state when structuredData changes
  useEffect(() => {
    console.log('%c STRUCTURED DATA CHANGED ', 'background: #ff00ff; color: #ffffff; font-size: 16px;');
    console.log('SportDataMapper: structuredData changed:', validStructuredData);
    
    // Reset states when structuredData changes
    setEntityFields([]);
    setMappedData({});
    setCurrentRecordIndex(0);
    setExcludedRecords(new Set());
    setImportProgress(null);
    setImportCompleted(false);
    
    if (validStructuredData) {
      try {
        // Validate structuredData before processing
        if (typeof validStructuredData !== 'object') {
          console.error('SportDataMapper: Invalid structuredData format - not an object', validStructuredData);
          return;
        }
        
        // Extract source fields from structured data
        extractSourceFields(validStructuredData);
        
        // Update dataToImport and totalRecords based on structuredData format
        if (Array.isArray(validStructuredData)) {
          // Handle array of objects
          if (validStructuredData.length > 0) {
            setDataToImport(validStructuredData);
            setTotalRecords(validStructuredData.length);
            console.log(`Setting totalRecords to ${validStructuredData.length} from array data`);
          } else {
            console.warn('SportDataMapper: Empty array in structuredData');
            setDataToImport([]);
            setTotalRecords(0);
          }
        } else if (validStructuredData.headers && validStructuredData.rows && Array.isArray(validStructuredData.rows)) {
          // Handle data with headers and rows format
          // Convert rows to array of objects
          const importData = validStructuredData.rows.map(row => {
            const obj: Record<string, any> = {};
            validStructuredData.headers.forEach((header: string, index: number) => {
              obj[header] = row[index];
            });
            return obj;
          });
          
          setDataToImport(importData);
          setTotalRecords(validStructuredData.rows.length);
          console.log(`Setting totalRecords to ${validStructuredData.rows.length} from headers/rows data`);
        } else {
          // Handle single object
          setDataToImport([validStructuredData]);
          setTotalRecords(1);
          console.log('Setting totalRecords to 1 from single object data');
        }
      } catch (error) {
        console.error('SportDataMapper: Error processing structuredData', error);
      }
    }
  }, [validStructuredData]);
  
  // Reset component state when dialog is opened or closed
  useEffect(() => {
    if (isOpen) {
      console.log('%c DIALOG OPENED ', 'background: #0000ff; color: #ffffff; font-size: 16px;');
      console.log('Dialog opened, initializing component state');
      
      // Set a default entity type as fallback, but detection logic can override this
      setSelectedEntityType('team');
      
      // Extract source fields from structured data
      extractSourceFields(validStructuredData);
      
      // Update dataToImport and totalRecords based on structuredData format
      if (validStructuredData) {
        if (Array.isArray(validStructuredData)) {
          // Handle array of objects
          setDataToImport(validStructuredData);
          setTotalRecords(validStructuredData.length);
          console.log(`Dialog open: Setting totalRecords to ${validStructuredData.length} from array data`);
        } else if (validStructuredData.headers && validStructuredData.rows && Array.isArray(validStructuredData.rows)) {
          // Handle data with headers and rows format
          // Convert rows to array of objects
          const importData = validStructuredData.rows.map(row => {
            const obj: Record<string, any> = {};
            validStructuredData.headers.forEach((header: string, index: number) => {
              obj[header] = row[index];
            });
            return obj;
          });
          
          setDataToImport(importData);
          setTotalRecords(validStructuredData.rows.length);
          console.log(`Dialog open: Setting totalRecords to ${validStructuredData.rows.length} from headers/rows data with ${importData.length} records`);
        } else {
          // Handle single object
          setDataToImport([validStructuredData]);
          setTotalRecords(1);
          console.log('Dialog open: Setting totalRecords to 1 from single object data');
        }
      }
    }
  }, [isOpen]);

  // Get current field mapping based on selected entity type
  const fieldMapping = selectedEntityType ? (mappingsByEntityType[selectedEntityType] || {}) : {};

  // Debug logging for component rendering
  useEffect(() => {
    console.log('%c SPORT DATA MAPPER COMPONENT RENDERING ', 'background: #00ff00; color: #000000; font-size: 16px;');
    console.log('SportDataMapper: Component rendering', { 
      isOpen, 
      hasStructuredData: !!validStructuredData,
      structuredDataType: validStructuredData ? typeof validStructuredData : 'none',
      structuredDataPreview: validStructuredData ? JSON.stringify(validStructuredData).substring(0, 100) + '...' : 'none'
    });
  }, [isOpen, validStructuredData]);

  // Debug logging for entity type changes
  useEffect(() => {
    if (selectedEntityType) {
      console.log('%c ENTITY TYPE CHANGED ', 'background: #ff9900; color: #000000; font-size: 16px;');
      console.log('SportDataMapper: Entity type changed to', selectedEntityType);
      console.log('Current mappings for this entity type:', mappingsByEntityType[selectedEntityType]);
    }
  }, [selectedEntityType, mappingsByEntityType]);

  // Debug logging for DndProvider and Dialog
  useEffect(() => {
    if (isOpen) {
      console.log('%c SPORT DATA MAPPER DIALOG OPENING ', 'background: #0000ff; color: #ffffff; font-size: 16px;');
      console.log('SportDataMapper: DndProvider and Dialog are rendering with isOpen =', isOpen);
    }
  }, [isOpen]);

  // Get entity fields when entity type is selected
  useEffect(() => {
    if (selectedEntityType) {
      // This would ideally come from a schema service
      // For now, we'll use hardcoded fields based on entity type with unique names
      const fieldsMap: Record<EntityType, string[]> = {
        league: ['league_name', 'league_sport', 'league_country', 'league_founded_year', 'league_description'],
        team: ['team_name', 'team_city', 'team_state', 'team_country', 'team_founded_year', 'team_league_id', 'team_stadium_id'],
        player: ['player_first_name', 'player_last_name', 'player_position', 'player_jersey_number', 'player_birth_date', 'player_nationality', 'player_team_id'],
        game: ['game_name', 'game_date', 'game_time', 'game_home_team_id', 'game_away_team_id', 'game_stadium_id', 'game_season', 'game_status'],
        stadium: ['stadium_name', 'stadium_city', 'stadium_state', 'stadium_country', 'stadium_capacity', 'stadium_opened_year', 'stadium_description'],
        broadcast: ['broadcast_name', 'broadcast_company_id', 'broadcast_entity_type', 'broadcast_entity_id', 'broadcast_start_date', 'broadcast_end_date', 'broadcast_territory', 'broadcast_value', 'broadcast_description'],
        production: ['production_name', 'production_company_id', 'production_entity_type', 'production_entity_id', 'production_service_type', 'production_start_date', 'production_end_date', 'production_description'],
        brand: ['brand_name', 'brand_id', 'brand_entity_type', 'brand_entity_id', 'brand_relationship_type', 'brand_start_date', 'brand_end_date', 'brand_value', 'brand_description'],
        game_broadcast: ['broadcast_name', 'broadcast_game_id', 'broadcast_company_id', 'broadcast_production_company_id', 'broadcast_type', 'broadcast_territory', 'broadcast_start_time', 'broadcast_end_time'],
        league_executive: ['executive_name', 'executive_league_id', 'executive_position', 'executive_start_date', 'executive_end_date'],
        brand_relationship: ['brand_relationship_name', 'brand_id', 'brand_entity_type', 'brand_entity_id', 'brand_relationship_type', 'brand_start_date', 'brand_end_date']
      };
      
      setEntityFields(fieldsMap[selectedEntityType] || []);
      
      // Update mapped data based on the current entity type's field mapping
      updateMappedDataForEntityType(selectedEntityType);
    }
  }, [selectedEntityType]);

  // Function to update mapped data for a specific entity type
  const updateMappedDataForEntityType = (entityType: EntityType) => {
    const currentMapping = mappingsByEntityType[entityType] || {};
    
    if (Object.keys(currentMapping).length > 0 && validStructuredData) {
      const newMappedData: Record<string, any> = {};
      
      // For each target field that has a mapping
      Object.entries(currentMapping).forEach(([sourceField, targetField]) => {
        // Get the value from the source data using our helper function
        const value = getFieldValue(sourceField);
        
        // Set the value in the mapped data
        if (value !== undefined) {
          newMappedData[targetField] = value;
        }
      });
      
      setMappedData(newMappedData);
    } else {
      setMappedData({});
    }
  };

  // Update mapped data when field mapping changes or structured data changes
  useEffect(() => {
    if (selectedEntityType) {
      updateMappedDataForEntityType(selectedEntityType);
    }
  }, [mappingsByEntityType, validStructuredData, selectedEntityType]);

  // Extract data for batch import
  useEffect(() => {
    if (validStructuredData) {
      let importData: any[] = [];
      
      // Handle array of objects
      if (Array.isArray(validStructuredData)) {
        importData = validStructuredData;
      } 
      // Handle data with headers and rows
      else if (validStructuredData.headers && validStructuredData.rows && Array.isArray(validStructuredData.rows)) {
        // Convert rows to array of objects using headers as keys
        importData = validStructuredData.rows.map(row => {
          const obj: Record<string, any> = {};
          validStructuredData.headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });
      }
      
      console.log('SportDataMapper: Prepared data for import', { count: importData.length });
    }
  }, [validStructuredData]);

  // Function to navigate to the next record
  const goToNextRecord = () => {
    if (currentRecordIndex < totalRecords - 1) {
      setCurrentRecordIndex(currentRecordIndex + 1);
    } else {
      // Wrap around to the first record
      setCurrentRecordIndex(0);
    }
  };

  // Function to navigate to the previous record
  const goToPreviousRecord = () => {
    if (currentRecordIndex > 0) {
      setCurrentRecordIndex(currentRecordIndex - 1);
    } else {
      // Wrap around to the last record
      setCurrentRecordIndex(totalRecords - 1);
    }
  };

  // Function to exclude/include the current record
  const toggleExcludeRecord = () => {
    const newExcludedRecords = new Set(excludedRecords);
    
    if (newExcludedRecords.has(currentRecordIndex)) {
      // If already excluded, include it again
      newExcludedRecords.delete(currentRecordIndex);
      showNotification('info', `Record ${currentRecordIndex + 1} will be included in the import`);
    } else {
      // If not excluded, exclude it
      newExcludedRecords.add(currentRecordIndex);
      showNotification('info', `Record ${currentRecordIndex + 1} will be excluded from the import`);
    }
    
    setExcludedRecords(newExcludedRecords);
  };

  // Update mapped data when current record index changes
  useEffect(() => {
    if (selectedEntityType) {
      updateMappedDataForEntityType(selectedEntityType);
    }
  }, [currentRecordIndex]);

  // Handle field mapping
  const handleFieldMapping = (sourceField: string, targetField: string) => {
    if (!selectedEntityType) return;
    
    console.log('Creating field mapping:', { sourceField, targetField, entityType: selectedEntityType });
    
    // Check if the mapping already exists for this entity type
    const currentMapping = mappingsByEntityType[selectedEntityType] || {};
    const existingMapping = Object.entries(currentMapping).find(
      ([source, target]) => target === targetField
    );
    
    if (existingMapping) {
      // If there's an existing mapping to this target field, update it
      const [existingSource] = existingMapping;
      console.log(`Updating existing mapping: ${existingSource} -> ${targetField} to ${sourceField} -> ${targetField}`);
      
      // Create a new mapping object for this entity type only
      const updatedEntityMapping = { ...currentMapping };
      // Remove the existing mapping
      delete updatedEntityMapping[existingSource];
      // Add the new mapping
      updatedEntityMapping[sourceField] = targetField;
      
      // Update the mappings state with the new mapping for this entity type only
      setMappingsByEntityType(prev => ({
        ...prev,
        [selectedEntityType]: updatedEntityMapping
      }));
      
      // Show a notification about the updated mapping
      showNotification('info', `Updated mapping for ${targetField}`);
    } else {
      // Create a new mapping for this entity type only
      setMappingsByEntityType(prev => ({
        ...prev,
        [selectedEntityType]: {
          ...prev[selectedEntityType],
          [sourceField]: targetField
        }
      }));
      
      // Show a notification about the new mapping
      showNotification('success', `Mapped ${sourceField} to ${targetField}`);
    }
  };

  // Map UI field names back to database field names
  const mapToDatabaseFieldNames = (entityType: EntityType, data: Record<string, any>): Record<string, any> => {
    console.log(`mapToDatabaseFieldNames called for ${entityType} with data:`, JSON.stringify(data, null, 2));
    
    // Define field mappings for each entity type
    const fieldMappings: Record<string, Record<string, string>> = {
      // League field mappings
      league: {
      league_name: 'name',
      league_sport: 'sport',
      league_country: 'country',
      league_founded_year: 'founded_year',
        league_broadcast_start_date: 'broadcast_start_date',
        league_broadcast_end_date: 'broadcast_end_date'
      },
      
      // Team field mappings
      team: {
      team_name: 'name',
      team_city: 'city',
      team_state: 'state',
      team_country: 'country',
      team_founded_year: 'founded_year',
      team_league_id: 'league_id',
        team_stadium_id: 'stadium_id'
      },
      
      // Player field mappings
      player: {
        player_name: 'name',
      player_position: 'position',
      player_jersey_number: 'jersey_number',
        player_college: 'college',
        player_team_id: 'team_id'
      },
      
      // Game field mappings
      game: {
      game_name: 'name',
      game_date: 'date',
      game_time: 'time',
        game_league_id: 'league_id',
      game_home_team_id: 'home_team_id',
      game_away_team_id: 'away_team_id',
      game_stadium_id: 'stadium_id',
        game_home_score: 'home_score',
        game_away_score: 'away_score',
      game_status: 'status',
        game_season_year: 'season_year',
        game_season_type: 'season_type'
      },
      
      // Stadium field mappings
      stadium: {
      stadium_name: 'name',
      stadium_city: 'city',
      stadium_state: 'state',
      stadium_country: 'country',
      stadium_capacity: 'capacity',
        stadium_owner: 'owner',
        stadium_naming_rights_holder: 'naming_rights_holder',
        stadium_host_broadcaster_id: 'host_broadcaster_id'
      },
      
      // Broadcast field mappings
      broadcast: {
      broadcast_name: 'name',
        broadcast_company_id: 'broadcast_company_id',
      broadcast_entity_type: 'entity_type',
      broadcast_entity_id: 'entity_id',
        broadcast_territory: 'territory',
      broadcast_start_date: 'start_date',
      broadcast_end_date: 'end_date',
        broadcast_is_exclusive: 'is_exclusive'
      },
      
      // Game Broadcast field mappings
      game_broadcast: {
        broadcast_name: 'name',
        broadcast_game_id: 'game_id',
        broadcast_company_id: 'broadcast_company_id',
        broadcast_production_company_id: 'production_company_id',
        broadcast_type: 'broadcast_type',
      broadcast_territory: 'territory',
        broadcast_start_time: 'start_time',
        broadcast_end_time: 'end_time'
      },
      
      // Production field mappings
      production: {
      production_name: 'name',
        production_company_id: 'production_company_id',
      production_entity_type: 'entity_type',
      production_entity_id: 'entity_id',
      production_service_type: 'service_type',
      production_start_date: 'start_date',
        production_end_date: 'end_date'
      },
      
      // Brand field mappings
      brand: {
      brand_name: 'name',
        brand_industry: 'industry'
      },
      
      // Brand Relationship field mappings
      brand_relationship: {
        brand_relationship_name: 'name',
      brand_id: 'brand_id',
      brand_entity_type: 'entity_type',
      brand_entity_id: 'entity_id',
      brand_relationship_type: 'relationship_type',
      brand_start_date: 'start_date',
        brand_end_date: 'end_date'
      },
      
      // League Executive field mappings
      league_executive: {
        executive_name: 'name',
        executive_league_id: 'league_id',
        executive_position: 'position',
        executive_start_date: 'start_date',
        executive_end_date: 'end_date'
      }
    };
    
    const result: Record<string, any> = {};
    const mappingsForType = fieldMappings[entityType] || {};
    
    // Log the mappings being used for this entity type
    if (entityType === 'stadium') {
      console.log(`Stadium field mappings:`, JSON.stringify(mappingsForType, null, 2));
    }
    
    // Map each field to its database name
    Object.entries(data).forEach(([field, value]) => {
      const dbField = mappingsForType[field] || field;
      result[dbField] = value;
      
      // Log each field mapping for stadium entities
      if (entityType === 'stadium') {
        console.log(`Mapping stadium field: ${field} -> ${dbField} with value:`, value);
      }
    });
    
    // Log the final result for stadium entities
    if (entityType === 'stadium') {
      console.log(`Final mapped stadium data:`, JSON.stringify(result, null, 2));
    }
    
    return result;
  };

  // Validate entity data before sending to the database
  const validateEntityData = (entityType: EntityType, data: Record<string, any>): { isValid: boolean; errors: string[] } => {
    console.log(`Validating ${entityType} data:`, JSON.stringify(data, null, 2));
    
    const errors: string[] = [];
    
    // Common validation for all entities
    if (!data.name) {
      errors.push('Name is required');
      console.warn(`${entityType} validation error: Name is required`);
    }
    
    // Entity-specific validation
    switch (entityType) {
      case 'league':
        if (!data.sport) {
          errors.push('Sport is required');
          console.warn(`League validation error: Sport is required`);
        }
        if (!data.country) {
          errors.push('Country is required');
          console.warn(`League validation error: Country is required`);
        }
        break;
        
      case 'team':
        if (!data.league_id) {
          errors.push('League ID is required');
          console.warn(`Team validation error: League ID is required`);
        } else if (!isValidUUID(data.league_id)) {
          errors.push('League ID must be a valid UUID');
          console.warn(`Team validation error: League ID must be a valid UUID, got: ${data.league_id}`);
        }
        
        if (!data.stadium_id) {
          errors.push('Stadium ID is required');
          console.warn(`Team validation error: Stadium ID is required`);
        } else if (!isValidUUID(data.stadium_id)) {
          errors.push('Stadium ID must be a valid UUID');
          console.warn(`Team validation error: Stadium ID must be a valid UUID, got: ${data.stadium_id}`);
        }
        
        if (!data.city) {
          errors.push('City is required');
          console.warn(`Team validation error: City is required`);
        }
        if (!data.country) {
          errors.push('Country is required');
          console.warn(`Team validation error: Country is required`);
        }
        break;
        
      case 'stadium':
        if (!data.name) {
          errors.push('Name is required');
          console.warn(`Stadium validation error: Name is required`);
        }
        if (!data.city) {
          errors.push('City is required');
          console.warn(`Stadium validation error: City is required`);
        }
        if (!data.country) {
          errors.push('Country is required');
          console.warn(`Stadium validation error: Country is required`);
        }
        // Log all stadium fields for debugging
        console.log('Stadium validation fields check:', {
          name: data.name ? 'Present' : 'Missing',
          city: data.city ? 'Present' : 'Missing',
          country: data.country ? 'Present' : 'Missing',
          state: data.state ? 'Present' : 'N/A',
          capacity: data.capacity ? 'Present' : 'N/A',
          owner: data.owner ? 'Present' : 'N/A',
          naming_rights_holder: data.naming_rights_holder ? 'Present' : 'N/A',
          host_broadcaster_id: data.host_broadcaster_id ? 'Present' : 'N/A'
        });
        
        // Check if capacity is a valid number if present
        if (data.capacity !== undefined && data.capacity !== null) {
          if (isNaN(Number(data.capacity))) {
            errors.push('Capacity must be a number');
            console.warn(`Stadium validation error: Capacity must be a number, got: ${data.capacity}`);
          }
        }
        
        // Check if host_broadcaster_id is a valid UUID if present
        if (data.host_broadcaster_id && !isValidUUID(data.host_broadcaster_id)) {
          errors.push('Host broadcaster ID must be a valid UUID');
          console.warn(`Stadium validation error: Host broadcaster ID must be a valid UUID, got: ${data.host_broadcaster_id}`);
        }
        break;
        
      case 'player':
        if (!data.team_id) {
          errors.push('Team ID is required');
        } else if (!isValidUUID(data.team_id)) {
          errors.push('Team ID must be a valid UUID');
        }
        
        if (!data.position) {
          errors.push('Position is required');
        }
        break;
        
      case 'game':
        if (!data.league_id) {
          errors.push('League ID is required');
        } else if (!isValidUUID(data.league_id)) {
          errors.push('League ID must be a valid UUID');
        }
        
        if (!data.home_team_id) {
          errors.push('Home Team ID is required');
        } else if (!isValidUUID(data.home_team_id)) {
          errors.push('Home Team ID must be a valid UUID');
        }
        
        if (!data.away_team_id) {
          errors.push('Away Team ID is required');
        } else if (!isValidUUID(data.away_team_id)) {
          errors.push('Away Team ID must be a valid UUID');
        }
        
        if (!data.stadium_id) {
          errors.push('Stadium ID is required');
        } else if (!isValidUUID(data.stadium_id)) {
          errors.push('Stadium ID must be a valid UUID');
        }
        
        if (!data.date) {
          errors.push('Date is required');
        }
        
        if (!data.season_year) {
          errors.push('Season Year is required');
        }
        
        if (!data.season_type) {
          errors.push('Season Type is required');
        }
        break;
        
      case 'broadcast':
        if (!data.broadcast_company_id) {
          errors.push('Broadcast Company ID is required');
        } else if (!isValidUUID(data.broadcast_company_id)) {
          errors.push('Broadcast Company ID must be a valid UUID');
        }
        
        if (!data.entity_type) {
          errors.push('Entity Type is required');
        }
        
        if (!data.entity_id) {
          errors.push('Entity ID is required');
        } else if (!isValidUUID(data.entity_id)) {
          errors.push('Entity ID must be a valid UUID');
        }
        
        if (!data.territory) {
          errors.push('Territory is required');
        }
        
        if (!data.start_date) {
          errors.push('Start Date is required');
        }
        
        if (!data.end_date) {
          errors.push('End Date is required');
        }
        break;
        
      case 'game_broadcast':
        if (!data.game_id) {
          errors.push('Game ID is required');
        } else if (!isValidUUID(data.game_id)) {
          errors.push('Game ID must be a valid UUID');
        }
        
        if (!data.broadcast_company_id) {
          errors.push('Broadcast Company ID is required');
        } else if (!isValidUUID(data.broadcast_company_id)) {
          errors.push('Broadcast Company ID must be a valid UUID');
        }
        
        if (!data.broadcast_type) {
          errors.push('Broadcast Type is required');
        }
        
        if (!data.territory) {
          errors.push('Territory is required');
        }
        break;
        
      case 'brand':
        if (!data.industry) {
          errors.push('Industry is required');
        }
        break;
        
      case 'brand_relationship':
        if (!data.brand_id) {
          errors.push('Brand ID is required');
        } else if (!isValidUUID(data.brand_id)) {
          errors.push('Brand ID must be a valid UUID');
        }
        
        if (!data.entity_type) {
          errors.push('Entity Type is required');
        }
        
        if (!data.entity_id) {
          errors.push('Entity ID is required');
        } else if (!isValidUUID(data.entity_id)) {
          errors.push('Entity ID must be a valid UUID');
        }
        
        if (!data.relationship_type) {
          errors.push('Relationship Type is required');
        }
        
        if (!data.start_date) {
          errors.push('Start Date is required');
        }
        break;
        
      case 'league_executive':
        if (!data.league_id) {
          errors.push('League ID is required');
        } else if (!isValidUUID(data.league_id)) {
          errors.push('League ID must be a valid UUID');
        }
        
        if (!data.position) {
          errors.push('Position is required');
        }
        
        if (!data.start_date) {
          errors.push('Start Date is required');
        }
        break;
    }
    
    const isValid = errors.length === 0;
    console.log(`Validation result for ${entityType}: ${isValid ? 'Valid' : 'Invalid'}, Errors:`, errors);
    
    return { isValid, errors };
  };

  // Check if a string is a valid UUID
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  // Add a helper function to generate sample UUIDs for testing
  const generateSampleUUID = (): string => {
    return uuidv4();
  };

  // Get required fields for the selected entity type
  const getRequiredFields = (entityType: EntityType): string[] => {
    switch (entityType) {
      case 'team':
        return ['name', 'league_id', 'stadium_id', 'city', 'country'];
      case 'player':
        return ['name', 'team_id', 'position'];
      case 'game':
        return ['name', 'league_id', 'home_team_id', 'away_team_id', 'stadium_id', 'date', 'season_year', 'season_type'];
      case 'stadium':
        return ['name', 'city', 'country'];
      case 'broadcast':
        return ['name', 'broadcast_company_id', 'entity_type', 'entity_id', 'territory', 'start_date', 'end_date'];
      case 'game_broadcast':
        return ['name', 'game_id', 'broadcast_company_id', 'broadcast_type', 'territory'];
      case 'league':
        return ['name', 'sport', 'country'];
      case 'brand':
        return ['name', 'industry'];
      case 'brand_relationship':
        return ['name', 'brand_id', 'entity_type', 'entity_id', 'relationship_type', 'start_date'];
      case 'league_executive':
        return ['name', 'league_id', 'position', 'start_date'];
      default:
        return ['name'];
    }
  };

  // Update the handleSaveToDatabase function to include validation
  const handleSaveToDatabase = async () => {
    if (!selectedEntityType || Object.keys(mappedData).length === 0) {
      showNotification('error', 'Please select an entity type and map at least one field');
      return;
    }

    setIsSaving(true);

    try {
      // Map UI field names back to database field names
      const databaseMappedData = mapToDatabaseFieldNames(selectedEntityType, mappedData);
      
      console.log('Saving to database:', { entityType: selectedEntityType, data: databaseMappedData });
      
      // Validate the data before sending to the database
      const validation = validateEntityData(selectedEntityType, databaseMappedData);
      if (!validation.isValid) {
        const errorMessage = `Validation failed: ${validation.errors.join(', ')}`;
        showNotification('error', errorMessage);
        console.error('Validation errors:', validation.errors);
        return;
      }
      
      // Save the entity to the database using the service
      let response;
      
      // Special handling for brand_relationship type
      if (selectedEntityType === 'brand_relationship') {
        response = await api.sports.createBrandRelationship(databaseMappedData);
      } else {
        response = await sportsDatabaseService.createEntity(selectedEntityType as DbEntityType, databaseMappedData);
      }
      
      showNotification('success', `Successfully saved ${selectedEntityType} to database`);
      onClose();
    } catch (error) {
      console.error('Error saving to database:', error);
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Try to extract a meaningful error message from the error object
        errorMessage = JSON.stringify(error);
      }
      
      showNotification('error', `Error saving to database: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Add a function to look up entity IDs by name
  const lookupEntityIdByName = async (entityType: string, name: string): Promise<string | null> => {
    console.log(`Looking up ${entityType} with name: "${name}"`);
    try {
      let entities: any[] = [];
      
      switch (entityType) {
        case 'league':
          entities = await api.sports.getLeagues();
          break;
        case 'stadium':
          entities = await api.sports.getStadiums();
          break;
        case 'team':
          entities = await api.sports.getTeams();
          break;
        case 'brand':
          entities = await api.sports.getBrands();
          break;
        default:
          console.error(`Unsupported entity type for lookup: ${entityType}`);
          return null;
      }
      
      // Find the entity with the matching name (case-insensitive)
      const entity = entities.find(e => 
        e.name && e.name.toLowerCase() === name.toLowerCase()
      );
      
      if (entity) {
        console.log(`Found ${entityType} with name "${name}": ${entity.id}`);
        return entity.id;
      } else {
        console.log(`No ${entityType} found with name "${name}"`);
        
        // If it's a stadium and it doesn't exist, create it
        if (entityType === 'stadium' && name) {
          try {
            // Get the current record
            const recordIndex = currentRecordIndex || 0;
            const item = dataToImport[recordIndex];
            
            // Try to find city and country fields in the current mapping
            const currentEntityType = selectedEntityType || '';
            const cityField = Object.entries(mappingsByEntityType[currentEntityType] || {})
              .find(([_, target]) => target === 'city')?.[0];
            const countryField = Object.entries(mappingsByEntityType[currentEntityType] || {})
              .find(([_, target]) => target === 'country')?.[0];
            
            const city = cityField && item && item[cityField] ? item[cityField] : 'Unknown';
            const country = countryField && item && item[countryField] ? item[countryField] : 'Unknown';
            
            console.log(`Creating new stadium "${name}" with city: ${city}, country: ${country}`);
            
            const newStadium = await api.sports.createStadium({
              name,
              city,
              country
            });
            
            console.log(`Created new stadium: ${newStadium.id}`);
            return newStadium.id;
          } catch (error) {
            console.error(`Error creating stadium "${name}":`, error);
            return null;
          }
        }
        
        // If it's a league and it doesn't exist, create it with basic info
        if (entityType === 'league' && name) {
          try {
            console.log(`Creating new league "${name}"`);
            
            const newLeague = await api.sports.createLeague({
              name,
              sport: name, // Use name as sport as a fallback
              country: 'Unknown'
            });
            
            console.log(`Created new league: ${newLeague.id}`);
            return newLeague.id;
          } catch (error) {
            console.error(`Error creating league "${name}":`, error);
            return null;
          }
        }
        
        return null;
      }
    } catch (error) {
      console.error(`Error looking up ${entityType} with name "${name}":`, error);
      return null;
    }
  };

  // Enhance mapToDatabaseFieldNames to handle name-to-ID lookups
  const enhancedMapToDatabaseFieldNames = async (entityType: EntityType, data: Record<string, any>): Promise<Record<string, any>> => {
    console.log(`enhancedMapToDatabaseFieldNames called for ${entityType} with data:`, JSON.stringify(data, null, 2));
    
    // First, get the basic mapping
    const basicMapped = mapToDatabaseFieldNames(entityType, data);
    console.log(`Basic mapping result for ${entityType}:`, JSON.stringify(basicMapped, null, 2));
    
    // For stadium entity, ensure data is properly formatted
    if (entityType === 'stadium') {
      console.log(`Processing stadium entity with required fields: name=${basicMapped.name}, city=${basicMapped.city}, country=${basicMapped.country}`);
      
      // Ensure required fields are present with default values if needed
      if (!basicMapped.name) basicMapped.name = 'Unnamed Stadium';
      if (!basicMapped.city) basicMapped.city = 'Unknown City';
      if (!basicMapped.country) basicMapped.country = 'Unknown Country';
      
      // Ensure capacity is a number if present
      if (basicMapped.capacity !== undefined && basicMapped.capacity !== null) {
        const capacityNum = parseInt(String(basicMapped.capacity));
        if (!isNaN(capacityNum)) {
          basicMapped.capacity = capacityNum;
        } else {
          // If capacity can't be parsed as a number, set it to null
          basicMapped.capacity = null;
        }
      }
      
      // Remove any unexpected fields that might cause validation errors
      const validStadiumFields = ['name', 'city', 'state', 'country', 'capacity', 'owner', 'naming_rights_holder', 'host_broadcaster_id'];
      Object.keys(basicMapped).forEach(key => {
        if (!validStadiumFields.includes(key)) {
          console.warn(`Removing unexpected stadium field: ${key}`);
          delete basicMapped[key];
        }
      });
    }
    
    // For team entity, handle special lookups
    if (entityType === 'team') {
      // If league_id is not a UUID but looks like a name, look it up
      if (basicMapped.league_id && !isValidUUID(basicMapped.league_id)) {
        console.log(`Looking up league ID for name: ${basicMapped.league_id}`);
        const leagueId = await lookupEntityIdByName('league', basicMapped.league_id);
        if (leagueId) {
          basicMapped.league_id = leagueId;
          console.log(`Found league ID: ${leagueId} for name: ${data.league_id}`);
        } else {
          console.warn(`Could not find league ID for name: ${basicMapped.league_id}`);
        }
      }
      
      // If stadium_id is not a UUID but looks like a name, look it up
      if (basicMapped.stadium_id && !isValidUUID(basicMapped.stadium_id)) {
        console.log(`Looking up stadium ID for name: ${basicMapped.stadium_id}`);
        const stadiumId = await lookupEntityIdByName('stadium', basicMapped.stadium_id);
        if (stadiumId) {
          basicMapped.stadium_id = stadiumId;
          console.log(`Found stadium ID: ${stadiumId} for name: ${data.stadium_id}`);
        } else {
          console.warn(`Could not find stadium ID for name: ${basicMapped.stadium_id}`);
        }
      }
    }
    
    // For player entity, handle team lookups
    if (entityType === 'player' && basicMapped.team_id && !isValidUUID(basicMapped.team_id)) {
      console.log(`Looking up team ID for name: ${basicMapped.team_id}`);
      const teamId = await lookupEntityIdByName('team', basicMapped.team_id);
      if (teamId) {
        basicMapped.team_id = teamId;
        console.log(`Found team ID: ${teamId} for name: ${data.team_id}`);
      } else {
        console.warn(`Could not find team ID for name: ${basicMapped.team_id}`);
      }
    }
    
    // For game entity, handle team and stadium lookups
    if (entityType === 'game') {
      if (basicMapped.home_team_id && !isValidUUID(basicMapped.home_team_id)) {
        console.log(`Looking up home team ID for name: ${basicMapped.home_team_id}`);
        const teamId = await lookupEntityIdByName('team', basicMapped.home_team_id);
        if (teamId) {
          basicMapped.home_team_id = teamId;
          console.log(`Found home team ID: ${teamId} for name: ${data.home_team_id}`);
        } else {
          console.warn(`Could not find home team ID for name: ${basicMapped.home_team_id}`);
        }
      }
      
      if (basicMapped.away_team_id && !isValidUUID(basicMapped.away_team_id)) {
        console.log(`Looking up away team ID for name: ${basicMapped.away_team_id}`);
        const teamId = await lookupEntityIdByName('team', basicMapped.away_team_id);
        if (teamId) {
          basicMapped.away_team_id = teamId;
          console.log(`Found away team ID: ${teamId} for name: ${data.away_team_id}`);
        } else {
          console.warn(`Could not find away team ID for name: ${basicMapped.away_team_id}`);
        }
      }
      
      if (basicMapped.stadium_id && !isValidUUID(basicMapped.stadium_id)) {
        console.log(`Looking up stadium ID for name: ${basicMapped.stadium_id}`);
        const stadiumId = await lookupEntityIdByName('stadium', basicMapped.stadium_id);
        if (stadiumId) {
          basicMapped.stadium_id = stadiumId;
          console.log(`Found stadium ID: ${stadiumId} for name: ${data.stadium_id}`);
        } else {
          console.warn(`Could not find stadium ID for name: ${basicMapped.stadium_id}`);
        }
      }
      
      if (basicMapped.league_id && !isValidUUID(basicMapped.league_id)) {
        console.log(`Looking up league ID for name: ${basicMapped.league_id}`);
        const leagueId = await lookupEntityIdByName('league', basicMapped.league_id);
        if (leagueId) {
          basicMapped.league_id = leagueId;
          console.log(`Found league ID: ${leagueId} for name: ${data.league_id}`);
        } else {
          console.warn(`Could not find league ID for name: ${basicMapped.league_id}`);
        }
      }
    }
    
    console.log(`Final enhanced mapping result for ${entityType}:`, JSON.stringify(basicMapped, null, 2));
    return basicMapped;
  };

  // Update the handleBatchImport function to use the enhanced mapping
  const handleBatchImport = async () => {
    if (!selectedEntityType) {
      showNotification('error', 'Please select an entity type');
      return;
    }
    
    const currentMapping = mappingsByEntityType[selectedEntityType] || {};
    if (Object.keys(currentMapping).length === 0) {
      showNotification('error', 'Please create at least one field mapping');
      return;
    }
    
    if (dataToImport.length === 0) {
      showNotification('error', 'No valid data to import');
      return;
    }
    
    // Check authentication status
    const token = localStorage.getItem('auth_token');
    console.log('Authentication token exists:', !!token);
    if (!token) {
      showNotification('error', 'You are not authenticated. Please log in again.');
      return;
    }
    
    // Reset import state
    setIsSaving(true);
    setImportProgress(null);
    setImportCompleted(false);
    
    console.log('Starting batch import with:', {
      entityType: selectedEntityType,
      mappings: currentMapping,
      recordCount: dataToImport.length,
      excludedCount: excludedRecords.size
    });

    // Log the raw data being imported
    console.log('Raw data to import:', dataToImport);
    
    try {
      // Map each item using the field mapping, excluding records that have been marked for exclusion
      const mappedItems = dataToImport
        .filter((_, index) => !excludedRecords.has(index)) // Filter out excluded records
        .map(item => {
          const mappedItem: Record<string, any> = {};
          
          Object.entries(currentMapping).forEach(([sourceField, targetField]) => {
            if (item[sourceField] !== undefined) {
              mappedItem[targetField] = item[sourceField];
            }
          });
          
          return mappedItem;
        });
      
      console.log('Mapped items before filtering:', mappedItems);
      
      // Filter out items with no mapped fields
      const validItems = mappedItems.filter(item => Object.keys(item).length > 0);
      
      console.log('Valid items after filtering:', validItems);
      
      if (validItems.length === 0) {
        showNotification('error', 'No valid items to import after mapping');
        setIsSaving(false);
        return;
      }
      
      // Initialize progress tracking
      setImportProgress({ current: 0, total: validItems.length });
      
      // Map UI field names to database field names and save each item
      const results: any[] = [];
      const errors: any[] = [];
      
      // Process items one by one to track progress
      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        
        try {
          console.log(`Processing item ${i+1}/${validItems.length}:`, item);
          
          // Use the enhanced mapping function that handles name-to-ID lookups
          const databaseItem = await enhancedMapToDatabaseFieldNames(selectedEntityType, item);
          
          console.log(`Item ${i+1} after enhanced mapping:`, JSON.stringify(databaseItem, null, 2));
          
          // For stadium entities, ensure all required fields are present and properly formatted
          if (selectedEntityType === 'stadium') {
            // Ensure required fields are present
            if (!databaseItem.name) {
              databaseItem.name = `Stadium ${i+1}`; // Provide a default name
              console.log(`Added default name for stadium ${i+1}`);
            }
            
            if (!databaseItem.city) {
              databaseItem.city = 'Unknown City'; // Provide a default city
              console.log(`Added default city for stadium ${i+1}`);
            }
            
            if (!databaseItem.country) {
              databaseItem.country = 'Unknown Country'; // Provide a default country
              console.log(`Added default country for stadium ${i+1}`);
            }
            
            // Ensure capacity is a number if present
            if (databaseItem.capacity !== undefined && databaseItem.capacity !== null) {
              const capacityNum = parseInt(databaseItem.capacity);
              if (!isNaN(capacityNum)) {
                databaseItem.capacity = capacityNum;
              } else {
                // If capacity can't be parsed as a number, set it to null
                databaseItem.capacity = null;
              }
            }
            
            console.log(`Stadium ${i+1} after ensuring required fields:`, JSON.stringify(databaseItem, null, 2));
          }
          
          // Validate the data before sending to the database
          const validation = validateEntityData(selectedEntityType, databaseItem);
          console.log(`Validation result for item ${i+1}:`, validation);
          
          if (!validation.isValid) {
            const errorMessage = `Validation failed: ${validation.errors.join(', ')}`;
            console.error(`Error validating item ${i+1}:`, errorMessage);
            errors.push({ item: i+1, error: errorMessage });
            // Continue with other items even if one fails
            setImportProgress({ current: i + 1, total: validItems.length });
            continue;
          }
          
          let result;
          
          // Special handling for brand_relationship type
          if (selectedEntityType === 'brand_relationship') {
            console.log(`Creating brand relationship for item ${i+1}:`, databaseItem);
            try {
              result = await api.sports.createBrandRelationship(databaseItem);
              console.log(`Brand relationship created for item ${i+1}:`, result);
            } catch (apiError) {
              console.error(`API error creating brand relationship for item ${i+1}:`, apiError);
              if (apiError.response) {
                console.error(`API response for item ${i+1}:`, {
                  status: apiError.response.status,
                  statusText: apiError.response.statusText,
                  data: apiError.response.data
                });
              }
              throw apiError;
            }
          } else {
            console.log(`Creating ${selectedEntityType} for item ${i+1} with data:`, JSON.stringify(databaseItem, null, 2));
            
            // Log the specific API call being made
            if (selectedEntityType === 'stadium') {
              console.log(`Calling api.sports.createStadium with data:`, JSON.stringify(databaseItem, null, 2));
              
              try {
                // Create a clean stadium object with only the required fields
                const cleanStadiumData = {
                  name: databaseItem.name || `Stadium ${i+1}`,
                  city: databaseItem.city || 'Unknown City',
                  country: databaseItem.country || 'Unknown Country',
                  // Only include optional fields if they have valid values
                  ...(databaseItem.state ? { state: databaseItem.state } : {}),
                  ...(databaseItem.capacity !== undefined && databaseItem.capacity !== null ? 
                      { capacity: parseInt(String(databaseItem.capacity)) } : {}),
                  ...(databaseItem.owner ? { owner: databaseItem.owner } : {}),
                  ...(databaseItem.naming_rights_holder ? { naming_rights_holder: databaseItem.naming_rights_holder } : {}),
                  ...(databaseItem.host_broadcaster_id && isValidUUID(databaseItem.host_broadcaster_id) ? 
                      { host_broadcaster_id: databaseItem.host_broadcaster_id } : {})
                };
                
                console.log(`Using clean stadium data:`, JSON.stringify(cleanStadiumData, null, 2));
                
                // Try direct API call with clean data
                const directResult = await api.sports.createStadium(cleanStadiumData);
                console.log(`Direct API call result for stadium ${i+1}:`, directResult);
                result = directResult;
              } catch (apiError) {
                console.error(`Direct API error creating stadium for item ${i+1}:`, apiError);
                if (apiError.response) {
                  console.error(`API response for stadium item ${i+1}:`, {
                    status: apiError.response.status,
                    statusText: apiError.response.statusText,
                    data: apiError.response.data
                  });
                  
                  // Log the detailed validation error
                  if (apiError.response.status === 422 && apiError.response.data) {
                    console.error('Validation error details:', JSON.stringify(apiError.response.data, null, 2));
                    
                    // Check for specific validation error patterns
                    if (apiError.response.data.detail) {
                      if (Array.isArray(apiError.response.data.detail)) {
                        apiError.response.data.detail.forEach((error: any) => {
                          console.error(`Field '${error.loc.join('.')}': ${error.msg}`);
                        });
                      } else {
                        console.error(`Validation error: ${apiError.response.data.detail}`);
                      }
                    }
                  }
                }
                throw apiError;
              }
            } else {
              try {
                result = await sportsDatabaseService.createEntity(selectedEntityType as DbEntityType, databaseItem);
                console.log(`${selectedEntityType} created for item ${i+1}, response:`, JSON.stringify(result, null, 2));
              } catch (apiError) {
                console.error(`API error creating ${selectedEntityType} for item ${i+1}:`, apiError);
                if (apiError.response) {
                  console.error(`API response for item ${i+1}:`, {
                    status: apiError.response.status,
                    statusText: apiError.response.statusText,
                    data: apiError.response.data
                  });
                }
                throw apiError;
              }
            }
          }
          
          results.push(result);
        } catch (error) {
          console.error(`Error importing item ${i+1}:`, error);
          let errorDetail = 'Unknown error';
          
          if (error instanceof Error) {
            errorDetail = error.message;
            console.error(`Error details for item ${i+1}:`, error.stack);
          } else if (typeof error === 'object' && error !== null) {
            errorDetail = JSON.stringify(error);
            console.error(`Error object for item ${i+1}:`, error);
          }
          
          errors.push({ item: i+1, error: errorDetail });
          // Continue with other items even if one fails
        }
        
        // Update progress after each item
        setImportProgress({ current: i + 1, total: validItems.length });
      }
      
      const excludedCount = excludedRecords.size;
      
      console.log('Batch import completed with:', {
        successful: results.length,
        errors: errors.length,
        excluded: excludedCount,
        successResults: results,
        errorDetails: errors
      });
      
      if (errors.length > 0) {
        showNotification('error', `Imported ${results.length} of ${validItems.length} ${selectedEntityType} items with ${errors.length} errors. Check console for details.`);
        console.error('Import errors:', errors);
      } else {
      showNotification('success', `Successfully imported ${results.length} ${selectedEntityType} items${excludedCount > 0 ? ` (${excludedCount} records excluded)` : ''}`);
      }
      
      // Mark import as completed
      setImportCompleted(true);
    } catch (error) {
      console.error('Error batch importing:', error);
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('Error stack:', error.stack);
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
        console.error('Error object:', error);
      }
      
      showNotification('error', `Error batch importing: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Update the FieldItem component to display the correct values for headers and rows format
  const getFieldValue = (fieldName: keyof typeof sourceFields[0] | string) => {
    if (!validStructuredData || !fieldName) return undefined;
    
    try {
      // Handle array of objects
      if (Array.isArray(validStructuredData)) {
        const recordIndex = Math.min(currentRecordIndex, validStructuredData.length - 1);
        if (recordIndex >= 0 && typeof validStructuredData[recordIndex] === 'object' && validStructuredData[recordIndex] !== null) {
          const key = typeof fieldName === 'symbol' ? String(fieldName) : fieldName;
          return validStructuredData[recordIndex][key];
        }
      } 
      // Handle single object
      else if (typeof validStructuredData === 'object' && validStructuredData !== null && !validStructuredData.headers) {
        const key = typeof fieldName === 'symbol' ? String(fieldName) : fieldName;
        return validStructuredData[key];
      }
      // Handle data with headers and rows
      else if (validStructuredData.headers && Array.isArray(validStructuredData.headers) && 
               validStructuredData.rows && Array.isArray(validStructuredData.rows) && validStructuredData.rows.length > 0) {
        const headerIndex = validStructuredData.headers.indexOf(String(fieldName));
        // Use the current record index instead of always using the first record
        const recordIndex = Math.min(currentRecordIndex, validStructuredData.rows.length - 1);
        
        console.log(`Getting field value for ${String(fieldName)} at record ${recordIndex}`, {
          headerIndex,
          recordIndex,
          totalRecords: validStructuredData.rows.length,
          headers: validStructuredData.headers,
        });
        
        if (headerIndex >= 0 && recordIndex >= 0) {
          return validStructuredData.rows[recordIndex][headerIndex];
        }
      }
    } catch (error) {
      console.error(`SportDataMapper: Error getting field value for ${String(fieldName)}`, error);
    }
    
    return undefined;
  };

  // Function to determine if an entity type is valid for the current data
  const isEntityTypeValid = (entityType: EntityType | string): boolean => {
    if (!validStructuredData || !sourceFields.length) return false;
    
    // Special case for stadium - just check for a Stadium field
    if (entityType === 'stadium') {
      const sourceFieldKeys = Object.keys(sourceFields[0] || {});
      const hasStadiumField = sourceFieldKeys.some(field => 
        field.toLowerCase() === 'stadium'
      );
      
      if (hasStadiumField) {
        return true;
      }
    }
    
    // Get required fields for this entity type
    const requiredFields = getRequiredFields(entityType as EntityType);
    
    // Check if we have potential matches for all required fields
    const sourceFieldKeys = Object.keys(sourceFields[0] || {});
    
    // For each required field, check if we have a potential match
    for (const requiredField of requiredFields) {
      // Look for exact or partial matches in source fields
      const hasMatch = sourceFieldKeys.some(sourceField => 
        sourceField.toLowerCase().includes(requiredField.toLowerCase()) ||
        requiredField.toLowerCase().includes(sourceField.toLowerCase())
      );
      
      if (!hasMatch) {
        return false; // Missing a required field match
      }
    }
    
    return true; // All required fields have potential matches
  }
  
  // Function to get entity type recommendation based on source fields
  const getRecommendedEntityType = (): string | null => {
    if (!validStructuredData || !sourceFields.length) return null;
    
    // Check for stadium-specific fields first
    const fieldValues = Object.values(sourceFieldValues).map(v => 
      typeof v === 'string' ? v.toLowerCase() : String(v).toLowerCase()
    );
    
    // Stadium detection - check for stadium-specific fields and values
    const hasStadiumName = sourceFields.some(field => 
      field.toLowerCase().includes('stadium') || 
      field.toLowerCase().includes('arena') || 
      field.toLowerCase().includes('center') ||
      field.toLowerCase().includes('venue')
    );
    
    const hasStadiumLocation = sourceFields.some(field => 
      field.toLowerCase().includes('city') || 
      field.toLowerCase().includes('state') || 
      field.toLowerCase().includes('country')
    );
    
    const hasStadiumDetails = sourceFields.some(field => 
      field.toLowerCase().includes('capacity') || 
      field.toLowerCase().includes('year') || 
      field.toLowerCase().includes('opened')
    );
    
    // Check if values contain stadium indicators
    const hasStadiumValueIndicators = Object.values(sourceFieldValues).some(value => 
      typeof value === 'string' && (
        value.toLowerCase().includes('stadium') || 
        value.toLowerCase().includes('arena') || 
        value.toLowerCase().includes('center') || 
        value.toLowerCase().includes('field') ||
        value.toLowerCase().includes('park')
      )
    );
    
    // If we have strong stadium indicators, return stadium type immediately
    if ((hasStadiumName && (hasStadiumLocation || hasStadiumDetails)) || 
        (hasStadiumValueIndicators && hasStadiumLocation)) {
      return 'stadium';
    }
    
    // Calculate a score for each entity type based on field matches
    const scores = ENTITY_TYPES.map(entityType => {
      const requiredFields = entityType.requiredFields || [];
      
      // Count exact and partial matches
      let exactMatches = 0;
      let partialMatches = 0;
      
      requiredFields.forEach(requiredField => {
        // Check for exact matches in source field keys
        const hasExactMatch = sourceFields.some(sourceField => 
          sourceField.toLowerCase() === requiredField.toLowerCase()
        );
        
        if (hasExactMatch) {
          exactMatches++;
        } else {
          // Check for partial matches
          const hasPartialMatch = sourceFields.some(sourceField => 
            sourceField.toLowerCase().includes(requiredField.toLowerCase()) ||
            requiredField.toLowerCase().includes(sourceField.toLowerCase())
          );
          
          if (hasPartialMatch) {
            partialMatches++;
          }
        }
      });
      
      // Calculate score - exact matches are worth more than partial matches
      const score = (exactMatches * 2) + partialMatches;
      
      // Special case for stadium - boost score if we have location data
      let finalScore = score;
      if (entityType.id === 'stadium' && hasStadiumLocation) {
        finalScore += 3;
      }
      
      return {
        entityType: entityType.id,
        score: finalScore
      };
    });
    
    // Sort by score in descending order
    scores.sort((a, b) => b.score - a.score);
    
    // Return the entity type with the highest score, if any
    return scores.length > 0 && scores[0].score > 0 ? scores[0].entityType : null;
  };
  
  // Set recommended entity type when source fields change
  useEffect(() => {
    if (sourceFields.length > 0) {
      console.log('Checking for recommended entity type with source fields:', sourceFields);
      
      // Check if we have a field labeled "Stadium"
      const hasStadiumField = sourceFields.some(field => 
        field.toLowerCase() === 'stadium'
      );
      
      // Also check if we have a field with "stadium" in its name
      const hasStadiumNameField = sourceFields.some(field => 
        field.toLowerCase().includes('stadium') || 
        field.toLowerCase().includes('arena') || 
        field.toLowerCase().includes('venue')
      );
      
      console.log('Has Stadium field:', hasStadiumField, 'Has Stadium-like field:', hasStadiumNameField, 'Source fields:', sourceFields);
      
      // Check if any field value contains stadium-related text
      const hasStadiumValue = Object.values(sourceFieldValues).some(value => 
        typeof value === 'string' && 
        (value.toLowerCase().includes('stadium') || 
         value.toLowerCase().includes('arena') || 
         value.toLowerCase().includes('center') ||
         value.toLowerCase().includes('garden'))
      );
      
      console.log('Has Stadium value:', hasStadiumValue, 'Source field values:', sourceFieldValues);
      
      if (hasStadiumField || (hasStadiumNameField && hasStadiumValue)) {
        console.log('Setting entity type to stadium based on Stadium field or value');
        setSelectedEntityType('stadium');
      } else {
        const recommended = getRecommendedEntityType();
        console.log('Recommended entity type:', recommended);
        
        if (recommended) {
          console.log('Setting entity type to recommended:', recommended);
          setSelectedEntityType(recommended as EntityType);
        }
      }
    }
  }, [sourceFields, sourceFieldValues]);

  // Guided Walkthrough Component
  const GuidedWalkthrough = () => {
    if (!showGuidedWalkthrough) return null;
    
    const steps = [
      {
        title: "Select an Entity Type",
        content: "Choose the type of sports data you're importing. The system has automatically recommended the best match based on your data."
      },
      {
        title: "Map Your Fields",
        content: "Drag fields from the Source Fields column to the corresponding Database Fields. Required fields are marked with an asterisk (*)."
      },
      {
        title: "Review Your Data",
        content: "Use the navigation controls to browse through your records. You can exclude any records that shouldn't be imported."
      },
      {
        title: "Import Your Data",
        content: "When you're ready, click 'Batch Import' to save all your mapped records to the database."
      }
    ];
    
    const currentStep = steps[guidedStep - 1];
    
    return (
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-indigo-200 p-4 w-80 z-50">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium text-indigo-700">Step {guidedStep}: {currentStep.title}</h4>
          <button 
            onClick={() => setShowGuidedWalkthrough(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-3">{currentStep.content}</p>
        <div className="flex justify-between">
          <button
            onClick={() => setGuidedStep(prev => Math.max(prev - 1, 1))}
            disabled={guidedStep === 1}
            className={`px-2 py-1 text-xs rounded ${
              guidedStep === 1 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
            }`}
          >
            Previous
          </button>
          <button
            onClick={() => {
              if (guidedStep < steps.length) {
                setGuidedStep(prev => prev + 1);
              } else {
                setShowGuidedWalkthrough(false);
              }
            }}
            className="px-2 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700"
          >
            {guidedStep < steps.length ? 'Next' : 'Finish'}
          </button>
        </div>
      </div>
    );
  };
  
  // Field Help Tooltip Component
  const FieldHelpTooltip = ({ field }: { field: string }) => {
    if (showFieldHelp !== field) return null;
    
    // Get help text based on field name
    const getHelpText = () => {
      switch (field) {
        case 'name':
          return "The name of the entity (e.g., 'Los Angeles Lakers' for a team)";
        case 'league_id':
          return "The UUID of the league this entity belongs to. If you enter a league name, it will be automatically looked up or created.";
        case 'stadium_id':
          return "The UUID of the stadium this entity uses. If you enter a stadium name, it will be automatically looked up or created.";
        case 'team_id':
          return "The UUID of the team this entity belongs to. If you enter a team name, it will be automatically looked up or created.";
        case 'city':
          return "The city where this entity is located.";
        case 'country':
          return "The country where this entity is located.";
        case 'sport':
          return "The sport this entity is associated with (e.g., 'Basketball', 'Football').";
        case 'position':
          return "The position or role (e.g., 'Point Guard', 'Commissioner').";
        case 'date':
          return "The date in YYYY-MM-DD format.";
        case 'start_date':
          return "The start date in YYYY-MM-DD format.";
        case 'end_date':
          return "The end date in YYYY-MM-DD format.";
        default:
          return "Enter the appropriate value for this field.";
      }
    };
    
    return (
      <div className="absolute z-10 bg-white border border-gray-200 rounded-md shadow-lg p-2 w-64 text-xs text-gray-700 top-full left-0 mt-1">
        {getHelpText()}
      </div>
    );
  };

  // Simplify the useEffect to just check for a Stadium field
  useEffect(() => {
    if (validStructuredData && sourceFields.length > 0) {
      // Check if we have a field labeled "Stadium"
      const sourceFieldKeys = Object.keys(sourceFields[0] || {});
      const hasStadiumField = sourceFieldKeys.some(field => 
        field.toLowerCase() === 'stadium'
      );
      
      // If we have a Stadium field, select Stadium entity type
      if (hasStadiumField) {
        console.log('Found Stadium field, selecting Stadium entity type');
        setSelectedEntityType('stadium');
        return;
      }
      
      // Otherwise, use the recommended entity type
      const recommended = getRecommendedEntityType();
      if (recommended && isEntityTypeValid(recommended)) {
        setSelectedEntityType(recommended as EntityType);
      } else {
        // Find the first valid entity type
        const firstValid = ENTITY_TYPES.find(et => isEntityTypeValid(et.id));
        if (firstValid) {
          setSelectedEntityType(firstValid.id as EntityType);
        }
      }
    }
  }, [validStructuredData, sourceFields]);

  return (
    <DndProvider backend={HTML5Backend}>
      <Transition.Root show={isOpen} as={React.Fragment}>
        <Dialog as="div" className="relative z-10" onClose={onClose}>
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-6xl sm:p-6">
                  <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      onClick={onClose}
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                  
                  <div>
                    <div className="mt-3 text-center sm:mt-5">
                      <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                        Map to Sports Data
                      </Dialog.Title>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Select an Entity, then drag and drop from left to right.
                        </p>
                      </div>
                      
                      {/* View Mode Toggle */}
                      <div className="mt-3 flex justify-center">
                        <div className="inline-flex rounded-md shadow-sm" role="group">
                          <button
                            type="button"
                            className={`px-3 py-1 text-xs font-medium rounded-l-md ${
                              viewMode === 'entity'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                            }`}
                            onClick={() => setViewMode('entity')}
                          >
                            Entity View
                          </button>
                          <button
                            type="button"
                            className={`px-3 py-1 text-xs font-medium ${
                              viewMode === 'global'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                            }`}
                            onClick={() => setViewMode('global')}
                          >
                            Global View
                          </button>
                          <button
                            type="button"
                            className={`px-3 py-1 text-xs font-medium rounded-r-md ${
                              viewMode === 'preview'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                            }`}
                            onClick={() => setViewMode('preview')}
                          >
                            Data Preview
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5">
                    {viewMode === 'entity' && (
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-sm font-medium text-gray-700">
                          Select Entity Type:
                        </label>
                          <button
                            onClick={() => setShowGuidedWalkthrough(true)}
                            className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center"
                          >
                            <QuestionMarkCircleIcon className="h-4 w-4 mr-1" />
                            Help Guide
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {ENTITY_TYPES.map((entityType) => {
                            const isValid = isEntityTypeValid(entityType.id);
                            const isRecommended = getRecommendedEntityType() === entityType.id;
                            
                            return (
                              <button
                              key={entityType.id}
                              onClick={() => setSelectedEntityType(entityType.id)}
                                className={`
                                  p-2 rounded-md text-center transition-colors
                                  ${selectedEntityType === entityType.id 
                                    ? 'bg-blue-600 text-white font-medium shadow-md' 
                                    : isValid 
                                      ? isRecommended 
                                        ? 'bg-blue-100 border-2 border-blue-400 text-blue-800' 
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800' 
                                      : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                                  }
                                `}
                                disabled={!isValid}
                              >
                                <div className="font-medium">{entityType.name}</div>
                                {isValid && isRecommended && selectedEntityType !== entityType.id && (
                                  <div className="text-xs mt-1 text-blue-600">Recommended</div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {viewMode === 'entity' && selectedEntityType && (
                      <div className="grid grid-cols-3 gap-4">
                        {/* Source Fields */}
                        <div className="border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-medium text-gray-900">Source Fields</h4>
                            
                            {/* Navigation Controls - Elegant and subtle styling */}
                            <div className="flex items-center space-x-2">
                              {/* Record Navigation */}
                              <div className="flex items-center text-gray-600">
                                <button
                                  type="button"
                                  onClick={goToPreviousRecord}
                                  className="p-1 text-gray-500 hover:text-gray-700"
                                  title="Previous Record"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </button>
                                <span className="text-xs font-medium mx-1">
                                  {currentRecordIndex + 1}/{Math.max(totalRecords, 1)}
                                </span>
                                <button
                                  type="button"
                                  onClick={goToNextRecord}
                                  className="p-1 text-gray-500 hover:text-gray-700"
                                  title="Next Record"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                              
                              {/* Simple X button for exclude/include */}
                              <button
                                type="button"
                                onClick={toggleExcludeRecord}
                                className={`p-1 rounded-full ${
                                  excludedRecords.has(currentRecordIndex)
                                    ? 'text-red-500 hover:text-red-700'
                                    : 'text-gray-400 hover:text-gray-600'
                                }`}
                                title={excludedRecords.has(currentRecordIndex) ? "Include Record" : "Exclude Record"}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                              {excludedRecords.has(currentRecordIndex) && (
                                <span className="text-xs text-red-500">(Excluded)</span>
                              )}
                            </div>
                          </div>

                          {/* Source Fields List */}
                          <div className="max-h-96 overflow-y-auto">
                            {sourceFields.map((field) => (
                              <FieldItem
                                key={field}
                                field={field}
                                value={getFieldValue(field)}
                                isSource={true}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Mapping Visualization */}
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3">
                            Field Mapping for {selectedEntityType && ENTITY_TYPES.find(et => et.id === selectedEntityType)?.name}
                          </h4>
                          
                          {/* Progress note for League and Stadium entity types */}
                          {(selectedEntityType === 'league' || selectedEntityType === 'stadium') && (
                            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                              <p className="font-medium mb-1">
                                {selectedEntityType === 'league' ? 'Leagues' : 'Stadiums'} are foundation entities and should be created first.
                              </p>
                              <p>
                                <span className="font-medium">Minimum required fields:</span> {' '}
                                {selectedEntityType === 'league' 
                                  ? 'name, sport, country' 
                                  : 'name, city, country'}
                              </p>
                              <p className="mt-1">
                                <span className="font-medium">Progress:</span> {' '}
                                {Object.keys(mappingsByEntityType[selectedEntityType] || {}).length} of {' '}
                                {selectedEntityType === 'league' ? 3 : 3} required fields mapped
                              </p>
                            </div>
                          )}
                          
                          <div className="max-h-96 overflow-y-auto">
                            {selectedEntityType && 
                              // Only show mappings for the currently selected entity type
                              Object.entries(mappingsByEntityType[selectedEntityType] || {}).map(([sourceField, targetField]) => (
                                <div key={`${selectedEntityType}-${sourceField}`} className="flex items-center mb-2">
                                  <div className="flex-1 p-2 bg-blue-50 border border-blue-200 rounded">
                                    {sourceField}
                                  </div>
                                  <div className="mx-2">→</div>
                                  <div className="flex-1 p-2 bg-green-50 border border-green-200 rounded">
                                    {targetField}
                                  </div>
                                  <button
                                    className="ml-2 text-red-500 hover:text-red-700"
                                    onClick={() => {
                                      if (!selectedEntityType) return;
                                      
                                      // Create a new mapping object for this entity type
                                      const updatedEntityMapping = { ...mappingsByEntityType[selectedEntityType] };
                                      // Remove the mapping to delete
                                      delete updatedEntityMapping[sourceField];
                                      
                                      // Update the mappings state
                                      setMappingsByEntityType(prev => ({
                                        ...prev,
                                        [selectedEntityType]: updatedEntityMapping
                                      }));
                                    }}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))
                            }
                            {selectedEntityType && Object.keys(mappingsByEntityType[selectedEntityType] || {}).length === 0 && (
                              <div className="text-center text-gray-500 py-4">
                                Drag fields from the left to the right to create mappings
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Target Fields */}
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3">Database Fields</h4>
                          <div className="max-h-96 overflow-y-auto">
                            {entityFields.map((field) => {
                              const isRequired = selectedEntityType && 
                                ENTITY_TYPES.find(et => et.id === selectedEntityType)?.requiredFields?.includes(field as any);
                              
                              return (
                                <div key={field} className="relative">
                              <FieldItem
                                key={field}
                                field={field}
                                value={mappedData[field]}
                                    isSource={false}
                                    onDrop={(sourceField, targetField) => handleFieldMapping(sourceField, targetField)}
                                  />
                                  {isRequired && (
                                    <span className="absolute top-2 right-2 text-red-500 text-xs">*</span>
                                  )}
                                  <button 
                                    className="absolute top-2 right-6 text-gray-400 hover:text-gray-600"
                                    onClick={() => setShowFieldHelp(showFieldHelp === field ? null : field)}
                                  >
                                    <InformationCircleIcon className="h-4 w-4" />
                                  </button>
                                  <FieldHelpTooltip field={field} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Global Field Mapping View */}
                    {viewMode === 'global' && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3">Global Field Mappings Across All Entities</h4>
                        <div className="overflow-y-auto max-h-[500px]">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source Field</th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Database Field</th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {Object.entries(mappingsByEntityType).flatMap(([entityType, mappings]) => 
                                Object.entries(mappings).map(([sourceField, targetField]) => (
                                  <tr key={`${entityType}-${sourceField}`} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                      {ENTITY_TYPES.find(et => et.id === entityType)?.name || entityType}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-blue-600">
                                      {sourceField}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-green-600">
                                      {targetField}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                                      <button
                                        className="text-red-500 hover:text-red-700"
                                        onClick={() => {
                                          // Create a new mapping object for this entity type
                                          const updatedEntityMapping = { ...mappingsByEntityType[entityType] };
                                          // Remove the mapping to delete
                                          delete updatedEntityMapping[sourceField];
                                          
                                          // Update the mappings state
                                          setMappingsByEntityType(prev => ({
                                            ...prev,
                                            [entityType]: updatedEntityMapping
                                          }));
                                        }}
                                      >
                                        Delete
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                              {Object.keys(mappingsByEntityType).length === 0 || 
                               Object.values(mappingsByEntityType).every(mapping => Object.keys(mapping).length === 0) ? (
                                <tr>
                                  <td colSpan={4} className="px-3 py-4 text-center text-sm text-gray-500">
                                    No field mappings created yet. Switch to Entity View to create mappings.
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Data Preview View */}
                    {viewMode === 'preview' && selectedEntityType && (
                      <div className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium text-gray-900">
                            Data Preview for {ENTITY_TYPES.find(et => et.id === selectedEntityType)?.name} (Record {currentRecordIndex + 1}/{Math.max(totalRecords, 1)})
                          </h4>
                          
                          {/* Navigation Controls */}
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center text-gray-600">
                              <button
                                type="button"
                                onClick={goToPreviousRecord}
                                className="p-1 text-gray-500 hover:text-gray-700"
                                title="Previous Record"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </button>
                              <span className="text-xs font-medium mx-1">
                                {currentRecordIndex + 1}/{Math.max(totalRecords, 1)}
                              </span>
                              <button
                                type="button"
                                onClick={goToNextRecord}
                                className="p-1 text-gray-500 hover:text-gray-700"
                                title="Next Record"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                            
                            <button
                              type="button"
                              onClick={toggleExcludeRecord}
                              className={`p-1 rounded-full ${
                                excludedRecords.has(currentRecordIndex)
                                  ? 'text-red-500 hover:text-red-700'
                                  : 'text-gray-400 hover:text-gray-600'
                              }`}
                              title={excludedRecords.has(currentRecordIndex) ? "Include Record" : "Exclude Record"}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                            {excludedRecords.has(currentRecordIndex) && (
                              <span className="text-xs text-red-500">(Excluded)</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="overflow-y-auto max-h-[500px]">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source Field</th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source Value</th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mapped To</th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Database Field</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {sourceFields.map((sourceField) => {
                                const sourceValue = getFieldValue(sourceField);
                                const mappedToField = selectedEntityType && mappingsByEntityType[selectedEntityType] ? 
                                  mappingsByEntityType[selectedEntityType][sourceField] : undefined;
                                
                                return (
                                  <tr key={sourceField} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                      {sourceField}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                      {sourceValue !== undefined ? String(sourceValue) : ''}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                      {mappedToField !== undefined ? String(mappedToField) : ''}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                      {selectedEntityType && entityFields.includes(sourceField) ? sourceField : ''}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                            </div>
                          </div>
                        )}
                      </div>

                  {/* Action Buttons */}
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    {/* Save to Database Button */}
                        <button
                          type="button"
                      className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2"
                        onClick={handleSaveToDatabase}
                      disabled={isSaving || !selectedEntityType || Object.keys(mappingsByEntityType[selectedEntityType] || {}).length === 0}
                      >
                        {isSaving ? 'Saving...' : 'Save to Database'}
                      </button>
                    
                    {/* Batch Import Button */}
                    {totalRecords > 1 && (
                      <button
                        type="button"
                        className="mt-3 inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 sm:col-start-1 sm:mt-0"
                        onClick={handleBatchImport}
                        disabled={isSaving || !selectedEntityType || Object.keys(mappingsByEntityType[selectedEntityType] || {}).length === 0}
                      >
                        {isSaving ? 'Importing...' : `Batch Import (${totalRecords - excludedRecords.size} records)`}
                      </button>
                    )}
                    
                    {/* Import Progress */}
                    {importProgress && (
                      <div className="col-span-2 mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-indigo-600 h-2.5 rounded-full" 
                            style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                          ></div>
                    </div>
                        <p className="text-xs text-center mt-1 text-gray-500">
                          Importing {importProgress.current} of {importProgress.total} records
                        </p>
                  </div>
                    )}
                    
                    {/* Import Completed Message */}
                    {importCompleted && (
                      <div className="col-span-2 mt-3 text-center text-sm text-green-600">
                        Import completed successfully!
                      </div>
                    )}
                  </div>

                  {/* Required Fields for Selected Entity */}
                  {selectedEntityType && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <h3 className="text-md font-medium text-blue-800">Required Fields for {selectedEntityType}</h3>
                      <ul className="mt-2 list-disc list-inside text-sm text-blue-700">
                        {getRequiredFields(selectedEntityType).map(field => (
                          <li key={field}>{field}</li>
                        ))}
                      </ul>
                      <p className="mt-2 text-sm text-blue-600">
                        Note: ID fields (like league_id, stadium_id, etc.) must be valid UUIDs.
                        <br />
                        Example UUID: {generateSampleUUID()}
                      </p>
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
      
      {/* Add the guided walkthrough component */}
      <GuidedWalkthrough />
    </DndProvider>
  );
};

export default SportDataMapper; 