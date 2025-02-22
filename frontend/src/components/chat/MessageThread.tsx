import React from 'react'
import { useNavigate } from 'react-router-dom'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  meta_data: Record<string, any>
}

interface MessageThreadProps {
  messages: Message[]
}

const MessageThread: React.FC<MessageThreadProps> = ({ messages }) => {
  const navigate = useNavigate()

  const handleViewData = (messageId: string) => {
    navigate(`/data?message=${messageId}`)
  }

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
                  onClick={() => handleViewData(message.id)}
                  className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
                >
                  View Data
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