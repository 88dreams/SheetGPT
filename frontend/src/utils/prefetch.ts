/**
 * Prefetching utilities for improved user experience
 *
 * This module provides utilities for prefetching data that users are likely to need,
 * which can significantly improve perceived performance.
 */

import { enhancedApi } from './enhancedApiClient';
import { useCallback, useEffect, useRef } from 'react';

/**
 * Options for prefetch operations
 */
interface PrefetchOptions {
  /** Time to wait before prefetching in milliseconds */
  delay?: number;
  
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** Whether to abort previous prefetch when a new one is triggered */
  abortPrevious?: boolean;
  
  /** Custom headers to include with the prefetch request */
  headers?: Record<string, string>;
}

/**
 * Options for usePrefetchOnHover hook
 */
interface PrefetchOnHoverOptions extends PrefetchOptions {
  /** 
   * Enables prefetching only when the "save-data" header is not set,
   * useful for respecting user's data saver preferences
   */
  respectDataSaver?: boolean;
  
  /** Minimum hover time before prefetching in milliseconds */
  hoverDelay?: number;
  
  /** Disable prefetching during initial render */
  disableOnMount?: boolean;
}

/**
 * Prefetch API data that may be needed soon
 * 
 * @param url - API endpoint to prefetch
 * @param options - Options for prefetching
 * @returns Promise that resolves when prefetch is complete
 */
export function prefetch(url: string, options: PrefetchOptions = {}) {
  const {
    delay = 0,
    timeout = 5000,
    headers
  } = options;
  
  // Create an AbortController for the request
  const controller = new AbortController();
  
  const prefetchPromise = new Promise<void>(async (resolve) => {
    // Delay if specified
    if (delay > 0) {
      await new Promise(r => setTimeout(r, delay));
    }
    
    // Check if we've been aborted during the delay
    if (controller.signal.aborted) {
      resolve();
      return;
    }
    
    try {
      // Perform the prefetch with timeout
      await enhancedApi.prefetch(url, {
        signal: controller.signal,
        headers,
        timeout
      });
    } catch (error) {
      // Ignore errors during prefetch
      console.debug('Prefetch error:', error);
    }
    
    resolve();
  });
  
  return {
    promise: prefetchPromise,
    abort: () => controller.abort()
  };
}

/**
 * Prefetch data for a collection of related items
 * 
 * @param baseUrl - Base API endpoint
 * @param ids - Array of IDs to prefetch
 * @param options - Options for prefetching
 * @returns Object with promise and abort methods
 */
