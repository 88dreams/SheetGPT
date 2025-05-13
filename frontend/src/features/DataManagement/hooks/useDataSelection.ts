import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../../utils/api';
import { useNotification } from '../../../contexts/NotificationContext';

export interface StructuredDataItem {
  id: string;
  data_type: string;
  created_at: string;
  data?: any;
  meta_data?: {
    name?: string;
    source?: string;
    message_id?: string;
    conversation_id?: string;
    [key: string]: any;
  };
}

export interface UseDataSelectionResult {
  messageId: string | null;
  structuredData: StructuredDataItem[] | undefined;
  isLoading: boolean;
  allDataError: Error | null;
  selectedDataId: string | null;
  selectedData: StructuredDataItem | null | undefined;
  handleSelectData: (dataId: string) => void;
  handleDeleteData: (dataId: string, e: React.MouseEvent) => Promise<void>;
  refetchAllData: () => Promise<any>;
}

/**
 * Hook for handling structured data selection and management
 * Provides functionality for loading, selecting, and managing structured data
 */
export const useDataSelection = (): UseDataSelectionResult => {
  const [searchParams] = useSearchParams();
  const messageId = searchParams.get('message');
  const selectedFromParams = searchParams.get('selected');
  const [selectedDataId, setSelectedDataId] = useState<string | null>(null);
  const [isVerifyingData, setIsVerifyingData] = useState(false);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  
  console.log('[useDataSelection] Initializing - selectedDataId from state:', selectedDataId);

  // Store the selected data ID in session storage when it changes
  useEffect(() => {
    if (selectedDataId) {
      // console.log('DataManagement: Storing selected data ID in session storage:', selectedDataId); // Original log
      sessionStorage.setItem('last_selected_data_id', selectedDataId);
    }
  }, [selectedDataId]);

  // Restore the selected data ID from session storage on mount
  useEffect(() => {
    if (!selectedDataId && !selectedFromParams) {
      const storedDataId = sessionStorage.getItem('last_selected_data_id');
      if (storedDataId) {
        console.log('[useDataSelection] Restoring selectedDataId from session storage:', storedDataId);
        setSelectedDataId(storedDataId);
      }
    }
  }, [selectedDataId, selectedFromParams]);

  // Handle selection from URL params
  useEffect(() => {
    if (selectedFromParams) {
      console.log('[useDataSelection] Setting selectedDataId from URL parameter:', selectedFromParams);
      setSelectedDataId(selectedFromParams);
      sessionStorage.setItem('last_selected_data_id', selectedFromParams);
    }
  }, [selectedFromParams]);
  
  // Check for recently created data ID from MessageItem
  useEffect(() => {
    const recentDataId = sessionStorage.getItem('recent_data_id');
    if (recentDataId && (!selectedDataId || selectedDataId !== recentDataId)) {
      console.log('[useDataSelection] Setting selectedDataId from recent_data_id:', recentDataId);
      setSelectedDataId(recentDataId);
      sessionStorage.removeItem('recent_data_id');
    }
  }, [selectedDataId]);

  // Query for all structured data
  const { 
    data: structuredData,
    isLoading: isLoadingAll,
    error: allDataError,
    refetch: refetchAllData
  } = useQuery<StructuredDataItem[], Error>(
    ['structured-data'], 
    () => api.data.getStructuredData(), 
    {
      staleTime: 1000 * 60 * 15,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
    });

  // Query for specific message data when messageId is present
  const {
    data: messageData,
    isLoading: isLoadingMessage,
    error: messageError,
    refetch: refetchMessageData
  } = useQuery<StructuredDataItem | null, Error>(
    ['structured-data', 'message', messageId], 
    () => messageId ? api.data.getStructuredDataByMessageId(messageId) : Promise.resolve(null), 
    {
      enabled: !!messageId,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 1000 * 60 * 15,
      refetchOnWindowFocus: true,
      refetchOnMount: true
    });

  // Query for selected data details with increased reliability
  const {
    data: selectedData,
    isLoading: isLoadingSelected,
    error: selectedDataError,
    refetch: refetchSelectedData
  } = useQuery<StructuredDataItem | null, Error>(
    ['structured-data', selectedDataId], 
    () => {
      if (!selectedDataId) return Promise.resolve(null);
      console.log('[useDataSelection] Querying for selectedDataId:', selectedDataId);
      return api.data.getStructuredDataById(selectedDataId);
    }, 
    {
      enabled: !!selectedDataId,
      retry: 3,
      retryDelay: 1000,
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    });

  // Enhanced verification for message data
  useEffect(() => {
    if (messageId && !messageData && !isLoadingMessage && verificationAttempts < 5) {
      // If we have a messageId but no data yet, start verification process
      setIsVerifyingData(true);
      
      const verifyDataExists = async () => {
        console.log(`DataManagement: Verification attempt ${verificationAttempts + 1} for message ID:`, messageId);
        
        try {
          // Try to get all data first to see if our item exists
          const allData = await api.data.getStructuredData();
          const existingItem = allData.find(item => 
            item.meta_data && item.meta_data.message_id === messageId
          );
          
          if (existingItem) {
            console.log('DataManagement: Found data during verification:', existingItem.id);
            // Force a refetch of the message data
            await refetchMessageData();
            setIsVerifyingData(false);
            return;
          }
          
          // If not found in all data, try direct API call
          try {
            const data = await api.data.getStructuredDataByMessageId(messageId);
            if (data) {
              console.log('DataManagement: Found data via direct API call during verification:', data.id);
              await refetchMessageData();
              setIsVerifyingData(false);
              return;
            }
          } catch (error) {
            console.log('DataManagement: Direct API call failed during verification:', error);
          }
          
          // If we get here, data wasn't found
          setVerificationAttempts(prev => prev + 1);
          
          // Schedule another verification attempt after a delay
          if (verificationAttempts < 4) {
            setTimeout(() => {
              refetchMessageData();
            }, 1000 * (verificationAttempts + 1)); // Increasing backoff
          } else {
            setIsVerifyingData(false);
            console.error('DataManagement: Data verification failed after multiple attempts');
            showNotification('error', 'Could not verify data was processed completely');
          }
        } catch (error) {
          console.error('DataManagement: Error during data verification:', error);
          setVerificationAttempts(prev => prev + 1);
          setIsVerifyingData(false);
        }
      };
      
      verifyDataExists();
    }
  }, [messageId, messageData, isLoadingMessage, verificationAttempts, refetchMessageData, showNotification]);

  // Set selected data when message data is loaded
  useEffect(() => {
    if (messageData) {
      console.log('DataManagement: Setting selected data from message data:', {
        id: messageData.id,
        dataType: messageData.data_type,
        hasData: !!messageData.data,
        dataKeys: messageData.data ? Object.keys(messageData.data) : []
      });
      setSelectedDataId(messageData.id);
      setIsVerifyingData(false);
      setVerificationAttempts(0);
      
      // Force a refetch of all data to ensure the sidebar is updated
      refetchAllData();
      
      // Force a refetch of the selected data to ensure we have the latest
      queryClient.invalidateQueries({ queryKey: ['structured-data', messageData.id] });
    } else if (messageId && !isLoadingMessage && verificationAttempts >= 5) {
      console.error('DataManagement: No data found for message ID after verification:', messageId);
    }
  }, [messageData, messageId, isLoadingMessage, queryClient, refetchAllData, verificationAttempts]);

  // Refetch data when selectedDataId changes
  useEffect(() => {
    if (selectedDataId) {
      console.log('DataManagement: Selected data ID changed, refetching:', selectedDataId);
      refetchSelectedData();
    }
  }, [selectedDataId, refetchSelectedData]);

  // Log selected data details
  useEffect(() => {
    if (selectedData && typeof selectedData === 'object') {
      console.log('DataManagement: Selected data loaded:', {
        id: selectedData.id,
        dataType: selectedData.data_type,
        hasData: !!selectedData.data,
        dataKeys: selectedData.data ? Object.keys(selectedData.data) : [],
        metaData: selectedData.meta_data,
        dataContent: selectedData.data ? JSON.stringify(selectedData.data).substring(0, 100) + '...' : 'empty'
      });
    } else if (selectedDataId && !isLoadingSelected) {
      console.error('DataManagement: No data returned for selected ID:', selectedDataId);
    }
  }, [selectedData, selectedDataId, isLoadingSelected]);

  // Handle errors
  useEffect(() => {
    if (messageError) {
      console.error('DataManagement: Error loading message data:', messageError);
    }
  }, [messageError]);

  useEffect(() => {
    if (selectedDataError) {
      console.error('DataManagement: Error loading selected data:', selectedDataError);
    }
  }, [selectedDataError]);

  // Handle data selection
  const handleSelectData = (dataId: string) => {
    console.log('[useDataSelection] handleSelectData called with ID:', dataId);
    setSelectedDataId(dataId);
  };

  // Add log before calculating final isLoading
  console.log('[useDataSelection] Calculating isLoading. Individual states:', {
    isLoadingAll,
    isLoadingMessage,
    isLoadingSelected,
    isVerifyingData,
    currentSelectedDataId: selectedDataId
  });

  // const isLoading = isLoadingAll || isLoadingMessage || isLoadingSelected || isVerifyingData;
  const isLoading = 
    isLoadingAll || 
    (!!messageId && isLoadingMessage) || 
    (!!selectedDataId && isLoadingSelected) || 
    isVerifyingData;

  // Delete data functionality
  const handleDeleteData = async (dataId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the selection
    
    if (window.confirm('Are you sure you want to delete this data?')) {
      try {
        await api.data.deleteStructuredData(dataId);
        showNotification('success', 'Data deleted successfully');
        queryClient.invalidateQueries({ queryKey: ['structured-data'] });
        
        // If the deleted data was selected, clear selection
        if (selectedDataId === dataId) {
          setSelectedDataId(null);
        }
      } catch (error) {
        console.error('Failed to delete data:', error);
        showNotification('error', 'Failed to delete data');
      }
    }
  };

  return {
    messageId,
    structuredData,
    isLoading,
    allDataError: allDataError instanceof Error ? allDataError : null,
    selectedDataId,
    selectedData,
    handleSelectData,
    handleDeleteData,
    refetchAllData
  };
};