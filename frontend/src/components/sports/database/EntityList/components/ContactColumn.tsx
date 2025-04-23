import React, { useMemo } from 'react';
import ContactBadge from '../../../../common/ContactBadge';
import { EntityType } from '../../../../../types/sports';

interface ContactColumnProps {
  entities: any[];
  selectedEntityType: EntityType;
  entityId: string;
}

/**
 * Contact Column component for use in EntityTable
 * Displays contact count data for brand entities
 */
const ContactColumn: React.FC<ContactColumnProps> = ({
  selectedEntityType,
  entityId
}) => {
  // Only show contact data for brand entities
  const showContacts = useMemo(() => 
    selectedEntityType === 'brand',
    [selectedEntityType]
  );

  if (!showContacts) {
    return null;
  }

  return (
    <ContactBadge
      brandId={entityId}
      showZero={false}
    />
  );
};

export default ContactColumn;