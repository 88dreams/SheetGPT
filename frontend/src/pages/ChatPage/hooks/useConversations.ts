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
  } = useInfiniteQuery<ConversationPage, Error, InfiniteData<ConversationPage>, string[]>({
    queryKey: ['conversations'],
    queryFn: async ({ pageParam }) => {
      // Ensure pageParam is a valid number
      const page = typeof pageParam === 'number' && !isNaN(pageParam) ? pageParam : 0;
      console.log('Fetching conversations page:', page);
      try {
        const skip = page * itemsPerPage;
        const response = await api.chat.getConversations(
          skip,
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
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // Renamed gcTime to cacheTime
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true
  });

  // Flatten conversations from all pages with proper type assertions
  const conversations: Conversation[] = conversationsData?.pages.flatMap((page) => ((page as unknown) as ConversationPage).items) || [];
  const totalConversations: number = ((conversationsData?.pages[0] as unknown) as ConversationPage | undefined)?.total ?? 0;

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