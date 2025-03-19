import React from 'react';
import { StandardDataFormat } from '../../utils/dataTransformer';
import SportDataMapperContainer from './SportDataMapper/SportDataMapperContainer';

/**
 * Interface for the SportDataMapper component props
 */
export interface SportDataMapperProps {
  /** Structured data to be mapped to sports database entities */
  data: StandardDataFormat;
  /** Function to confirm the mapping */
  onConfirm: (data: StandardDataFormat) => void;
  /** Function to handle when the mapper is closed without confirming */
  onClose?: () => void;
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
const SportDataMapper: React.FC<SportDataMapperProps> = ({ data, onConfirm, onClose }) => {
  // Handle the close event without automatically confirming
  const handleClose = () => {
    // When modal is closed, we don't automatically confirm the data
    // This separates the "Map to Sports" action from "Send to Data"
    console.log('Sport Data Mapper closed without confirming data');
    
    // Call the onClose callback if provided
    if (onClose) {
      onClose();
    }
  };
  
  return (
    <>
      <SportDataMapperContainer
        isOpen={true}
        onClose={handleClose}
        structuredData={data}
      />
    </>
  );
};

export default SportDataMapper; 