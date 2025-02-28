import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useNotification } from '../contexts/NotificationContext';
import { useDataFlow } from '../contexts/DataFlowContext';
import { useAuth } from '../hooks/useAuth';
import SportsDatabaseService, { EntityType } from '../services/SportsDatabaseService';
import { api } from '../utils/api';
import PageContainer from '../components/common/PageContainer';
// @ts-ignore
import { FaFileExport, FaTrash, FaEye } from 'react-icons/fa';

const ENTITY_TYPES = [
  { id: 'league', name: 'Leagues', description: 'Sports leagues' },
  { id: 'team', name: 'Teams', description: 'Sports teams' },
  { id: 'player', name: 'Players', description: 'Team players' },
  { id: 'game', name: 'Games', description: 'Scheduled games' },
  { id: 'stadium', name: 'Stadiums', description: 'Venues and stadiums' },
  { id: 'broadcast', name: 'Broadcast Rights', description: 'Media broadcast rights' },
  { id: 'production', name: 'Production Services', description: 'Production services' },
  { id: 'brand', name: 'Brand Relationships', description: 'Sponsorships and partnerships' }
];

const SportsDatabase: React.FC = () => {
  const { isAuthenticated, isReady } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { setDestination } = useDataFlow();
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType>('league');
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [includeRelationships, setIncludeRelationships] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'entity' | 'global'>('entity');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [globalMappings, setGlobalMappings] = useState<Record<string, Record<string, string>>>({});

  // Update data flow when component mounts
  useEffect(() => {
    setDestination('sportsdb');
  }, []);

  // Fetch entities based on selected type
  const {
    data: entities,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['sportsEntities', selectedEntityType],
    queryFn: () => SportsDatabaseService.getEntitiesWithRelationships(selectedEntityType),
    enabled: isAuthenticated && isReady
  });

  // Handle entity selection
  const toggleEntitySelection = (entityId: string) => {
    setSelectedEntities(prev => 
      prev.includes(entityId)
        ? prev.filter(id => id !== entityId)
        : [...prev, entityId]
    );
  };

  // Handle export to Google Sheets
  const handleExportToSheets = async (selectedEntities: any[]) => {
    try {
      setIsExporting(true);
      
      // Use the actual API endpoint for exporting
      const result = await api.sports.exportEntities({
        entity_type: selectedEntityType,
        entity_ids: selectedEntities.map(entity => entity.id),
        include_relationships: true
      });
      
      // Show success notification
      showNotification('success', `Successfully exported ${selectedEntities.length} ${selectedEntityType} entities to Google Sheets`);
      
      // Open the spreadsheet in a new tab if URL is provided
      if (result.spreadsheet_url) {
        window.open(result.spreadsheet_url, '_blank');
      }
    } catch (error) {
      console.error('Error exporting to Google Sheets:', error);
      
      // Show error notification
      showNotification('error', `Failed to export ${selectedEntityType} entities to Google Sheets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle entity deletion
  const handleDeleteEntity = async (entityId: string) => {
    try {
      setIsDeleting(true);
      
      await SportsDatabaseService.deleteEntity(selectedEntityType, entityId);
      
      // Show success notification
      showNotification('success', `Successfully deleted ${selectedEntityType} entity`);
      
      // Remove from selected entities if it was selected
      setSelectedEntities(prev => prev.filter(id => id !== entityId));
      
      // Refresh the entity list
      refetch();
    } catch (error) {
      console.error(`Error deleting ${selectedEntityType}:`, error);
      
      // Show error notification
      showNotification('error', `Failed to delete ${selectedEntityType} entity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(null);
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      navigate('/login');
    }
  }, [isReady, isAuthenticated, navigate]);

  // Create page actions
  const pageActions = (
    <div className="flex gap-2">
      <button
        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 flex items-center"
        onClick={() => navigate('/export')}
        disabled={selectedEntities.length === 0}
      >
        <FaFileExport className="mr-2" /> Export
      </button>
    </div>
  );

  if (!isReady) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
        <div className="ml-3 text-gray-600">Initializing...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center text-red-600">
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
    );
  }

  return (
    <PageContainer
      title="Sports Database"
      description="Manage and explore sports entities and relationships"
      actions={pageActions}
    >
      <div className="content-card">
        <div className="content-card-title">Entity Types</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {ENTITY_TYPES.map(entityType => (
            <div
              key={entityType.id}
              className={`p-4 rounded-lg cursor-pointer border ${
                selectedEntityType === entityType.id
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedEntityType(entityType.id as EntityType)}
            >
              <div className="font-medium">{entityType.name}</div>
              <div className="text-sm text-gray-500 mt-1">{entityType.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="content-card">
        <div className="content-card-title">Entity List</div>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">
            {ENTITY_TYPES.find(e => e.id === selectedEntityType)?.name || 'Entities'}
          </h2>
          <div className="flex items-center">
            <div className="flex mr-4">
              <button
                type="button"
                className={`px-3 py-1 text-xs font-medium rounded-l-md ${
                  viewMode === 'entity'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
                onClick={() => setViewMode('entity')}
              >
                Entity View
              </button>
              <button
                type="button"
                className={`px-3 py-1 text-xs font-medium rounded-r-md ${
                  viewMode === 'global'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
                onClick={() => setViewMode('global')}
              >
                Global View
              </button>
            </div>
            <label className="flex items-center text-sm text-gray-600 mr-4">
              <input
                type="checkbox"
                checked={includeRelationships}
                onChange={(e) => setIncludeRelationships(e.target.checked)}
                className="mr-2"
              />
              Include relationships in export
            </label>
            <button
              onClick={() => handleExportToSheets(entities || [])}
              disabled={selectedEntities.length === 0 || isExporting}
              className={`px-4 py-2 rounded text-white ${
                selectedEntities.length > 0 && !isExporting
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              Export to Sheets
            </button>
          </div>
        </div>
        
        {viewMode === 'entity' && (
          <>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="medium" />
                <span className="ml-2 text-gray-600">Loading entities...</span>
              </div>
            ) : entities && entities.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="w-12 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedEntities.length === entities.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEntities(entities.map(entity => entity.id));
                            } else {
                              setSelectedEntities([]);
                            }
                          }}
                        />
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Relationships
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {entities.map((entity) => (
                      <tr key={entity.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedEntities.includes(entity.id)}
                            onChange={() => toggleEntitySelection(entity.id)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{entity.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(entity.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {entity.relationships && (
                              <div className="flex flex-wrap gap-1">
                                {entity.relationships.teams && entity.relationships.teams.length > 0 && (
                                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                    {entity.relationships.teams.length} Teams
                                  </span>
                                )}
                                {entity.relationships.players && entity.relationships.players.length > 0 && (
                                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                    {entity.relationships.players.length} Players
                                  </span>
                                )}
                                {entity.relationships.games && entity.relationships.games.length > 0 && (
                                  <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                                    {entity.relationships.games.length} Games
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setShowDeleteConfirm(entity.id)}
                              className="text-red-500 hover:text-red-700"
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                            <button
                              onClick={() => {
                                // Navigate to entity detail view
                                navigate(`/sports/${selectedEntityType}/${entity.id}`);
                              }}
                              className="text-blue-500 hover:text-blue-700"
                              title="View Details"
                            >
                              <FaEye />
                            </button>
                          </div>
                          {showDeleteConfirm === entity.id && (
                            <div className="absolute z-10 mt-2 p-3 bg-white rounded-md shadow-lg border border-gray-200">
                              <p className="text-sm text-gray-700 mb-2">Are you sure you want to delete this {selectedEntityType}?</p>
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => setShowDeleteConfirm(null)}
                                  className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleDeleteEntity(entity.id)}
                                  className="px-2 py-1 text-xs text-white bg-red-500 hover:bg-red-600 rounded"
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex justify-center items-center h-64 border rounded-lg bg-gray-50">
                <div className="text-center text-gray-500">
                  <p>No {selectedEntityType} entities found</p>
                  <p className="text-sm mt-2">Try selecting a different entity type or adding new entities</p>
                </div>
              </div>
            )}
          </>
        )}

        {viewMode === 'global' && (
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Global View of All Entities</h4>
            <div className="overflow-y-auto max-h-[500px]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity Type</th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4">
                        <div className="flex justify-center items-center">
                          <LoadingSpinner size="small" />
                          <span className="ml-2 text-gray-600">Loading entities...</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    ENTITY_TYPES.map(entityType => {
                      // Get entities of this type
                      const entitiesOfType = entities && selectedEntityType === entityType.id ? entities : [];
                      const count = entitiesOfType?.length || 0;
                      
                      // Get the most recently updated entity
                      const mostRecentEntity = entitiesOfType?.length > 0 
                        ? entitiesOfType.reduce((latest, current) => {
                            return new Date(current.updated_at) > new Date(latest.updated_at) ? current : latest;
                          }, entitiesOfType[0])
                        : null;
                      
                      return (
                        <tr key={entityType.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                            {entityType.name}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                            {selectedEntityType === entityType.id ? count : '—'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                            {mostRecentEntity ? new Date(mostRecentEntity.updated_at).toLocaleString() : '—'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                            <button
                              className="text-indigo-600 hover:text-indigo-800"
                              onClick={() => setSelectedEntityType(entityType.id as EntityType)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default SportsDatabase; 