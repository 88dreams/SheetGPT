import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../utils/api'
import type { StructuredData } from '../../utils/api'
import { DataExtractionService } from '../../services/DataExtractionService'
import { useNotification } from '../../contexts/NotificationContext'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  meta_data: Record<string, any>
  conversation_id: string
}

interface MessageThreadProps {
  messages: Message[]
}

const MessageThread: React.FC<MessageThreadProps> = ({ messages }) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  // Add a processing state to track which messages are being processed
  const [processingMessages, setProcessingMessages] = useState<Set<string>>(new Set())

  const handleViewData = async (messageId: string, message: Message) => {
    console.log('MessageThread: handleViewData called for message:', messageId);
    
    // Check if this message is already being processed
    if (processingMessages.has(messageId)) {
      console.log('MessageThread: Already processing this message, ignoring duplicate request');
      return;
    }
    
    try {
      // Mark this message as being processed
      setProcessingMessages(prev => new Set([...prev, messageId]));
      
      // Disable the button during processing to prevent multiple clicks
      const button = document.querySelector(`button[data-message-id="${messageId}"]`) as HTMLButtonElement;
      if (button) {
        button.disabled = true;
        button.textContent = 'Processing...';
      }
      
      // Step 1: Check if data already exists for this message - ENHANCED VERSION
      let existingDataId: string | null = null;
      
      try {
        console.log('MessageThread: Checking for existing data for message:', messageId);
        
        // First, try to get all structured data and check if any is associated with this message
        // This is the most reliable way to find existing data
        const allData = await api.data.getStructuredData();
        console.log('MessageThread: Got all data, checking for message ID:', messageId);
        
        // Look for any data item with this message ID in its metadata
        const existingItems = allData.filter(item => 
          item.meta_data && item.meta_data.message_id === messageId
        );
        
        if (existingItems.length > 0) {
          console.log(`MessageThread: Found ${existingItems.length} existing data items for message:`, 
            existingItems.map(item => item.id));
          
          // If we found multiple items, we have duplicates - use the most recent one
          const mostRecent = existingItems.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];
          
          existingDataId = mostRecent.id;
          console.log('MessageThread: Using most recent data item:', existingDataId);
          
          // If we found duplicates, clean them up
          if (existingItems.length > 1) {
            console.log('MessageThread: Found duplicate data items, cleaning up...');
            
            // Delete all but the most recent
            for (const item of existingItems) {
              if (item.id !== existingDataId) {
                try {
                  console.log('MessageThread: Deleting duplicate data item:', item.id);
                  await api.data.deleteStructuredData(item.id);
                } catch (error) {
                  console.error('MessageThread: Failed to delete duplicate:', error);
                  // Continue with other deletions even if one fails
                }
              }
            }
            
            // Invalidate queries to refresh data after cleanup
            queryClient.invalidateQueries({ queryKey: ['structured-data'] });
          }
        } else {
          // If not found in the list, try the direct API call
          try {
            console.log('MessageThread: Trying direct API call for message ID:', messageId);
            const existingData = await api.data.getStructuredDataByMessageId(messageId);
            if (existingData && existingData.id) {
              console.log('MessageThread: Found existing data via direct API call:', existingData.id);
              existingDataId = existingData.id;
            }
          } catch (error) {
            console.log('MessageThread: Direct API call failed, no existing data found:', error);
          }
        }
      } catch (error) {
        console.log('MessageThread: Error checking for existing data:', error);
      }

      // If data exists, navigate to it
      if (existingDataId) {
        console.log('MessageThread: Navigating to existing data:', existingDataId);
        
        // Re-enable the button before navigating
        if (button) {
          button.disabled = false;
          button.textContent = 'Send to Data';
        }
        
        // Remove this message from processing state
        setProcessingMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
        
        navigate(`/data?message=${messageId}`);
        return;
      }

      // Step 2: Extract and parse data from message content
      console.log('MessageThread: Extracting data from message content');
      const contentParts = message.content.split('---DATA---');
      if (contentParts.length < 2) {
        console.error('MessageThread: No data marker found in message');
        showNotification('error', 'No data found in message');
        
        // Re-enable the button
        if (button) {
          button.disabled = false;
          button.textContent = 'Send to Data';
        }
        
        return;
      }

      const dataText = contentParts[1].trim();
      console.log('MessageThread: Extracted data text length:', dataText.length);

      let parsedData;
      try {
        parsedData = JSON.parse(dataText);
        console.log('MessageThread: Successfully parsed data:', 
          typeof parsedData, 
          Array.isArray(parsedData) ? 'array' : 'not array',
          parsedData && typeof parsedData === 'object' ? Object.keys(parsedData) : 'no keys'
        );
      } catch (error) {
        console.error('MessageThread: Failed to parse data:', error);
        showNotification('error', 'Failed to parse data from message');
        
        // Re-enable the button
        if (button) {
          button.disabled = false;
          button.textContent = 'Send to Data';
        }
        
        return;
      }

      // Step 3: Extract headers and rows in a consistent way
      console.log('MessageThread: Extracting structured data');
      const extractedData = extractStructuredData(parsedData);
      
      if (!extractedData || !extractedData.headers || extractedData.headers.length === 0) {
        console.error('MessageThread: Failed to extract structured data');
        showNotification('error', 'Failed to extract structured data');
        
        // Re-enable the button
        if (button) {
          button.disabled = false;
          button.textContent = 'Send to Data';
        }
        
        return;
      }

      console.log('MessageThread: Extracted structured data:', {
        headers: extractedData.headers,
        rowCount: extractedData.rows.length,
        sample: extractedData.rows.length > 0 ? extractedData.rows[0] : 'no rows'
      });

      // Step 4: Get conversation title for metadata
      let conversationTitle = 'Conversation';
      try {
        console.log('MessageThread: Getting conversation details');
        const conversation = await api.chat.getConversation(message.conversation_id);
        conversationTitle = conversation.title || 'Conversation';
        console.log('MessageThread: Got conversation title:', conversationTitle);
      } catch (error) {
        console.error('MessageThread: Failed to get conversation details:', error);
        // Continue with default title
      }

      // Step 5: Create structured data in the backend - ENHANCED VERSION
      try {
        console.log('MessageThread: Creating structured data in backend');
        
        // Double-check one more time that data doesn't already exist
        // This helps prevent race conditions where data was created between our initial check and now
        try {
          console.log('MessageThread: Final check for existing data before creation');
          const finalCheck = await api.data.getStructuredDataByMessageId(messageId);
          if (finalCheck && finalCheck.id) {
            console.log('MessageThread: Data was created between checks:', finalCheck.id);
            
            // Re-enable the button
            if (button) {
              button.disabled = false;
              button.textContent = 'Send to Data';
            }
            
            // Remove this message from processing state
            setProcessingMessages(prev => {
              const newSet = new Set(prev);
              newSet.delete(messageId);
              return newSet;
            });
            
            navigate(`/data?message=${messageId}`);
            showNotification('success', 'Data already exists');
            return;
          }
        } catch (error) {
          console.log('MessageThread: Final check failed, proceeding with creation:', error);
        }
        
        // IMPORTANT: Force the data into a specific format
        // This ensures we always send the same structure to the backend
        const dataToSend = {
          headers: extractedData.headers,
          rows: extractedData.rows
        };
        
        console.log('MessageThread: Data being sent to backend:', JSON.stringify(dataToSend, null, 2));
        
        // Create the structured data
        let newData: StructuredData | null = null;
        
        try {
          newData = await api.data.createStructuredData({
            data_type: 'chat_extraction',
            schema_version: '1.0',
            data: dataToSend,
            meta_data: {
              message_id: messageId,
              source: 'message',
              created_from: 'send_to_data_button',
              conversation_title: conversationTitle,
              created_at: new Date().toISOString()
            },
            conversation_id: message.conversation_id
          });
          
          if (newData && newData.id) {
            console.log('MessageThread: Successfully created structured data:', {
              id: newData.id,
              dataType: newData.data_type,
              dataKeys: newData.data ? Object.keys(newData.data) : []
            });
          } else {
            throw new Error('Created data has no ID');
          }
        } catch (error) {
          console.error('MessageThread: Failed to create structured data:', error);
          
          // Check if data was actually created despite the error
          console.log('MessageThread: Checking if data was created despite error');
          
          // Wait a moment before checking
          await new Promise(resolve => setTimeout(resolve, 500));
          
          try {
            const verifyData = await api.data.getStructuredDataByMessageId(messageId);
            if (verifyData && verifyData.id) {
              console.log('MessageThread: Data was actually created successfully:', verifyData.id);
              newData = verifyData;
            } else {
              throw error; // Re-throw the original error
            }
          } catch (verifyError) {
            console.error('MessageThread: Verification also failed:', verifyError);
            throw error; // Re-throw the original error
          }
        }

        // Step 7: Invalidate queries to refresh data
        console.log('MessageThread: Invalidating queries');
        await queryClient.invalidateQueries({ queryKey: ['structured-data'] });
        
        // Wait a moment to ensure data is available before navigating
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Step 8: Navigate to data view
        console.log('MessageThread: Navigating to data view');
        
        // Re-enable the button before navigating
        if (button) {
          button.disabled = false;
          button.textContent = 'Send to Data';
        }
        
        // Remove this message from processing state
        setProcessingMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
        
        navigate(`/data?message=${messageId}`);
        showNotification('success', 'Data successfully extracted');
      } catch (error) {
        console.error('MessageThread: Error creating structured data:', error);
        showNotification('error', 'Failed to create structured data');
        
        // Re-enable the button
        if (button) {
          button.disabled = false;
          button.textContent = 'Send to Data';
        }
        
        // Remove this message from processing state
        setProcessingMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('MessageThread: Error handling data extraction:', error);
      showNotification('error', 'Failed to extract data');
      
      // Re-enable the button in case of error
      const button = document.querySelector(`button[data-message-id="${messageId}"]`) as HTMLButtonElement;
      if (button) {
        button.disabled = false;
        button.textContent = 'Send to Data';
      }
      
      // Remove this message from processing state
      setProcessingMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    }
  };

  // Helper function to extract structured data in a consistent format
  const extractStructuredData = (data: any): { headers: string[], rows: any[][] } | null => {
    try {
      console.log('MessageThread: extractStructuredData input:', JSON.stringify(data, null, 2));
      
      // Special case: Handle the nested structure we're seeing in the NFL teams data
      // This is the structure that's causing the display issues
      if (data && data.rows && Array.isArray(data.rows) && 
          data.rows.length > 0 && typeof data.rows[0] === 'object' &&
          data.rows[0].headers && data.rows[0].rows) {
        
        console.log('MessageThread: Detected nested structure with rows containing headers/rows');
        
        // Extract all unique headers from the nested structure
        const headers: string[] = [];
        data.rows.forEach((item: any) => {
          if (item.headers && !headers.includes(item.headers)) {
            headers.push(item.headers);
          }
        });
        
        console.log('MessageThread: Extracted headers from nested structure:', headers);
        
        // Find the maximum length of any rows array
        let maxRowLength = 0;
        data.rows.forEach((item: any) => {
          if (Array.isArray(item.rows)) {
            maxRowLength = Math.max(maxRowLength, item.rows.length);
          }
        });
        
        // Create a 2D array of rows
        const rows: any[][] = [];
        for (let i = 0; i < maxRowLength; i++) {
          const row: any[] = [];
          headers.forEach(header => {
            // Find the item with this header
            const item = data.rows.find((r: any) => r.headers === header);
            // Get the value at this index, or empty string if not available
            const value = item && Array.isArray(item.rows) && i < item.rows.length 
              ? item.rows[i] 
              : '';
            row.push(value);
          });
          rows.push(row);
        }
        
        console.log('MessageThread: Created rows from nested structure:', rows);
        return { headers, rows };
      }
      
      // Default empty structure
      const result = {
        headers: [] as string[],
        rows: [] as any[][]
      };

      // Case 1: Data already has headers and rows arrays at the top level
      if (data && data.headers && Array.isArray(data.headers) && 
          data.rows && Array.isArray(data.rows)) {
        
        console.log('MessageThread: Found standard headers and rows format');
        result.headers = [...data.headers];
        
        // Convert all rows to arrays of values
        if (data.rows.length > 0) {
          if (Array.isArray(data.rows[0])) {
            // Rows are already arrays
            result.rows = [...data.rows];
          } else {
            // Convert object rows to arrays
            result.rows = data.rows.map((row: any) => {
              return result.headers.map((header: string) => {
                return row[header] !== undefined ? row[header] : '';
              });
            });
          }
        }
        
        return result;
      }
      
      // Case 2: Data is an array of objects
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
        console.log('MessageThread: Data is an array of objects');
        // Extract headers from the first object
        result.headers = Object.keys(data[0]).filter(key => !key.startsWith('_'));
        
        // Convert objects to arrays of values
        result.rows = data.map(item => {
          return result.headers.map(header => {
            return item[header] !== undefined ? item[header] : '';
          });
        });
        
        return result;
      }
      
      // Case 3: Data is a single object
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        console.log('MessageThread: Data is a single object');
        const keys = Object.keys(data).filter(key => 
          !key.startsWith('_') && key !== 'headers' && key !== 'rows'
        );
        
        if (keys.length > 0) {
          result.headers = keys;
          // Create a single row with values
          const row = keys.map(key => data[key] !== undefined ? data[key] : '');
          result.rows = [row];
          
          return result;
        }
      }
      
      console.error('MessageThread: Could not extract structured data from input');
      return null;
    } catch (error) {
      console.error('MessageThread: Error extracting structured data:', error);
      return null;
    }
  };

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-[80%] rounded-lg p-3 ${
              message.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            <div className="whitespace-pre-wrap text-sm break-words overflow-auto max-h-[500px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              {message.content}
            </div>
            <div className="flex items-center justify-between mt-2">
              <div
                className={`text-[10px] ${
                  message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                }`}
              >
                {new Date(message.created_at).toLocaleTimeString()}
              </div>
              {message.role === 'assistant' && message.content.includes('---DATA---') && (
                <button
                  onClick={() => handleViewData(message.id, message)}
                  className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
                  data-message-id={message.id}
                >
                  Send to Data
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default MessageThread 