import React, { useState, KeyboardEvent } from 'react'
import LoadingSpinner from '../common/LoadingSpinner'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled = false }) => {
  const [message, setMessage] = useState('')

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage('')
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex space-x-4">
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
  )
}

export default ChatInput 