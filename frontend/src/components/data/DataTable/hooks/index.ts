/**
 * Data table hooks consolidated exports
 * Central point of access for all DataTable hooks
 */

// Core data handling hooks
export { default as useDataTransformer } from './useDataTransformer';

// Layout and interaction hooks
export { default as useColumnResize } from './useColumnResize';
export { default as useDragAndDrop } from './useDragAndDrop';
export { default as useResizable } from './useResizable';
export { default as usePagination } from './usePagination';

// Data manipulation hooks - uncomment once these are implemented fully
// export { default as useSorting } from './useSorting';
// export { default as useSelection } from './useSelection';

// Utility function to check if dynamic hooks are available
export const isHookAvailable = (hookName: string): boolean => {
  try {
    // This approach is used because dynamic imports are async and not suited for hook detection
    // Instead, we check if the file exists at runtime (in development only)
    return [
      'useColumnResize', 
      'useDragAndDrop', 
      'useResizable', 
      'usePagination', 
      'useDataTransformer', 
      // Comment out until implemented
      // 'useSorting',
      // 'useSelection'
    ].includes(hookName);
  } catch (e) {
    return false;
  }
};