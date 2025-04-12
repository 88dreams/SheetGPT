import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { detectEntityType } from '../../../utils/sportDataMapper';
import { EntityType as MapperEntityType } from '../../../utils/sportDataMapper/entityTypes';
import { fingerprint, createMemoEqualityFn } from '../../../utils/fingerprint';
import { withMemo } from '../../../utils/memoization';
import { relationshipLoader } from '../../../utils/relationshipLoader';

// Import components
import {
  DialogContainer,
  EntityView,
  ViewModeSelectorContainer,
  FieldView,
  GlobalMappingView,
  Notification,
  GuidedWalkthrough,
  InvalidDataView
} from './components';

// Import custom hooks
import { 
  useFieldMapping, 
  useRecordNavigation, 
  useImportProcess, 
  useUiState, 
  useDataManagement 
} from './hooks';

// Import API services
import sportsDatabaseService, { EntityType as DbEntityType } from '../../../services/SportsDatabaseService';

// Define props interface
interface SportDataMapperProps {
  isOpen: boolean;
  onClose: () => void;
  structuredData: any;
}

/**
 * Container component for the Sport Data Mapper functionality
 * Allows mapping data from various formats to sports database entities
 * Optimized with fingerprinting and memoization for better performance
 */
const SportDataMapperContainer: React.FC<SportDataMapperProps> = ({ isOpen, onClose, structuredData }) => {
  // Use custom hooks for state management
  const {
    mappingsByEntityType,
    selectedEntityType,
    setSelectedEntityType,
    handleFieldMapping,
    removeMapping,
    getCurrentMappings
  } = useFieldMapping();
  
  const {
    dataToImport,
    sourceFields,
    sourceFieldValues,
    extractSourceFields,
    updateMappedDataForEntityType: hookUpdateMappedDataForEntityType,
    updateSourceFieldValues,
    updateMappedDataForField
  } = useDataManagement();
  
  const {
    currentRecordIndex,
    setCurrentRecordIndex,
    totalRecords,
    goToNextRecord: hookGoToNextRecord,
    goToPreviousRecord,
    toggleExcludeRecord,
    isCurrentRecordExcluded,
    getIncludedRecords,
    stats: navigationStats
  } = useRecordNavigation(dataToImport);
  
  const {
    isSaving,
    isBatchImporting,
    notification,
    saveToDatabase,
    batchImport,
    clearNotification
  } = useImportProcess();
  
  const {
    viewMode,
    setViewMode,
    showGuidedWalkthrough,
    setShowGuidedWalkthrough,
    guidedStep,
    setGuidedStep,
    showFieldHelp,
    validStructuredData,
    setDataValidity,
    showHelpForField,
    hideFieldHelp
  } = useUiState();
  
  // Local state
  const [suggestedEntityType, setSuggestedEntityType] = useState<MapperEntityType | null>(null);
  const [leagueAndStadiumExist, setLeagueAndStadiumExist] = useState<boolean>(false);
  const [isUpdateMode, setIsUpdateMode] = useState<boolean>(false);
  
  // Memoize common data entities for improved performance
  useEffect(() => {
    // Load common entity data for form selections
    const preloadEntityData = async () => {
      try {
        await relationshipLoader.preloadEntitySet('FORM_BASICS');
      } catch (error) {
        console.error('Error preloading entity data:', error);
      }
    };
    
    preloadEntityData();
  }, []);
  
  // Check if League and Stadium data exist with optimized API calls
  useEffect(() => {
    const checkLeagueAndStadiumData = async () => {
      try {
        // Fetch league and stadium counts
        const leagueResponse = await sportsDatabaseService.getEntities({ 
          entityType: 'league' as unknown as DbEntityType,
          limit: 1
        });
        const stadiumResponse = await sportsDatabaseService.getEntities({ 
          entityType: 'stadium' as unknown as DbEntityType,
          limit: 1
        });
        
        // Check total counts from paginated responses
        const hasLeagues = leagueResponse && leagueResponse.total > 0;
        const hasStadiums = stadiumResponse && stadiumResponse.total > 0;
        
        setLeagueAndStadiumExist(hasLeagues && hasStadiums);
      } catch (error) {
        console.error('Error checking League and Stadium data:', error);
        setLeagueAndStadiumExist(false);
      }
    };
    
    checkLeagueAndStadiumData();
  }, []);
  
  // Initialize data when the component mounts or structuredData changes
  useEffect(() => {
    if (structuredData) {
      console.log('SportDataMapperContainer: Initializing with structured data', {
        structuredData,
        currentDataLength: dataToImport.length
      });
      
      // Force initialization regardless of dataToImport length to debug
      // But only if we haven't already loaded data
      if (dataToImport.length === 0) {
        extractSourceFields(structuredData, setDataValidity);
      }
    }
  }, [structuredData, extractSourceFields, setDataValidity, dataToImport.length]);
  
  // Separate effect for setting the initial record index
  // This prevents circular dependency with dataToImport
  useEffect(() => {
    // If we have data but no current record index, set it to 0
    if (dataToImport.length > 0 && currentRecordIndex === null) {
      console.log('SportDataMapperContainer: Setting initial record index to 0');
      setCurrentRecordIndex(0);
    }
  }, [dataToImport.length, currentRecordIndex, setCurrentRecordIndex]);
  
  // Memoize the update function to prevent recreation on every render
  const updateMappedDataForEntityType = useCallback((entityType: MapperEntityType) => {
    hookUpdateMappedDataForEntityType(entityType, mappingsByEntityType, currentRecordIndex);
  }, [hookUpdateMappedDataForEntityType, mappingsByEntityType, currentRecordIndex]);
  
  // Use memoized dependencies for source field updates
  const memoizedDataLength = useMemo(() => dataToImport.length, [dataToImport.length]);
  const memoizedSourceFieldValues = useMemo(
    () => sourceFieldValues, 
    [createMemoEqualityFn(sourceFieldValues)]
  );
  
  // Simple, focused update of source field values when record changes
  useEffect(() => {
    // Skip if no data available
    if (dataToImport.length === 0) {
      return;
    }
    
    // Just update source field values when record index changes
    if (currentRecordIndex !== null && currentRecordIndex >= 0 && currentRecordIndex < dataToImport.length) {
      // Update source field values directly from current record index
      updateSourceFieldValues(currentRecordIndex);
    }
  }, [currentRecordIndex, dataToImport, updateSourceFieldValues]);
  
  // Update mapped data when entity type or current record changes
  useEffect(() => {
    if (selectedEntityType) {
      updateMappedDataForEntityType(selectedEntityType);
    }
  }, [selectedEntityType, currentRecordIndex, updateMappedDataForEntityType]);
  
  // Detect entity type from data with optimized dependency tracking
  useEffect(() => {
    if (dataToImport.length > 0 && sourceFields.length > 0) {
      const detectedType = detectEntityType(dataToImport[0], sourceFields);
      if (detectedType && suggestedEntityType !== detectedType) {
        setSuggestedEntityType(detectedType);
      }
    }
  }, [fingerprint(dataToImport[0] || {}), fingerprint(sourceFields), suggestedEntityType]);
  
  // Use the hook's navigation functions directly with memoization
  const goToNextRecord = useMemo(() => hookGoToNextRecord, [hookGoToNextRecord]);
  
  // Optimized handler for entity type selection
  const handleEntityTypeSelect = useCallback((entityType: MapperEntityType) => {
    setSelectedEntityType(entityType);
    
    // Special auto-mapping for Stadium entity when selecting it
    if (entityType === 'stadium' && currentRecordIndex !== null && dataToImport.length > 0) {
      console.log('SportDataMapperContainer: Auto-mapping fields for Stadium entity');
      
      try {
        // Get the current record data
        const recordIndex = currentRecordIndex;
        const record = dataToImport[recordIndex];
        
        // Safely handle both array and object record types
        let rawArray = null;
        
        // If record is directly an array with at least 5 elements (Indianapolis Motor Speedway format)
        if (Array.isArray(record) && record.length >= 5) {
          console.log('SportDataMapperContainer: Detected direct array format for Indianapolis Motor Speedway');
          rawArray = [...record]; // Create a safe copy
        } 
        // If record is an object, check for special keys
        else if (record && typeof record === 'object') {
          console.log('SportDataMapperContainer: Checking record object for Indianapolis Motor Speedway format');
          
          // Check if there's a nested array
          for (const key in record) {
            if (Array.isArray(record[key]) && record[key].length >= 5) {
              rawArray = [...record[key]]; // Create a safe copy
              console.log('SportDataMapperContainer: Found nested array in key', key);
              break;
            }
          }
          
          // If no array found, check for numeric keys (0, 1, 2, etc.)
          if (!rawArray && record['0'] !== undefined && record['2'] !== undefined && 
              record['3'] !== undefined && record['4'] !== undefined) {
            
            // Build the array from numeric keys
            rawArray = [];
            for (let i = 0; i < 10; i++) {
              const key = i.toString();
              if (record[key] !== undefined) {
                rawArray.push(record[key]);
              }
            }
            console.log('SportDataMapperContainer: Constructed array from numeric keys', rawArray);
          }
        }
        
        // If we found a valid Indianapolis Motor Speedway format array, map the fields
        if (rawArray && Array.isArray(rawArray) && rawArray.length >= 5) {
          console.log('SportDataMapperContainer: Detected Indianapolis Motor Speedway format with fields', rawArray);
          
          // Map name from position 0
          if (rawArray[0]) {
            try {
              console.log('SportDataMapperContainer: Mapping name field from position 0');
              handleFieldMapping('0', 'name');
              console.log('SportDataMapperContainer: Auto-mapped name from position 0:', rawArray[0]);
            } catch (error) {
              console.error('Error mapping name field:', error);
            }
          }
          
          // Map city from position 2
          if (rawArray[2]) {
            try {
              console.log('SportDataMapperContainer: Mapping city field from position 2');
              handleFieldMapping('2', 'city');
              console.log('SportDataMapperContainer: Auto-mapped city from position 2:', rawArray[2]);
            } catch (error) {
              console.error('Error mapping city field:', error);
            }
          }
          
          // Map state from position 3
          if (rawArray[3]) {
            try {
              console.log('SportDataMapperContainer: Mapping state field from position 3');
              handleFieldMapping('3', 'state');
              console.log('SportDataMapperContainer: Auto-mapped state from position 3:', rawArray[3]);
            } catch (error) {
              console.error('Error mapping state field:', error);
            }
          }
          
          // Map country from position 4
          if (rawArray[4]) {
            try {
              console.log('SportDataMapperContainer: Mapping country field from position 4');
              handleFieldMapping('4', 'country');
              console.log('SportDataMapperContainer: Auto-mapped country from position 4:', rawArray[4]);
            } catch (error) {
              console.error('Error mapping country field:', error);
            }
          }
          
          // Map capacity from position 5 if available
          if (rawArray[5]) {
            try {
              console.log('SportDataMapperContainer: Mapping capacity field from position 5');
              handleFieldMapping('5', 'capacity');
              console.log('SportDataMapperContainer: Auto-mapped capacity from position 5:', rawArray[5]);
            } catch (error) {
              console.error('Error mapping capacity field:', error);
            }
          }
        } else {
          console.log('SportDataMapperContainer: No Indianapolis Motor Speedway format found in record', record);
        }
      } catch (error) {
        // Catch any errors to prevent the UI from breaking
        console.error('Error in auto-mapping stadium fields:', error);
      }
    }
  }, [setSelectedEntityType, currentRecordIndex, dataToImport, handleFieldMapping, updateMappedDataForField]);
  
  // Optimized handler for field mapping drop
  const handleFieldMappingDrop = useCallback((sourceField: string, targetField: string) => {
    handleFieldMapping(sourceField, targetField);
    updateMappedDataForField(sourceField, targetField, currentRecordIndex);
  }, [handleFieldMapping, updateMappedDataForField, currentRecordIndex]);
  
  // Optimized save to database function using memoization
  const handleSaveToDatabase = useCallback(async () => {
    if (!selectedEntityType) return;
    
    const currentMappings = getCurrentMappings();
    
    const success = await saveToDatabase(
      selectedEntityType,
      currentMappings,
      currentRecordIndex !== null ? dataToImport[currentRecordIndex] : undefined,
      isUpdateMode
    );
    
    if (success) {
      if (selectedEntityType === 'league' || selectedEntityType === 'stadium') {
        setLeagueAndStadiumExist(true);
      }
      goToNextRecord();
    }
  }, [selectedEntityType, getCurrentMappings, currentRecordIndex, dataToImport, isUpdateMode, saveToDatabase, goToNextRecord]);
  
  // Optimized batch import function using memoization
  const handleBatchImport = useCallback(async () => {
    if (!selectedEntityType) return;
    
    const includedRecords = getIncludedRecords();
    const mappings = getCurrentMappings();
    
    const success = await batchImport(selectedEntityType, mappings, includedRecords, isUpdateMode);
    
    if (success && (selectedEntityType === 'league' || selectedEntityType === 'stadium')) {
      setLeagueAndStadiumExist(true);
    }
  }, [selectedEntityType, getIncludedRecords, getCurrentMappings, isUpdateMode, batchImport]);
  
  // Memoize the component state for props to avoid unnecessary renders
  const entityViewProps = useMemo(() => ({
    selectedEntityType,
    suggestedEntityType,
    leagueAndStadiumExist,
    isUpdateMode,
    sourceFields,
    sourceFieldValues: memoizedSourceFieldValues,
    mappingsByEntityType,
    showFieldHelp,
    currentRecordIndex,
    totalRecords,
    isCurrentRecordExcluded: isCurrentRecordExcluded(),
    isSaving,
    isBatchImporting
  }), [
    selectedEntityType,
    suggestedEntityType,
    leagueAndStadiumExist,
    isUpdateMode,
    sourceFields,
    memoizedSourceFieldValues,
    fingerprint(mappingsByEntityType),
    showFieldHelp,
    currentRecordIndex,
    totalRecords,
    isCurrentRecordExcluded,
    isSaving,
    isBatchImporting
  ]);
  
  // Render the component with memoized sub-components
  return (
    <DialogContainer
      isOpen={isOpen} 
      onClose={onClose}
      title="Data Mapper"
    >
      {!validStructuredData ? (
        <InvalidDataView />
      ) : (
        <div>
          {/* Entity View */}
          {viewMode === 'entity' && (
            <div>
              <EntityView
                {...entityViewProps}
                onEntityTypeSelect={handleEntityTypeSelect}
                setIsUpdateMode={setIsUpdateMode}
                onFieldMapping={handleFieldMappingDrop}
                onRemoveMapping={removeMapping}
                onShowFieldHelp={showHelpForField}
                onHideFieldHelp={hideFieldHelp}
                onPreviousRecord={goToPreviousRecord}
                onNextRecord={goToNextRecord}
                onToggleExcludeRecord={toggleExcludeRecord}
                onSaveToDatabase={handleSaveToDatabase}
                onBatchImport={handleBatchImport}
                onSendToData={onClose} // Use the onClose prop as onSendToData
              />
              
              <ViewModeSelectorContainer 
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </div>
          )}
          
          {/* Field View */}
          {viewMode === 'field' && (
            <div>
              <ViewModeSelectorContainer 
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
              
              <FieldView
                mappingsByEntityType={mappingsByEntityType}
                sourceFields={sourceFields}
                sourceFieldValues={memoizedSourceFieldValues}
              />
            </div>
          )}
          
          {/* Global View */}
          {viewMode === 'global' && (
            <div>
              <ViewModeSelectorContainer 
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
              
              <GlobalMappingView
                mappingsByEntityType={mappingsByEntityType}
              />
            </div>
          )}
        </div>
      )}
      
      {/* Notification */}
      <Notification notification={notification} onClose={clearNotification} />
      
      {/* Guided Walkthrough */}
      <GuidedWalkthrough
        showGuidedWalkthrough={showGuidedWalkthrough}
        setShowGuidedWalkthrough={setShowGuidedWalkthrough}
        guidedStep={guidedStep}
        setGuidedStep={setGuidedStep}
      />
    </DialogContainer>
  );
};

// Apply memoization to the entire component for top-level optimization
export default withMemo(SportDataMapperContainer);