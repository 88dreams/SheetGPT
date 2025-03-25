import { useEffect } from 'react';

/**
 * Custom hook to set page title with a consistent format
 * 
 * @param title The page-specific title to display
 * @param suffix Optional suffix to add after the app name (default: '')
 */
const usePageTitle = (title: string, suffix: string = '') => {
  useEffect(() => {
    // Create the full title with pattern: "Page Title | SheetGPT"
    const fullTitle = suffix 
      ? `${title} ${suffix} | SheetGPT`
      : `${title} | SheetGPT`;
    
    // Set the document title
    document.title = fullTitle;
    
    // Restore the default title when component unmounts
    return () => {
      document.title = 'SheetGPT';
    };
  }, [title, suffix]);
};

export default usePageTitle;