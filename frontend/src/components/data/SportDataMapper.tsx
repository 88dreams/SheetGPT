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
const SportDataMapper: React.FC<SportDataMapperProps> = ({ data, onConfirm }) => {
  return (
    <SportDataMapperContainer
      isOpen={true}
      onClose={() => onConfirm(data)}
      structuredData={data}
    />
  );
};

export default SportDataMapper; 