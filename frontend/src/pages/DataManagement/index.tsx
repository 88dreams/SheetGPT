import React from 'react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import DataTable from '../../components/data/DataTable';
import DataPreview from './components/DataPreview';
import NoDataView from './components/NoDataView';
import usePageTitle from '../../hooks/usePageTitle';

// Import hooks
import { useDataSelection } from './hooks/useDataSelection';
import { useExtractedData } from './hooks/useExtractedData';
import { useDataFlowManager } from './hooks/useDataFlow';

const DataManagement: React.FC = () => {
  // Set the page title
  usePageTitle('Data Management');
  
  // Initialize hooks
  useDataFlowManager();
  
  const {
    structuredData,
    isLoading,
    allDataError,
    selectedDataId,
    refetchAllData,
    handleSelectData,
  } = useDataSelection();

  const {
    extractedData,
    handleSaveExtractedData,
    handleClosePreview
  } = useExtractedData(refetchAllData, handleSelectData);

  const renderContent = () => {
    if (isLoading) {
      console.log('DataManagement: Loading state active');
      return <LoadingSpinner />;
    }

    if (allDataError) {
      console.error('DataManagement: Error loading data:', allDataError);
      return (
        <div className="text-red-500 p-4">
          <h3 className="text-lg font-semibold">Error loading data</h3>
          <p className="mt-2">{allDataError instanceof Error ? allDataError.message : 'Unknown error occurred'}</p>
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

  // Removed PageContainer with header - directly render content
  // Added classes to ensure proper spacing at the top of the page with fixed navbar
  return (
    <div className="h-full pt-0">
      <div className="page-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default DataManagement;