import { useState, useEffect } from 'react';
import { useInfiniteQuery, InfiniteData } from '@tanstack/react-query';
import { api, Conversation, PaginatedResponse } from '../../../utils/api';

interface ConversationPage extends PaginatedResponse<Conversation> {}

interface UseConversationsOptions {
  initialPageParam?: number;
  itemsPerPage?: number;
  enabled?: boolean;
}

export function useConversations({
  initialPageParam = 0,
  itemsPerPage = 20,
  enabled = true
}: UseConversationsOptions = {}) {
  const [page, setPage] = useState(initialPageParam);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const {
    data: conversationsData,
    isLoading,
    error,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useInfiniteQuery<ConversationPage, Error, InfiniteData<ConversationPage>, string[], number>({
    queryKey: ['conversations'],
    queryFn: async ({ pageParam }) => {
      console.log('Fetching conversations page:', pageParam);
      try {
        const response = await api.chat.getConversations(
          pageParam * itemsPerPage,
          itemsPerPage
        );
        return response;
      } catch (error) {
        console.error('Error fetching conversations:', error);
        throw error;
      }
    },
    getNextPageParam: (lastPage: ConversationPage, allPages: ConversationPage[]) => {
      if (lastPage.items.length < itemsPerPage) return undefined;
      return allPages.length;
    },
    initialPageParam,
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true
  });

  // Flatten conversations from all pages
  const conversations = conversationsData?.pages.flatMap(page => page.items) || [];
  const totalConversations = conversationsData?.pages[0]?.total || 0;

  // Handle loading more conversations
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      setPage(prev => prev + 1);
      fetchNextPage();
    }
  };

  // Set initial load to false when data is loaded
  useEffect(() => {
    if (conversations.length > 0 && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [conversations.length, isInitialLoad]);

  // Reset initial load when authentication changes
  const resetInitialLoad = () => {
    setIsInitialLoad(true);
  };

  return {
    conversations,
    totalConversations,
    isLoading,
    error,
    isError,
    refetch,
    hasNextPage,
    isInitialLoad,
    isFetchingNextPage,
    handleLoadMore,
    resetInitialLoad
  };
}

export default useConversations;