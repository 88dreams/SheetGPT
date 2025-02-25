import React, { useState } from 'react'
import { Message } from '../../utils/api'
// @ts-ignore
import ReactMarkdown from 'react-markdown'
// @ts-ignore
import { formatDistanceToNow } from 'date-fns'
// @ts-ignore
import { FaTable, FaPlus, FaFileExport } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { useDataManagement } from '../../hooks/useDataManagement'

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
  isLast: boolean
  conversationTitle?: string
}

const MessageItem: React.FC<MessageItemProps> = ({ message, isLast, conversationTitle }) => {
  const [showDataModal, setShowDataModal] = useState(false)
  const navigate = useNavigate()
  
  const handleExtractData = (extractedInfo: { dataId: string, data: any }) => {
    // Include conversation title in metadata if available
    const metadata = conversationTitle 
      ? { 
          source: 'message', 
          name: `Data from: ${conversationTitle}`,
          conversation_title: conversationTitle 
        }
      : { source: 'message' };
    
    console.log('Extracting data with metadata:', metadata);
    
    // Here you would call the API to append the data with metadata
    // For now, we just navigate to the data view with the metadata as query params
    const queryParams = new URLSearchParams();
    queryParams.append('dataId', extractedInfo.dataId);
    if (metadata.name) {
      queryParams.append('name', metadata.name);
    }
    if (metadata.conversation_title) {
      queryParams.append('conversation_title', metadata.conversation_title);
    }
    
    navigate(`/data?${queryParams.toString()}`);
    
    setShowDataModal(false)
  }

  return (
    <div className={`p-4 ${message.role === 'assistant' ? 'bg-blue-50' : 'bg-white'}`}>
      <div className="flex items-start">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          message.role === 'assistant' ? 'bg-blue-500 text-white' : 'bg-gray-200'
        }`}>
          {message.role === 'assistant' ? 'AI' : 'U'}
        </div>
        <div className="ml-4 flex-1">
          <div className="flex justify-between items-center mb-1">
            <div className="font-medium">
              {message.role === 'assistant' ? 'Assistant' : 'You'}
            </div>
            <div className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
            </div>
          </div>
          <div className="prose max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
          
          <div className="mt-2 flex justify-end space-x-2">
            <button
              onClick={() => setShowDataModal(true)}
              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center"
              title="Extract data from this message"
            >
              <FaTable className="mr-1" size={12} />
              Extract Data
            </button>
          </div>
        </div>
      </div>
      
      {showDataModal && (
        <DataExtractionModal
          message={message}
          onClose={() => setShowDataModal(false)}
          onExtract={handleExtractData}
        />
      )}
    </div>
  )
}

export default MessageItem 