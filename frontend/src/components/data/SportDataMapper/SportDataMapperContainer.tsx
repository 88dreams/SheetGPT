import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Import utility functions
import {
  ENTITY_TYPES,
  detectEntityType,
  validateEntityData,
  mapToDatabaseFieldNames,
  enhancedMapToDatabaseFieldNames,
  isEntityTypeValid,
  getEntityTypeDisplayName,
  getFieldValue,
  formatFieldValueForDisplay,
  getEntityTypeColorClass,
  calculateMappingStats
} from '../../../utils/sportDataMapper';

import { EntityType as MapperEntityType } from '../../../utils/sportDataMapper/entityTypes';

// Import components
import {
  EntityTypeSelector,
  ViewModeSelector,
  RecordNavigation,
  FieldMappingArea,
  GlobalMappingView,
  ActionButtons,
  Notification,
  GuidedWalkthrough
} from './components';

// Import custom hooks
import { useFieldMapping, useRecordNavigation, useImportProcess, useUiState, useDataManagement } from './hooks';

// Import API services
import { api } from '../../../utils/api';
import sportsDatabaseService, { EntityType as DbEntityType } from '../../../services/SportsDatabaseService';

// Define props interface
interface SportDataMapperProps {
  isOpen: boolean;
  onClose: () => void;
  structuredData: any;
}

