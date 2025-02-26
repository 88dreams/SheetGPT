import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useDataFlow } from '../contexts/DataFlowContext';
import { api } from '../utils/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageContainer from '../components/common/PageContainer';
// @ts-ignore
import { FaGoogle, FaFileExcel, FaFileCsv } from 'react-icons/fa';
import './export.css';

const Export: React.FC = () => {
  const [searchParams] = useSearchParams();
  const dataId = searchParams.get('id');
  const { setDestination, dataFlow } = useDataFlow();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [exportTitle, setExportTitle] = useState<string>(`Export - ${new Date().toLocaleDateString()}`);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportResult, setExportResult] = useState<{ url?: string; message?: string } | null>(null);

  // Update data flow when component mounts
  useEffect(() => {
    setDestination('export');
  }, [setDestination]);

  // Fetch templates
  const {
    data: templates,
    isLoading: isLoadingTemplates,
    error: templatesError
  } = useQuery({
    queryKey: ['export-templates'],
    queryFn: () => api.export.getTemplates(),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Fetch data details if dataId is provided
  const {
    data: dataDetails,
    isLoading: isLoadingData,
    error: dataError
  } = useQuery({
    queryKey: ['structured-data', dataId],
    queryFn: () => dataId ? api.data.getStructuredDataById(dataId) : Promise.resolve(null),
    enabled: !!dataId,
    staleTime: 0 // Always fetch fresh data
  });

  // Set default export title when data details are loaded
  useEffect(() => {
    if (dataDetails && dataDetails.meta_data?.name) {
      setExportTitle(`${dataDetails.meta_data.name} - ${new Date().toLocaleDateString()}`);
    }
  }, [dataDetails]);

  // Handle export to Google Sheets
  const handleExportToSheets = async () => {
    if (!dataId || !selectedTemplate) return;
    
    try {
      setIsExporting(true);
      setExportResult(null);
      
      const result = await api.export.exportToSheets(dataId, selectedTemplate, exportTitle);
      
      if (result && result.spreadsheet_url) {
        setExportResult({
          url: result.spreadsheet_url,
          message: 'Successfully exported to Google Sheets!'
        });
      } else {
        setExportResult({
          message: 'Export completed, but no URL was returned.'
        });
      }
    } catch (error) {
      console.error('Error exporting to Google Sheets:', error);
      setExportResult({
        message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Check Google authentication status
  const {
    data: authStatus,
    isLoading: isLoadingAuthStatus,
    refetch: refetchAuthStatus
  } = useQuery({
    queryKey: ['google-auth-status'],
    queryFn: () => api.export.getAuthStatus(),
    staleTime: 60 * 1000 // 1 minute
  });

  // Handle Google authentication
  const handleGoogleAuth = async () => {
    try {
      const { url } = await api.export.getAuthUrl();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error getting Google auth URL:', error);
    }
  };

  // Create page actions
  const pageActions = (
    <div className="flex gap-2">
      {!authStatus?.authenticated && (
        <button
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 flex items-center"
          onClick={handleGoogleAuth}
          disabled={isLoadingAuthStatus}
        >
          <FaGoogle className="mr-2" /> Connect Google
        </button>
      )}
    </div>
  );

  const isLoading = isLoadingTemplates || isLoadingData || isLoadingAuthStatus;

  return (
    <PageContainer
      title="Export Data"
      description="Export your structured data to various formats"
      actions={pageActions}
    >
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="medium" />
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      ) : templatesError || dataError ? (
        <div className="text-red-500 p-4 border border-red-200 rounded bg-red-50">
          Error: {((templatesError || dataError) as Error)?.message || 'Failed to load required data'}
        </div>
      ) : !dataId ? (
        <div className="text-center py-8 text-gray-500">
          <p>No data selected for export</p>
          <p className="text-sm mt-2">
            Please select data from the Data Management page first
          </p>
        </div>
      ) : !authStatus?.authenticated ? (
        <div className="text-center py-8">
          <p className="text-gray-700 mb-4">Connect your Google account to export data to Google Sheets</p>
          <button
            onClick={handleGoogleAuth}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center mx-auto"
          >
            <FaGoogle className="mr-2" /> Connect Google Account
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="content-card">
            <div className="content-card-title">Export Settings</div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Export Title
                </label>
                <input
                  type="text"
                  value={exportTitle}
                  onChange={(e) => setExportTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter export title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md export-template-select"
                >
                  <option value="">Select a template</option>
                  {templates && templates.map((template) => (
                    <option key={template} value={template}>
                      {template}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="content-card">
            <div className="content-card-title">Export Options</div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <button
                onClick={handleExportToSheets}
                disabled={!selectedTemplate || isExporting}
                className={`p-4 rounded-lg border flex flex-col items-center justify-center export-option ${
                  !selectedTemplate || isExporting
                    ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                    : 'bg-white border-blue-300 text-blue-600 hover:bg-blue-50'
                }`}
              >
                <FaGoogle className="text-3xl mb-2" />
                <span className="font-medium">Google Sheets</span>
                <span className="text-xs text-gray-500 mt-1">Export to Google Sheets</span>
              </button>
              
              <button
                disabled={true}
                className="p-4 rounded-lg border bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed flex flex-col items-center justify-center export-option"
              >
                <FaFileExcel className="text-3xl mb-2" />
                <span className="font-medium">Excel</span>
                <span className="text-xs text-gray-500 mt-1">Coming soon</span>
              </button>
              
              <button
                disabled={true}
                className="p-4 rounded-lg border bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed flex flex-col items-center justify-center export-option"
              >
                <FaFileCsv className="text-3xl mb-2" />
                <span className="font-medium">CSV</span>
                <span className="text-xs text-gray-500 mt-1">Coming soon</span>
              </button>
            </div>
          </div>
          
          {isExporting && (
            <div className="flex justify-center items-center p-4 border border-blue-200 rounded bg-blue-50">
              <LoadingSpinner size="small" />
              <span className="ml-2 text-blue-600">Exporting to Google Sheets...</span>
            </div>
          )}
          
          {exportResult && (
            <div className={`p-4 border rounded export-result ${
              exportResult.url ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
            }`}>
              <p className={exportResult.url ? 'text-green-700' : 'text-yellow-700'}>
                {exportResult.message}
              </p>
              {exportResult.url && (
                <a
                  href={exportResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Open in Google Sheets
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
};

export default Export; 