// Services index file - exports all services and provides service switching capability
import realSportsDatabaseService from './SportsDatabaseService';
import mockSportsDatabaseService from './SportsDatabaseService.mock';

/**
 * Determine if we should use development fallbacks
 * This checks multiple sources to ensure we have a reliable detection mechanism
 */
export const useDevFallbacks = (): boolean => {
  const sources = {
    // 1. Check for global override from index.html
    globalOverride: typeof window !== 'undefined' && (window as any).FORCE_DEV_FALLBACKS === true,
    
    // 2. Check environment variables
    envVars: import.meta.env.DEV && (
      import.meta.env.VITE_ENABLE_DEV_FALLBACKS === 'true' || 
      import.meta.env.VITE_MOCK_DATA === 'true'
    ),
    
    // 3. Check for Docker container environment (hostname won't be localhost)
    dockerEnv: typeof window !== 'undefined' && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1'
  };
  
  const useFallbacks = sources.globalOverride || sources.envVars || sources.dockerEnv;
  
  // Log detailed source information in development mode
  if (import.meta.env.DEV) {
    console.log('Development fallback detection sources:', sources);
    console.log('Using development fallbacks:', useFallbacks);
  }
  
  return useFallbacks;
};

// Export the appropriate service implementation based on environment
export const sportsDatabaseService = useDevFallbacks() 
  ? mockSportsDatabaseService 
  : realSportsDatabaseService;

// Export services individually
export { default as authService } from './authService';
export { default as chatService } from './chatService';
export { default as dataService } from './dataService';
export { default as docsService } from './docsService';
export { default as exportService } from './exportService';
export { default as adminService } from './adminService';

// Default export is the sports database service
export default sportsDatabaseService;