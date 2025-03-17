import React, { useMemo } from 'react';
import { formatDate } from '../../../utils/dateUtils';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { type StructuredDataItem } from '../hooks';
import { FaTrash } from 'react-icons/fa';

interface DataListProps {
  structuredData: StructuredDataItem[] | undefined;
  selectedDataId: string | null;
  isLoading: boolean;
  onSelectData: (id: string) => void;
  onDeleteData: (id: string, e: React.MouseEvent) => void;
}

/**
 * Component that renders a list of structured data items for selection
 */
const DataList: React.FC<DataListProps> = ({
  structuredData,
  selectedDataId,
  isLoading,
  onSelectData,
  onDeleteData
}) => {
  // Memoize the filtered data
  const filteredData = useMemo(() => {
    if (!structuredData) return [];
    
    return structuredData.filter((data: StructuredDataItem) => {
      // Add any filtering logic here if needed
      return true;
    });
  }, [structuredData]);

  // Render the list of structured data
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (!filteredData || filteredData.length === 0) {
    return <div className="text-gray-500 p-4">No structured data available</div>;
  }

  return (
    <div className="space-y-2 p-2">
      {filteredData.map((data: StructuredDataItem) => {
        const displayName = data.meta_data?.name || data.data_type;
        
        return (
          <div
            key={data.id}
            className={`p-3 rounded-md cursor-pointer transition-colors ${
              selectedDataId === data.id
                ? 'bg-blue-100 dark:bg-blue-900'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            onClick={() => onSelectData(data.id)}
          >
            <div className="flex justify-between items-start">
              <div className="font-medium">{displayName}</div>
              <button
                onClick={(e) => onDeleteData(data.id, e)}
                className="text-gray-500 hover:text-red-500 p-1 -mt-1 -mr-1 rounded"
                title="Delete data"
              >
                <FaTrash size={14} />
              </button>
            </div>
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

export default DataList;