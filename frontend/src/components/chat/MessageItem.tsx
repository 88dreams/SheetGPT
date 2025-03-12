import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { Message, api } from '../../utils/api'
import { useNotification } from '../../contexts/NotificationContext'
import { useDataManagement } from '../../hooks/useDataManagement'
import { FaTable, FaMapMarkedAlt, FaEye, FaEyeSlash } from 'react-icons/fa'
import DataPreviewModal from './DataPreviewModal'
import SportDataMapper from '../data/SportDataMapper'
import '../../styles/dataPreviewModal.css'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useChatContext } from '../../contexts/ChatContext'
// Note: Extraction service is now imported dynamically when needed

interface DataExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  onConfirm: (data: any) => void;
}

const DataExtractionModal: React.FC<DataExtractionModalProps> = ({ isOpen, onClose, data, onConfirm }) => {
  const [extractedData, setExtractedData] = useState<any>(null)
  const [targetDataId, setTargetDataId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const extractData = () => {
    setLoading(true)
    setError(null)
    
    try {
      const jsonMatches = data.content.match(/\{[\s\S]*?\}/g) || []
      const jsonArrayMatches = data.content.match(/\[[\s\S]*?\]/g) || []
      
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
  }, [data])
  
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
                onClick={() => onConfirm({ dataId: targetDataId, data: extractedData })}
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

export interface MessageItemProps {
  message: Message;
  isLastMessage?: boolean;
  onDataPreview?: (data: any) => Promise<any>;
  isProcessing?: boolean;
  onRepeat?: (content: string) => void;
  onStreamingStateChange?: (isStreaming: boolean) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ 
  message, 
  isLastMessage, 
  onDataPreview,
  isProcessing,
  onRepeat,
  onStreamingStateChange
}) => {
  const navigate = useNavigate()
  const dataManagement = useDataManagement()
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [showDataPreview, setShowDataPreview] = useState(false)
  const [extractedData, setExtractedData] = useState<string>('')
  const [showSportDataMapper, setShowSportDataMapper] = useState(false)
  const [sportMapperData, setSportMapperData] = useState<any>(null)
  const [mapperKey, setMapperKey] = useState(0)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionError, setExtractionError] = useState<string | null>(null)
  const [isProcessingTask, setIsProcessingTask] = useState(isProcessing)
  const { isDataVisible } = useChatContext()
  const [isStreaming, setIsStreaming] = useState(false)
  const [parsedData, setParsedData] = useState<any>(null)
  const [showData, setShowData] = useState(true)
  const [isDataComplete, setIsDataComplete] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now())
  const [isStuck, setIsStuck] = useState(false)
  const [currentPhase, setCurrentPhase] = useState<string>('idle')
  const [isComplete, setIsComplete] = useState(false)
  const prevContent = React.useRef('')

  const deleteMessageMutation = useMutation({
    mutationFn: async () => {
      await api.chat.deleteMessage(message.conversation_id, message.id)
    },
    onSuccess: () => {
      queryClient.setQueryData(['messages', message.conversation_id], (old: Message[] | undefined) => {
        if (!old) return old
        return old.filter(m => m.id !== message.id)
      })
      showNotification('success', 'Message deleted successfully')
    },
    onError: (error: Error) => {
      showNotification('error', `Failed to delete message: ${error.message}`)
    }
  })

  useEffect(() => {
    setIsProcessingTask(isProcessing)
  }, [isProcessing])
  
  // Notify parent when streaming state changes
  useEffect(() => {
    if (onStreamingStateChange && isLastMessage) {
      onStreamingStateChange(isStreaming)
    }
  }, [isStreaming, isLastMessage, onStreamingStateChange])

  useEffect(() => {
    if (!message.content) {
      setIsStreaming(false)
      setCurrentPhase('idle')
      setIsComplete(false)
      return
    }

    // Skip processing for existing messages when browsing through conversations
    // This prevents the streaming spinner from appearing for already complete messages
    if (!prevContent.current && message.content.trim().length > 0) {
      // This is the first time we're seeing this content (initial load of existing message)
      console.log('Initial load of existing message, forcing complete state:', message.id)
      prevContent.current = message.content
      setIsStreaming(false)
      setIsComplete(true)
      
      // Parse data section if present for existing messages
      if (message.content.includes('---DATA---')) {
        const parts = message.content.split('---DATA---')
        if (parts.length >= 2) {
          const dataText = parts[1].trim().replace('__STREAM_COMPLETE__', '')
          setStreamingContent(dataText)
          
          // Enhanced check for existing messages, similar to streaming check
          const hasHeaders = dataText.includes('"headers"') || dataText.includes('"Headers"');
          const hasRows = dataText.includes('"rows"') || dataText.includes('"Rows"');
          const hasClosingBraces = (
            dataText.endsWith('}}') || dataText.endsWith(']}') || 
            dataText.endsWith('"}]') || dataText.endsWith('"}') ||
            dataText.includes('}}__STREAM_COMPLETE__') || 
            dataText.includes(']}__STREAM_COMPLETE__')
          );
          const startsWithOpenBrace = dataText.trimStart().startsWith('{');
          
          // More permissive completion detection for existing messages
          const isLikelyComplete = (
            startsWithOpenBrace && 
            (hasClosingBraces || message.content.includes('[PHASE:COMPLETE]')) && 
            (hasHeaders || hasRows)
          );
          
          console.log('Existing message data check:', {
            isLikelyComplete,
            hasClosingBraces,
            hasHeaders,
            hasRows,
            startsWithOpenBrace
          });
          
          if (isLikelyComplete) {
            try {
              // Try to clean up any completion markers that might be in the JSON
              const cleanedData = dataText
                .replace('__STREAM_COMPLETE__', '')
                .replace('[STREAM_END]', '')
                .replace('[PHASE:COMPLETE]', '')
                .trim();
                
              const data = JSON.parse(cleanedData)
              setParsedData(data)
              setIsDataComplete(true)
              console.log('Successfully parsed existing message data')
            } catch (error) {
              console.log('Error parsing existing message data:', error)
              
              // For existing messages, we'll be more permissive and show the buttons
              // even if parsing fails, as long as the data looks reasonably complete
              if (hasHeaders && hasRows && startsWithOpenBrace) {
                console.log('Forcing data completion for existing message despite parse error');
                setIsDataComplete(true);
              } else {
                setIsDataComplete(false);
              }
            }
          } else {
            console.log('Existing message has incomplete data format')
            setIsDataComplete(false)
          }
        }
      }
      return
    }

    // Only process content changes for active streaming
    // Skip for complete messages when browsing conversations
    if (prevContent.current && message.content === prevContent.current) {
      return
    }

    // Track the latest phase
    const phases = {
      '[RESPONSE_START]': 'starting',
      '[PHASE:INITIAL]': 'initial',
      '[PHASE:SEARCHING]': 'searching',
      '[PHASE:PROCESSING]': 'processing',
      '[PHASE:FINALIZING]': 'finalizing',
      '[PHASE:STRUCTURING]': 'structuring',
      '[PHASE:COMPLETE]': 'complete',
      '[STREAM_END]': 'ended'
    }

    // Find the latest phase marker in the content
    let latestPhase = 'idle'
    let foundPhases: string[] = []
    
    Object.entries(phases).forEach(([marker, phase]) => {
      if (message.content.includes(marker)) {
        foundPhases.push(phase)
        latestPhase = phase
      }
    })

    // Enhanced search state detection
    const searchStart = message.content.lastIndexOf('[SEARCH]')
    const searchEnd = message.content.lastIndexOf('[/SEARCH]')
    const searchError = message.content.includes('Search service unavailable') || 
                       message.content.includes('Search timed out')
    
    const isInSearch = searchStart > -1 && (
      searchEnd === -1 || // No end tag yet
      searchEnd < searchStart || // Start of new search
      latestPhase === 'searching' // Explicitly in search phase
    )
    
    // The special stream complete marker is the definitive signal that streaming is done
    const hasCompletionMarker = message.content.includes('__STREAM_COMPLETE__');
    const hasPhaseComplete = message.content.includes('[PHASE:COMPLETE]');
    const hasStreamEnd = message.content.includes('[STREAM_END]');
    
    // Determine if a search is running or just completed
    const isSearching = isInSearch || latestPhase === 'searching';
    
    // Check if the data section looks complete if present
    let dataLooksComplete = false;
    if (message.content.includes('---DATA---')) {
      const parts = message.content.split('---DATA---');
      if (parts.length >= 2) {
        const dataText = parts[1].trim();
        dataLooksComplete = (
          (dataText.endsWith('}}') || dataText.endsWith(']}') || 
           dataText.endsWith('"}]') || dataText.endsWith('"}')) &&
          dataText.startsWith('{')
        );
      }
    }
    
    // Logging for debugging
    if (latestPhase !== currentPhase) {
      console.log(`Phase transition: ${currentPhase} -> ${latestPhase}`);
    }
    
    // Enhanced streaming state management
    // Additional checks for data completeness
    const dataSection = message.content.includes("---DATA---");
    const dataEndsWithBrace = message.content.includes('}}') || message.content.includes(']}');
    const hasJsonStructure = message.content.includes('"headers"') && message.content.includes('"rows"');
    
    console.log('Streaming state check:', {
      hasCompletionMarker,
      hasPhaseComplete,
      hasStreamEnd,
      dataLooksComplete,
      dataSection,
      dataEndsWithBrace,
      hasJsonStructure
    });
    
    // Force the streaming state to continue until we get the completion marker
    if (hasCompletionMarker) {
      console.log('Stream completion marker received - ending stream');
      setIsStreaming(false);
      setIsComplete(true);
    } else if (hasPhaseComplete || hasStreamEnd) {
      // Either phase complete or stream end markers present
      console.log('Phase complete or stream end marker received - ending stream');
      setIsStreaming(false);
      setIsComplete(true);
    } else if (dataSection && dataLooksComplete && hasJsonStructure) {
      // JSON data appears to be complete with headers and rows
      console.log('Data structure appears complete - ending stream');
      setIsStreaming(false);
      setIsComplete(true);
    } else if (dataSection && dataEndsWithBrace && hasJsonStructure) {
      // Backup check - if we have JSON structure and closing braces
      console.log('Data appears structurally complete - ending stream');
      setIsStreaming(false);
      setIsComplete(true);
    } else if (isSearching) {
      console.log('In search mode - continuing stream');
      setIsStreaming(true);
      setIsComplete(false);
      setLastUpdateTime(Date.now());
    } else if (message.content.trim().length > 0 && prevContent.current !== message.content) {
      // Only set streaming if content is actively changing
      console.log('Content received without completion marker - continuing stream');
      setIsStreaming(true);
      setIsComplete(false);
    }

    // Update the current phase
    setCurrentPhase(latestPhase)
    
    // Reset stuck timer on content update or phase change
    if (latestPhase !== currentPhase || message.content !== prevContent.current) {
      setLastUpdateTime(Date.now())
      setIsStuck(false)
    }
    
    // Store current content for comparison
    prevContent.current = message.content

    // Handle data section if present
    if (message.content.includes('---DATA---')) {
      const parts = message.content.split('---DATA---')
      if (parts.length >= 2) {
        const dataText = parts[1].trim().replace('__STREAM_COMPLETE__', '')
        
        if (dataText !== streamingContent) {
          setStreamingContent(dataText)
          setLastUpdateTime(Date.now())
          
          // Enhanced check to detect if the data is complete
          // We'll try to be more permissive about what looks like complete data
          const hasHeaders = dataText.includes('"headers"') || dataText.includes('"Headers"');
          const hasRows = dataText.includes('"rows"') || dataText.includes('"Rows"');
          const hasClosingBraces = (
            dataText.endsWith('}}') || dataText.endsWith(']}') || 
            dataText.endsWith('"}]') || dataText.endsWith('"}') ||
            dataText.includes('}}__STREAM_COMPLETE__') || 
            dataText.includes(']}__STREAM_COMPLETE__')
          );
          const startsWithOpenBrace = dataText.trimStart().startsWith('{');
          
          // More robust completion detection
          const isLikelyComplete = (
            startsWithOpenBrace && 
            hasClosingBraces && 
            (hasHeaders || hasRows)
          );
          
          // Forced completion based on stream markers
          const forceComplete = (
            hasCompletionMarker || 
            latestPhase === 'ended' || 
            latestPhase === 'complete' ||
            message.content.includes('[PHASE:COMPLETE]') ||
            message.content.includes('[STREAM_END]')
          );
          
          console.log('Data completion check:', {
            isLikelyComplete,
            forceComplete,
            hasClosingBraces,
            hasHeaders,
            hasRows,
            startsWithOpenBrace
          });
          
          if (isLikelyComplete || forceComplete) {
            try {
              // Try to clean up any completion markers that might be in the JSON
              const cleanedData = dataText
                .replace('__STREAM_COMPLETE__', '')
                .replace('[STREAM_END]', '')
                .replace('[PHASE:COMPLETE]', '')
                .trim();
                
              const data = JSON.parse(cleanedData);
              setParsedData(data);
              setIsDataComplete(true);
              console.log('Successfully parsed complete data');
            } catch (error) {
              console.log('Error parsing data (appears complete but invalid):', error);
              
              // If we have markers indicating completion, and it's a JSON error
              // we should still try to make the buttons available
              if (forceComplete) {
                console.log('Stream is complete but JSON parsing failed - forcing data completion');
                setIsDataComplete(true);
              } else {
                setIsDataComplete(false);
              }
            }
          } else {
            console.log('Data is still streaming, waiting for complete JSON');
            setIsDataComplete(false);
          }
        }
      }
    }
  }, [message.content, currentPhase])

  // Add effect to reset stuck state when streaming stops
  useEffect(() => {
    if (!isStreaming) {
      setIsStuck(false)
    }
  }, [isStreaming])

  // We've integrated this logic into the main content processing effect
  // This useEffect is now unnecessary as we detect initial messages in the main effect
  useEffect(() => {}, [])

  // Modify the stuck detection interval with shorter timeouts for better user experience
  useEffect(() => {
    if (!isStreaming) return

    // For completed messages with data section, force completion
    if (message.content && 
        message.content.includes("---DATA---") && 
        (message.content.includes("}]") || message.content.includes("}}"))) {
      console.log('Found completed data structure - forcing completion state')
      setIsStreaming(false)
      setIsComplete(true)
      return
    }

    // Initial short timeout for user feedback
    const shortTimeout = setTimeout(() => {
      const timeSinceLastUpdate = Date.now() - lastUpdateTime
      if (timeSinceLastUpdate > 8000) { // 8 seconds with no update
        console.log('Initial stuck check triggered - no updates for 8s')
        setIsStuck(true)
      }
    }, 8000)
    
    // Shorter timeout that will force streaming to end completely
    const longTimeout = setTimeout(() => {
      const timeSinceLastUpdate = Date.now() - lastUpdateTime
      if (timeSinceLastUpdate > 15000) { // 15 seconds
        console.log('Long stuck check triggered - no updates for 15s, ending stream')
        setIsStuck(true)
        setIsStreaming(false) // Force streaming to stop if stuck
        // Force complete state to allow interaction
        setIsComplete(true)
      }
    }, 15000)

    return () => {
      clearTimeout(shortTimeout)
      clearTimeout(longTimeout)
    }
  }, [isStreaming, lastUpdateTime, message.content])

  const isInteractionDisabled = isProcessingTask || isExtracting

  const handleDataExtraction = async () => {
    if (!parsedData) {
      showNotification('error', 'No valid data available')
      return
    }

    try {
      // Import DataExtractionService from the new location
      const { DataExtractionService } = await import('../../services/extraction');
      
      // Pre-process the data before sending it to the database
      const processedData = await DataExtractionService.preprocessData(parsedData);
      
      // Add metadata to the processed data
      const dataWithMetadata = {
        ...processedData,
        meta_data: {
          source: 'message-extracted-data',
          message_id: message.id,
          conversation_id: message.conversation_id,
          extracted_at: new Date().toISOString(),
          name: `Data from ${new Date().toLocaleString()}`
        }
      };
      
      // Store an unprocessed version in session storage as fallback
      try {
        sessionStorage.setItem('latest_extracted_data', JSON.stringify(dataWithMetadata));
      } catch (storageError) {
        console.warn('Could not store data in session storage:', storageError);
      }
      
      // Update state with processed data
      console.log('MessageItem: Showing data preview modal with processed data', dataWithMetadata);
      setExtractedData(JSON.stringify(dataWithMetadata, null, 2));
      setSportMapperData(dataWithMetadata);
      
      // Show the data preview modal
      setShowDataPreview(true);
      
    } catch (error) {
      console.error('Error processing data for extraction:', error);
      
      // Import error types
      const { isDataExtractionError, isDataValidationError } = await import('../../utils/errors');
      
      // Show appropriate error message
      if (isDataExtractionError(error)) {
        showNotification('error', `Failed to extract data: ${error.getUserMessage()}`)
      } else if (isDataValidationError(error)) {
        showNotification('error', `Data validation failed: ${error.getFormattedErrors()}`)
      } else {
        showNotification('error', `Failed to extract data: ${(error as Error).message}`)
      }
    }
  }

  const extractAndOpenSportDataMapper = async () => {
    setIsExtracting(true)
    setExtractionError(null)
    
    try {
      // Import extraction utilities from the new location
      const { extractDataFromMessage, DataExtractionService } = await import('../../services/extraction');
      const { isDataExtractionError, isDataValidationError } = await import('../../utils/errors');
      
      // Extract data using the new service
      const extractedData = await extractDataFromMessage(message);
      
      if (!extractedData || (!extractedData.headers && !extractedData.rows)) {
        setExtractionError('No structured data found in this message')
        setIsExtracting(false)
        showNotification('error', 'No structured data found in this message. Please make sure the message contains tables or structured data.')
        return
      }
      
      console.log('MessageItem: Extracted real data from message', extractedData)
      
      // Add message metadata
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
      }
      
      // Check for sports data type
      const sportsDetection = DataExtractionService.detectSportsDataType(dataWithMetadata);
      if (sportsDetection.isSportsData) {
        console.log('MessageItem: Sports data detected', {
          entityType: sportsDetection.entityType,
          confidence: sportsDetection.confidence
        });
        
        // Add sports data metadata
        dataWithMetadata.meta_data.data_type = 'sports-data';
        dataWithMetadata.meta_data.entity_type = sportsDetection.entityType;
        dataWithMetadata.meta_data.suggested_mappings = sportsDetection.suggestedFields;
      }
      
      // Ensure data has headers and rows
      let validData = dataWithMetadata;
      
      // If we have rows but no headers, try to extract headers from first row
      if (validData.rows && Array.isArray(validData.rows) && validData.rows.length > 0 && !validData.headers) {
        if (typeof validData.rows[0] === 'object' && validData.rows[0] !== null) {
          validData.headers = Object.keys(validData.rows[0]);
        }
      }
      
      // If we still don't have headers and rows, create a default structure
      if (!validData.rows && !validData.headers) {
        console.warn('MessageItem: Creating default structure for SportDataMapper')
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
        }
      }
      
      // Update state with the validated data
      setSportMapperData(validData)
      
      // Increment key to force component remount
      setMapperKey(prevKey => prevKey + 1)
      
      // Show the SportDataMapper with a small delay to ensure state is updated
      setTimeout(() => {
        setShowSportDataMapper(true)
        console.log('MessageItem: Opening SportDataMapper with extracted data', validData)
      }, 100)
    } catch (error) {
      console.error('MessageItem: Error extracting data', error)
      
      // Import error types
      const { isDataExtractionError, isDataValidationError } = await import('../../utils/errors');
      
      // Show appropriate error message
      if (isDataExtractionError(error)) {
        setExtractionError(error.getUserMessage())
        showNotification('error', `Failed to extract sports data: ${error.getUserMessage()}`)
      } else if (isDataValidationError(error)) {
        setExtractionError(error.getFormattedErrors())
        showNotification('error', `Sports data validation failed: ${error.getFormattedErrors()}`)
      } else {
        setExtractionError(`Error extracting data: ${(error as Error).message}`)
        showNotification('error', `Error extracting sports data: ${(error as Error).message}`)
      }
    } finally {
      setIsExtracting(false)
    }
  }

  useEffect(() => {
    if (message.role === 'assistant') {
      console.log('MessageItem: Assistant message detected, should show buttons', message.id)
    }
  }, [message.id, message.role])

  useEffect(() => {
    if (message.role === 'assistant' && isLastMessage) {
      const element = document.getElementById(`message-${message.id}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [message.id, message.role, isLastMessage])

  const handleDataPreview = async () => {
    if (onDataPreview) {
      try {
        const contentParts = message.content.split('---DATA---')
        if (contentParts.length < 2) {
          console.error('No data marker found in message')
          return
        }

        const dataText = contentParts[1].trim()
        const parsedData = JSON.parse(dataText)
        const standardData = await onDataPreview(parsedData)
        
        // Set both extractedData for backwards compatibility and sportMapperData for the modal
        setExtractedData(JSON.stringify(standardData, null, 2))
        setSportMapperData(standardData)
        setShowDataPreview(true)
        
        console.log('MessageItem: Showing data preview', standardData)
      } catch (error) {
        console.error('Error previewing data:', error)
      }
    }
  }

  const handleDataConfirm = async (data: any) => {
    showNotification('info', 'Sending data to database...');
    
    try {
      console.log('MessageItem: Creating structured data in the database', data)
      
      // Ensure data has consistent format
      const formattedData = {
        conversation_id: message.conversation_id,
        data_type: 'tabular',
        schema_version: '1.0',
        data: {
          rows: data.rows || [],
          column_order: data.headers || []
        },
        meta_data: {
          ...data.meta_data,
          message_id: message.id,
          extracted_at: new Date().toISOString(),
          source: 'chat-extraction'
        }
      };
      
      // Store in session storage as a fallback (in case API fails)
      try {
        console.log('MessageItem: Storing data in session storage as fallback');
        sessionStorage.setItem('preview_data', JSON.stringify({
          headers: data.headers,
          rows: data.rows,
          meta_data: formattedData.meta_data
        }));
      } catch (storageError) {
        console.warn('Could not store data in session storage:', storageError);
      }
      
      // Create structured data entry in the database
      const response = await api.data.createStructuredData(formattedData);
      
      console.log('MessageItem: Structured data created successfully', response);
      showNotification('success', 'Data successfully sent to Data Management');
      
      // Pass the data ID through search params to select it automatically 
      if (response && response.id) {
        // Navigate to the data management page with ID to select
        navigate(`/data?selected=${response.id}`);
      } else {
        // Navigate to the base data path if no ID
        navigate('/data');
      }
    } catch (error) {
      console.error('MessageItem: Error creating structured data', error);
      showNotification('error', 'Failed to save data to database. You can still view the preview.');
      
      // Navigate to data page for preview even if API fails
      navigate('/data');
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this message?')) return
    
    try {
      await deleteMessageMutation.mutateAsync()
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  const getPhaseMessage = () => {
    switch (currentPhase) {
      case 'initial':
        return 'Preparing response...'
      case 'searching':
        return 'Searching for information...'
      case 'processing':
        return 'Processing search results...'
      case 'structuring':
        return 'Structuring data...'
      case 'finalizing':
        return 'Finalizing response...'
      case 'complete':
        return 'Completing response...'
      default:
        return isStreaming ? 'Receiving response...' : ''
    }
  }

  return (
    <div className={`flex flex-col gap-2 p-4 rounded-lg ${
      message.role === 'assistant' ? 'bg-blue-50' : 'bg-gray-50'
    } ${isProcessingTask ? 'opacity-70 pointer-events-none' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="font-semibold text-sm text-gray-600">
          {message.role === 'assistant' ? 'Assistant' : 'You'}
        </div>
        <div className="flex gap-2">
          {message.role === 'user' && (
            <button
              onClick={() => onRepeat?.(message.content)}
              className="text-sm text-blue-600 hover:text-blue-800"
              title="Repeat this message"
            >
              Repeat
            </button>
          )}
          {message.content.includes('---DATA---') && (
            <button
              onClick={() => setShowData(!showData)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              {showData ? (
                <>
                  <FaEyeSlash className="w-4 h-4" />
                  Hide Data
                </>
              ) : (
                <>
                  <FaEye className="w-4 h-4" />
                  View Data
                </>
              )}
            </button>
          )}
          <button
            onClick={handleDelete}
            className="text-sm text-red-600 hover:text-red-800"
            title="Delete message"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="whitespace-pre-wrap">{message.content
        .replace('__STREAM_COMPLETE__', '')
        .split('---DATA---')[0]}
      </div>
      
      {isStreaming && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span>{getPhaseMessage()}</span>
          {isStuck && (
            <div className="ml-2 text-amber-600 font-medium flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              Taking longer than usual...
              <button 
                onClick={() => {setIsStreaming(false); setIsComplete(true);}}
                className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded hover:bg-amber-200"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
      
      {showData && message.content.includes('---DATA---') && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <div className="font-mono text-sm overflow-x-auto">
            <pre className="whitespace-pre-wrap break-all">
              {streamingContent.replace('__STREAM_COMPLETE__', '')}
            </pre>
          </div>
        </div>
      )}
      
      {/* Add debugging information */}
      <div className="text-xs text-gray-500 mt-1">
        {message.role === 'assistant' && message.content.includes('---DATA---') && (
          <div>
            <div>Data status: {isDataComplete ? 'Complete' : 'Incomplete'} | Streaming: {isStreaming ? 'Yes' : 'No'}</div>
            <div>Has parsed data: {parsedData ? 'Yes' : 'No'} | Phase: {currentPhase}</div>
          </div>
        )}
      </div>

      {message.role === 'assistant' && isDataComplete && !isStreaming && parsedData && (
        <div className="mt-2 flex space-x-2">
          <button
            onClick={handleDataExtraction}
            className={`px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center ${
              !isDataComplete ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={!isDataComplete || parsedData.rows?.some((row: any) => row.includes('Search required'))}
          >
            <FaTable className="mr-1" />
            Send to Data
          </button>
          <button
            onClick={extractAndOpenSportDataMapper}
            className={`px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors flex items-center ${
              !isDataComplete ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={!isDataComplete || parsedData.rows?.some((row: any) => row.includes('Search required'))}
          >
            <FaMapMarkedAlt className="mr-1" />
            Map to Sports
          </button>
        </div>
      )}

      {showDataPreview && sportMapperData && (
        <DataPreviewModal
          isOpen={showDataPreview}
          onClose={() => setShowDataPreview(false)}
          messageContent="Data preview"
          extractedData={sportMapperData}
          onConfirm={handleDataConfirm}
        />
      )}
      {showSportDataMapper && sportMapperData && (
        <SportDataMapper
          data={sportMapperData}
          onConfirm={handleDataConfirm}
        />
      )}

      {isProcessingTask && (
        <div className="flex items-center text-sm text-gray-500 mt-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
          Processing...
        </div>
      )}
    </div>
  )
}

export default MessageItem 