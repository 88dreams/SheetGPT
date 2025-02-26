import React, { useState, useEffect } from 'react'
import { Message } from '../../utils/api'
// @ts-ignore
import ReactMarkdown from 'react-markdown'
// @ts-ignore
import { formatDistanceToNow } from 'date-fns'
// @ts-ignore
import { FaTable, FaPlus, FaFileExport, FaDatabase, FaFlask } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { useDataManagement } from '../../hooks/useDataManagement'
import { DataExtractionService } from '../../services/DataExtractionService'
import { api } from '../../utils/api'
import DataPreviewModal from './DataPreviewModal'
import SportDataMapper from '../data/SportDataMapper'
import '../../styles/dataPreviewModal.css'

// SUPER VISIBLE DEBUG MESSAGE
console.log('%c MessageItem.tsx LOADED - TEST CHANGE at ' + new Date().toISOString(), 'background: #ff0000; color: #ffffff; font-size: 16px; padding: 10px;');
console.log('If you can see this message, the MessageItem component is being loaded correctly');

// TEST CHANGE: This comment should be reflected in the container if volume mounting is working
console.log('MessageItem.tsx loaded - TEST CHANGE at', new Date().toISOString());

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
  const [showSportDataMapper, setShowSportDataMapper] = useState(false)
  const [extractedData, setExtractedData] = useState<any>(null)
  const [sportsMappingData, setSportsMappingData] = useState<any>(null)
  
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

  // Handle sports data mapping
  const handleSportsDataMapping = () => {
    try {
      // Extract data from the message
      const data = DataExtractionService.extractStructuredData(message.content);
      
      if (!data) {
        console.error('MessageItem: No structured data found for sports mapping');
        return;
      }
      
      // Set the data for the sports mapper
      setSportsMappingData(data);
      
      // Open the sports data mapper modal
      setShowSportDataMapper(true);
    } catch (error) {
      console.error('MessageItem: Error preparing sports data mapping', error);
    }
  };
  
  // Check if the message contains structured data that might be sports-related
  const detectSportsData = () => {
    try {
      console.log('MessageItem: Checking if message contains sports data', message.id);
      const data = DataExtractionService.extractStructuredData(message.content);
      console.log('MessageItem: Extracted structured data:', data);
      
      if (!data) {
        console.log('MessageItem: No structured data found');
        return false;
      }
      
      const detection = DataExtractionService.detectSportsDataType(data);
      console.log('MessageItem: Sports data detection result:', detection);
      
      return detection.isSportsData;
    } catch (error) {
      console.error('MessageItem: Error detecting sports data', error);
      return false;
    }
  };
  
  // Determine if the message might contain sports data
  const mightContainSportsData = message.role === 'assistant' && detectSportsData();
  
  // Debug logging
  console.log('MessageItem: Rendering message', {
    id: message.id,
    role: message.role,
    mightContainSportsData,
    showTestButton: true // Always show test button for debugging
  });

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
            <div className="mt-2 flex space-x-2">
              <button
                onClick={() => setShowDataPreview(true)}
                className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <FaTable className="mr-1" />
                Send to Data
              </button>
              
              {mightContainSportsData && (
                <button
                  onClick={handleSportsDataMapping}
                  className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <FaDatabase className="mr-1" />
                  Map to Sports Database
                </button>
              )}
            </div>
          )}
          
          {/* STANDALONE TEST BUTTON - ALWAYS VISIBLE */}
          <div className="mt-2 flex space-x-2" style={{ border: '2px solid red', padding: '5px', backgroundColor: '#ffeeee' }}>
            <button
              onClick={() => {
                // Add a very visible console message
                console.log('%c TEST BUTTON CLICKED - OPENING SPORT DATA MAPPER ', 'background: #ff0000; color: #ffffff; font-size: 20px;');
                console.log('Test: Opening SportDataMapper with sample data - TEST BUTTON CLICKED');
                // Create sample sports data for testing
                const sampleData = {
                  headers: ['Team', 'City', 'State', 'Stadium', 'Founded'],
                  rows: [
                    ['Dallas Cowboys', 'Dallas', 'TX', 'AT&T Stadium', '1960'],
                    ['New York Giants', 'East Rutherford', 'NJ', 'MetLife Stadium', '1925'],
                    ['Philadelphia Eagles', 'Philadelphia', 'PA', 'Lincoln Financial Field', '1933'],
                    ['Washington Commanders', 'Landover', 'MD', 'FedExField', '1932'],
                    ['TEST TEAM', 'Test City', 'TS', 'Test Stadium', '2025'] // Added test team for visibility
                  ],
                  meta_data: {
                    source: 'test-data',
                    data_type: 'sports-data',
                    extracted_at: new Date().toISOString(),
                    test_flag: true // Added flag to identify test data
                  }
                };
                console.log('Test: Sample data created', sampleData);
                setSportsMappingData(sampleData);
                console.log('Test: Setting showSportDataMapper to true');
                setShowSportDataMapper(true);
                console.log('Test: SportDataMapper should now be visible');
                
                // Add an alert to make it very obvious
                alert('Test button clicked! Check console for logs and watch for the SportDataMapper modal.');
              }}
              className="inline-flex items-center px-2.5 py-1.5 border border-red-500 text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              style={{ fontSize: '14px', padding: '10px', marginTop: '10px' }}
            >
              <FaFlask className="mr-1" size={18} />
              TEST MAPPER BUTTON
            </button>
          </div>
          
          {/* Always show buttons regardless of message role */}
          <div className="mt-2 flex space-x-2">
            <button
              onClick={() => setShowDataPreview(true)}
              className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <FaTable className="mr-1" />
              Send to Data
            </button>
            
            {mightContainSportsData && (
              <button
                onClick={handleSportsDataMapping}
                className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <FaDatabase className="mr-1" />
                Map to Sports Database
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Data Preview Modal */}
      <DataPreviewModal
        isOpen={showDataPreview}
        onClose={() => setShowDataPreview(false)}
        messageContent={message.content}
        onConfirm={handleDataExtraction}
      />
      
      {/* Sports Data Mapper Modal */}
      <SportDataMapper
        isOpen={showSportDataMapper}
        onClose={() => setShowSportDataMapper(false)}
        structuredData={sportsMappingData}
      />
    </div>
  )
}

export default MessageItem 