import { useQuery } from '@tanstack/react-query';
import { api, Message } from '../../../utils/api';

interface UseMessagesOptions {
  conversationId: string | null;
  enabled?: boolean;
}

export function useMessages({ conversationId, enabled = true }: UseMessagesOptions) {
  const {
    data: messages,
    isLoading,
    error,
    isError,
    refetch
  } = useQuery<Message[], Error>(['messages', conversationId], async () => {
    console.log('useMessages: Fetching messages for conversationId:', conversationId);
    
    if (!conversationId) {
      console.log('useMessages: conversationId is falsy, returning [].');
      return [];
    }
    
    let conversationResponse;
    try {
      conversationResponse = await api.chat.getConversation(conversationId);
      console.log('useMessages: Raw API response for getConversation:', conversationResponse);
    } catch (apiError) {
      console.error('useMessages: Error calling api.chat.getConversation:', apiError);
      throw apiError;
    }

    const messages = conversationResponse.messages;
    
    console.log('useMessages: Messages extracted from response:', {
      conversationId,
      messageCount: messages ? messages.length : 'undefined',
      areMessagesArray: Array.isArray(messages)
    });
    
    return messages || [];
  }, {
    enabled: !!conversationId && enabled,
    retry: 2,
    staleTime: 1000 * 60,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    messages: messages || [],
    isLoading,
    error,
    isError,
    refetch
  };
}

export default useMessages;