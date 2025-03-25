import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../hooks/useAuth';
import usePageTitle from '../hooks/usePageTitle';
import SportsDatabaseService, { EntityType } from '../services/SportsDatabaseService';
import PageContainer from '../components/common/PageContainer';
// @ts-ignore
import { FaArrowLeft, FaEdit, FaTrash } from 'react-icons/fa';

const EntityDetail: React.FC = () => {
  const { entityType, id } = useParams<{ entityType: string; id: string }>();
  
  // Set the page title with entity type for better navigation
  usePageTitle(entityType ? `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Details` : 'Entity Details');
  
  const { isAuthenticated, isReady } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch entity details
  const {
    data: entity,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['entityDetail', entityType, id],
    queryFn: () => SportsDatabaseService.getEntityById(entityType as EntityType, id as string),
    enabled: isAuthenticated && isReady && !!entityType && !!id
  });
  
  // Update the page title when entity data loads
  useEffect(() => {
    if (entity && entity.name) {
      // Update with actual entity name for better navigation
      usePageTitle(`${entity.name} | ${entityType?.charAt(0).toUpperCase()}${entityType?.slice(1)}`);
    }
  }, [entity, entityType]);

  // Redirect if not authenticated
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      navigate('/login');
    }
  }, [isReady, isAuthenticated, navigate]);

  // Handle entity deletion
  const handleDeleteEntity = async () => {
    if (!entityType || !id) return;
    
    try {
      setIsDeleting(true);
      
      await SportsDatabaseService.deleteEntity(entityType as EntityType, id);
      
      // Show success notification
      showNotification('success', `Successfully deleted ${entityType}`);
      
      // Navigate back to the sports database page
      navigate('/sports');
    } catch (error) {
      console.error(`Error deleting ${entityType}:`, error);
      
      // Show error notification
      showNotification('error', `Failed to delete ${entityType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Create page actions
  const pageActions = (
    <div className="flex gap-2">
      <button
        className="px-3 py-1 text-sm font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center"
        onClick={() => navigate('/sports')}
      >
        <FaArrowLeft className="mr-2" /> Back to List
      </button>
      <button
        className="px-3 py-1 text-sm font-medium bg-red-600 text-white rounded hover:bg-red-700 flex items-center"
        onClick={() => setShowDeleteConfirm(true)}
      >
        <FaTrash className="mr-2" /> Delete
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
          <div>Failed to load entity details</div>
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
      title={`${entityType?.charAt(0).toUpperCase()}${entityType?.slice(1)} Details`}
      description={`View and manage details for this ${entityType}`}
      actions={pageActions}
    >
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="medium" />
          <span className="ml-2 text-gray-600">Loading entity details...</span>
        </div>
      ) : entity ? (
        <div className="content-card">
          <div className="content-card-title">
            {entity.name || `${entityType} Details`}
          </div>
          <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Entity details */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="space-y-3">
                  {Object.entries(entity).map(([key, value]) => {
                    // Skip certain fields
                    if (['id', 'created_at', 'updated_at', 'relationships'].includes(key)) {
                      return null;
                    }
                    
                    return (
                      <div key={key} className="flex">
                        <div className="w-1/3 text-sm font-medium text-gray-500">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div className="w-2/3 text-sm text-gray-900">
                          {value === null || value === undefined
                            ? '—'
                            : typeof value === 'object'
                              ? JSON.stringify(value)
                              : String(value)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Metadata */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Metadata</h3>
                <div className="space-y-3">
                  <div className="flex">
                    <div className="w-1/3 text-sm font-medium text-gray-500">ID</div>
                    <div className="w-2/3 text-sm text-gray-900 break-all">{entity.id}</div>
                  </div>
                  <div className="flex">
                    <div className="w-1/3 text-sm font-medium text-gray-500">Created</div>
                    <div className="w-2/3 text-sm text-gray-900">
                      {entity.created_at ? new Date(entity.created_at).toLocaleString() : '—'}
                    </div>
                  </div>
                  <div className="flex">
                    <div className="w-1/3 text-sm font-medium text-gray-500">Last Updated</div>
                    <div className="w-2/3 text-sm text-gray-900">
                      {entity.updated_at ? new Date(entity.updated_at).toLocaleString() : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Relationships */}
            {entity.relationships && Object.keys(entity.relationships).length > 0 && (
              <div className="mt-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Relationships</h3>
                <div className="space-y-6">
                  {Object.entries(entity.relationships).map(([relationType, entities]) => (
                    <div key={relationType}>
                      <h4 className="text-md font-medium text-gray-800 mb-2">
                        {relationType.charAt(0).toUpperCase() + relationType.slice(1)}
                      </h4>
                      {Array.isArray(entities) && entities.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {entities.map((relatedEntity: any) => (
                            <div 
                              key={relatedEntity.id}
                              className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                              onClick={() => navigate(`/sports/${relationType.slice(0, -1)}/${relatedEntity.id}`)}
                            >
                              <div className="font-medium text-indigo-600">{relatedEntity.name}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {relatedEntity.id.substring(0, 8)}...
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No {relationType} found</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex justify-center items-center h-64 border rounded-lg bg-gray-50">
          <div className="text-center text-gray-500">
            <p>Entity not found</p>
            <p className="text-sm mt-2">The requested {entityType} could not be found</p>
            <button
              onClick={() => navigate('/sports')}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Back to Sports Database
            </button>
          </div>
        </div>
      )}
      
      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this {entityType}? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEntity}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default EntityDetail; 