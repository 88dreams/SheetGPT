import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useNotification } from '../contexts/NotificationContext'
import { useDataFlow } from '../contexts/DataFlowContext'
import { api } from '../utils/api'
import type { StructuredData } from '../utils/api'
import LoadingSpinner from '../components/common/LoadingSpinner'
import DataTable from '../components/data/DataTable'
import PageContainer from '../components/common/PageContainer'
// @ts-ignore
import { FaTrash, FaFileExport } from 'react-icons/fa'

const DataManagement: React.FC = () => {
  const [searchParams] = useSearchParams()
  const messageId = searchParams.get('message')
  const [selectedDataId, setSelectedDataId] = useState<string | null>(null)
  const [isVerifyingData, setIsVerifyingData] = useState(false)
  const [verificationAttempts, setVerificationAttempts] = useState(0)
  const { showNotification } = useNotification()
  const { setDestination } = useDataFlow()
  const queryClient = useQueryClient()

  // Query for all structured data
  const { 
    data: structuredData,
    isLoading: isLoadingAll,
    error: allDataError,
    refetch: refetchAllData
  } = useQuery({
    queryKey: ['structured-data'],
    queryFn: () => api.data.getStructuredData(),
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 60, // 60 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })

  // Update data flow when component mounts
  useEffect(() => {
    setDestination('data')
  }, [setDestination])

  // Query for specific message data when messageId is present
  const {
    data: messageData,
    isLoading: isLoadingMessage,
    error: messageError,
    refetch: refetchMessageData
  } = useQuery({
    queryKey: ['structured-data', 'message', messageId],
    queryFn: () => messageId ? api.data.getStructuredDataByMessageId(messageId) : Promise.resolve(null),
    enabled: !!messageId,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 60, // 60 minutes
    refetchOnWindowFocus: false
  })

  // Refetch all data when the component mounts or when messageId changes
  useEffect(() => {
    console.log('DataManagement: Refetching all structured data');
    refetchAllData();
  }, [refetchAllData, messageId]);

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

  // Query for selected data details with increased reliability
  const {
    data: selectedData,
    isLoading: isLoadingSelected,
    error: selectedDataError,
    refetch: refetchSelectedData
  } = useQuery({
    queryKey: ['structured-data', selectedDataId],
    queryFn: () => {
      if (!selectedDataId) return Promise.resolve(null);
      console.log('DataManagement: Fetching selected data for ID:', selectedDataId);
      return api.data.getStructuredDataById(selectedDataId);
    },
    enabled: !!selectedDataId,
    retry: 3, // Retry up to 3 times if the query fails
    retryDelay: 1000, // Wait 1 second between retries
    staleTime: 0 // Consider data immediately stale to ensure fresh data
  })

  // Refetch data when selectedDataId changes
  useEffect(() => {
    if (selectedDataId) {
      console.log('DataManagement: Selected data ID changed, refetching:', selectedDataId);
      refetchSelectedData();
    }
  }, [selectedDataId, refetchSelectedData]);

  useEffect(() => {
    if (selectedData) {
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

  // Handle message error
  useEffect(() => {
    if (messageError) {
      console.error('DataManagement: Error loading message data:', messageError);
    }
  }, [messageError]);

  // Handle selected data error
  useEffect(() => {
    if (selectedDataError) {
      console.error('DataManagement: Error loading selected data:', selectedDataError);
    }
  }, [selectedDataError]);

  const isLoading = isLoadingAll || isLoadingMessage || isLoadingSelected || isVerifyingData

  // Add delete data functionality
  const handleDeleteData = async (dataId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the selection
    
    if (window.confirm('Are you sure you want to delete this data?')) {
      try {
        await api.data.deleteStructuredData(dataId)
        showNotification('success', 'Data deleted successfully')
        queryClient.invalidateQueries({ queryKey: ['structured-data'] })
        
        // If the deleted data was selected, clear selection
        if (selectedDataId === dataId) {
          setSelectedDataId(null)
        }
      } catch (error) {
        console.error('Failed to delete data:', error)
        showNotification('error', 'Failed to delete data')
      }
    }
  }

  // Handle data selection
  const handleSelectData = (dataId: string) => {
    console.log('DataManagement: Selecting data ID:', dataId);
    setSelectedDataId(dataId);
  }

  // Create page actions
  const pageActions = (
    <div className="flex gap-2">
      <button 
        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 flex items-center"
        onClick={() => window.location.href = '/export'}
        disabled={!selectedDataId}
      >
        <FaFileExport className="mr-2" /> Export
      </button>
    </div>
  )

  return (
    <PageContainer
      title="Data Management"
      description="View, manage, and export your structured data"
      actions={pageActions}
    >
      {isLoadingAll ? (
        <LoadingSpinner />
      ) : allDataError ? (
        <div className="text-red-500">Error loading data</div>
      ) : structuredData && structuredData.length > 0 && selectedDataId ? (
        <DataTable dataId={selectedDataId} />
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No structured data available</p>
          <p className="text-sm text-gray-400 mt-2">
            Start a chat conversation and extract data to see it here
          </p>
        </div>
      )}
    </PageContainer>
  )
}

export default DataManagement 