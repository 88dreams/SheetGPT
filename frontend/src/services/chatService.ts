import { request, getToken, APIError } from '../utils/apiClient';
import { Conversation, Message, PaginatedResponse } from '../types/api';

// For streaming responses
// Use the same API URL determination logic as apiClient.ts
const getApiUrl = () => {
  // Check if we're in a browser and have access to import.meta.env
  if (typeof window !== 'undefined' && typeof import.meta !== 'undefined' && import.meta.env) {
    // Check for production mode first
    if (import.meta.env.MODE === 'production' && import.meta.env.VITE_API_URL) {
      console.log('Production environment detected, using VITE_API_URL:', import.meta.env.VITE_API_URL);
      return import.meta.env.VITE_API_URL;
    }
    
    // In development, use relative URL for proxy
    if (import.meta.env.MODE === 'development') {
      console.log('Development environment detected, using relative URL for chat service');
      return '';
    }
    
    // Try to use VITE_API_URL as fallback if available
    if (import.meta.env.VITE_API_URL) {
      console.log('Using VITE_API_URL for chat service:', import.meta.env.VITE_API_URL);
      return import.meta.env.VITE_API_URL;
    }
  }
  
  // Default fallback for development or when env vars are missing
  console.log('Using default localhost API URL for chat service');
  return 'http://localhost:8000';
};

const API_URL = getApiUrl();
// Check if API_URL already contains /api/v1
const API_PREFIX = API_URL.includes('/api/v1') ? '' : '/api/v1';

console.log('Chat service API configuration:', {
  API_URL,
  API_PREFIX,
  fullBaseURL: `${API_URL}${API_PREFIX}`,
});

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

    // Log the full URL being used
    const url = `${API_URL}${API_PREFIX}/chat/conversations/${conversationId}/messages`;
    console.log('Sending message to URL:', url);
    
    const response = await fetch(url, {
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
      meta_data: fileAttachment ? { fileAttachment } : {}
    }
  }
};

export default chatService;