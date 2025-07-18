import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { detectEntityType } from '../../../utils/sportDataMapper';
import { EntityType } from '../../../types/sports';
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
import type { ImportResults } from './utils/batchProcessor';

// Import API services
import sportsDatabaseService from '../../../services/SportsDatabaseService';

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
    importResults,
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
  const [suggestedEntityType, setSuggestedEntityType] = useState<EntityType | null>(null);
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
          entityType: 'league' as unknown as EntityType,
          limit: 1
        });
        const stadiumResponse = await sportsDatabaseService.getEntities({ 
          entityType: 'stadium' as unknown as EntityType,
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
  const updateMappedDataForEntityType = useCallback((entityType: EntityType) => {
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
  
  // Simple entity type selection handler
  const handleEntityTypeSelect = useCallback((entityType: EntityType) => {
    // Just update the selected entity type
    setSelectedEntityType(entityType);
    console.log(`Selected entity type: ${entityType}`);
    
    // No special case handling - let the user map fields manually
  }, [setSelectedEntityType]);
  
  // Simple, direct field mapping handler
  const handleFieldMappingDrop = useCallback((sourceField: string, targetField: string) => {
    console.log(`Field mapping: "${sourceField}" → "${targetField}"`);
    
    // Update the field mapping in state
    handleFieldMapping(sourceField, targetField);
    
    // Update the mapped data with this new field mapping
    updateMappedDataForField(sourceField, targetField, currentRecordIndex);
    
    // Log the current state of mappings
    console.log(`Current mappings for ${selectedEntityType}:`, getCurrentMappings());
  }, [handleFieldMapping, updateMappedDataForField, currentRecordIndex, selectedEntityType, getCurrentMappings]);
  
  // Optimized save to database function using memoization
  const handleSaveToDatabase = useCallback(async (): Promise<void> => {
    if (!selectedEntityType) return;
    
    const currentMappings = getCurrentMappings();
    
    const success = await saveToDatabase(
      selectedEntityType,
      currentMappings,
      currentRecordIndex !== null ? dataToImport[currentRecordIndex] : undefined,
      isUpdateMode,
      sourceFields
    );
    
    if (success) {
      if (selectedEntityType === 'league' || selectedEntityType === 'stadium') {
        setLeagueAndStadiumExist(true);
      }
      const navigated = hookGoToNextRecord();
    }
  }, [selectedEntityType, getCurrentMappings, currentRecordIndex, dataToImport, isUpdateMode, saveToDatabase, hookGoToNextRecord, sourceFields]);
  
  // Effect to react to batch import completion via importResults state
  useEffect(() => {
    if (importResults && !isBatchImporting) { // Process results only when batch is done and results are available
      console.log('Batch import completed in container, results:', importResults);
      if (importResults.success > 0 && 
          (selectedEntityType === 'league' || selectedEntityType === 'stadium')) {
        setLeagueAndStadiumExist(true);
      }
      // Notifications are largely handled within useImportProcess, but further actions could be here.
    }
  }, [importResults, isBatchImporting, selectedEntityType, setLeagueAndStadiumExist]); // Added setLeagueAndStadiumExist
  
  // Optimized batch import function using memoization
  const handleBatchImport = useCallback(async () => {
    if (!selectedEntityType) return;
    
    const includedRecords = getIncludedRecords();
    const mappings = getCurrentMappings();
    
    // Call batchImport, results will be set in the importResults state by the hook
    await batchImport(selectedEntityType, mappings, includedRecords, isUpdateMode, sourceFields);
    // No need to handle resultsFromHook here, the useEffect above will react to importResults state change.

  }, [selectedEntityType, getIncludedRecords, getCurrentMappings, isUpdateMode, batchImport, sourceFields]);
  
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
                key={dataToImport.length}
                {...entityViewProps}
                onEntityTypeSelect={handleEntityTypeSelect}
                setIsUpdateMode={setIsUpdateMode}
                onFieldMapping={handleFieldMappingDrop}
                onRemoveMapping={removeMapping}
                onShowFieldHelp={showHelpForField}
                onHideFieldHelp={hideFieldHelp}
                onPreviousRecord={goToPreviousRecord}
                onNextRecord={hookGoToNextRecord}
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