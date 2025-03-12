import { useState, useCallback, useRef, useEffect } from 'react';

interface UseColumnResizeProps {
  headers: string[];
  defaultWidth?: number;
}

export function useColumnResize({ headers, defaultWidth = 150 }: UseColumnResizeProps) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const tableRef = useRef<HTMLDivElement>(null);
  
  // Initialize column widths
  useEffect(() => {
    if (headers.length > 0 && Object.keys(columnWidths).length === 0) {
      const initialWidths: Record<string, number> = {};
      headers.forEach(header => {
        initialWidths[header] = defaultWidth;
      });
      setColumnWidths(initialWidths);
    }
  }, [headers, columnWidths, defaultWidth]);

  // Handle column resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, header: string) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent drag and drop from triggering
    
    // Store initial values
    const initialX = e.clientX;
    const initialWidth = columnWidths[header] || defaultWidth;
    
    // Get the table element and header element
    const tableElement = tableRef.current;
    if (!tableElement) return;
    
    const headerElement = tableElement.querySelector(`th[data-header="${header}"]`);
    if (!headerElement) return;
    
    // Define the mousemove handler
    function handleMouseMove(moveEvent: MouseEvent) {
      moveEvent.preventDefault();
      
      // Calculate the new width
      const diff = moveEvent.clientX - initialX;
      const newWidth = Math.max(80, initialWidth + diff); // Minimum width of 80px
      
      // Update the column width in real-time
      setColumnWidths(prev => ({
        ...prev,
        [header]: newWidth
      }));
    }
    
    // Define the mouseup handler
    function handleMouseUp(upEvent: MouseEvent) {
      // Remove event listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    
    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths, defaultWidth]);

  // Cleanup effect to remove event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', () => {});
      document.removeEventListener('mouseup', () => {});
    };
  }, []);

  return {
    columnWidths,
    tableRef,
    handleResizeStart
  };
}

export default useColumnResize;