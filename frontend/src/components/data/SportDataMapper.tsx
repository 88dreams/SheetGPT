import React from 'react';
import SportDataMapperContainer from './SportDataMapper/index';

// Define the interface for the component props
interface SportDataMapperProps {
  isOpen: boolean;
  onClose: () => void;
  structuredData: any;
}

/**
 * SportDataMapper component for mapping structured data to sports database entities.
 * This is a wrapper around the refactored SportDataMapperContainer component.
 */
const SportDataMapper: React.FC<SportDataMapperProps> = (props) => {
  return <SportDataMapperContainer {...props} />;
};

export default SportDataMapper; 