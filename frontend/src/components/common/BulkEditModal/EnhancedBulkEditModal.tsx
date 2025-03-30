import React, { useState, useEffect } from 'react';
import { Modal, Alert, Space, Typography, Divider } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import FieldSelector from './components/FieldSelector';
import ProcessingStatus from './components/ProcessingStatus';
import { SelectedFieldsMap, FieldValuesMap } from './types';

const { Text } = Typography;

// Define prop types that match the original component
interface BulkEditModalProps {
  visible: boolean;
  onCancel: () => void;
  entityType?: string;
  selectedIds?: string[];
  queryResults?: any[];
  selectedIndexes?: Set<number>;
  onSuccess?: (updatedData?: any) => void;
}

/**
 * Simplified BulkEditModal component to avoid infinite update loops
 */
const EnhancedBulkEditModal: React.FC<BulkEditModalProps> = ({
  visible,
  onCancel,
  entityType,
  selectedIds = [],
  queryResults = [],
  selectedIndexes = new Set(),
  onSuccess
}) => {
  // Simple state for UI
  const [currentView, setCurrentView] = useState<'fields' | 'processing'>('fields');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [results, setResults] = useState({ success: 0, failed: 0 });
  
  // State for field values
  const [selectedFields, setSelectedFields] = useState<SelectedFieldsMap>({});
  const [fieldValues, setFieldValues] = useState<FieldValuesMap>({});
  
  // Reset state when modal opens/closes
  useEffect(() => {
    // Only run when visibility changes to avoid loops
    if (visible) {
      setCurrentView('fields');
      setIsProcessing(false);
      setProcessingProgress(0);
      setResults({ success: 0, failed: 0 });
    } else {
      setSelectedFields({});
      setFieldValues({});
    }
  }, [visible]);
  
  // Toggle selection for a field
  const handleToggleField = (fieldName: string) => {
    setSelectedFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
    
    // If we're toggling off, remove the value
    if (selectedFields[fieldName]) {
      setFieldValues(prev => {
        const newValues = { ...prev };
        delete newValues[fieldName];
        return newValues;
      });
    }
  };
  
  // Update a field value
  const handleUpdateFieldValue = (fieldName: string, value: any) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };
  
  // Process update when form is submitted
  const handleProcessUpdate = () => {
    // Verify we have fields selected
    if (Object.keys(selectedFields).filter(key => selectedFields[key]).length === 0) {
      return;
    }
    
    // Switch to processing view
    setCurrentView('processing');
    setIsProcessing(true);
    
    // Simulate processing (in a real implementation, this would call an API)
    setTimeout(() => {
      setIsProcessing(false);
      setResults({
        success: selectedIds.length,
        failed: 0
      });
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    }, 1000);
  };
  
  // Generate modal title based on mode
  const getModalTitle = () => {
    if (entityType && selectedIds.length > 0) {
      return `Edit ${selectedIds.length} ${entityType} items`;
    } else if (queryResults.length > 0 && selectedIndexes.size > 0) {
      return `Edit ${selectedIndexes.size} selected rows`;
    }
    return 'Bulk Edit';
  };
  
  // Count selected fields
  const selectedFieldCount = Object.values(selectedFields).filter(Boolean).length;
  
  // Dummy field categories for demo
  const fieldsByCategory = {
    "Basic Information": [
      { name: 'name', type: 'string', required: true, description: 'Name of the entity' },
      { name: 'description', type: 'string', required: false, description: 'Description of the entity' }
    ],
    "Relationships": [
      { name: 'league_id', type: 'relation', required: true, description: 'League this entity belongs to' },
      { name: 'division_conference_id', type: 'relation', required: true, description: 'Division/Conference this entity belongs to' }
    ],
    "Dates & Numbers": [
      { name: 'year', type: 'number', required: false, description: 'Year value' },
      { name: 'founded_date', type: 'date', required: false, description: 'Foundation date' }
    ]
  };
  
  // Dummy related entities
  const relatedEntities = {
    league_id: [
      { id: '1', name: 'NFL' },
      { id: '2', name: 'NBA' },
      { id: '3', name: 'MLB' }
    ],
    division_conference_id: [
      { id: '1', name: 'Eastern Conference' },
      { id: '2', name: 'Western Conference' },
      { id: '3', name: 'Northern Division' }
    ]
  };
  
  return (
    <Modal
      title={getModalTitle()}
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={null}
    >
      {currentView === 'fields' && (
        <div className="p-4">
          <div className="mb-4">
            <Alert
              message="Bulk Edit"
              description={
                <Space direction="vertical">
                  <Text>
                    Select fields to update and enter values. Fields will be updated 
                    for all selected {entityType ? entityType + ' items' : 'rows'}.
                  </Text>
                  <Text type="secondary">
                    <InfoCircleOutlined className="mr-2" />
                    Empty fields will clear existing values.
                  </Text>
                </Space>
              }
              type="info"
              showIcon
            />
          </div>
          
          <FieldSelector
            fieldsByCategory={fieldsByCategory}
            selectedFields={selectedFields}
            fieldValues={fieldValues}
            relatedEntities={relatedEntities}
            onToggleField={handleToggleField}
            onUpdateFieldValue={handleUpdateFieldValue}
            disabled={false}
            context={{}}
          />
          
          <Divider />
          
          <div className="flex justify-between mt-6">
            <div>
              <Text type="secondary">
                {selectedFieldCount} field{selectedFieldCount !== 1 ? 's' : ''} selected
              </Text>
            </div>
            <div className="space-x-3">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 rounded-md text-white ${
                  selectedFieldCount === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
                onClick={handleProcessUpdate}
                disabled={selectedFieldCount === 0}
              >
                {entityType
                  ? `Update ${selectedIds.length} Items`
                  : `Update ${selectedIndexes.size} Rows`}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {currentView === 'processing' && (
        <ProcessingStatus
          isProcessing={isProcessing}
          progress={processingProgress}
          results={results}
          onClose={onCancel}
        />
      )}
    </Modal>
  );
};

export default EnhancedBulkEditModal;