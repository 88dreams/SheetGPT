import React, { useState, useEffect } from 'react';
import { DataExtractionService } from '../../services/DataExtractionService';
import { transformDataForDisplay } from '../../utils/dataTransformer';
import '../../styles/dataPreviewModal.css';

interface DataPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageContent: string;
  onConfirm: (data: any) => void;
}

/**
 * Modal component for previewing extracted data before sending it to the Data Management section
 * Uses the centralized data transformer for consistent display across the application
 */
const DataPreviewModal: React.FC<DataPreviewModalProps> = ({
  isOpen,
  onClose,
  messageContent,
  onConfirm
}) => {
  const [extractedData, setExtractedData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);

  // Extract data when the modal is opened
  useEffect(() => {
    if (isOpen) {
      extractData();
    }
  }, [isOpen, messageContent]);

  /**
   * Extract structured data from the message content
   */
  const extractData = () => {
    setLoading(true);
    setError(null);

    try {
      const data = DataExtractionService.extractStructuredData(messageContent);
      
      if (!data) {
        setError('No structured data found in this message');
        setLoading(false);
        return;
      }
      
      setExtractedData(data);
      setLoading(false);
    } catch (e) {
      setError(`Error extracting data: ${(e as Error).message}`);
      setLoading(false);
    }
  };

  /**
   * Handle confirmation and data processing
   */
  const handleConfirm = async () => {
    if (!extractedData) return;
    
    setProcessing(true);
    try {
      // Pre-process the data to ensure it's in the correct format
      const processedData = await DataExtractionService.preprocessData(extractedData);
      console.log('Data pre-processed successfully:', processedData);
      
      // Add a small delay to ensure data is fully processed
      setTimeout(() => {
        onConfirm(processedData);
        setProcessing(false);
      }, 1000);
    } catch (error) {
      console.error('Error pre-processing data:', error);
      setProcessing(false);
    }
  };

  /**
   * Render the data preview based on the extracted data
   * Uses the centralized data transformer for consistent display
   */
  const renderPreview = () => {
    if (!extractedData) return null;

    console.log('DataPreviewModal: Rendering preview for data');
    
    // Use the centralized data transformer for all formats consistently
    const { headers, rows } = transformDataForDisplay(extractedData);
    
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
        {JSON.stringify(extractedData, null, 2)}
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
            disabled={processing}
          >
            ×
          </button>
        </div>
        
        <div className="data-preview-content">
          {loading ? (
            <div className="data-preview-loading">
              Loading data preview...
            </div>
          ) : processing ? (
            <div className="data-preview-loading">
              Processing data... Please wait...
            </div>
          ) : error ? (
            <div className="data-preview-error">
              {error}
            </div>
          ) : (
            <>
              <p className="mb-4">
                Review the extracted data before sending it to the Data Management section.
              </p>
              {renderPreview()}
            </>
          )}
        </div>
        
        <div className="data-preview-actions">
          <button 
            className="data-preview-button data-preview-button-secondary" 
            onClick={onClose}
            disabled={processing}
          >
            Cancel
          </button>
          <button 
            className="data-preview-button data-preview-button-primary" 
            onClick={handleConfirm}
            disabled={loading || processing || !!error || !extractedData}
          >
            {processing ? 'Processing...' : 'Send to Data'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataPreviewModal; 