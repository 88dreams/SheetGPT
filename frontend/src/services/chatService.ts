import { request, getToken, APIError } from '../utils/apiClient';
import { Conversation, Message, PaginatedResponse } from '../types/api';

// For streaming responses
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1';

export const chatService = {
  getConversations: async (skip = 0, limit = 10): Promise<PaginatedResponse<Conversation>> => {
    const response = await request<PaginatedResponse<Conversation>>(`/chat/conversations?skip=${skip}&limit=${limit}`, { requiresAuth: true })
    return response
  },

  createConversation: (data: { title: string; description?: string }): Promise<Conversation> =>
    request('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true
    }),

  getConversation: (id: string): Promise<Conversation> =>
    request(`/chat/conversations/${id}`, { requiresAuth: true }),

  deleteConversation: (id: string): Promise<void> =>
    request(`/chat/conversations/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
      headers: {
        'Accept': '*/*'  // Accept any response type since we expect 204
      }
    }),

  deleteMessage: (conversationId: string, messageId: string): Promise<void> =>
    request(`/chat/conversations/${conversationId}/messages/${messageId}`, {
      method: 'DELETE',
      requiresAuth: true,
      headers: {
        'Accept': '*/*'  // Accept any response type since we expect 204
      }
    }),

  updateConversation: (id: string, data: { title: string; description?: string }): Promise<Conversation> =>
    request(`/chat/conversations/${id}/update`, {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true
    }),
    
  updateConversationOrder: (orderUpdates: { id: string, order: number }[]): Promise<Conversation[]> =>
    request(`/chat/conversations/order`, {
      method: 'POST',
      body: JSON.stringify(orderUpdates),
      requiresAuth: true
    }),

  sendMessage: async (
    conversationId: string,
    content: string,
    structuredFormat?: Record<string, any>,
    onChunk?: (chunk: string) => void,
    fileAttachment?: {
      name: string;
      content: string;
      type: 'csv' | 'text' | 'json' | 'markdown';
      size: number;
    }
  ): Promise<Message> => {
    const token = getToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_URL}${API_PREFIX}/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        content,
        role: 'user',
        structured_format: structuredFormat,
        metadata: fileAttachment ? { fileAttachment } : undefined
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    if (!response.body) throw new Error('No response body')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullResponse = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      buffer += chunk
      
      // Process complete lines from the buffer
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep the last incomplete line in the buffer
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.slice(6).trim()
            if (jsonStr) {
              const data = JSON.parse(jsonStr)
              if (data.text) {
                // Check for special completion marker
                if (data.text === '__STREAM_COMPLETE__') {
                  console.log('Stream completion marker received from server')
                  if (onChunk) {
                    onChunk('__STREAM_COMPLETE__')
                  }
                } else {
                  fullResponse += data.text
                  if (onChunk) onChunk(data.text)
                }
              }
            }
          } catch (error) {
            console.error('Error parsing streaming response:', error)
            // Continue processing other chunks even if one fails
          }
        }
      }
    }

    // Process any remaining data in the buffer
    if (buffer.startsWith('data: ')) {
      try {
        const jsonStr = buffer.slice(6).trim()
        if (jsonStr) {
          const data = JSON.parse(jsonStr)
          if (data.text) {
            // Check for special completion marker in final chunk
            if (data.text === '__STREAM_COMPLETE__') {
              console.log('Stream completion marker received from server in final chunk')
              if (onChunk) {
                onChunk('__STREAM_COMPLETE__')
              }
            } else {
              fullResponse += data.text
              if (onChunk) onChunk(data.text)
            }
          }
        }
      } catch (error) {
        console.error('Error parsing final chunk:', error)
      }
    }

    // Return a Message object with the complete response
    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: fullResponse,
      created_at: new Date().toISOString(),
      conversation_id: conversationId,
      meta_data: {}
    }
  }
};

export default chatService;