import React, { useState, KeyboardEvent } from 'react'
import LoadingSpinner from '../common/LoadingSpinner'
import StructuredFormatModal from './StructuredFormatModal'
import { TableCellsIcon } from '@heroicons/react/24/outline'

interface ChatInputProps {
  onSend: (message: string, structuredFormat?: Record<string, any>) => void
  disabled?: boolean
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled = false }) => {
  const [message, setMessage] = useState('')
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false)
  const [activeFormat, setActiveFormat] = useState<Record<string, any> | null>(null)

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim(), activeFormat || undefined)
      setMessage('')
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
        <div className="flex space-x-2">
          <button
            onClick={() => setIsFormatModalOpen(true)}
            disabled={disabled}
            className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            title="Add structured format"
          >
            <TableCellsIcon className="h-5 w-5" />
          </button>
          <div className="flex-1 flex space-x-4">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 resize-none rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={2}
              disabled={disabled}
            />
            <button
              onClick={handleSubmit}
              disabled={!message.trim() || disabled}
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