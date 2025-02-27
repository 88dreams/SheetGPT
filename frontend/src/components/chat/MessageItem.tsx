import React, { useState, useEffect } from 'react'
import { Message } from '../../utils/api'
// @ts-ignore
import ReactMarkdown from 'react-markdown'
// @ts-ignore
import { formatDistanceToNow } from 'date-fns'
// @ts-ignore
import { FaTable, FaMapMarkedAlt } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { useDataManagement } from '../../hooks/useDataManagement'
import { DataExtractionService } from '../../services/DataExtractionService'
import { api } from '../../utils/api'
import DataPreviewModal from './DataPreviewModal'
import SportDataMapper from '../data/SportDataMapper'
import '../../styles/dataPreviewModal.css'

interface DataExtractionModalProps {
  message: Message
  onClose: () => void
  onExtract: (data: any) => void
}

const DataExtractionModal: React.FC<DataExtractionModalProps> = ({ message, onClose, onExtract }) => {
  const [extractedData, setExtractedData] = useState<any>(null)
  const [targetDataId, setTargetDataId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const extractData = () => {
    setLoading(true)
    setError(null)
    
    try {
      const jsonMatches = message.content.match(/\{[\s\S]*?\}/g) || []
      const jsonArrayMatches = message.content.match(/\[[\s\S]*?\]/g) || []
      
      const allMatches = [...jsonMatches, ...jsonArrayMatches]
      
      if (allMatches.length === 0) {
        setError('No structured data found in this message')
        setLoading(false)
        return
      }
      
      const parsedData: any[] = []
      for (const match of allMatches) {
        try {
          const data = JSON.parse(match)
          parsedData.push(data)
        } catch (e) {
          // Skip invalid JSON
        }
      }
      
      if (parsedData.length === 0) {
        setError('Could not parse any valid data structures')
        setLoading(false)
        return
      }
      
      setExtractedData(parsedData[0])
      setLoading(false)
    } catch (e) {
      setError('Error extracting data: ' + (e as Error).message)
      setLoading(false)
    }
  }
  
  React.useEffect(() => {
    extractData()
  }, [message])
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Extract Data from Message</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
        
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : error ? (
          <div className="text-red-500 py-4">{error}</div>
        ) : extractedData ? (
          <>
            <div className="mb-4">
              <h3 className="text-md font-medium mb-2">Extracted Data:</h3>
              <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-60 border border-gray-300">
                {JSON.stringify(extractedData, null, 2)}
              </pre>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Target Data Table:
              </label>
              <input 
                type="text" 
                value={targetDataId}
                onChange={(e) => setTargetDataId(e.target.value)}
                placeholder="Enter Data ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => onExtract({ dataId: targetDataId, data: extractedData })}
                disabled={!targetDataId}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Append to Data
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">No data found</div>
        )}
      </div>
    </div>
  )
}

