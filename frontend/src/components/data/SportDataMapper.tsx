import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { EntityType } from '../../services/SportsDatabaseService';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { api } from '../../utils/api';
import { useNotification } from '../../contexts/NotificationContext';
import sportsDatabaseService from '../../services/SportsDatabaseService';

// Define the interface for the component props
interface SportDataMapperProps {
  isOpen: boolean;
  onClose: () => void;
  structuredData: any;
}

// Define the entity types available for mapping
const ENTITY_TYPES: { id: EntityType; name: string; description: string }[] = [
  { id: 'league', name: 'League', description: 'Sports league information' },
  { id: 'team', name: 'Team', description: 'Sports team with league affiliation' },
  { id: 'player', name: 'Player', description: 'Player with team affiliation' },
  { id: 'game', name: 'Game', description: 'Game between two teams' },
  { id: 'stadium', name: 'Stadium', description: 'Stadium or venue information' },
  { id: 'broadcast', name: 'Broadcast Rights', description: 'Media broadcast rights' },
  { id: 'production', name: 'Production Service', description: 'Production service details' },
  { id: 'brand', name: 'Brand Relationship', description: 'Sponsorship or brand partnership' }
];

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
  field: string;
}

// Define collected props interfaces
interface DragCollectedProps {
  isDragging: boolean;
}

interface DropCollectedProps {
  isOver: boolean;
}

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

  // @ts-ignore - Ignoring type errors for react-dnd hooks
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemType,
    drop: (item: DragItem) => {
      console.log('Drop detected:', { sourceField: item.field, targetField: field });
      if (onDrop && !isSource) {
        onDrop(item.field, field);
        return { dropped: true };
      }
      return undefined;
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
    canDrop: (item: DragItem) => !isSource && item.field !== field,
  }));

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
      {!isSource && canDrop && (
        <div className="text-xs text-indigo-500 mt-1">
          Drop here to map
        </div>
      )}
    </div>
  );
};

