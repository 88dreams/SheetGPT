import React from 'react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import DataTable from '../../components/data/DataTable';
import { 
  DataList, 
  DataPreview, 
  NoDataView 
} from './components';

// Import hooks
import {
  useDataFlowManager,
  useDataSelection,
  useExtractedData
} from './hooks';

/**
 * Data Management Page Component
 * 
 * Main container for the data management feature, which includes:
 * - Data selection list
 * - Data preview
 * - Data table for viewing and editing
 */
const DataManagement: React.FC = () => {
  // Initialize hooks
  useDataFlowManager();
  
  const {
    structuredData,
    isLoading,
    allDataError,
    selectedDataId,
    refetchAllData,
    handleSelectData,
    handleDeleteData
  } = useDataSelection();

  const {
    extractedData,
    handleSaveExtractedData,
    handleClosePreview
  } = useExtractedData(refetchAllData, handleSelectData);

  const renderContent = () => {
    if (isLoading) {
      console.log('DataManagement: Loading state active');
      return (
        <div className="flex justify-center items-center h-full">
          <LoadingSpinner />
        </div>
      );
    }

    if (allDataError) {
      console.error('DataManagement: Error loading data:', allDataError);
      return (
        <div className="text-red-500 p-4">
          <h3 className="text-lg font-semibold">Error loading data</h3>
          <p className="mt-2">{allDataError.message || 'Unknown error occurred'}</p>
        </div>
      );
    }

    if (extractedData) {
      console.log('DataManagement: Rendering DataPreview for extracted data');
      return (
        <DataPreview 
          extractedData={extractedData} 
          onSave={handleSaveExtractedData} 
          onClose={handleClosePreview} 
        />
      );
    }

    // First check for selectedDataId, which is the most important factor
    if (selectedDataId) {
      console.log('DataManagement: Selected data ID available:', selectedDataId);
      return <DataTable dataId={selectedDataId} />;
    }
    
    // Second check for structured data without a selection
    if (structuredData && structuredData.length > 0) {
      console.log('DataManagement: No selection but structured data available, returning NoDataView with selection prompt');
      return <NoDataView hasData={true} />;
    }

    // Fallback: No data available
    console.log('DataManagement: No data available, returning empty NoDataView');
    return <NoDataView hasData={false} />;
  };

  return (
    <div className="h-full flex">
      {/* Data List Sidebar */}
      <div className="w-64 border-r border-gray-200 h-full overflow-y-auto bg-gray-50">
        <div className="p-3 border-b border-gray-200 font-medium">
          Data Management
        </div>
        <DataList
          structuredData={structuredData}
          selectedDataId={selectedDataId}
          isLoading={isLoading}
          onSelectData={handleSelectData}
          onDeleteData={handleDeleteData}
        />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 h-full overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default DataManagement;