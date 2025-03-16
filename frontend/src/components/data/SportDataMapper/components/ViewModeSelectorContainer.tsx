import React from 'react';
import { ViewModeSelector } from './';

type ViewMode = 'entity' | 'field' | 'global';

interface ViewModeSelectorContainerProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

/**
 * Consistently styled container for the view mode selector
 */
const ViewModeSelectorContainer: React.FC<ViewModeSelectorContainerProps> = ({
  viewMode,
  onViewModeChange
}) => {
  return (
    <div className="flex justify-center mb-4">
      <ViewModeSelector 
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />
    </div>
  );
};

export default ViewModeSelectorContainer;