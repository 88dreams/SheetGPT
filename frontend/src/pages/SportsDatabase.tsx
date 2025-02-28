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
import { FaFileExport } from 'react-icons/fa';

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
      </div>
    </PageContainer>
  );
};

export default SportsDatabase; 