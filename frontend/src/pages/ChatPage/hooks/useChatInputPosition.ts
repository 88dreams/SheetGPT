import { useEffect, useRef, useLayoutEffect, useCallback } from 'react';

interface UseChatInputPositionProps {
  sidebarRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  sidebarWidth: number;
  onPositionUpdated?: () => void;
}

export function useChatInputPosition({
  sidebarRef,
  containerRef,
  sidebarWidth,
  onPositionUpdated
}: UseChatInputPositionProps) {
  const chatInputRef = useRef<HTMLDivElement>(null);
  
  // Function to update chat input position based on sidebar's actual width
  const updateChatInputPosition = useCallback(() => {
    if (sidebarRef.current && chatInputRef.current && containerRef.current) {
      // Get the sidebar and divider elements
      const sidebarElement = sidebarRef.current;
      const dividerElement = sidebarElement.nextElementSibling as HTMLElement;
      
      if (dividerElement) {
        // Get the right edge of the divider
        const dividerRect = dividerElement.getBoundingClientRect();
        
        // Set the chat input position to align with the right edge of the divider
        chatInputRef.current.style.left = `${dividerRect.right}px`;
        chatInputRef.current.style.width = `calc(100% - ${dividerRect.right}px)`;
        
        if (onPositionUpdated) {
          onPositionUpdated();
        }
      }
    }
  }, [sidebarRef, containerRef, onPositionUpdated]);

  // Update chat input position whenever sidebar width changes
  useEffect(() => {
    updateChatInputPosition();
  }, [sidebarWidth, updateChatInputPosition]);

  // Use layout effect to ensure positioning happens after DOM measurements are available
  useLayoutEffect(() => {
    // Initial position update
    updateChatInputPosition();
    
    // Add a small delay to ensure all DOM elements are properly sized
    const timeoutId = setTimeout(() => {
      updateChatInputPosition();
    }, 100);
    
    // Set up a MutationObserver to detect DOM changes
    if (containerRef.current) {
      const observer = new MutationObserver(() => {
        updateChatInputPosition();
      });
      
      observer.observe(containerRef.current, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
      
      return () => {
        clearTimeout(timeoutId);
        observer.disconnect();
      };
    }
    
    return () => clearTimeout(timeoutId);
  }, [containerRef, updateChatInputPosition]);

  // Also update on window resize
  useEffect(() => {
    window.addEventListener('resize', updateChatInputPosition);
    
    // Run once after first render to ensure correct positioning
    const timeoutId = setTimeout(updateChatInputPosition, 50);
    
    return () => {
      window.removeEventListener('resize', updateChatInputPosition);
      clearTimeout(timeoutId);
    };
  }, [updateChatInputPosition]);

  // Add an effect to update position when the component is fully mounted
  useEffect(() => {
    // Run immediately
    updateChatInputPosition();
    
    // And again after a short delay to catch any late layout adjustments
    const timeoutId1 = setTimeout(updateChatInputPosition, 50);
    const timeoutId2 = setTimeout(updateChatInputPosition, 200);
    const timeoutId3 = setTimeout(updateChatInputPosition, 500);
    
    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
    };
  }, [updateChatInputPosition]);

  // Add visibility change listener to handle tab switching
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, updating chat input position');
        // Update immediately and with delays when page becomes visible again
        updateChatInputPosition();
        setTimeout(updateChatInputPosition, 100);
        setTimeout(updateChatInputPosition, 300);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updateChatInputPosition]);

  return { 
    chatInputRef,
    updateChatInputPosition
  };
}

export default useChatInputPosition;