import React, { useMemo } from 'react';
import LinkedInConnectionBadge from '../../../../common/LinkedInConnectionBadge';
import { EntityType } from '../../../../../types/sports';

interface LinkedInColumnProps {
  entities: any[];
  selectedEntityType: EntityType;
  entityId: string;
}

/**
 * LinkedIn Connection Column component for use in EntityTable
 * Displays LinkedIn connection data for brand entities
 */
const LinkedInColumn: React.FC<LinkedInColumnProps> = ({
  selectedEntityType,
  entityId
}) => {
  // Only show LinkedIn connection data for brand entities
  const showConnections = useMemo(() => 
    selectedEntityType === 'brand',
    [selectedEntityType]
  );

  if (!showConnections) {
    return null;
  }

  return (
    <LinkedInConnectionBadge
      brandId={entityId}
      showZero={false}
    />
  );
};

export default LinkedInColumn;