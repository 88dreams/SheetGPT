import React, { useState, useEffect } from 'react';
import { transformDataForDisplay } from '../../utils/dataTransformer';
import '../../styles/dataPreviewModal.css';
import { extractDataFromContent } from '../../services/extraction';
import { DataExtractionError, DataValidationError, isDataExtractionError, isDataValidationError } from '../../utils/errors';
import { ExclamationCircleIcon, ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { DataExtractionService } from '../../services/extraction';
import { ParsedData } from '../../services/extraction/DataParserService';

interface DataPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageContent: string | any;
  onConfirm: (data: any) => void;
  extractedData?: ParsedData | null;
}

/**
 * Modal component for previewing extracted data before sending it to the Data Management section
 * Uses the centralized data transformer for consistent display across the application
 */
const DataPreviewModal: React.FC<DataPreviewModalProps> = ({
  isOpen,
  onClose,
  messageContent,
  onConfirm,
  extractedData: propExtractedData
}) => {
  const [extractedData, setExtractedData] = useState<ParsedData | null>(propExtractedData || null);
  const [loading, setLoading] = useState<boolean>(propExtractedData ? false : true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [processingState, setProcessingState] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [showErrorDetails, setShowErrorDetails] = useState<boolean>(false);
  const [dataStructureInfo, setDataStructureInfo] = useState<{ rows: number; columns: number } | null>(null);

  // Update extracted data if prop changes
  useEffect(() => {
    if (propExtractedData) {
      setExtractedData(propExtractedData);
      setLoading(false);
      
      // Calculate data structure info
      const rowCount = propExtractedData.rows?.length || 0;
      const columnCount = propExtractedData.headers?.length || 0;
      setDataStructureInfo({ rows: rowCount, columns: columnCount });
    }
  }, [propExtractedData]);

  // Extract data when the modal is opened
  useEffect(() => {
    if (isOpen) {
      if (propExtractedData) {
        // If we have pre-extracted data, use it directly
        setExtractedData(propExtractedData);
        setLoading(false);
        setError(null);
        
        // Calculate data structure info
        try {
          const parsedData = typeof propExtractedData === 'string' 
            ? JSON.parse(propExtractedData) 
            : propExtractedData;
          
          const rowCount = parsedData.rows?.length || 0;
          const columnCount = parsedData.headers?.length || 0;
          setDataStructureInfo({ rows: rowCount, columns: columnCount });
        } catch (e) {
          console.error("Error parsing extracted data:", e);
        }
      } else if (typeof messageContent === 'string') {
        // Check if this looks like raw JSON data (used for pre-extraction data)
        if (messageContent.trim().startsWith('{') || messageContent.trim().startsWith('[')) {
          try {
            // Try to parse as JSON directly
            const parsedJson = JSON.parse(messageContent);
            setExtractedData(parsedJson);
            setLoading(false);
            setError(null);
            
            // Calculate data structure info
            const rowCount = parsedJson.rows?.length || 0;
            const columnCount = parsedJson.headers?.length || 0;
            setDataStructureInfo({ rows: rowCount, columns: columnCount });
          } catch (e) {
            console.error("Error parsing JSON content:", e);
            // If we can't parse it as JSON, try normal extraction
            extractData();
          }
        } else {
          // Only try to extract if the content isn't pre-extracted JSON
          extractData();
        }
      }
    } else {
      // Reset state when modal is closed
      if (!propExtractedData) {
        setExtractedData(null);
        setDataStructureInfo(null);
      }
      setError(null);
      setErrorDetails(null);
      setProcessingState('idle');
      setShowErrorDetails(false);
    }
  }, [isOpen, propExtractedData, messageContent]);

  /**
   * Extract structured data from the message content
   */
  const extractData = async () => {
    if (typeof messageContent !== 'string') {
      console.error('Cannot extract data: messageContent is not a string');
      setError('Invalid message content format');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    setErrorDetails(null);
    setProcessingState('idle');
    
    try {
      // Use the new extraction service
      const data = await extractDataFromContent(messageContent);
      
      if (!data || (!data.headers && !data.rows)) {
        setError('No structured data found in this message');
        setLoading(false);
        return;
      }
      
      // Calculate data structure info for display
      const rowCount = data.rows?.length || 0;
      const columnCount = data.headers?.length || 0;
      setDataStructureInfo({ rows: rowCount, columns: columnCount });
      
      setExtractedData(data);
      setLoading(false);
    } catch (e) {
      console.error('Error extracting data:', e);
      
      if (isDataExtractionError(e)) {
        setError(e.message);
        setErrorDetails(e.detail);
      } else if (isDataValidationError(e)) {
        setError(e.message);
        setErrorDetails(e.getFormattedErrors());
      } else {
        setError(`Error extracting data: ${(e as Error).message}`);
      }
      
      setLoading(false);
    }
  };

  /**
   * Retry data extraction after an error
   */
  const handleRetry = () => {
    extractData();
  };

  /**
   * Handle confirmation and data processing
   */
  const handleConfirm = async () => {
    if (!extractedData) return;
    
    setProcessingState('processing');
    try {
      // Pre-process the data to ensure it's in the correct format
      const processedData = await DataExtractionService.preprocessData(extractedData);
      console.log('Data pre-processed successfully:', processedData);
      
      // Store the data in session storage for the data management page
      try {
        sessionStorage.setItem('preview_data', JSON.stringify({
          headers: processedData.headers,
          rows: processedData.rows,
          meta_data: processedData.meta_data || {}
        }));
      } catch (storageError) {
        console.warn('Could not store data in session storage:', storageError);
      }
      
      // Add a small delay for UX feedback
      setTimeout(() => {
        setProcessingState('success');
        
        // Give the success state a moment to show
        setTimeout(() => {
          onConfirm(processedData);
        }, 500);
      }, 500);
    } catch (error) {
      console.error('Error pre-processing data:', error);
      
      if (isDataExtractionError(error)) {
        setError(error.message);
        setErrorDetails(error.detail);
      } else {
        setError(`Error processing data: ${(error as Error).message}`);
      }
      
      setProcessingState('error');
    }
  };

  /**
   * Render the data preview based on the extracted data
   * Uses the centralized data transformer for consistent display
   */
  const renderPreview = () => {
    if (!extractedData) return null;

    console.log('DataPreviewModal: Rendering preview for data');
    
    try {
      // Parse data if it's a string
      let parsedData = extractedData;
      if (typeof extractedData === 'string') {
        try {
          parsedData = JSON.parse(extractedData);
        } catch (e) {
          console.error('Error parsing data:', e);
          // If we can't parse it, show it as a string
          return (
            <div className="data-preview-json">
              <pre>{extractedData}</pre>
            </div>
          );
        }
      }
      
      // Use the centralized data transformer for all formats consistently
      const { headers, rows } = transformDataForDisplay(parsedData);
      
      if (headers.length > 0 && rows.length > 0) {
        return (
          <div className="data-preview-table-container">
            <table className="data-preview-table">
              <thead>
                <tr>
                  {headers.map((header, index) => (
                    <th key={index}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {headers.map((header, colIndex) => (
                      <td key={colIndex}>
                        {typeof row[header] === 'object' 
                          ? JSON.stringify(row[header]) 
                          : row[header] !== undefined ? String(row[header]) : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      
      // Otherwise, render as JSON
      return (
        <div className="data-preview-json">
          <pre>{JSON.stringify(parsedData, null, 2)}</pre>
        </div>
      );
    } catch (e) {
      console.error('Error rendering preview:', e);
      return (
        <div className="data-preview-error">
          <p>Error rendering data preview.</p>
          <pre>{typeof extractedData === 'string' ? extractedData : JSON.stringify(extractedData, null, 2)}</pre>
        </div>
      );
    }
  };
  
  /**
   * Render error details when available
   */
  const renderErrorDetails = () => {
    if (!errorDetails) return null;
    
    return (
      <div className="data-preview-error-details">
        <div className="data-preview-error-details-header">
          <button 
            className="data-preview-error-details-toggle"
            onClick={() => setShowErrorDetails(!showErrorDetails)}
          >
            {showErrorDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
        {showErrorDetails && (
          <div className="data-preview-error-details-content">
            <pre>{errorDetails}</pre>
          </div>
        )}
      </div>
    );
  };

  // Don't render anything if the modal is closed
  if (!isOpen) return null;

  return (
    <div className="data-preview-modal-overlay">
      <div className="data-preview-modal">
        <div className="data-preview-header">
          <h2 className="data-preview-title">Data Preview</h2>
          <button 
            className="data-preview-close-button" 
            onClick={onClose}
            aria-label="Close"
            disabled={processingState === 'processing'}
          >
            ×
          </button>
        </div>
        
        <div className="data-preview-content">
          {loading ? (
            <div className="data-preview-loading">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 inline-block mr-2"></div>
              <span>Loading data preview...</span>
            </div>
          ) : processingState === 'processing' ? (
            <div className="data-preview-loading">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 inline-block mr-2"></div>
              <span>Processing data... Please wait...</span>
            </div>
          ) : processingState === 'success' ? (
            <div className="data-preview-success">
              <CheckCircleIcon className="h-6 w-6 text-green-500 inline-block mr-2" />
              <span>Data successfully processed!</span>
            </div>
          ) : error ? (
            <div className="data-preview-error">
              <ExclamationCircleIcon className="h-6 w-6 text-red-500 inline-block mr-2" />
              <span>{error}</span>
              {renderErrorDetails()}
              <div className="mt-4">
                <button 
                  className="data-preview-button data-preview-button-secondary" 
                  onClick={handleRetry}
                >
                  <ArrowPathIcon className="h-4 w-4 inline-block mr-1" />
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex justify-between items-start">
                <p>
                  Review the extracted data before sending it to the Data Management section.
                </p>
                {dataStructureInfo && (
                  <div className="text-sm text-gray-500">
                    {dataStructureInfo.rows} rows × {dataStructureInfo.columns} columns
                  </div>
                )}
              </div>
              {renderPreview()}
            </>
          )}
        </div>
        
        <div className="data-preview-actions">
          <button 
            className="data-preview-button data-preview-button-secondary" 
            onClick={onClose}
            disabled={processingState === 'processing'}
          >
            Cancel
          </button>
          <button 
            className="data-preview-button data-preview-button-primary" 
            onClick={handleConfirm}
            disabled={loading || processingState === 'processing' || !!error || !extractedData}
          >
            {processingState === 'processing' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                Processing...
              </>
            ) : 'Send to Data'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataPreviewModal; 