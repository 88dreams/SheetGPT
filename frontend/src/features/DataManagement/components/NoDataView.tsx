import React from 'react';

interface NoDataViewProps {
  hasData?: boolean;
}

/**
 * Component that displays a message when no data is selected or available
 */
const NoDataView: React.FC<NoDataViewProps> = ({ hasData = false }) => (
  <div className="text-center py-8">
    {hasData ? (
      <>
        <p className="text-gray-600">Please select a data item from the list</p>
        <p className="text-sm text-gray-400 mt-2">
          You have data available, but no item is currently selected
        </p>
        <p className="text-sm text-gray-400 mt-2">
          If you just clicked "Send to Data" from a chat, the data is being loaded...
        </p>
      </>
    ) : (
      <>
        <p className="text-gray-500">No structured data available</p>
        <p className="text-sm text-gray-400 mt-2">
          Start a chat conversation and extract data to see it here
        </p>
      </>
    )}
  </div>
);

export default NoDataView;