const SportDataMapperContainer: React.FC<SportDataMapperProps> = ({ isOpen, onClose, structuredData }) => {
  // Use custom hooks for state management
  const {
    mappingsByEntityType,
    selectedEntityType,
    setSelectedEntityType,
    handleFieldMapping,
    clearMappings,
    removeMapping,
    getCurrentMappings
  } = useFieldMapping(structuredData);
  
  const {
    dataToImport,
    sourceFields,
    sourceFieldValues,
    mappedData,
    extractSourceFields: hookExtractSourceFields,
    updateMappedDataForEntityType: hookUpdateMappedDataForEntityType,
    updateSourceFieldValues,
    updateMappedDataForField,
    clearMappedData
  } = useDataManagement();
  
  const {
    currentRecordIndex,
    totalRecords,
    includedRecordsCount,
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
    setShowFieldHelp,
    validStructuredData,
    setDataValidity,
    showHelpForField,
    hideFieldHelp
  } = useUiState();
  
  // Local state
  const [suggestedEntityType, setSuggestedEntityType] = useState<MapperEntityType | null>(null);
  const [leagueAndStadiumExist, setLeagueAndStadiumExist] = useState<boolean>(false);
  
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
  
  // Extract source fields from structured data
  const extractSourceFields = (data: any) => {
    console.log('SportDataMapperContainer: Extracting source fields from data:', data);
    
    // Create a properly formatted data object for the hook
    let formattedData = data;
    
    // If data is in the format {"headers": [...], "rows": [...]}
    if (data && data.headers && data.rows) {
      console.log('SportDataMapperContainer: Data has headers and rows format');
      
      // Create objects from rows using headers as keys
      if (Array.isArray(data.rows) && Array.isArray(data.headers)) {
        const processedRows = data.rows.map((row: any[]) => {
          const rowObj: Record<string, any> = {};
          data.headers.forEach((header: string, index: number) => {
            rowObj[header] = row[index];
          });
          return rowObj;
        });
        
        formattedData = {
          headers: data.headers,
          rows: processedRows
        };
        
        console.log('SportDataMapperContainer: Processed rows with headers:', processedRows);
      }
    }
    
    // Pass the formatted data to the hook
    hookExtractSourceFields(formattedData, setDataValidity);
  };
  
  // Initialize data when the component mounts or structuredData changes
  useEffect(() => {
    if (structuredData) {
      extractSourceFields(structuredData);
    }
  }, [structuredData]);
  
  // Update mapped data when entity type changes
  const updateMappedDataForEntityType = (entityType: MapperEntityType) => {
    hookUpdateMappedDataForEntityType(entityType, mappingsByEntityType, currentRecordIndex);
  };
  
  // Update source field values when current record changes
  useEffect(() => {
    if (currentRecordIndex !== null) {
      updateSourceFieldValues(currentRecordIndex);
      console.log('Updated source field values for record index:', currentRecordIndex);
      console.log('Source field values:', sourceFieldValues);
    }
  }, [currentRecordIndex, updateSourceFieldValues]);
  
  // Update mapped data when entity type or current record changes
  useEffect(() => {
    if (selectedEntityType) {
      updateMappedDataForEntityType(selectedEntityType);
    }
  }, [selectedEntityType, currentRecordIndex, mappingsByEntityType]);
  
  // Wrapper functions to update UI state when using hook functions
  const goToNextRecord = () => {
    hookGoToNextRecord();
    if (currentRecordIndex !== null && dataToImport.length > 0) {
      const nextIndex = (currentRecordIndex + 1) % dataToImport.length;
      updateSourceFieldValues(nextIndex);
    }
  };
  
  // Handle entity type selection
  const handleEntityTypeSelect = (entityType: MapperEntityType) => {
    setSelectedEntityType(entityType);
    updateMappedDataForEntityType(entityType);
  };
  
  // Handle field mapping
  const handleFieldMappingDrop = (sourceField: string, targetField: string) => {
    handleFieldMapping(sourceField, targetField);
    updateMappedDataForField(sourceField, targetField, currentRecordIndex);
  };
  
  // Handle save to database
  const handleSaveToDatabase = async () => {
    if (!selectedEntityType) return;
    
    // Get the current mappings for the selected entity type
    const currentMappings = mappingsByEntityType[selectedEntityType] || {};
    
    const success = await saveToDatabase(
      selectedEntityType,
      currentMappings,  // Use the mappings from useFieldMapping instead of mappedData
      currentRecordIndex !== null ? dataToImport[currentRecordIndex] : undefined
    );
    
    if (success) {
      // If we just saved a league or stadium, update the leagueAndStadiumExist state
      if (selectedEntityType === 'league' || selectedEntityType === 'stadium') {
        setLeagueAndStadiumExist(true);
      }
      goToNextRecord();
    }
  };
  
  // Handle batch import
  const handleBatchImport = async () => {
    if (!selectedEntityType) return;
    
    const includedRecords = getIncludedRecords();
    const mappings = getCurrentMappings();
    
    await batchImport(selectedEntityType, mappings, includedRecords);
    
    // If we just imported leagues or stadiums, update the leagueAndStadiumExist state
    if (selectedEntityType === 'league' || selectedEntityType === 'stadium') {
      setLeagueAndStadiumExist(true);
    }
  };
  
  // Detect entity type from data
  useEffect(() => {
    if (dataToImport.length > 0 && sourceFields.length > 0) {
      const detectedType = detectEntityType(dataToImport[0], sourceFields);
      if (detectedType) {
        setSuggestedEntityType(detectedType);
      }
    }
  }, [dataToImport, sourceFields]);

  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-10 overflow-y-auto"
    >
      <div className="flex min-h-screen items-center justify-center">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white rounded-lg w-full max-w-7xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-2 border-b sticky top-0 bg-white z-10">
              <Dialog.Title className="text-base font-medium text-gray-900">
                Data Mapper
              </Dialog.Title>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 p-6">
              {!validStructuredData ? (
                <div className="bg-red-50 border border-red-300 rounded-md p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Invalid Data Format</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>
                          The data provided is not in a valid format for mapping. Please ensure your data is structured as an array of objects or a table with headers.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Entity View */}
                  {viewMode === 'entity' && (
                    <div>
                      {/* Entity Type Selector */}
                      <EntityTypeSelector
                        selectedEntityType={selectedEntityType}
                        onEntityTypeSelect={handleEntityTypeSelect}
                        suggestedEntityType={suggestedEntityType}
                        leagueAndStadiumExist={leagueAndStadiumExist}
                      />
                      
                      {/* View Mode Selector - Moved here and centered */}
                      <div className="flex justify-center mb-4">
                        <ViewModeSelector 
                          viewMode={viewMode}
                          onViewModeChange={setViewMode}
                        />
                      </div>
                      
                      {selectedEntityType && (
                        <div>
                          {/* Field Mapping Area */}
                          <DndProvider backend={HTML5Backend}>
                            <FieldMappingArea
                              selectedEntityType={selectedEntityType}
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
                            />
                          </DndProvider>
                          
                          {/* Action Buttons */}
                          <ActionButtons
                            selectedEntityType={selectedEntityType}
                            isSaving={isSaving}
                            isBatchImporting={isBatchImporting}
                            onSaveToDatabase={handleSaveToDatabase}
                            onBatchImport={handleBatchImport}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Field View */}
                  {viewMode === 'field' && (
                    <div>
                      {/* View Mode Selector - Centered */}
                      <div className="flex justify-center mb-4">
                        <ViewModeSelector 
                          viewMode={viewMode}
                          onViewModeChange={setViewMode}
                        />
                      </div>
                      
                      {/* Field view implementation */}
                      <p>Field view is not implemented yet.</p>
                    </div>
                  )}
                  
                  {/* Global View */}
                  {viewMode === 'global' && (
                    <div>
                      {/* View Mode Selector - Centered */}
                      <div className="flex justify-center mb-4">
                        <ViewModeSelector 
                          viewMode={viewMode}
                          onViewModeChange={setViewMode}
                        />
                      </div>
                      
                      <GlobalMappingView
                        mappingsByEntityType={mappingsByEntityType}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Notification */}
            <Notification notification={notification} />
            
            {/* Guided Walkthrough */}
            <GuidedWalkthrough
              showGuidedWalkthrough={showGuidedWalkthrough}
              setShowGuidedWalkthrough={setShowGuidedWalkthrough}
              guidedStep={guidedStep}
              setGuidedStep={setGuidedStep}
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default SportDataMapperContainer; 