// Main component
const SportDataMapper: React.FC<SportDataMapperProps> = ({ isOpen, onClose, structuredData }) => {
  // State for the selected entity type
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType | null>(null);
  
  // State for the fields of the selected entity
  const [entityFields, setEntityFields] = useState<string[]>([]);
  
  // State for the source fields from the structured data
  const [sourceFields, setSourceFields] = useState<string[]>([]);
  
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
  
  // Get the notification context
  const { showNotification } = useNotification();
  
  // Debug logging for component rendering
  console.log('%c SportDataMapper RENDERING ', 'background: #00ff00; color: #000000; font-size: 16px;');
  console.log('SportDataMapper rendering with structured data:', structuredData);
  
  // Function to extract source fields from structured data
  const extractSourceFields = (data: any) => {
    if (!data) return;
    
    console.log('SportDataMapper: Processing structured data', {
      type: typeof data,
      isArray: Array.isArray(data),
      hasHeaders: data.headers && Array.isArray(data.headers),
      hasRows: data.rows && Array.isArray(data.rows)
    });
    
    let fields: string[] = [];
    
    // Handle array of objects
    if (Array.isArray(data) && data.length > 0) {
      fields = Object.keys(data[0]);
    } 
    // Handle single object
    else if (typeof data === 'object' && data !== null && !data.headers) {
      fields = Object.keys(data);
    }
    // Handle data with headers and rows - this is the format we're seeing in the screenshots
    else if (data.headers && Array.isArray(data.headers)) {
      // Use the actual header values as source fields instead of the "headers" property itself
      fields = data.headers;
      console.log('SportDataMapper: Using header values as source fields:', fields);
    }
    
    console.log('SportDataMapper: Extracted source fields', fields);
    setSourceFields(fields);
  };
  
  // Reset component state when structuredData changes
  useEffect(() => {
    console.log('%c STRUCTURED DATA CHANGED ', 'background: #ff00ff; color: #ffffff; font-size: 16px;');
    console.log('SportDataMapper: structuredData changed:', structuredData);
    
    // Reset states when structuredData changes
    setSelectedEntityType(null);
    setEntityFields([]);
    setMappedData({});
    setCurrentRecordIndex(0);
    setExcludedRecords(new Set());
    setImportProgress(null);
    setImportCompleted(false);
    
    if (structuredData) {
      // Extract source fields from structured data
      extractSourceFields(structuredData);
      
      // Update dataToImport and totalRecords based on structuredData
      const newDataToImport = Array.isArray(structuredData) ? structuredData : [structuredData];
      setDataToImport(newDataToImport);
      setTotalRecords(newDataToImport.length);
    }
  }, [structuredData]);
  
  // Reset component state when dialog is opened or closed
  useEffect(() => {
    if (isOpen) {
      console.log('%c DIALOG OPENED ', 'background: #0000ff; color: #ffffff; font-size: 16px;');
      console.log('Dialog opened, initializing component state');
      
      // Extract source fields from structured data
      extractSourceFields(structuredData);
      
      // Update dataToImport and totalRecords based on structuredData
      const newDataToImport = Array.isArray(structuredData) ? structuredData : [structuredData];
      setDataToImport(newDataToImport);
      setTotalRecords(newDataToImport.length);
    }
  }, [isOpen]);

  // Get current field mapping based on selected entity type
  const fieldMapping = selectedEntityType ? mappingsByEntityType[selectedEntityType] : {};

  // Debug logging for component rendering
  useEffect(() => {
    console.log('%c SPORT DATA MAPPER COMPONENT RENDERING ', 'background: #00ff00; color: #000000; font-size: 16px;');
    console.log('SportDataMapper: Component rendering', { 
      isOpen, 
      hasStructuredData: !!structuredData,
      structuredDataType: structuredData ? typeof structuredData : 'none',
      structuredDataPreview: structuredData ? JSON.stringify(structuredData).substring(0, 100) + '...' : 'none'
    });
  }, [isOpen, structuredData]);

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
        brand: ['brand_name', 'brand_id', 'brand_entity_type', 'brand_entity_id', 'brand_relationship_type', 'brand_start_date', 'brand_end_date', 'brand_value', 'brand_description']
      };
      
      setEntityFields(fieldsMap[selectedEntityType] || []);
      
      // Update mapped data based on the current entity type's field mapping
      updateMappedDataForEntityType(selectedEntityType);
    }
  }, [selectedEntityType]);

  // Function to update mapped data for a specific entity type
  const updateMappedDataForEntityType = (entityType: EntityType) => {
    const currentMapping = mappingsByEntityType[entityType] || {};
    
    if (Object.keys(currentMapping).length > 0 && structuredData) {
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
  }, [mappingsByEntityType, structuredData, selectedEntityType]);

  // Extract data for batch import
  useEffect(() => {
    if (structuredData) {
      let importData: any[] = [];
      
      // Handle array of objects
      if (Array.isArray(structuredData)) {
        importData = structuredData;
      } 
      // Handle data with headers and rows
      else if (structuredData.headers && structuredData.rows && Array.isArray(structuredData.rows)) {
        // Convert rows to array of objects using headers as keys
        importData = structuredData.rows.map(row => {
          const obj: Record<string, any> = {};
          structuredData.headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });
      }
      
      console.log('SportDataMapper: Prepared data for import', { count: importData.length });
    }
  }, [structuredData]);

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

  // Handle saving the mapped data to the database
  const handleSaveToDatabase = async () => {
    if (!selectedEntityType || Object.keys(mappedData).length === 0) {
      showNotification('error', 'Please select an entity type and map at least one field');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Map UI field names back to database field names
      const databaseMappedData = mapToDatabaseFieldNames(selectedEntityType, mappedData);
      
      // Save the entity to the database using the service
      const response = await sportsDatabaseService.createEntity(selectedEntityType, databaseMappedData);
      
      showNotification('success', `Successfully saved ${selectedEntityType} to database`);
      onClose();
    } catch (error) {
      console.error('Error saving to database:', error);
      showNotification('error', `Error saving to database: ${(error as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Map UI field names back to database field names
  const mapToDatabaseFieldNames = (entityType: EntityType, data: Record<string, any>): Record<string, any> => {
    const fieldMappings: Record<string, string> = {
      // League fields
      league_name: 'name',
      league_sport: 'sport',
      league_country: 'country',
      league_founded_year: 'founded_year',
      league_description: 'description',
      
      // Team fields
      team_name: 'name',
      team_city: 'city',
      team_state: 'state',
      team_country: 'country',
      team_founded_year: 'founded_year',
      team_league_id: 'league_id',
      team_stadium_id: 'stadium_id',
      
      // Player fields
      player_first_name: 'first_name',
      player_last_name: 'last_name',
      player_position: 'position',
      player_jersey_number: 'jersey_number',
      player_birth_date: 'birth_date',
      player_nationality: 'nationality',
      player_team_id: 'team_id',
      
      // Game fields
      game_name: 'name',
      game_date: 'date',
      game_time: 'time',
      game_home_team_id: 'home_team_id',
      game_away_team_id: 'away_team_id',
      game_stadium_id: 'stadium_id',
      game_season: 'season',
      game_status: 'status',
      
      // Stadium fields
      stadium_name: 'name',
      stadium_city: 'city',
      stadium_state: 'state',
      stadium_country: 'country',
      stadium_capacity: 'capacity',
      stadium_opened_year: 'opened_year',
      stadium_description: 'description',
      
      // Broadcast fields
      broadcast_name: 'name',
      broadcast_company_id: 'company_id',
      broadcast_entity_type: 'entity_type',
      broadcast_entity_id: 'entity_id',
      broadcast_start_date: 'start_date',
      broadcast_end_date: 'end_date',
      broadcast_territory: 'territory',
      broadcast_value: 'value',
      broadcast_description: 'description',
      
      // Production fields
      production_name: 'name',
      production_company_id: 'company_id',
      production_entity_type: 'entity_type',
      production_entity_id: 'entity_id',
      production_service_type: 'service_type',
      production_start_date: 'start_date',
      production_end_date: 'end_date',
      production_description: 'description',
      
      // Brand fields
      brand_name: 'name',
      brand_id: 'brand_id',
      brand_entity_type: 'entity_type',
      brand_entity_id: 'entity_id',
      brand_relationship_type: 'relationship_type',
      brand_start_date: 'start_date',
      brand_end_date: 'end_date',
      brand_value: 'value',
      brand_description: 'description'
    };
    
    const result: Record<string, any> = {};
    
    // Map each field to its database name
    Object.entries(data).forEach(([field, value]) => {
      const dbField = fieldMappings[field] || field;
      result[dbField] = value;
    });
    
    return result;
  };

  // Handle batch import for array data
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
    
    // Reset import state
    setIsSaving(true);
    setImportProgress(null);
    setImportCompleted(false);
    
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
      
      // Filter out items with no mapped fields
      const validItems = mappedItems.filter(item => Object.keys(item).length > 0);
      
      if (validItems.length === 0) {
        showNotification('error', 'No valid items to import after mapping');
        setIsSaving(false);
        return;
      }
      
      // Initialize progress tracking
      setImportProgress({ current: 0, total: validItems.length });
      
      // Map UI field names to database field names and save each item
      const results: any[] = [];
      
      // Process items one by one to track progress
      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        const databaseItem = mapToDatabaseFieldNames(selectedEntityType, item);
        
        try {
          const result = await sportsDatabaseService.createEntity(selectedEntityType, databaseItem);
          results.push(result);
        } catch (error) {
          console.error(`Error importing item ${i+1}:`, error);
          // Continue with other items even if one fails
        }
        
        // Update progress after each item
        setImportProgress({ current: i + 1, total: validItems.length });
      }
      
      const excludedCount = excludedRecords.size;
      showNotification('success', `Successfully imported ${results.length} ${selectedEntityType} items${excludedCount > 0 ? ` (${excludedCount} records excluded)` : ''}`);
      
      // Mark import as completed
      setImportCompleted(true);
    } catch (error) {
      console.error('Error batch importing:', error);
      showNotification('error', `Error batch importing: ${(error as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Update the FieldItem component to display the correct values for headers and rows format
  const getFieldValue = (field: string) => {
    if (!structuredData) return undefined;
    
    // Handle array of objects
    if (Array.isArray(structuredData) && structuredData.length > 0) {
      // Use the current record index instead of always using the first record
      const recordIndex = Math.min(currentRecordIndex, structuredData.length - 1);
      return structuredData[recordIndex][field];
    } 
    // Handle single object
    else if (typeof structuredData === 'object' && structuredData !== null && !structuredData.headers) {
      return structuredData[field];
    }
    // Handle data with headers and rows
    else if (structuredData.headers && structuredData.rows && Array.isArray(structuredData.rows) && structuredData.rows.length > 0) {
      const headerIndex = structuredData.headers.indexOf(field);
      // Use the current record index instead of always using the first record
      const recordIndex = Math.min(currentRecordIndex, structuredData.rows.length - 1);
      if (headerIndex !== -1 && structuredData.rows[recordIndex][headerIndex] !== undefined) {
        return structuredData.rows[recordIndex][headerIndex];
      }
    }
    
    return undefined;
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Transition show={isOpen} as={React.Fragment}>
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
                        Map Data to Sports Database
                      </Dialog.Title>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Select an entity type and map the fields from your data to the database fields.
                          Drag fields from the left to the right to create mappings.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Entity Type:
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {ENTITY_TYPES.map((entityType) => (
                          <div
                            key={entityType.id}
                            className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                              selectedEntityType === entityType.id
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-300 hover:border-indigo-300 hover:bg-indigo-50/50'
                            }`}
                            onClick={() => setSelectedEntityType(entityType.id)}
                          >
                            <h4 className="font-medium text-gray-900">{entityType.name}</h4>
                            <p className="mt-1 text-xs text-gray-500">{entityType.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedEntityType && (
                      <div className="grid grid-cols-3 gap-4">
                        {/* Source Fields */}
                        <div className="border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-medium text-gray-900">Source Fields</h4>
                            {totalRecords > 1 && (
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={goToPreviousRecord}
                                  className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                                  title="Previous Record"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </button>
                                <span className="text-sm text-gray-600">
                                  Record {currentRecordIndex + 1} of {totalRecords}
                                  {excludedRecords.has(currentRecordIndex) && (
                                    <span className="ml-1 text-red-500">(Excluded)</span>
                                  )}
                                </span>
                                <button
                                  type="button"
                                  onClick={goToNextRecord}
                                  className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                                  title="Next Record"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={toggleExcludeRecord}
                                  className={`p-1 rounded-full ${
                                    excludedRecords.has(currentRecordIndex)
                                      ? 'bg-red-100 hover:bg-red-200 text-red-700'
                                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                  }`}
                                  title={excludedRecords.has(currentRecordIndex) ? "Include Record" : "Exclude Record"}
                                >
                                  {excludedRecords.has(currentRecordIndex) ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l3.293-3.293-3.293-3.293a1 1 0 011.414-1.414L10 6.586l3.293-3.293a1 1 0 011.414 1.414L11.414 8l3.293 3.293a1 1 0 010 1.414z" clipRule="evenodd" />
                                    </svg>
                                  ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
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
                            {entityFields.map((field) => (
                              <FieldItem
                                key={field}
                                field={field}
                                value={mappedData[field]}
                                onDrop={handleFieldMapping}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Preview of Mapped Data */}
                    {selectedEntityType && Object.keys(mappedData).length > 0 && (
                      <div className="mt-4 border rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3">Preview</h4>
                        <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto max-h-40">
                          {JSON.stringify(mappedData, null, 2)}
                        </pre>
                      </div>
                    )}

                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                      {dataToImport.length > 1 && (
                        <button
                          type="button"
                          className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm ${
                            selectedEntityType && Object.keys(fieldMapping).length > 0 && !isSaving && !importCompleted
                              ? 'bg-green-600 hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600'
                              : importCompleted 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-green-400 cursor-not-allowed'
                          }`}
                          onClick={handleBatchImport}
                          disabled={!selectedEntityType || Object.keys(fieldMapping).length === 0 || isSaving || importCompleted}
                        >
                          {isSaving 
                            ? importProgress 
                              ? `Importing... (${importProgress.current}/${importProgress.total})` 
                              : 'Preparing import...'
                            : importCompleted
                              ? `Import Complete (${dataToImport.length - excludedRecords.size} records)`
                              : `Batch Import (${dataToImport.length - excludedRecords.size} of ${dataToImport.length} items)`
                          }
                        </button>
                      )}
                      <button
                        type="button"
                        className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm ${
                          selectedEntityType && Object.keys(mappedData).length > 0 && !isSaving
                            ? 'bg-indigo-600 hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                            : 'bg-indigo-400 cursor-not-allowed'
                        }`}
                        onClick={handleSaveToDatabase}
                        disabled={!selectedEntityType || Object.keys(mappedData).length === 0 || isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save to Database'}
                      </button>
                      <button
                        type="button"
                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                        onClick={onClose}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </DndProvider>
  );
};

export default SportDataMapper; 