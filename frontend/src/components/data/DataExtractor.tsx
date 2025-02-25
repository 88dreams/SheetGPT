import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../utils/api'
import { DataExtractionService } from '../../services/DataExtractionService'
import LoadingSpinner from '../common/LoadingSpinner'
import { useNotification } from '../../contexts/NotificationContext'

interface DataExtractorProps {
  isOpen: boolean
  onClose: () => void
  conversationId?: string
  messageId?: string
  dataId?: string
}

const DataExtractor: React.FC<DataExtractorProps> = ({
  isOpen,
  onClose,
  conversationId,
  messageId,
  dataId: initialDataId
}) => {
  const [selectedDataId, setSelectedDataId] = useState(initialDataId || '')
  const [extractedData, setExtractedData] = useState<any>(null)
  const [transformedRows, setTransformedRows] = useState<any[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [isAppending, setIsAppending] = useState(false)
  const { showNotification } = useNotification()

  // Fetch available structured data
  const { data: structuredData, isLoading: isLoadingData } = useQuery({
    queryKey: ['structured-data'],
    queryFn: () => api.data.getStructuredData(),
    enabled: isOpen
  })

  // Fetch conversation if conversationId is provided
  const { data: conversation, isLoading: isLoadingConversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => api.chat.getConversation(conversationId!),
    enabled: isOpen && !!conversationId
  })

  // Extract data from conversation or specific message
  useEffect(() => {
    if (!isOpen || (!conversation && !messageId)) return

    const extractData = async () => {
      setIsExtracting(true)
      try {
        let content = ''
        
        if (messageId && conversation) {
          // Find specific message
          const message = conversation.messages.find(m => m.id === messageId)
          if (message) {
            content = message.content
          }
        } else if (conversation) {
          // Use all assistant messages
          content = conversation.messages
            .filter(m => m.role === 'assistant')
            .map(m => m.content)
            .join('\n\n')
        }
        
        if (!content) {
          setIsExtracting(false)
          return
        }
        
        // Extract structured data
        const extracted = DataExtractionService.extractStructuredData(content)
        setExtractedData(extracted)
        
        // Transform to row format if data was found
        if (extracted && (extracted.rows || extracted.columns)) {
          const rows = DataExtractionService.transformToRowFormat(extracted)
          setTransformedRows(rows)
        }
      } catch (error) {
        console.error('Error extracting data:', error)
        showNotification('error', 'Failed to extract data from conversation')
      } finally {
        setIsExtracting(false)
      }
    }
    
    extractData()
  }, [isOpen, conversation, messageId, showNotification])

  // Handle appending data
  const handleAppendData = async () => {
    if (!selectedDataId || transformedRows.length === 0) return
    
    setIsAppending(true)
    try {
      // Include conversation title in the data name if available
      const dataName = conversation?.title 
        ? `Data from: ${conversation.title}`
        : 'Extracted Data';
      
      console.log('Appending data with name:', dataName);
      console.log('Conversation title:', conversation?.title);
      
      // Use the DataExtractionService as the single source of truth for appending data
      const success = await DataExtractionService.appendRows(
        selectedDataId, 
        transformedRows,
        { 
          source: 'conversation', 
          name: dataName,
          conversation_title: conversation?.title || 'chat extraction'
        }
      );
      
      if (success) {
        // Verify the update was successful by fetching the data again
        try {
          const updatedData = await api.data.getStructuredDataById(selectedDataId);
          console.log('Final data after append:', {
            id: updatedData.id,
            meta_data: updatedData.meta_data,
            name: updatedData.meta_data?.name,
            conversation_title: updatedData.meta_data?.conversation_title
          });
        } catch (error) {
          console.error('Error verifying data update:', error);
        }
        
        showNotification('success', `Successfully appended ${transformedRows.length} rows to data`);
        onClose();
      } else {
        showNotification('error', 'Failed to append data');
      }
    } catch (error) {
      console.error('Error appending data:', error);
      showNotification('error', 'An error occurred while appending data');
    } finally {
      setIsAppending(false);
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Extract Data from Conversation</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {isLoadingConversation || isExtracting ? (
          <div className="py-8 text-center">
            <LoadingSpinner size="medium" />
            <p className="mt-2 text-gray-600">Extracting data from conversation...</p>
          </div>
        ) : !extractedData ? (
          <div className="py-8 text-center text-gray-600">
            No structured data found in this conversation.
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h3 className="text-md font-medium mb-2">Extracted Data:</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-md overflow-hidden">
                <div className="p-4 bg-gray-100 border-b border-gray-200 flex justify-between items-center">
                  <span className="font-medium">Preview</span>
                  <span className="text-sm text-gray-500">
                    {transformedRows.length} rows found
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {transformedRows.length > 0 &&
                          Object.keys(transformedRows[0]).map((key) => (
                            <th
                              key={key}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {key}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transformedRows.slice(0, 5).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {Object.values(row).map((value: any, valueIndex) => (
                            <td
                              key={valueIndex}
                              className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                            >
                              {typeof value === 'object'
                                ? JSON.stringify(value)
                                : String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {transformedRows.length > 5 && (
                        <tr>
                          <td
                            colSpan={Object.keys(transformedRows[0]).length}
                            className="px-6 py-4 text-center text-sm text-gray-500"
                          >
                            ... and {transformedRows.length - 5} more rows
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-md font-medium mb-2">Select Target Data:</h3>
              {isLoadingData ? (
                <div className="py-4 text-center">
                  <LoadingSpinner size="small" />
                </div>
              ) : (
                <select
                  value={selectedDataId}
                  onChange={(e) => setSelectedDataId(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a data table...</option>
                  {structuredData?.map((data) => (
                    <option key={data.id} value={data.id}>
                      {data.data_type} (Created: {new Date(data.created_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleAppendData}
                disabled={!selectedDataId || isAppending}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {isAppending && <LoadingSpinner size="small" className="text-white" />}
                <span>Append Data</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default DataExtractor 