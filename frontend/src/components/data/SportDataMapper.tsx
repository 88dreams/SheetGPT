import React from 'react';
import SportDataMapperContainer from './SportDataMapper/SportDataMapperContainer';

/**
 * Interface for the SportDataMapper component props
 */
interface SportDataMapperProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Function to close the modal */
  onClose: () => void;
  /** Structured data to be mapped to sports database entities */
  structuredData: any;
}

/**
 * SportDataMapper component for mapping structured data to sports database entities.
 * This is a wrapper around the refactored SportDataMapperContainer component.
 * 
 * The component provides a user interface for:
 * - Selecting an entity type (team, player, league, etc.)
 * - Mapping source fields to entity fields using drag-and-drop
 * - Navigating through records
 * - Excluding specific records from import
 * - Saving mapped data to the database
 * - Batch importing multiple records
 */
const SportDataMapper: React.FC<SportDataMapperProps> = (props) => {
  return <SportDataMapperContainer {...props} />;
};

export default SportDataMapper; 