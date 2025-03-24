import React from 'react';

interface PageActionsProps {
  selectedDataId: string | null;
}

// Removed redundant Export button - export functionality is already
// available through the ExportDialog component in the data table

const PageActions: React.FC<PageActionsProps> = () => (
  <div className="flex gap-2">
    {/* Page actions will be added here as needed */}
  </div>
);

export default PageActions;