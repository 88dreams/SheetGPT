import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import { api } from '../../../utils/api';

export interface ExtractedData {
  headers: string[];
  rows: any[][];
  meta_data?: {
    name?: string;
    source?: string;
    conversation_id?: string;
    message_id?: string;
    [key: string]: any;
  };
}

export interface UseExtractedDataResult {
  extractedData: ExtractedData | null;
  handleSaveExtractedData: () => Promise<void>;
  handleClosePreview: () => void;
}

/**
 * Hook for managing extracted data preview and persistence
 * Handles loading extracted data from session storage and saving it to the database
 */
export const useExtractedData = (
  refetchAllData: () => void, 
  setSelectedDataId: (id: string) => void
): UseExtractedDataResult => {
  const [searchParams] = useSearchParams();
  const messageId = searchParams.get('message');
  const isExtracted = searchParams.get('extracted') === 'true';
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const { showNotification } = useNotification();

  // Load extracted data from session storage
  useEffect(() => {
    // Check for preview data first (higher priority)
    try {
      const previewData = sessionStorage.getItem('preview_data');
      if (previewData) {
        console.log('Found preview data in storage, loading...');
        const parsedData = JSON.parse(previewData);
        setExtractedData(parsedData);
        setTimeout(() => {
          showNotification('success', 'Showing extracted data preview');
        }, 100);
        
        // Clear it after loading to prevent showing on refresh
        sessionStorage.removeItem('preview_data');
        return;
      }
      
      // Fall back to checking for extraction params
      if (isExtracted && messageId) {
        const storedData = sessionStorage.getItem('latest_extracted_data');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          setExtractedData(parsedData);
          setTimeout(() => {
            showNotification('success', 'Data loaded from extraction');
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error loading data from session storage:', error);
    }
  }, []); // Empty dependency array - only run once on mount

  const handleSaveExtractedData = async () => {
    if (extractedData && extractedData.headers && extractedData.rows) {
      showNotification('info', 'Saving data to database...');
      try {
        const response = await api.data.createStructuredData({
          conversation_id: extractedData.meta_data?.conversation_id || 'unknown',
          data_type: 'tabular',
          schema_version: '1.0',
          data: {
            rows: extractedData.rows || [],
            column_order: extractedData.headers || []
          },
          meta_data: extractedData.meta_data || {}
        });
        
        showNotification('success', 'Data saved to database successfully');
        refetchAllData();
        
        // Instead of clearing data, set the selected data to show the saved item
        if (response && response.id) {
          console.log('Setting selected data to newly created item:', response.id);
          setSelectedDataId(response.id);
          // Don't clear the preview until we've selected the saved data
          setTimeout(() => {
            setExtractedData(null);
          }, 1000);
        }
      } catch (error: any) {
        showNotification('error', 'Failed to save data: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const handleClosePreview = () => {
    setExtractedData(null);
  };

  return {
    extractedData,
    handleSaveExtractedData,
    handleClosePreview
  };
};