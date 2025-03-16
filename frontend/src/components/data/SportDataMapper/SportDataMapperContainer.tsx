import React, { useState, useEffect } from 'react';
import { detectEntityType } from '../../../utils/sportDataMapper';
import { EntityType as MapperEntityType } from '../../../utils/sportDataMapper/entityTypes';

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

// Import utilities
import { extractSourceFields } from './utils/dataProcessor';

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
    extractSourceFields: hookExtractSourceFields,
    updateMappedDataForEntityType: hookUpdateMappedDataForEntityType,
    updateSourceFieldValues,
    updateMappedDataForField
  } = useDataManagement();
  
  const {
    currentRecordIndex,
    totalRecords,
    goToNextRecord: hookGoToNextRecord,
    goToPreviousRecord,
    toggleExcludeRecord,
    isCurrentRecordExcluded,
    getIncludedRecords
  } = useRecordNavigation(dataToImport);
  
  const {
    isSaving,
    isBatchImporting,
    notification,
    saveToDatabase,
    batchImport
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
  
  // Check if League and Stadium data exist
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
        console.log(`League and Stadium data exist: ${hasLeagues && hasStadiums} (Leagues: ${leagueResponse.total}, Stadiums: ${stadiumResponse.total})`);
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
      extractSourceFields(structuredData, hookExtractSourceFields, setDataValidity);
    }
  }, [structuredData, hookExtractSourceFields, setDataValidity]);
  
  // Update mapped data when entity type changes
  const updateMappedDataForEntityType = (entityType: MapperEntityType) => {
    hookUpdateMappedDataForEntityType(entityType, mappingsByEntityType, currentRecordIndex);
  };
  
  // Update source field values when current record changes
  useEffect(() => {
    if (currentRecordIndex !== null) {
      updateSourceFieldValues(currentRecordIndex);
    }
  }, [currentRecordIndex, updateSourceFieldValues]);
  
  // Update mapped data when entity type or current record changes
  useEffect(() => {
    if (selectedEntityType) {
      updateMappedDataForEntityType(selectedEntityType);
    }
  }, [selectedEntityType, currentRecordIndex, mappingsByEntityType]);
  
  // Detect entity type from data
  useEffect(() => {
    if (dataToImport.length > 0 && sourceFields.length > 0) {
      const detectedType = detectEntityType(dataToImport[0], sourceFields);
      if (detectedType) {
        setSuggestedEntityType(detectedType);
      }
    }
  }, [dataToImport, sourceFields]);
  
  // Handle functions
  const goToNextRecord = () => {
    hookGoToNextRecord();
    if (currentRecordIndex !== null && dataToImport.length > 0) {
      const nextIndex = (currentRecordIndex + 1) % dataToImport.length;
      updateSourceFieldValues(nextIndex);
    }
  };
  
  const handleEntityTypeSelect = (entityType: MapperEntityType) => {
    setSelectedEntityType(entityType);
    updateMappedDataForEntityType(entityType);
  };
  
  const handleFieldMappingDrop = (sourceField: string, targetField: string) => {
    handleFieldMapping(sourceField, targetField);
    updateMappedDataForField(sourceField, targetField, currentRecordIndex);
  };
  
  const handleSaveToDatabase = async () => {
    if (!selectedEntityType) return;
    
    const currentMappings = mappingsByEntityType[selectedEntityType] || {};
    
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
  };
  
  const handleBatchImport = async () => {
    if (!selectedEntityType) return;
    
    const includedRecords = getIncludedRecords();
    const mappings = getCurrentMappings();
    
    await batchImport(selectedEntityType, mappings, includedRecords, isUpdateMode);
    
    if (selectedEntityType === 'league' || selectedEntityType === 'stadium') {
      setLeagueAndStadiumExist(true);
    }
  };

  // Render the component
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
                selectedEntityType={selectedEntityType}
                onEntityTypeSelect={handleEntityTypeSelect}
                suggestedEntityType={suggestedEntityType}
                leagueAndStadiumExist={leagueAndStadiumExist}
                isUpdateMode={isUpdateMode}
                setIsUpdateMode={setIsUpdateMode}
                sourceFields={sourceFields}
                sourceFieldValues={sourceFieldValues}
                mappingsByEntityType={mappingsByEntityType}
                showFieldHelp={showFieldHelp}
                onFieldMapping={handleFieldMappingDrop}
                onRemoveMapping={removeMapping}
                onShowFieldHelp={showHelpForField}
                onHideFieldHelp={hideFieldHelp}
                currentRecordIndex={currentRecordIndex}
                totalRecords={totalRecords}
                onPreviousRecord={goToPreviousRecord}
                onNextRecord={goToNextRecord}
                onToggleExcludeRecord={toggleExcludeRecord}
                isCurrentRecordExcluded={isCurrentRecordExcluded()}
                isSaving={isSaving}
                isBatchImporting={isBatchImporting}
                onSaveToDatabase={handleSaveToDatabase}
                onBatchImport={handleBatchImport}
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
                sourceFieldValues={sourceFieldValues}
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
      <Notification notification={notification} />
      
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

export default SportDataMapperContainer; 