interface MessageItemProps {
  message: Message
  isLastMessage?: boolean
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, isLastMessage }) => {
  const navigate = useNavigate()
  const dataManagement = useDataManagement()
  const [showDataPreview, setShowDataPreview] = useState(false)
  const [extractedData, setExtractedData] = useState<any>(null)
  // Add state for SportDataMapper
  const [showSportDataMapper, setShowSportDataMapper] = useState(false)
  const [sportMapperData, setSportMapperData] = useState<any>(null)
  // Add a key to force re-render of SportDataMapper when data changes
  const [mapperKey, setMapperKey] = useState(0)
  // Add state for loading data
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionError, setExtractionError] = useState<string | null>(null)
  
  // Handle data extraction for the data preview modal
  const handleDataExtraction = async (extractedData: any) => {
    try {
      console.log('MessageItem: Handling data extraction', extractedData);
      
      // Create structured data in the backend
      const newData = await api.data.createStructuredData({
        data_type: 'extracted',
        meta_data: {
          message_id: message.id,
          conversation_id: message.conversation_id,
          extracted_at: new Date().toISOString(),
          name: `Data from ${new Date().toLocaleString()}`
        }
      });
      
      console.log('MessageItem: Created new structured data', newData);
      
      // Navigate to the data view
      navigate(`/data/${newData.id}`);
      
      // Close the modal
      setShowDataPreview(false);
    } catch (error) {
      console.error('MessageItem: Error handling data extraction', error);
    }
  };

  // Function to extract data from message content and open SportDataMapper
  const extractAndOpenSportDataMapper = () => {
    setIsExtracting(true);
    setExtractionError(null);
    
    try {
      // Use the DataExtractionService to extract structured data from the message content
      const extractedData = DataExtractionService.extractStructuredData(message.content);
      
      if (!extractedData) {
        setExtractionError('No structured data found in this message');
        setIsExtracting(false);
        alert('No structured data found in this message. Please make sure the message contains tables or structured data.');
        return;
      }
      
      console.log('MessageItem: Extracted real data from message', extractedData);
      
      // Add metadata to indicate this is real extracted data
      const dataWithMetadata = {
        ...extractedData,
        meta_data: {
          ...(extractedData.meta_data || {}),
          source: 'message-extracted-data',
          message_id: message.id,
          conversation_id: message.conversation_id,
          extracted_at: new Date().toISOString(),
          is_test_data: false,
          note: 'This is real data extracted from the message content'
        }
      };
      
      // Ensure we have a valid data structure before opening the mapper
      // This is the key fix - ensure we have a properly formatted structure
      let validData = dataWithMetadata;
      
      // If we have rows but no headers, try to create headers from the first row's keys
      if (validData.rows && Array.isArray(validData.rows) && validData.rows.length > 0 && !validData.headers) {
        if (typeof validData.rows[0] === 'object' && validData.rows[0] !== null) {
          validData.headers = Object.keys(validData.rows[0]);
        }
      }
      
      // Create a default empty structure if we don't have valid data
      if (!validData.rows && !validData.headers) {
        console.warn('MessageItem: Creating default structure for SportDataMapper');
        validData = {
          headers: ['Sample'],
          rows: [['No data found']],
          meta_data: {
            source: 'message-extracted-data',
            message_id: message.id,
            conversation_id: message.conversation_id,
            extracted_at: new Date().toISOString(),
            is_test_data: false,
            note: 'This is empty data with default structure'
          }
        };
      }
      
      // Set the data and show the SportDataMapper
      setSportMapperData(validData);
      
      // Increment key to force re-render
      setMapperKey(prevKey => prevKey + 1);
      
      // Only open the modal after data is properly set
      setTimeout(() => {
        setShowSportDataMapper(true);
        console.log('MessageItem: Opening SportDataMapper with extracted data', validData);
      }, 100);
    } catch (error) {
      console.error('MessageItem: Error extracting data', error);
      setExtractionError(`Error extracting data: ${(error as Error).message}`);
      alert(`Error extracting data: ${(error as Error).message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  // Add debug logging for rendering
  useEffect(() => {
    if (message.role === 'assistant') {
      console.log('MessageItem: Assistant message detected, should show buttons', message.id);
    }
  }, [message.id, message.role]);

  return (
    <div className={`p-4 ${message.role === 'user' ? 'bg-blue-50' : 'bg-white'}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'
          }`}>
            {message.role === 'user' ? 'U' : 'A'}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-500 mb-1">
            {message.role === 'user' ? 'You' : 'Assistant'} • {
              formatDistanceToNow(new Date(message.created_at), { addSuffix: true })
            }
          </div>
          <div className="prose max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
          
          {message.role === 'assistant' && (
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => setShowDataPreview(true)}
                className="inline-flex items-center px-2 py-1 border border-blue-500 text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                <FaTable className="mr-1" />
                Send to Data
              </button>
              
              <button
                onClick={extractAndOpenSportDataMapper}
                disabled={isExtracting}
                className="inline-flex items-center px-2 py-1 border border-green-500 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-sm"
              >
                <FaMapMarkedAlt className="mr-1" />
                {isExtracting ? 'Extracting...' : 'Map Sports Data'}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Data Preview Modal */}
      <DataPreviewModal
        isOpen={showDataPreview}
        onClose={() => setShowDataPreview(false)}
        messageContent={message.content}
        onConfirm={handleDataExtraction}
      />
      
      {/* Sport Data Mapper Modal */}
      <SportDataMapper
        key={mapperKey}
        isOpen={showSportDataMapper}
        onClose={() => setShowSportDataMapper(false)}
        structuredData={sportMapperData}
      />
    </div>
  )
}

export default MessageItem 