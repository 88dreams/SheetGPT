import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import LoadingSpinner from '../../common/LoadingSpinner';
import PageContainer from '../../common/PageContainer';
import EntityFilter, { FilterConfig } from '../EntityFilter';
import { SportsDatabaseProvider } from './SportsDatabaseContext';
import EntityTypeSelector from './EntityTypeSelector';
import ViewModeSelector from './ViewModeSelector';
import EntityList from './EntityList';
import EntityFieldsView from './EntityFieldsView';
import GlobalEntityView from './GlobalEntityView';
import EntityActions from './EntityActions';
// @ts-ignore
import { FaFileExport } from 'react-icons/fa';
import { useSportsDatabase } from './SportsDatabaseContext';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const SportsDatabase: React.FC = () => {
  const { isAuthenticated, isReady } = useAuth();
  const navigate = useNavigate();

  if (!isReady) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
        <div className="ml-3 text-gray-600">Initializing...</div>
      </div>
    );
  }

  return (
    <div className="h-full pt-0">
      <div className="page-content">
        <SportsDatabaseProvider>
          <div className="space-y-4">
            <EntityTypeSelector />
            
            <div className="space-y-4">
              <SportsDatabaseContent />
            </div>
            
            <div className="space-y-4">
              <EntityFilterWrapper />
            </div>
          </div>
        </SportsDatabaseProvider>
      </div>
    </div>
  );
};

// This component renders different content based on the view mode
const SportsDatabaseContent: React.FC = () => {
  const { viewMode, error, refetch, selectedEntityType } = useSportsDatabase();

  if (error) {
    return (
      <div className="bg-white overflow-hidden rounded-lg border border-gray-200">
        <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between rounded-t-lg">
          <h3 className="text-lg font-medium">Data Error</h3>
        </div>
        <div className="p-4">
          <div className="h-64 flex items-center justify-center text-red-600">
            <div className="text-center">
              <div>Failed to load sports database</div>
              <div className="text-sm mt-2">{(error as Error).message || 'Unknown error'}</div>
              <button 
                onClick={() => refetch()}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Title based on view mode and entity type
  const getTitleByViewMode = () => {
    const entityName = selectedEntityType.charAt(0).toUpperCase() + selectedEntityType.slice(1);
    
    switch (viewMode) {
      case 'entity':
        return `${entityName} List`;
      case 'global':
        return 'Global Entity View';
      case 'fields':
        return `${entityName} Fields`;
      default:
        return 'Entity Data';
    }
  };

  // Wrap the content in a consistent container
  return (
    <div className="bg-white overflow-hidden rounded-lg border border-gray-200">
      <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between rounded-t-lg">
        <h3 className="text-lg font-medium">{getTitleByViewMode()}</h3>
        <ViewModeSelector className="ml-auto" />
      </div>
      {(() => {
          // These components will handle their own padding
          switch (viewMode) {
            case 'entity':
              return <EntityList />;
            case 'global':
              return <GlobalEntityView />;
            case 'fields':
              return <EntityFieldsView />;
            default:
              return <EntityList />;
          }
        })()}
    </div>
  );
};

// Wrapper for EntityFilter to provide context values
const EntityFilterWrapper: React.FC = () => {
  const { 
    selectedEntityType, 
    activeFilters, 
    handleApplyFilters, 
    handleClearFilters 
  } = useSportsDatabase();

  // Debug log for the wrapper
  console.log('EntityFilterWrapper: Rendering with activeFilters:', activeFilters);

  const onApplyFilters = (filters: FilterConfig[]) => {
    console.log('EntityFilterWrapper: onApplyFilters called with:', filters);
    handleApplyFilters(filters);
  };

  const onClearFilters = () => {
    console.log('EntityFilterWrapper: onClearFilters called');
    handleClearFilters();
  };

  return (
    <div className="bg-white overflow-hidden rounded-lg border border-gray-200">
      <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between rounded-t-lg">
        <h3 className="text-lg font-medium">Filters</h3>
      </div>
      <div className="p-4">
        <EntityFilter
          entityType={selectedEntityType}
          initialFilters={activeFilters}
          onApplyFilters={onApplyFilters}
          onClearFilters={onClearFilters}
        />
      </div>
    </div>
  );
};

export default SportsDatabase; 