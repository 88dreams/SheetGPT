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
  } = useQuery<Message[], Error>({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      console.log('Fetching messages for conversation:', {
        conversationId,
        timestamp: new Date().toISOString()
      });
      
      if (!conversationId) return [];
      
      const conversation = await api.chat.getConversation(conversationId);
      const messages = conversation.messages;
      
      console.log('Messages fetched:', {
        conversationId,
        messageCount: messages.length,
        timestamp: new Date().toISOString()
      });
      
      return messages;
    },
    enabled: !!conversationId && enabled,
    retry: 2,
    staleTime: 1000 * 60, // Consider data fresh for 1 minute
    gcTime: 1000 * 60 * 60, // Cache for 60 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Disable automatic refetch on window focus
    refetchOnReconnect: false, // Disable automatic refetch on reconnect
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