export function prefetchCollection(
  baseUrl: string,
  ids: string[],
  options: PrefetchOptions & { concurrency?: number } = {}
) {
  const {
    concurrency = 2,
    delay = 0,
    ...restOptions
  } = options;
  
  // Create an array of AbortControllers for each request
  const controllers: AbortController[] = [];
  
  const prefetchPromise = new Promise<void>(async (resolve) => {
    // Delay if specified before starting any prefetching
    if (delay > 0) {
      await new Promise(r => setTimeout(r, delay));
    }
    
    // Process in batches according to concurrency
    for (let i = 0; i < ids.length; i += concurrency) {
      // Check if we've been aborted
      if (controllers.some(c => c.signal.aborted)) {
        break;
      }
      
      // Take the next batch of IDs
      const batch = ids.slice(i, i + concurrency);
      
      // Prefetch each ID in the batch concurrently
      await Promise.all(batch.map(async (id) => {
        const controller = new AbortController();
        controllers.push(controller);
        
        try {
          await enhancedApi.prefetch(`${baseUrl}/${id}`, {
            signal: controller.signal,
            ...restOptions
          });
        } catch (error) {
          // Ignore errors during prefetch
          console.debug(`Prefetch error for ${id}:`, error);
        }
      }));
      
      // Small delay between batches to prevent overwhelming the API
      if (i + concurrency < ids.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
    
    resolve();
  });
  
  return {
    promise: prefetchPromise,
    abort: () => controllers.forEach(c => c.abort())
  };
}

/**
 * React hook for prefetching data when a component is mounted
 * 
 * @param url - API endpoint to prefetch
 * @param options - Options for prefetching
 * @returns Object with status of prefetch
 */
export function usePrefetchOnMount(url: string | null, options: PrefetchOptions = {}) {
  const { delay = 500, ...restOptions } = options;
  const prefetchRef = useRef<ReturnType<typeof prefetch> | null>(null);
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  useEffect(() => {
    // Skip if no URL provided
    if (!url) {
      return;
    }
    
    setStatus('loading');
    
    // Start prefetch
    prefetchRef.current = prefetch(url, { delay, ...restOptions });
    
    prefetchRef.current.promise
      .then(() => {
        setStatus('success');
      })
      .catch(() => {
        setStatus('error');
      });
    
    // Clean up on unmount
    return () => {
      if (prefetchRef.current) {
        prefetchRef.current.abort();
        prefetchRef.current = null;
      }
    };
  }, [url]);
  
  return { status };
}

/**
 * React hook for prefetching data when an element is hovered
 * 
 * @param url - API endpoint to prefetch
 * @param options - Options for prefetching on hover
 * @returns Object with event handlers and prefetch status
 */
export function usePrefetchOnHover(url: string | null, options: PrefetchOnHoverOptions = {}) {
  const {
    hoverDelay = 150,
    disableOnMount = true,
    respectDataSaver = true,
    ...restOptions
  } = options;
  
  const prefetchRef = useRef<ReturnType<typeof prefetch> | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const mountedRef = useRef(false);
  
  // Check if data-saver is enabled
  const shouldRespectDataSaver = respectDataSaver &&
    typeof navigator !== 'undefined' &&
    (navigator as any).connection?.saveData === true;
  
  // Clear any existing timeout
  const clearHoverTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);
  
  // Create hover handlers
  const onMouseEnter = useCallback(() => {
    // Skip if no URL provided or should respect data-saver
    if (!url || shouldRespectDataSaver || (disableOnMount && !mountedRef.current)) {
      return;
    }
    
    // Clear any existing timeout to prevent duplicate prefetches
    clearHoverTimeout();
    
    // Set a timeout for the hover delay
    timeoutRef.current = window.setTimeout(() => {
      setStatus('loading');
      
      // Abort previous prefetch if it exists
      if (prefetchRef.current) {
        prefetchRef.current.abort();
      }
      
      // Start new prefetch
      prefetchRef.current = prefetch(url, restOptions);
      
      prefetchRef.current.promise
        .then(() => {
          setStatus('success');
        })
        .catch(() => {
          setStatus('error');
        });
    }, hoverDelay);
  }, [url, hoverDelay, shouldRespectDataSaver, disableOnMount, mountedRef.current]);
  
  const onMouseLeave = useCallback(() => {
    clearHoverTimeout();
  }, [clearHoverTimeout]);
  
  // Track component mount status for disableOnMount option
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      // Clean up on unmount
      clearHoverTimeout();
      
      if (prefetchRef.current) {
        prefetchRef.current.abort();
        prefetchRef.current = null;
      }
    };
  }, []);
  
  return {
    onMouseEnter,
    onMouseLeave,
    status
  };
}

/**
 * React hook for prefetching data for list items that are near the visible area
 * 
 * @param baseUrl - Base API endpoint
 * @param ids - Array of all IDs in the list
 * @param visibleStartIndex - Index of the first visible item
 * @param visibleEndIndex - Index of the last visible item
 * @param options - Options for prefetching
 */
export function usePrefetchNearbyItems(
  baseUrl: string,
  ids: string[],
  visibleStartIndex: number,
  visibleEndIndex: number,
  options: PrefetchOptions & { lookahead?: number } = {}
) {
  const {
    lookahead = 5,
    ...restOptions
  } = options;
  
  const prefetchRef = useRef<ReturnType<typeof prefetchCollection> | null>(null);
  
  useEffect(() => {
    // Skip if no IDs are provided
    if (!baseUrl || !ids || ids.length === 0) {
      return;
    }
    
    // Calculate which IDs to prefetch (items just outside the visible range)
    const prefetchStartIndex = Math.max(0, visibleStartIndex - lookahead);
    const prefetchEndIndex = Math.min(ids.length - 1, visibleEndIndex + lookahead);
    
    // Filter out the visible IDs (we only want to prefetch non-visible ones)
    const idsToFetch: string[] = [];
    
    for (let i = prefetchStartIndex; i <= prefetchEndIndex; i++) {
      if (i < visibleStartIndex || i > visibleEndIndex) {
        idsToFetch.push(ids[i]);
      }
    }
    
    // Skip if no IDs to fetch
    if (idsToFetch.length === 0) {
      return;
    }
    
    // Abort any previous prefetch
    if (prefetchRef.current) {
      prefetchRef.current.abort();
    }
    
    // Start the prefetch
    prefetchRef.current = prefetchCollection(baseUrl, idsToFetch, restOptions);
    
    // Clean up on deps change
    return () => {
      if (prefetchRef.current) {
        prefetchRef.current.abort();
        prefetchRef.current = null;
      }
    };
  }, [baseUrl, visibleStartIndex, visibleEndIndex]);
}