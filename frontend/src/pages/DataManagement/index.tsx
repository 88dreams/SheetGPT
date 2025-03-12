import React from 'react';
import PageContainer from '../../components/common/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import DataTable from '../../components/data/DataTable';
import DataPreview from './components/DataPreview';
import NoDataView from './components/NoDataView';
import PageActions from './components/PageActions';

// Import hooks
import { useDataSelection } from './hooks/useDataSelection';
import { useExtractedData } from './hooks/useExtractedData';
import { useDataFlowManager } from './hooks/useDataFlow';

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
  } = useDataSelection();

  const {
    extractedData,
    handleSaveExtractedData,
    handleClosePreview
  } = useExtractedData(refetchAllData, handleSelectData);

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSpinner />;
    }

    if (allDataError) {
      return <div className="text-red-500">Error loading data</div>;
    }

    if (extractedData) {
      return (
        <DataPreview 
          extractedData={extractedData} 
          onSave={handleSaveExtractedData} 
          onClose={handleClosePreview} 
        />
      );
    }

    if (structuredData && structuredData.length > 0 && selectedDataId) {
      return <DataTable dataId={selectedDataId} />;
    }

    return <NoDataView />;
  };

  return (
    <PageContainer
      title="Data Management"
      description="View, manage, and export your structured data"
      actions={<PageActions selectedDataId={selectedDataId} />}
    >
      {renderContent()}
    </PageContainer>
  );
};

export default DataManagement;