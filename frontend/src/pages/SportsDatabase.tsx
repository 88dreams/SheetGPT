import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useNotification } from '../contexts/NotificationContext';
import { useDataFlow } from '../contexts/DataFlowContext';
import { useAuth } from '../hooks/useAuth';
import SportsDatabaseService, { EntityType, BaseEntity, League, Team, Player, Game, Stadium, BroadcastRights, GameBroadcast, ProductionService, Brand, BrandRelationship, LeagueExecutive } from '../services/SportsDatabaseService';
import { api } from '../utils/api';
import PageContainer from '../components/common/PageContainer';
// @ts-ignore
import { FaFileExport, FaTrash, FaEye, FaList, FaGlobe, FaTable, FaSortUp, FaSortDown, FaSort } from 'react-icons/fa';

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
  const [viewMode, setViewMode] = useState<'entity' | 'global' | 'fields'>('entity');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [globalMappings, setGlobalMappings] = useState<Record<string, Record<string, string>>>({});
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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
        className="px-3 py-1 text-sm font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
        onClick={() => navigate('/export')}
        disabled={selectedEntities.length === 0}
      >
        <FaFileExport className="mr-2" /> Export
      </button>
    </div>
  );

  // Get field information for an entity type
  const getEntityFields = (entityType: EntityType) => {
    const fields: { name: string; required: boolean; type: string; description: string }[] = [];
    
    // Common fields for all entities
    fields.push(
      { name: 'id', required: false, type: 'string', description: 'Unique identifier (auto-generated)' },
      { name: 'name', required: true, type: 'string', description: 'Name of the entity' },
      { name: 'created_at', required: false, type: 'datetime', description: 'Creation timestamp (auto-generated)' },
      { name: 'updated_at', required: false, type: 'datetime', description: 'Last update timestamp (auto-generated)' }
    );
    
    // Entity-specific fields
    switch (entityType) {
      case 'league':
        fields.push(
          { name: 'sport', required: true, type: 'string', description: 'Sport type (e.g., Football, Basketball)' },
          { name: 'country', required: true, type: 'string', description: 'Country where the league operates' },
          { name: 'founded_year', required: true, type: 'number', description: 'Year the league was founded' },
          { name: 'broadcast_start_date', required: false, type: 'date', description: 'Start date of broadcast rights' },
          { name: 'broadcast_end_date', required: false, type: 'date', description: 'End date of broadcast rights' }
        );
        break;
        
      case 'team':
        fields.push(
          { name: 'league_id', required: true, type: 'string', description: 'ID of the league this team belongs to' },
          { name: 'stadium_id', required: true, type: 'string', description: 'ID of the home stadium' },
          { name: 'city', required: true, type: 'string', description: 'City where the team is based' },
          { name: 'state', required: false, type: 'string', description: 'State/province where the team is based' },
          { name: 'country', required: true, type: 'string', description: 'Country where the team is based' },
          { name: 'founded_year', required: true, type: 'number', description: 'Year the team was founded' }
        );
        break;
        
      case 'player':
        fields.push(
          { name: 'team_id', required: true, type: 'string', description: 'ID of the team this player belongs to' },
          { name: 'position', required: true, type: 'string', description: 'Player position' },
          { name: 'jersey_number', required: false, type: 'number', description: 'Player jersey number' },
          { name: 'college', required: false, type: 'string', description: 'College the player attended' }
        );
        break;
        
      case 'game':
        fields.push(
          { name: 'league_id', required: true, type: 'string', description: 'ID of the league this game belongs to' },
          { name: 'home_team_id', required: true, type: 'string', description: 'ID of the home team' },
          { name: 'away_team_id', required: true, type: 'string', description: 'ID of the away team' },
          { name: 'stadium_id', required: true, type: 'string', description: 'ID of the stadium where the game is played' },
          { name: 'date', required: true, type: 'date', description: 'Date of the game' },
          { name: 'time', required: true, type: 'time', description: 'Time of the game' },
          { name: 'home_score', required: false, type: 'number', description: 'Score of the home team' },
          { name: 'away_score', required: false, type: 'number', description: 'Score of the away team' },
          { name: 'status', required: true, type: 'string', description: 'Game status (scheduled, in_progress, completed, etc.)' },
          { name: 'season_year', required: true, type: 'number', description: 'Year of the season' },
          { name: 'season_type', required: true, type: 'string', description: 'Type of season (regular, playoff, etc.)' }
        );
        break;
        
      case 'stadium':
        fields.push(
          { name: 'city', required: true, type: 'string', description: 'City where the stadium is located' },
          { name: 'state', required: false, type: 'string', description: 'State/province where the stadium is located' },
          { name: 'country', required: true, type: 'string', description: 'Country where the stadium is located' },
          { name: 'capacity', required: true, type: 'number', description: 'Seating capacity of the stadium' },
          { name: 'owner', required: true, type: 'string', description: 'Owner of the stadium' },
          { name: 'naming_rights_holder', required: false, type: 'string', description: 'Entity holding naming rights' },
          { name: 'host_broadcaster_id', required: false, type: 'string', description: 'ID of the host broadcaster' }
        );
        break;
        
      case 'broadcast':
        fields.push(
          { name: 'broadcast_company_id', required: true, type: 'string', description: 'ID of the broadcasting company' },
          { name: 'entity_type', required: true, type: 'string', description: 'Type of entity (league, team, game)' },
          { name: 'entity_id', required: true, type: 'string', description: 'ID of the entity' },
          { name: 'territory', required: true, type: 'string', description: 'Broadcast territory' },
          { name: 'start_date', required: true, type: 'date', description: 'Start date of broadcast rights' },
          { name: 'end_date', required: true, type: 'date', description: 'End date of broadcast rights' },
          { name: 'is_exclusive', required: false, type: 'boolean', description: 'Whether the rights are exclusive' }
        );
        break;
        
      case 'production':
        fields.push(
          { name: 'production_company_id', required: true, type: 'string', description: 'ID of the production company' },
          { name: 'entity_type', required: true, type: 'string', description: 'Type of entity (league, team, game)' },
          { name: 'entity_id', required: true, type: 'string', description: 'ID of the entity' },
          { name: 'service_type', required: true, type: 'string', description: 'Type of production service' },
          { name: 'start_date', required: true, type: 'date', description: 'Start date of production service' },
          { name: 'end_date', required: false, type: 'date', description: 'End date of production service' }
        );
        break;
        
      case 'brand':
        fields.push(
          { name: 'industry', required: true, type: 'string', description: 'Industry the brand belongs to' }
        );
        break;
        
      case 'game_broadcast':
        fields.push(
          { name: 'game_id', required: true, type: 'string', description: 'ID of the game' },
          { name: 'broadcast_company_id', required: true, type: 'string', description: 'ID of the broadcasting company' },
          { name: 'production_company_id', required: false, type: 'string', description: 'ID of the production company' },
          { name: 'broadcast_type', required: true, type: 'string', description: 'Type of broadcast' },
          { name: 'territory', required: true, type: 'string', description: 'Broadcast territory' },
          { name: 'start_time', required: false, type: 'time', description: 'Start time of the broadcast' },
          { name: 'end_time', required: false, type: 'time', description: 'End time of the broadcast' }
        );
        break;
        
      case 'league_executive':
        fields.push(
          { name: 'league_id', required: true, type: 'string', description: 'ID of the league' },
          { name: 'position', required: true, type: 'string', description: 'Executive position' },
          { name: 'start_date', required: true, type: 'date', description: 'Start date of the position' },
          { name: 'end_date', required: false, type: 'date', description: 'End date of the position' }
        );
        break;
    }
    
    return fields;
  };

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sorted entities
  const getSortedEntities = () => {
    if (!entities) return [];
    
    return [...entities].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle dates
      if (sortField === 'created_at' || sortField === 'updated_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      // Handle relationships count
      if (sortField === 'relationships') {
        const aRelCount = a.relationships ? 
          Object.values(a.relationships).reduce((sum: number, rel: any) => sum + (Array.isArray(rel) ? rel.length : 0), 0) : 0;
        const bRelCount = b.relationships ? 
          Object.values(b.relationships).reduce((sum: number, rel: any) => sum + (Array.isArray(rel) ? rel.length : 0), 0) : 0;
        aValue = aRelCount;
        bValue = bRelCount;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Render sort icon
  const renderSortIcon = (field: string) => {
    if (sortField !== field) return <FaSort className="ml-1 text-gray-400" />;
    return sortDirection === 'asc' ? 
      <FaSortUp className="ml-1 text-indigo-600" /> : 
      <FaSortDown className="ml-1 text-indigo-600" />;
  };

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
        <div className="content-card-title grid grid-cols-3 items-center">
          <div className="text-left">Entity List</div>
          <div className="flex justify-center">
            <div className="flex space-x-2 mb-4">
              <button
                className={`px-3 py-1 text-sm font-medium rounded flex items-center ${
                  viewMode === 'entity'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setViewMode('entity')}
              >
                <FaList className="mr-2" /> Entities
              </button>
              <button
                className={`px-3 py-1 text-sm font-medium rounded flex items-center ${
                  viewMode === 'global'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setViewMode('global')}
              >
                <FaGlobe className="mr-2" /> Global
              </button>
              <button
                className={`px-3 py-1 text-sm font-medium rounded flex items-center ${
                  viewMode === 'fields'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setViewMode('fields')}
              >
                <FaTable className="mr-2" /> Fields
              </button>
            </div>
          </div>
          <div className="text-right"></div> {/* Empty div for grid spacing */}
        </div>
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
              className={`px-4 py-2 rounded text-sm font-medium ${
                selectedEntities.length > 0 && !isExporting
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isExporting ? 'Exporting...' : 'Export to Sheets'}
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
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center">
                          Name
                          {renderSortIcon('name')}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('created_at')}
                      >
                        <div className="flex items-center">
                          Created
                          {renderSortIcon('created_at')}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('relationships')}
                      >
                        <div className="flex items-center">
                          Relationships
                          {renderSortIcon('relationships')}
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getSortedEntities().map((entity) => (
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
                    <th 
                      scope="col" 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('entityType')}
                    >
                      <div className="flex items-center">
                        Entity Type
                        {renderSortIcon('entityType')}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('count')}
                    >
                      <div className="flex items-center">
                        Count
                        {renderSortIcon('count')}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('lastUpdated')}
                    >
                      <div className="flex items-center">
                        Last Updated
                        {renderSortIcon('lastUpdated')}
                      </div>
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
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
                      
                      return {
                        id: entityType.id,
                        name: entityType.name,
                        count: count,
                        lastUpdated: mostRecentEntity ? new Date(mostRecentEntity.updated_at).getTime() : 0,
                        entityType: entityType.name,
                        mostRecentEntity
                      };
                    })
                    .sort((a, b) => {
                      let aValue = a[sortField];
                      let bValue = b[sortField];
                      
                      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
                      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
                      return 0;
                    })
                    .map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {item.name}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                          {selectedEntityType === item.id ? item.count : '—'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                          {item.mostRecentEntity ? new Date(item.mostRecentEntity.updated_at).toLocaleString() : '—'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          <button
                            className="text-indigo-600 hover:text-indigo-800"
                            onClick={() => setSelectedEntityType(item.id as EntityType)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === 'fields' && (
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Fields for {ENTITY_TYPES.find(e => e.id === selectedEntityType)?.name || selectedEntityType}</h4>
            <div className="overflow-y-auto max-h-[500px]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('fieldName')}
                    >
                      <div className="flex items-center">
                        Field Name
                        {renderSortIcon('fieldName')}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('fieldType')}
                    >
                      <div className="flex items-center">
                        Type
                        {renderSortIcon('fieldType')}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('required')}
                    >
                      <div className="flex items-center">
                        Required
                        {renderSortIcon('required')}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('description')}
                    >
                      <div className="flex items-center">
                        Description
                        {renderSortIcon('description')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getEntityFields(selectedEntityType)
                    .map(field => ({
                      fieldName: field.name,
                      fieldType: field.type,
                      required: field.required,
                      description: field.description,
                      name: field.name,
                      type: field.type
                    }))
                    .sort((a, b) => {
                      let aValue = a[sortField];
                      let bValue = b[sortField];
                      
                      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
                      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
                      return 0;
                    })
                    .map((field) => (
                      <tr key={field.name} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          {field.name}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            field.type === 'string' ? 'bg-blue-100 text-blue-800' :
                            field.type === 'number' ? 'bg-green-100 text-green-800' :
                            field.type === 'boolean' ? 'bg-yellow-100 text-yellow-800' :
                            field.type === 'date' || field.type === 'datetime' || field.type === 'time' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {field.type}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                          {field.required ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Required</span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Optional</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-600">
                          {field.description}
                        </td>
                      </tr>
                    ))}
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