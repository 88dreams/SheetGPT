import React, { useState, useEffect, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Import utility functions
import {
  EntityType,
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

// Import components
import FieldItem from './components/FieldItem';
import GuidedWalkthrough from './components/GuidedWalkthrough';
import FieldHelpTooltip from './components/FieldHelpTooltip';

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

/**
 * SportDataMapperContainer - Main component for mapping structured data to sports database entities
 */
const SportDataMapperContainer: React.FC<SportDataMapperProps> = ({ isOpen, onClose, structuredData }) => {
  // Use UI state hook
  const {
    viewMode,
    showGuidedWalkthrough,
    guidedStep,
    showFieldHelp,
    validStructuredData,
    setViewMode,
    setShowGuidedWalkthrough,
    setGuidedStep,
    setShowFieldHelp,
    setValidStructuredData,
    toggleViewMode,
    startGuidedWalkthrough,
    endGuidedWalkthrough,
    nextGuidedStep,
    previousGuidedStep,
    showHelpForField,
    hideFieldHelp,
    setDataValidity
  } = useUiState();
  
  // Use data management hook
  const {
    dataToImport,
    sourceFields,
    sourceFieldValues,
    mappedData,
    setDataToImport,
    setSourceFields,
    setSourceFieldValues,
    setMappedData,
    extractSourceFields: hookExtractSourceFields,
    updateMappedDataForEntityType: hookUpdateMappedDataForEntityType,
    updateSourceFieldValues,
    updateMappedDataForField,
    clearMappedData
  } = useDataManagement();
  
  // Use custom hooks
  const {
    mappingsByEntityType,
    selectedEntityType,
    setSelectedEntityType,
    handleFieldMapping: hookHandleFieldMapping,
    clearMappings,
    removeMapping,
    getCurrentMappings
  } = useFieldMapping();
  
  const {
    currentRecordIndex,
    totalRecords,
    includedRecordsCount,
    goToNextRecord: hookGoToNextRecord,
    goToPreviousRecord: hookGoToPreviousRecord,
    toggleExcludeRecord: hookToggleExcludeRecord,
    isCurrentRecordExcluded,
    getCurrentRecord,
    getIncludedRecords
  } = useRecordNavigation(dataToImport);
  
  const {
    isSaving,
    isBatchImporting,
    importResults,
    notification,
    showNotification,
    saveToDatabase,
    batchImport
  } = useImportProcess();
  
  // Extract source fields from structured data
  const extractSourceFields = (data: any) => {
    hookExtractSourceFields(data, setDataValidity);
  };
  
  // Initialize data when the component mounts or structuredData changes
  useEffect(() => {
    if (structuredData) {
      extractSourceFields(structuredData);
    }
  }, [structuredData]);
  
  // Update mapped data when entity type changes
  const updateMappedDataForEntityType = (entityType: EntityType) => {
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
  
  // Wrapper functions to update UI state when using hook functions
  const goToNextRecord = () => {
    hookGoToNextRecord();
    if (currentRecordIndex !== null && dataToImport.length > 0) {
      const nextIndex = (currentRecordIndex + 1) % dataToImport.length;
      setSourceFieldValues(dataToImport[nextIndex]);
    }
  };
  
  const goToPreviousRecord = () => {
    hookGoToPreviousRecord();
    if (currentRecordIndex !== null && dataToImport.length > 0) {
      const prevIndex = (currentRecordIndex - 1 + dataToImport.length) % dataToImport.length;
      setSourceFieldValues(dataToImport[prevIndex]);
    }
  };
  
  const toggleExcludeRecord = () => {
    hookToggleExcludeRecord();
  };
  
  // Handle field mapping
  const handleFieldMapping = (sourceField: string, targetField: string) => {
    hookHandleFieldMapping(sourceField, targetField);
    updateMappedDataForField(sourceField, targetField, currentRecordIndex);
  };
  
  // Save to database handler
  const handleSaveToDatabase = async () => {
    if (!selectedEntityType) return;
    
    const currentRecord = currentRecordIndex !== null ? dataToImport[currentRecordIndex] : undefined;
    const success = await saveToDatabase(selectedEntityType, mappedData, currentRecord);
    
    if (success) {
      goToNextRecord();
    }
  };
  
  // Batch import handler
  const handleBatchImport = async () => {
    if (!selectedEntityType) return;
    
    const mappings = mappingsByEntityType[selectedEntityType] || {};
    const recordsToImport = getIncludedRecords();
    
    await batchImport(selectedEntityType, mappings, recordsToImport);
  };
  
  // Auto-detect entity type when source fields change
  useEffect(() => {
    if (sourceFields.length > 0 && !selectedEntityType) {
      const detectedType = detectEntityType(sourceFields, sourceFieldValues);
      if (detectedType) {
        console.log(`Auto-detected entity type: ${detectedType}`);
        setSelectedEntityType(detectedType);
      }
    }
  }, [sourceFields, sourceFieldValues, selectedEntityType]);
  
  // Render the component
  return (
    <Dialog
      open={isOpen}
      onClose={() => {
        if (!isSaving && !isBatchImporting) {
          onClose();
        }
      }}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-6xl max-h-[90vh] overflow-auto bg-white rounded-lg shadow-xl">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <Dialog.Title className="text-xl font-semibold text-gray-900">
                Sports Data Mapper
              </Dialog.Title>
              
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
                disabled={isSaving || isBatchImporting}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {!validStructuredData ? (
              <div className="text-center py-8">
                <p className="text-red-500">Invalid data format. Please provide structured data as an array of objects.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Entity Type Selection */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Select Entity Type</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {ENTITY_TYPES.map(entityType => {
                      const isSelected = selectedEntityType === entityType.id;
                      const mappingCount = Object.keys(mappingsByEntityType[entityType.id] || {}).length;
                      
                      return (
                        <button
                          key={entityType.id}
                          onClick={() => setSelectedEntityType(entityType.id as EntityType)}
                          className={`p-3 rounded-md border text-left ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : mappingCount > 0
                                ? 'border-blue-200 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-medium">{entityType.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{entityType.description}</div>
                          {mappingCount > 0 && (
                            <div className="text-xs mt-1 font-medium text-blue-700">
                              {mappingCount} field{mappingCount !== 1 ? 's' : ''} mapped
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* View Mode Toggle */}
                <div className="flex justify-center">
                  <div className="inline-flex rounded-md shadow-sm" role="group">
                    <button
                      type="button"
                      onClick={() => setViewMode('entity')}
                      className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                        viewMode === 'entity'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                      }`}
                    >
                      Entity View
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('global')}
                      className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                        viewMode === 'global'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                      }`}
                    >
                      Global View
                    </button>
                  </div>
                </div>
                
                {/* Record View */}
                {viewMode === 'entity' && (
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium text-gray-900">
                        Record {currentRecordIndex !== null ? currentRecordIndex + 1 : 0} of {dataToImport.length}
                      </h3>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={goToPreviousRecord}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={goToNextRecord}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Next
                        </button>
                        <button
                          onClick={toggleExcludeRecord}
                          className={`px-3 py-1 text-sm border rounded-md ${
                            isCurrentRecordExcluded()
                              ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {isCurrentRecordExcluded()
                            ? 'Include'
                            : 'Exclude'}
                        </button>
                      </div>
                    </div>
                    
                    <DndProvider backend={HTML5Backend}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Source Fields */}
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">Source Fields</h4>
                          <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
                            {sourceFields.map(field => (
                              <FieldItem
                                key={field}
                                field={field}
                                value={sourceFieldValues[field]}
                                isSource={true}
                                onDrop={handleFieldMapping}
                              />
                            ))}
                          </div>
                        </div>
                        
                        {/* Database Fields */}
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">
                            Database Fields
                            {selectedEntityType && (
                              <span className="ml-2 text-sm text-gray-500">
                                ({getEntityTypeDisplayName(selectedEntityType)})
                              </span>
                            )}
                          </h4>
                          
                          {selectedEntityType ? (
                            <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
                              {ENTITY_TYPES.find(et => et.id === selectedEntityType)?.requiredFields.map(field => {
                                const isRequired = true;
                                const isMapped = Object.values(mappingsByEntityType[selectedEntityType] || {}).includes(field);
                                
                                return (
                                  <div key={field} className="relative">
                                    <FieldItem
                                      field={`${field}${isRequired ? ' *' : ''}`}
                                      value={mappedData[field]}
                                      isSource={false}
                                      onDrop={handleFieldMapping}
                                    />
                                    <button 
                                      className="absolute top-2 right-6 text-gray-400 hover:text-gray-600"
                                      onClick={() => setShowFieldHelp(showFieldHelp === field ? null : field)}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </button>
                                    <FieldHelpTooltip field={field} showFieldHelp={showFieldHelp} />
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="border border-gray-200 rounded-md p-4 bg-gray-50 text-center text-gray-500">
                              Please select an entity type
                            </div>
                          )}
                        </div>
                      </div>
                    </DndProvider>
                    
                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        onClick={handleSaveToDatabase}
                        disabled={!selectedEntityType || isSaving}
                        className={`px-4 py-2 rounded-md ${
                          !selectedEntityType || isSaving
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        {isSaving ? 'Saving...' : 'Save & Next'}
                      </button>
                      
                      <button
                        onClick={handleBatchImport}
                        disabled={!selectedEntityType || isBatchImporting}
                        className={`px-4 py-2 rounded-md ${
                          !selectedEntityType || isBatchImporting
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {isBatchImporting ? 'Importing...' : 'Batch Import All'}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Global View */}
                {viewMode === 'global' && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Global Field Mappings Across All Entities</h4>
                    
                    {/* Entity Totals Summary */}
                    <div className="mb-4 bg-gray-50 p-3 rounded-md">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Entity Mapping Totals</h5>
                      <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5">
                        {ENTITY_TYPES.map(entityType => {
                          const mappingCount = Object.keys(mappingsByEntityType[entityType.id] || {}).length;
                          return (
                            <div 
                              key={entityType.id} 
                              className={`text-xs p-2 rounded-md ${
                                mappingCount > 0 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              <span className="font-medium">{entityType.name}: </span>
                              <span>{mappingCount}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Mappings by Entity Type */}
                    <div className="space-y-4">
                      {ENTITY_TYPES.map(entityType => {
                        const mappings = mappingsByEntityType[entityType.id] || {};
                        const mappingEntries = Object.entries(mappings);
                        
                        if (mappingEntries.length === 0) return null;
                        
                        return (
                          <div key={entityType.id} className="border rounded-md p-3">
                            <h5 className="font-medium text-gray-800 mb-2">{entityType.name}</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {mappingEntries.map(([sourceField, targetField]) => (
                                <div key={`${sourceField}-${targetField}`} className="text-sm bg-gray-50 p-2 rounded border border-gray-200">
                                  <span className="font-medium text-blue-600">{sourceField}</span>
                                  <span className="text-gray-500 mx-2">→</span>
                                  <span className="font-medium text-indigo-600">{targetField}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Notification */}
            {notification && (
              <div className={`fixed bottom-4 right-4 p-4 rounded-md shadow-lg ${
                notification.type === 'success' ? 'bg-green-100 border border-green-300 text-green-800' :
                notification.type === 'error' ? 'bg-red-100 border border-red-300 text-red-800' :
                'bg-blue-100 border border-blue-300 text-blue-800'
              }`}>
                {notification.message}
              </div>
            )}
            
            {/* Guided Walkthrough */}
            <GuidedWalkthrough
              showGuidedWalkthrough={showGuidedWalkthrough}
              setShowGuidedWalkthrough={setShowGuidedWalkthrough}
              guidedStep={guidedStep}
              setGuidedStep={setGuidedStep}
            />
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default SportDataMapperContainer; 