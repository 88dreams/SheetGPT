import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';

interface BrandConnection {
  brand_id: string;
  brand_name: string;
  industry?: string;
  company_type?: string;
  first_degree_count: number;
  second_degree_count: number;
  total_connections: number;
}

interface LinkedInConnectionBadgeProps {
  brandId: string;
  className?: string;
  showZero?: boolean;
}

const LinkedInConnectionBadge: React.FC<LinkedInConnectionBadgeProps> = ({
  brandId,
  className = '',
  showZero = false
}) => {
  const { isAuthenticated } = useAuth();
  const [connection, setConnection] = useState<BrandConnection | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // First check if LinkedIn is connected
        const statusResponse = await api.linkedin.getStatus();
        setIsConnected(statusResponse.is_connected);
        
        if (statusResponse.is_connected) {
          try {
            const connectionResponse = await api.linkedin.getBrandConnection(brandId);
            setConnection(connectionResponse);
          } catch (error) {
            // 404 is expected if there are no connections
            if (error.response?.status !== 404) {
              console.error('Error fetching brand connection:', error);
            }
            setConnection(null);
          }
        }
      } catch (error) {
        console.error('Error fetching LinkedIn status:', error);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [isAuthenticated, brandId]);

  // If loading, show skeleton
  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 bg-gray-200 rounded w-20"></div>
      </div>
    );
  }

  // If not authenticated or not connected to LinkedIn, don't show anything
  if (!isAuthenticated || !isConnected) {
    return null;
  }

  // If no connections and showZero is false, don't show anything
  if (!connection && !showZero) {
    return null;
  }

  // If no connections but showZero is true, show zero badge
  if (!connection && showZero) {
    return (
      <div className={`text-xs text-gray-500 ${className}`}>
        No LinkedIn connections
      </div>
    );
  }

  // Show connection badge
  return (
    <div className={`flex items-center ${className}`}>
      {/* Badge */}
      <div className="flex rounded-md border border-gray-200 overflow-hidden">
        {/* First degree connections */}
        <div className="flex items-center bg-blue-500 text-white px-2 py-1">
          <span className="text-xs font-medium">1°</span>
          <span className="ml-1 text-xs">{connection?.first_degree_count || 0}</span>
        </div>
        
        {/* Second degree connections */}
        <div className="flex items-center bg-indigo-300 text-white px-2 py-1">
          <span className="text-xs font-medium">2°</span>
          <span className="ml-1 text-xs">{connection?.second_degree_count || 0}</span>
        </div>
      </div>
      
      {/* Label */}
      <div className="ml-2 text-xs text-gray-600">
        Connections
      </div>
    </div>
  );
};

export default LinkedInConnectionBadge;