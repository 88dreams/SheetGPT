import React, { useState, KeyboardEvent, useRef, ChangeEvent, useEffect } from 'react'
import LoadingSpinner from '../common/LoadingSpinner'
import StructuredFormatModal from './StructuredFormatModal'
import { TableCellsIcon, DocumentTextIcon, XMarkIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline'
import Papa from 'papaparse'
import { FileAttachment } from '../../types/chat'

interface ChatInputProps {
  onSend: (message: string, structuredFormat?: Record<string, any>, fileAttachment?: FileAttachment) => void
  disabled?: boolean
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled = false }) => {
  const [message, setMessage] = useState('')
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false)
  const [activeFormat, setActiveFormat] = useState<Record<string, any> | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // For textarea resizing
  const [textareaHeight, setTextareaHeight] = useState<number>(() => {
    // Retrieve from localStorage or use default (2 rows)
    const savedHeight = localStorage.getItem('chatInputHeight')
    return savedHeight ? parseInt(savedHeight, 10) : 80
  })
  
  const [isResizing, setIsResizing] = useState(false)
  const resizeStartPosRef = useRef<number>(0)
  const initialHeightRef = useRef<number>(textareaHeight)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleSubmit = () => {
    if ((message.trim() || fileContent) && !disabled) {
      // If file content exists, use that as the message or prepend to existing message
      const finalMessage = fileContent 
        ? (message.trim() ? `${message.trim()}\n\n${fileContent}` : fileContent)
        : message.trim()
      
      // Create file attachment if we have file data
      const fileAttachment = fileName && fileContent ? {
        name: fileName,
        content: fileContent,
        type: fileName.endsWith('.csv') ? 'csv' : 'text',
        size: new Blob([fileContent]).size
      } as FileAttachment : undefined
      
      onSend(finalMessage, activeFormat || undefined, fileAttachment)
      setMessage('')
      setFileContent(null)
      setFileName(null)
      setActiveFormat(null)
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFormatApply = (format: Record<string, any>) => {
    setActiveFormat(format)
  }

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    
    const reader = new FileReader()
    
    reader.onload = (event) => {
      const content = event.target?.result as string
      
      // Handle CSV files
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        try {
          const result = Papa.parse(content, { header: true });
          
          if (activeFormat && activeFormat.headers && activeFormat.rows) {
            // If we have a table format active, convert to that format
            const headers = result.meta.fields || [];
            const rows = result.data.map(row => 
              headers.map(header => (row as any)[header] || '')
            );
            
            setFileContent(JSON.stringify({ headers, rows }, null, 2));
          } else {
            // Default table format
            const headers = result.meta.fields || [];
            const rows = result.data.map(row => 
              headers.map(header => (row as any)[header] || '')
            );
            
            setFileContent(JSON.stringify({ headers, rows }, null, 2));
            // Auto-set the format to Table Data if no format is selected
            if (!activeFormat) {
              setActiveFormat({
                headers: headers,
                rows: rows
              });
            }
          }
        } catch (error) {
          console.error('Error parsing CSV:', error);
          setFileContent(content);
        }
      } else {
        // Handle as plain text
        setFileContent(content);
      }
    };
    
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setFileContent(null);
    setFileName(null);
  };
  
  // Handle resize events
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartPosRef.current = e.clientY;
    initialHeightRef.current = textareaHeight;
    
    // Add event listeners to the document
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };
  
  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    // Calculate the new height (moving up decreases height, moving down increases it)
    const delta = resizeStartPosRef.current - e.clientY;
    const newHeight = Math.max(80, initialHeightRef.current + delta);
    
    // Set maximum height (5 rows)
    const maxHeight = 200;
    const limitedHeight = Math.min(newHeight, maxHeight);
    
    setTextareaHeight(limitedHeight);
    
    // Apply the height to the textarea directly for immediate feedback
    if (textareaRef.current) {
      textareaRef.current.style.height = `${limitedHeight}px`;
    }
  };
  
  const handleResizeEnd = () => {
    setIsResizing(false);
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    
    // Save to localStorage
    localStorage.setItem('chatInputHeight', textareaHeight.toString());
  };
  
  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, []);
  
  // Apply initial height to textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = `${textareaHeight}px`;
    }
  }, []);

  return (
    <>
      <div ref={containerRef} className="flex flex-col space-y-2">
        {/* Resize handle */}
        <div
          className="w-full h-2 cursor-ns-resize flex justify-center items-center hover:bg-gray-100 rounded-t -mt-2 mb-1 group"
          onMouseDown={handleResizeStart}
        >
          <ArrowsUpDownIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
        </div>
        
        {activeFormat && (
          <div className="flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded text-sm">
            <TableCellsIcon className="h-4 w-4 mr-2" />
            Structured format active
            <button
              onClick={() => setActiveFormat(null)}
              className="ml-2 text-blue-500 hover:text-blue-700"
            >
              ×
            </button>
          </div>
        )}
        
        {fileName && (
          <div className="flex items-center bg-green-50 text-green-700 px-3 py-1 rounded text-sm">
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            File attached: {fileName}
            <button
              onClick={removeFile}
              className="ml-2 text-green-500 hover:text-green-700"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}
        
        <div className="flex space-x-2">
          <div className="flex space-x-2">
            <button
              onClick={() => setIsFormatModalOpen(true)}
              disabled={disabled}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Add structured format"
            >
              <TableCellsIcon className="h-5 w-5" />
            </button>
            
            <button
              onClick={handleFileButtonClick}
              disabled={disabled}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Import file"
            >
              <DocumentTextIcon className="h-5 w-5" />
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.txt,.json,.md"
              className="hidden"
              disabled={disabled}
            />
          </div>
          
          <div className="flex-1 flex space-x-4">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={fileContent ? "Add a message to explain the file content..." : "Type your message..."}
              className="flex-1 resize-none rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              style={{ height: `${textareaHeight}px` }}
              disabled={disabled}
            />
            <button
              onClick={handleSubmit}
              disabled={(!message.trim() && !fileContent) || disabled}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {disabled ? (
                <>
                  <LoadingSpinner size="small" className="text-white" />
                  <span>Sending...</span>
                </>
              ) : (
                'Send'
              )}
            </button>
          </div>
        </div>
        
        {/* Status message during resizing */}
        {isResizing && (
          <div className="absolute bottom-28 right-4 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-50">
            Height: {textareaHeight}px
          </div>
        )}
      </div>

      <StructuredFormatModal
        isOpen={isFormatModalOpen}
        onClose={() => setIsFormatModalOpen(false)}
        onApply={handleFormatApply}
      />
    </>
  )
}

export default ChatInput 