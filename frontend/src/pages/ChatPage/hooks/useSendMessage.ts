import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Message } from '../../../utils/api';

interface SendMessageParams {
  content: string;
  structuredFormat?: Record<string, any>;
}

interface UseSendMessageOptions {
  conversationId: string | null;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useSendMessage({ 
  conversationId, 
  onSuccess,
  onError
}: UseSendMessageOptions) {
  const queryClient = useQueryClient();
  
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, structuredFormat }: SendMessageParams) => {
      if (!conversationId) throw new Error('No conversation selected');
      
      console.log('Sending message:', {
        conversationId,
        content,
        hasStructuredFormat: !!structuredFormat,
        timestamp: new Date().toISOString()
      });
      
      // Get current messages from the cache
      const currentMessages = queryClient.getQueryData(['messages', conversationId]) as Message[] || [];
      
      // Create a temporary message ID for optimistic updates
      const tempMessageId = crypto.randomUUID();
      const userMessage = {
        id: tempMessageId,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
        conversation_id: conversationId,
        meta_data: structuredFormat ? { structuredFormat } : {}
      };
      
      // Create a temporary message for the assistant's response
      const assistantMessageId = crypto.randomUUID();
      const assistantMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
        conversation_id: conversationId,
        meta_data: {}
      };
      
      // Update the cache with both messages
      const updatedMessages = [...currentMessages, userMessage, assistantMessage];
      queryClient.setQueryData(['messages', conversationId], updatedMessages);

      try {
        // Send the message and handle streaming response
        const response = await api.chat.sendMessage(
          conversationId,
          content,
          structuredFormat,
          (chunk) => {
            queryClient.setQueryData(['messages', conversationId], (old: Message[] | undefined) => {
              const messages = old || [];
              return messages.map(msg => {
                if (msg.id === assistantMessageId) {
                  // Append the new chunk to the existing content
                  return { ...msg, content: (msg.content || '') + chunk };
                }
                return msg;
              });
            });
          }
        );
        
        // We'll skip the automatic refetch after streaming is complete
        // This prevents the screen from jumping around after the message is complete
        // The data we have in cache from streaming is sufficient
        
        return response;
      } catch (error) {
        // On error, rollback the optimistic update
        queryClient.setQueryData(['messages', conversationId], currentMessages);
        throw error;
      }
    },
    onSuccess: async () => {
      // Invalidate conversations to update last message
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      if (onError) {
        onError(error);
      }
    },
  });

  const sendMessage = async (content: string, structuredFormat?: Record<string, any>) => {
    return sendMessageMutation.mutateAsync({ content, structuredFormat });
  };

  return {
    sendMessage,
    isPending: sendMessageMutation.isPending,
    isError: sendMessageMutation.isError,
    error: sendMessageMutation.error
  };
}

export default useSendMessage;