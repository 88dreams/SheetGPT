import React, { useEffect } from 'react';
import { detectEntityType } from '../../../../utils/sportDataMapper';
import { EntityType as MapperEntityType } from '../../../../utils/sportDataMapper/entityTypes';

// Import hooks with proper dependency management
import {
  useDataManagement,
  useFieldMapping,
  useImportProcess,
  useNotifications,
  useRecordNavigation,
  useUiState
} from './hooks';

// Import existing components
import {
  DialogContainer,
  EntityView,
  ViewModeSelectorContainer,
  FieldView,
  GlobalMappingView,
  Notification,
  GuidedWalkthrough,
  InvalidDataView
} from '../components';

// Import API services
import sportsDatabaseService, { EntityType as DbEntityType } from '../../../../services/SportsDatabaseService';

// Define props interface
interface SportDataMapperV2Props {
  isOpen: boolean;
  onClose: () => void;
  structuredData: any;
}

/**
 * SportDataMapperV2 - Refactored container component with proper hook separation
 * 
 * This component demonstrates how to use the refactored hooks that follow
 * single responsibility principle and avoid circular dependencies.
 */
const SportDataMapperV2: React.FC<SportDataMapperV2Props> = ({ 
  isOpen, 
  onClose, 
  structuredData 
}) => {
  // Initialize UI state hook first (no dependencies)
  const uiState = useUiState();
  
  // Initialize notification hook (no dependencies)
  const notifications = useNotifications();
  
  // Initialize data management hook (no dependencies on other hooks)
  const dataManagement = useDataManagement();
  
  // Initialize field mapping hook (depends only on selected entity type)
  const fieldMapping = useFieldMapping();
  
  // Initialize record navigation hook (depends on dataToImport from dataManagement)
  const recordNavigation = useRecordNavigation(dataManagement.dataToImport);
  
  // Initialize import process hook (depends on notifications)
  const importProcess = useImportProcess(notifications);
  
  // Local state using React useState for component-specific state
  const [suggestedEntityType, setSuggestedEntityType] = React.useState<MapperEntityType | null>(null);
  const [leagueAndStadiumExist, setLeagueAndStadiumExist] = React.useState<boolean>(false);
  
  // Check if League and Stadium data exist (side effect)
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
      // Only initialize the data on first load, not on every structuredData change
      if (dataManagement.dataToImport.length === 0) {
        console.log('Initializing data for the first time');
        dataManagement.extractSourceFields(structuredData, uiState.setDataValidity);
      }
    }
  }, [
    structuredData, 
    dataManagement.dataToImport.length, 
    dataManagement.extractSourceFields, 
    uiState.setDataValidity
  ]);
  
  // Update mapped data when entity type changes
  useEffect(() => {
    if (fieldMapping.selectedEntityType) {
      dataManagement.updateMappedData(
        fieldMapping.selectedEntityType, 
        fieldMapping.currentMappings, 
        recordNavigation.currentRecordIndex
      );
    }
  }, [
    fieldMapping.selectedEntityType, 
    fieldMapping.currentMappings, 
    recordNavigation.currentRecordIndex, 
    dataManagement.updateMappedData
  ]);
  
  // Update source field values when current record changes
  useEffect(() => {
    // Skip if no data
    if (dataManagement.dataToImport.length === 0) {
      console.log('No data to import, skipping source field update');
      return;
    }
    
    // Update source field values immediately
    dataManagement.updateSourceFieldValues(recordNavigation.currentRecordIndex);
  }, [
    recordNavigation.currentRecordIndex, 
    dataManagement.dataToImport.length, 
    dataManagement.updateSourceFieldValues
  ]);
  
  // Detect entity type from data
  useEffect(() => {
    if (dataManagement.dataToImport.length > 0 && dataManagement.sourceFields.length > 0) {
      const detectedType = detectEntityType(dataManagement.dataToImport[0], dataManagement.sourceFields);
      if (detectedType) {
        setSuggestedEntityType(detectedType);
      }
    }
  }, [dataManagement.dataToImport, dataManagement.sourceFields]);
  
  // Event handlers
  const handleEntityTypeSelect = (entityType: MapperEntityType) => {
    fieldMapping.setSelectedEntityType(entityType);
    dataManagement.updateMappedData(
      entityType, 
      fieldMapping.currentMappings, 
      recordNavigation.currentRecordIndex
    );
  };
  
  const handleFieldMappingDrop = (sourceField: string, targetField: string) => {
    fieldMapping.handleFieldMapping(sourceField, targetField);
    dataManagement.updateMappedField(
      sourceField, 
      targetField, 
      recordNavigation.currentRecordIndex
    );
  };
  
  const handleSaveToDatabase = async () => {
    if (!fieldMapping.selectedEntityType) return;
    
    const success = await importProcess.saveToDatabase(
      fieldMapping.selectedEntityType,
      fieldMapping.currentMappings,
      recordNavigation.currentRecord,
      uiState.isEntityUpdateMode
    );
    
    if (success) {
      if (fieldMapping.selectedEntityType === 'league' || fieldMapping.selectedEntityType === 'stadium') {
        setLeagueAndStadiumExist(true);
      }
      recordNavigation.goToNextRecord();
    }
  };
  
  const handleBatchImport = async () => {
    if (!fieldMapping.selectedEntityType) return;
    
    await importProcess.batchImport(
      fieldMapping.selectedEntityType,
      fieldMapping.currentMappings,
      recordNavigation.includedRecords,
      uiState.isEntityUpdateMode
    );
    
    if (fieldMapping.selectedEntityType === 'league' || fieldMapping.selectedEntityType === 'stadium') {
      setLeagueAndStadiumExist(true);
    }
  };

  // Render the component
  return (
    <DialogContainer
      isOpen={isOpen} 
      onClose={onClose}
      title="Data Mapper v2"
    >
      {!uiState.validStructuredData ? (
        <InvalidDataView />
      ) : (
        <div>
          {/* Entity View */}
          {uiState.viewMode === 'entity' && (
            <div>
              <EntityView
                selectedEntityType={fieldMapping.selectedEntityType}
                onEntityTypeSelect={handleEntityTypeSelect}
                suggestedEntityType={suggestedEntityType}
                leagueAndStadiumExist={leagueAndStadiumExist}
                isUpdateMode={uiState.isEntityUpdateMode}
                setIsUpdateMode={uiState.setIsEntityUpdateMode}
                sourceFields={dataManagement.sourceFields}
                sourceFieldValues={dataManagement.sourceFieldValues}
                mappingsByEntityType={fieldMapping.mappingsByEntityType}
                showFieldHelp={uiState.showFieldHelp}
                onFieldMapping={handleFieldMappingDrop}
                onRemoveMapping={fieldMapping.removeMapping}
                onShowFieldHelp={uiState.showHelpForField}
                onHideFieldHelp={uiState.hideFieldHelp}
                currentRecordIndex={recordNavigation.currentRecordIndex}
                totalRecords={recordNavigation.totalRecords}
                onPreviousRecord={recordNavigation.goToPreviousRecord}
                onNextRecord={recordNavigation.goToNextRecord}
                onToggleExcludeRecord={recordNavigation.toggleExcludeRecord}
                isCurrentRecordExcluded={recordNavigation.isCurrentRecordExcluded}
                isSaving={importProcess.isSaving}
                isBatchImporting={importProcess.isBatchImporting}
                onSaveToDatabase={handleSaveToDatabase}
                onBatchImport={handleBatchImport}
                onSendToData={onClose} // Use the onClose prop as onSendToData
              />
              
              <ViewModeSelectorContainer 
                viewMode={uiState.viewMode}
                onViewModeChange={uiState.setViewMode}
              />
            </div>
          )}
          
          {/* Field View */}
          {uiState.viewMode === 'field' && (
            <div>
              <ViewModeSelectorContainer 
                viewMode={uiState.viewMode}
                onViewModeChange={uiState.setViewMode}
              />
              
              <FieldView
                mappingsByEntityType={fieldMapping.mappingsByEntityType}
                sourceFields={dataManagement.sourceFields}
                sourceFieldValues={dataManagement.sourceFieldValues}
              />
            </div>
          )}
          
          {/* Global View */}
          {uiState.viewMode === 'global' && (
            <div>
              <ViewModeSelectorContainer 
                viewMode={uiState.viewMode}
                onViewModeChange={uiState.setViewMode}
              />
              
              <GlobalMappingView
                mappingsByEntityType={fieldMapping.mappingsByEntityType}
              />
            </div>
          )}
        </div>
      )}
      
      {/* Notification */}
      <Notification 
        notification={notifications.notification} 
        onClose={notifications.clearNotification} 
      />
      
      {/* Guided Walkthrough */}
      <GuidedWalkthrough
        showGuidedWalkthrough={uiState.showGuidedWalkthrough}
        setShowGuidedWalkthrough={uiState.setShowGuidedWalkthrough}
        guidedStep={uiState.guidedStep}
        setGuidedStep={uiState.setGuidedStep}
      />
    </DialogContainer>
  );
};

export default SportDataMapperV2;