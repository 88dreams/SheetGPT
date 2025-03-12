import { useState, useRef, useEffect } from 'react';

interface UseResizableSidebarProps {
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  onWidthChange?: (width: number) => void;
}

export function useResizableSidebar({
  defaultWidth = 25,
  minWidth = 15,
  maxWidth = 50,
  onWidthChange
}: UseResizableSidebarProps = {}) {
  const [sidebarWidth, setSidebarWidth] = useState(defaultWidth);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
    // Add a class to the body to change cursor during resize
    document.body.classList.add('resizing');
  };

  const handleDrag = (e: MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // Limit the sidebar width between minWidth and maxWidth
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setSidebarWidth(newWidth);
      if (onWidthChange) {
        onWidthChange(newWidth);
      }
    }
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', handleDragEnd);
    // Remove the resizing class
    document.body.classList.remove('resizing');
  };

  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
      document.body.classList.remove('resizing');
    };
  }, []);

  return {
    sidebarWidth,
    setSidebarWidth,
    containerRef,
    sidebarRef,
    handleDragStart,
  };
}

export default useResizableSidebar;