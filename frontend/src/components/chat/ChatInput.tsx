import React, { useState, KeyboardEvent, useRef, ChangeEvent } from 'react'
import LoadingSpinner from '../common/LoadingSpinner'
import StructuredFormatModal from './StructuredFormatModal'
import { TableCellsIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline'
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

  return (
    <>
      <div className="flex flex-col space-y-2">
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
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={fileContent ? "Add a message to explain the file content..." : "Type your message..."}
              className="flex-1 resize-none rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={2}
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