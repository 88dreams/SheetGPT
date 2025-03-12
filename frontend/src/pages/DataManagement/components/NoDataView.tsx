import React from 'react';

const NoDataView: React.FC = () => (
  <div className="text-center py-8">
    <p className="text-gray-500">No structured data available</p>
    <p className="text-sm text-gray-400 mt-2">
      Start a chat conversation and extract data to see it here
    </p>
  </div>
);

export default NoDataView;