import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useDataFlow } from '../../contexts/DataFlowContext';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatDate } from '../../utils/dateUtils';

interface StructuredData {
  id: string;
  data_type: string;
  created_at: string;
  meta_data?: {
    name?: string;
    source?: string;
  };
}

export const DataManagement: React.FC = () => {
  const { dataFlow, setData } = useDataFlow();
  const [isLoadingStructuredData, setIsLoadingStructuredData] = useState(false);
  const [selectedDataId, setSelectedDataId] = useState<string | null>(null);
  const [structuredData, setStructuredData] = useState<StructuredData[]>([]);

  // Memoize the handleSelectData callback
  const handleSelectData = useCallback((id: string) => {
    setSelectedDataId(id);
    const selectedData = structuredData.find(data => data.id === id);
    if (selectedData) {
      setData(selectedData);
    }
  }, [structuredData, setData]);

  // Fetch structured data with proper dependency array
  useEffect(() => {
    const fetchStructuredData = async () => {
      setIsLoadingStructuredData(true);
      try {
        const response = await fetch('/api/v1/structured-data');
        const data = await response.json();
        setStructuredData(data);
      } catch (error) {
        console.error('Error fetching structured data:', error);
      } finally {
        setIsLoadingStructuredData(false);
      }
    };

    fetchStructuredData();
  }, []); // Empty dependency array since we only want to fetch once on mount

  // Memoize the filtered data
  const filteredData = useMemo(() => {
    return structuredData.filter((data: StructuredData) => {
      // Add any filtering logic here if needed
      return true;
    });
  }, [structuredData]);

  // Render the list of structured data
  const renderStructuredDataList = () => {
    if (isLoadingStructuredData) {
      return <LoadingSpinner />;
    }

    if (!filteredData || filteredData.length === 0) {
      return <div className="text-gray-500 p-4">No structured data available</div>;
    }

    return (
      <div className="space-y-2">
        {filteredData.map((data: StructuredData) => {
          const displayName = data.meta_data?.name || data.data_type;
          
          return (
            <div
              key={data.id}
              className={`p-3 rounded-md cursor-pointer transition-colors ${
                selectedDataId === data.id
                  ? 'bg-blue-100 dark:bg-blue-900'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              onClick={() => handleSelectData(data.id)}
            >
              <div className="font-medium">{displayName}</div>
              <div className="text-xs text-gray-500">
                {formatDate(data.created_at)} • {data.data_type}
                {data.meta_data?.source && ` • Source: ${data.meta_data.source}`}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        {renderStructuredDataList()}
      </div>
    </div>
  );
}; 