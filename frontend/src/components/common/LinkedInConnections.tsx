import React, { useState, useEffect } from 'react';
import { FaLinkedin, FaUserFriends, FaSync, FaSpinner } from 'react-icons/fa';
import { api } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../contexts/NotificationContext';

interface BrandConnection {
  brand_id: string;
  brand_name: string;
  industry?: string;
  company_type?: string;
  first_degree_count: number;
  second_degree_count: number;
  total_connections: number;
}

interface LinkedInStatusResponse {
  is_connected: boolean;
  profile_name?: string;
  connection_count?: number;
  last_synced?: string;
}

interface LinkedInConnectionsProps {
  brandId?: string;
  className?: string;
  showConnectButton?: boolean;
}

const LinkedInConnections: React.FC<LinkedInConnectionsProps> = ({
  brandId,
  className = '',
  showConnectButton = true
}) => {
  const { isAuthenticated } = useAuth();
  const { showNotification } = useNotification();
  const [status, setStatus] = useState<LinkedInStatusResponse | null>(null);
  const [brandConnection, setBrandConnection] = useState<BrandConnection | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch LinkedIn status and brand connection data
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Get token ready for possible refresh
        const token = localStorage.getItem('auth_token'); // Match the key used in apiClient.ts
        let tokenValid = true;
        
        if (token) {
          try {
            // Simple JWT expiration check
            const payload = JSON.parse(atob(token.split('.')[1]));
            const exp = payload.exp * 1000; // Convert to milliseconds
            
            if (Date.now() >= exp) {
              console.log('Token expired, attempting refresh before LinkedIn status fetch');
              try {
                const refreshResult = await api.auth.refresh();
                if (!refreshResult || !refreshResult.access_token) {
                  tokenValid = false;
                }
              } catch (refreshError) {
                console.error('Error refreshing token:', refreshError);
                tokenValid = false;
              }
            }
          } catch (parseError) {
            console.error('Error parsing token:', parseError);
          }
        } else {
          tokenValid = false;
        }
        
        if (!tokenValid) {
          console.log('Invalid token, showing not connected state');
          setStatus({ is_connected: false });
          setIsLoading(false);
          return;
        }
        
        // Get LinkedIn connection status
        try {
          const statusResponse = await api.linkedin.getStatus();
          setStatus(statusResponse);
          
          // If connected and brand ID provided, get brand connections
          if (statusResponse.is_connected && brandId) {
            try {
              const connection = await api.linkedin.getBrandConnection(brandId);
              setBrandConnection(connection);
            } catch (error) {
              console.error('Error fetching brand connection:', error);
              setBrandConnection(null);
            }
          }
        } catch (error) {
          console.error('Error fetching LinkedIn status:', error);
          // Show not connected state on error
          setStatus({ is_connected: false });
        }
      } catch (outerError) {
        console.error('Unexpected error in LinkedIn data fetch:', outerError);
        setStatus({ is_connected: false });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [isAuthenticated, brandId]);

  // Handle LinkedIn connect button click
  const handleConnect = async () => {
    if (!isAuthenticated) {
      showNotification('error', 'Authentication required. Please log in before connecting LinkedIn.');
      return;
    }

    try {
      // First, make a call to ensure we have an active session
      console.log('Checking authentication status before LinkedIn connect');
      try {
        const userResponse = await api.auth.me();
        console.log('Auth check succeeded, user:', userResponse?.email);
      } catch (authError) {
        console.error('Auth check failed:', authError);
        showNotification('error', 'Authentication error. Please log in again.');
        return;
      }
      
      // Get the current auth token to include it in the request headers
      const token = localStorage.getItem('auth_token');
      
      // Store the user ID in session storage to help with callback handling
      try {
        // Parse the JWT token to get the user ID
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload && payload.sub) {
          console.log('Storing user ID in sessionStorage for OAuth flow:', payload.sub);
          sessionStorage.setItem('linkedin_oauth_user_id', payload.sub);
        }
      } catch (parseError) {
        console.error('Error parsing token for user ID:', parseError);
      }
      
      // Instead of fetch, use window.location.href to avoid CORS issues
      console.log('Initiating LinkedIn authorization by direct navigation');
      try {
        // Include the token as a query parameter for backend authentication
        window.location.href = `/api/v1/linkedin/auth?access_token=${encodeURIComponent(token)}`;
      } catch (err) {
        console.error('LinkedIn navigation error:', err);
        showNotification('error', 'Failed to connect to LinkedIn. Please try again.');
      }
      
    } catch (error) {
      console.error('Error in LinkedIn connect process:', error);
      showNotification('error', 'Failed to connect to LinkedIn. Please try again.');
    }
  };

  // Handle LinkedIn disconnect button click
  const handleDisconnect = async () => {
    try {
      await api.linkedin.disconnect();
      showNotification('success', 'LinkedIn account disconnected');
      setStatus({ is_connected: false });
      setBrandConnection(null);
    } catch (error) {
      console.error('Error disconnecting LinkedIn account:', error);
      showNotification('error', 'Failed to disconnect LinkedIn account');
    }
  };

  // Handle sync button click
  const handleSync = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    
    try {
      await api.linkedin.sync();
      showNotification('success', 'LinkedIn connections sync started');
      
      // Wait 3 seconds and refresh data
      setTimeout(async () => {
        try {
          const newStatus = await api.linkedin.getStatus();
          setStatus(newStatus);
          
          if (brandId) {
            try {
              const connection = await api.linkedin.getBrandConnection(brandId);
              setBrandConnection(connection);
            } catch (error) {
              console.error('Error refreshing brand connection:', error);
            }
          }
        } catch (error) {
          console.error('Error refreshing LinkedIn status:', error);
        } finally {
          setIsSyncing(false);
        }
      }, 3000);
    } catch (error) {
      console.error('Error syncing LinkedIn connections:', error);
      showNotification('error', 'Failed to sync LinkedIn connections');
      setIsSyncing(false);
    }
  };

  // If loading, show a loading spinner
  if (isLoading) {
    return (
      <div className={`linkedin-loading ${className}`}>
        <div className="flex items-center justify-center py-4">
          <FaSpinner className="animate-spin text-gray-400 text-xl mr-2" />
          <span className="text-gray-500">Loading connection data...</span>
        </div>
      </div>
    );
  }

  // If not connected, show connect button
  if (!status?.is_connected) {
    if (!showConnectButton) {
      return (
        <div className={`linkedin-not-connected ${className}`}>
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <div className="text-sm text-gray-500">
              No LinkedIn connection data available
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className={`linkedin-connect ${className}`}>
        <button
          onClick={handleConnect}
          className="flex items-center px-4 py-2 bg-[#0A66C2] text-white rounded-md hover:bg-[#084482] transition-colors"
        >
          <FaLinkedin className="mr-2" />
          Connect LinkedIn
        </button>
        <p className="mt-2 text-sm text-gray-500">
          Connect your LinkedIn account to see your connections at companies in SheetGPT.
        </p>
      </div>
    );
  }

  // If connected but no brand ID, show status
  if (!brandId) {
    return (
      <div className={`linkedin-status ${className}`}>
        <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FaLinkedin className="text-[#0A66C2] text-xl mr-2" />
              <div>
                <div className="font-medium">
                  {status.profile_name ? `Connected as ${status.profile_name}` : 'LinkedIn Connected'}
                </div>
                <div className="text-sm text-gray-600">
                  {status.connection_count 
                    ? `${status.connection_count} connections` 
                    : 'Connection data loading...'}
                </div>
                {status.last_synced && (
                  <div className="text-xs text-gray-500">
                    Last updated: {new Date(status.last_synced).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
            <div className="flex">
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="p-2 bg-white rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 mr-2"
                title="Sync connections"
              >
                {isSyncing ? <FaSpinner className="animate-spin" /> : <FaSync />}
              </button>
              <button
                onClick={handleDisconnect}
                className="p-2 bg-white rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
                title="Disconnect LinkedIn"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If connected and brand ID provided, show brand connection
  return (
    <div className={`linkedin-brand-connection ${className}`}>
      <div className="p-4 bg-white rounded-md border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium flex items-center">
            <FaLinkedin className="text-[#0A66C2] text-lg mr-2" />
            LinkedIn Connections
          </h3>
          <div className="flex">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="p-1.5 bg-white rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm"
              title="Sync connections"
            >
              {isSyncing ? (
                <div className="flex items-center">
                  <FaSpinner className="animate-spin mr-1" />
                  <span>Syncing</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <FaSync className="mr-1" />
                  <span>Sync</span>
                </div>
              )}
            </button>
          </div>
        </div>
        
        {brandConnection ? (
          <div>
            <div className="flex items-center mb-3">
              <div className="bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm font-medium">
                {brandConnection.total_connections} connections at {brandConnection.brand_name}
              </div>
            </div>
            
            <div className="space-y-2">
              {brandConnection.first_degree_count > 0 && (
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
                    <span className="text-xs">1°</span>
                  </div>
                  <div className="ml-2">
                    <div className="font-medium">
                      {brandConnection.first_degree_count} first-degree connections
                    </div>
                    <div className="text-xs text-gray-500">
                      People you're directly connected to
                    </div>
                  </div>
                </div>
              )}
              
              {brandConnection.second_degree_count > 0 && (
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-indigo-300 rounded-full flex items-center justify-center text-white">
                    <span className="text-xs">2°</span>
                  </div>
                  <div className="ml-2">
                    <div className="font-medium">
                      {brandConnection.second_degree_count} second-degree connections
                    </div>
                    <div className="text-xs text-gray-500">
                      People connected to your connections
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-4 text-xs text-gray-500">
              {status?.last_synced 
                ? `Last updated: ${new Date(status.last_synced).toLocaleString()}`
                : 'Connection data is being processed...'}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-6">
            <FaUserFriends className="text-gray-300 text-2xl mr-2" />
            <div className="text-gray-500">
              No connections found at this company
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LinkedInConnections;