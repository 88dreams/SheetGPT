import { useState, useCallback, useEffect } from 'react';

interface UseResizableProps {
  defaultHeight: number;
  minHeight?: number;
  maxHeight?: number;
}

export function useResizable({ 
  defaultHeight, 
  minHeight = 100, 
  maxHeight = window.innerHeight
}: UseResizableProps) {
  const [height, setHeight] = useState(defaultHeight);
  const [isExpanded, setIsExpanded] = useState(false);

  // Toggle expansion
  const toggleExpansion = useCallback(() => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    
    if (newExpandedState) {
      const newHeight = window.innerHeight * 0.7;
      setHeight(Math.min(newHeight, maxHeight));
    } else {
      setHeight(defaultHeight);
    }
  }, [isExpanded, defaultHeight, maxHeight]);

  // Handle resize
  const handleResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = height;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientY - startY;
      setHeight(Math.max(minHeight, Math.min(maxHeight, startHeight + diff)));
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [height, minHeight, maxHeight]);

  // Cleanup effect to remove event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', () => {});
      document.removeEventListener('mouseup', () => {});
    };
  }, []);

  return {
    height,
    isExpanded,
    toggleExpansion,
    handleResize
  };
}

export default useResizable;