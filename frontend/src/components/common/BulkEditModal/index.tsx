/**
 * Unified BulkEditModal Component
 * 
 * This is a standardized component that supports two modes of operation:
 * 1. Entity Mode: For editing multiple entities from the EntityList component
 * 2. Query Mode: For editing multiple query results from the DatabaseQuery component
 * 
 * Key features:
 * - Dynamically determines fields based on entity type or query results
 * - Loads relationship data for dropdown fields
 * - Ensures division_conference_id is always available for team entities
 * - Detects entity types automatically in query mode
 * - Groups fields into logical categories
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Modal } from 'antd';
import { BulkEditModalProps, FieldDefinition } from './types';
import { FieldSelector, ProcessingStatus } from './components';
import { 
  useFieldManagement, 
  useRelationships, 
  useFieldDetection,
  useBulkUpdate,
  useModalLifecycle
} from './hooks';
import { getModalTitle } from './utils';

const BulkEditModal: React.FC<BulkEditModalProps> = ({
  visible,
  onCancel,
  entityType,
  selectedIds = [],
  queryResults = [],
  selectedIndexes = new Set<number>(),
  onSuccess,
}) => {
  // Determine which mode we're in
  const isEntityMode = Boolean(entityType && selectedIds.length > 0);
  const isQueryMode = Boolean(queryResults.length > 0 && selectedIndexes.size > 0);
  
  // Store available fields
  const [availableFields, setAvailableFields] = useState<FieldDefinition[]>([]);
  
  // Initialize lifecycle management
  const { 
    isLoading, 
    showResults, 
    isMountedRef, 
    setIsLoading, 
    setShowResults 
  } = useModalLifecycle({ 
    visible,
    onCleanup: () => {
      // Reset all state when modal closes
      setAvailableFields([]);
      fieldManagement.resetFields();
      relationships.resetRelationships();
    }
  });
  
  // Initialize hooks for field detection
  const fieldDetection = useFieldDetection();
  
  // Initialize field management hook
  const fieldManagement = useFieldManagement({ availableFields });
  
  // Initialize relationships hook
  const relationships = useRelationships({ 
    isMounted: isMountedRef, 
    isVisible: visible 
  });
  
  // Initialize bulk update hook
  const bulkUpdate = useBulkUpdate({ isMounted: isMountedRef });
  
  // Load entity fields when operating in entity mode
  const loadEntityFields = useCallback(async () => {
    if (!entityType || !isMountedRef.current) return;
    
    try {
      // Get field definitions for this entity type
      const fields = fieldDetection.getEntityFields(entityType);
      setAvailableFields(fields);
      
      // Load related entities for dropdowns
      await relationships.loadEntityRelationships(fields);
    } catch (error) {
      console.error('Error loading entity fields:', error);
    } finally {
      setIsLoading(false);
    }
  }, [entityType, fieldDetection, relationships, setIsLoading, isMountedRef]);
  
  // Load fields from query results for query-based mode
  const loadQueryFields = useCallback(() => {
    if (!queryResults.length || !isMountedRef.current) return;
    
    try {
      // Detect fields and entity type from query results
      const { fields, isTeam } = fieldDetection.detectFieldsFromQueryResults(queryResults);
      setAvailableFields(fields);
      
      // Load relationship data with a short delay to ensure fields are processed first
      setTimeout(() => {
        if (isMountedRef.current && visible) {
          // For teams, load division data first
          if (isTeam) {
            relationships.loadDivisionData();
          }
          
          // Then load other relationships
          relationships.loadQueryRelationships(fields);
        }
      }, 250);
    } catch (error) {
      console.error('Error processing query fields:', error);
    } finally {
      setIsLoading(false);
    }
  }, [
    queryResults, 
    fieldDetection, 
    relationships, 
    setIsLoading, 
    isMountedRef, 
    visible
  ]);
  
  // Initialize the modal when it becomes visible
  useEffect(() => {
    if (visible && isMountedRef.current && availableFields.length === 0) {
      // Load appropriate fields based on mode
      if (isEntityMode) {
        loadEntityFields();
      } else if (isQueryMode) {
        loadQueryFields();
      }
    }
  }, [
    visible, 
    isEntityMode, 
    isQueryMode, 
    loadEntityFields, 
    loadQueryFields, 
    isMountedRef, 
    availableFields.length
  ]);
  
  // Handle bulk update operation
  const handleBulkUpdate = useCallback(() => {
    // Get the update payload from field management
    const updateData = fieldManagement.createUpdatePayload();
    
    // Check if we have fields to update
    const fieldsToUpdate = fieldManagement.getSelectedFieldNames();
    if (fieldsToUpdate.length === 0) return;
    
    // Set results mode
    setShowResults(true);
    
    // Process the update based on mode
    if (isEntityMode && entityType) {
      bulkUpdate.processEntityBulkUpdate(
        entityType,
        selectedIds,
        updateData,
        onSuccess,
        onCancel
      );
    } else if (isQueryMode) {
      bulkUpdate.processQueryBulkUpdate(
        queryResults,
        selectedIndexes,
        updateData,
        onSuccess,
        onCancel
      );
    }
  }, [
    fieldManagement, 
    bulkUpdate, 
    isEntityMode, 
    isQueryMode, 
    entityType, 
    selectedIds, 
    queryResults, 
    selectedIndexes, 
    onSuccess, 
    onCancel, 
    setShowResults
  ]);
  
  // Determine component display state
  const status = isLoading ? 'loading' 
    : bulkUpdate.isProcessing ? 'processing'
    : showResults ? 'results'
    : 'idle';
  
  return (
    <Modal
      title={getModalTitle(isEntityMode, entityType, selectedIds, selectedIndexes)}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
    >
      {status !== 'idle' ? (
        <ProcessingStatus
          status={status}
          processingProgress={bulkUpdate.processingProgress}
          results={bulkUpdate.results}
          onClose={onCancel}
        />
      ) : (
        <div className="p-4">
          <FieldSelector
            fieldsByCategory={fieldManagement.fieldsByCategory}
            selectedFields={fieldManagement.selectedFields}
            fieldValues={fieldManagement.fieldValues}
            relatedEntities={relationships.relatedEntities}
            onToggleField={fieldManagement.toggleField}
            onUpdateFieldValue={fieldManagement.updateFieldValue}
          />
          
          <div className="flex justify-end mt-6 space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkUpdate}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={fieldManagement.getSelectedFieldNames().length === 0}
            >
              {isEntityMode 
                ? `Update ${selectedIds.length} Items` 
                : `Update ${selectedIndexes.size} Rows`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default BulkEditModal;