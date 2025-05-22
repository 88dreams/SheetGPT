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
    if (!conversationId) {
      return [];
    }
    
    let conversationResponse;
    conversationResponse = await api.chat.getConversation(conversationId);

    const messages = conversationResponse.messages;
    
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