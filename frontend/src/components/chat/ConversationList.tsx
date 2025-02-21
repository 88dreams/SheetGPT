import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNotification } from '../../contexts/NotificationContext'
import NewConversationModal from './NewConversationModal'
import LoadingSpinner from '../common/LoadingSpinner'

interface Conversation {
  id: string
  title: string
  description?: string
  created_at: string
}

interface ConversationListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
  isLoading?: boolean
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelect,
  isLoading = false
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()

  const createConversationMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string }) => {
      const response = await fetch('/api/v1/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create conversation')
      }
      return response.json()
    },
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      onSelect(newConversation.id)
    },
    onError: (error: Error) => {
      showNotification('error', error.message)
    },
  })

  const handleCreateConversation = async (title: string, description?: string) => {
    await createConversationMutation.mutateAsync({ title, description })
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner size="medium" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <button
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            onClick={() => setIsModalOpen(true)}
          >
            New
          </button>
        </div>
        {conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No conversations yet
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`p-3 rounded cursor-pointer transition-colors ${
                selectedId === conversation.id
                  ? 'bg-blue-100 hover:bg-blue-200'
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => onSelect(conversation.id)}
            >
              <h3 className="font-medium truncate">{conversation.title}</h3>
              {conversation.description && (
                <p className="text-sm text-gray-600 truncate">
                  {conversation.description}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {new Date(conversation.created_at).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>
      <NewConversationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateConversation}
      />
    </>
  )
}

export default ConversationList 