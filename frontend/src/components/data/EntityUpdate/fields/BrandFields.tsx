import React from 'react';
import { Form, Select, Space, Typography } from 'antd';
import { EditOutlined, LockOutlined } from '@ant-design/icons';
import FormField from './FormField';
import { Entity } from '../../../../types/sports';
import { useEntityData } from '../hooks/useEntityData';

const { Text } = Typography;
const { Option } = Select;

interface BrandFieldsProps {
  entity: Entity;
  onChange: (field: string, value: string | number) => void;
  isEditing: boolean;
}

/**
 * Brand form fields - for editing a brand company entity
 */
const BrandFields: React.FC<BrandFieldsProps> = ({ entity, onChange, isEditing }) => {
  // List of industries for the dropdown
  const industryOptions = [
    // Original industries
    { value: 'Technology', label: 'Technology' },
    { value: 'Finance', label: 'Finance' },
    { value: 'Sports Equipment', label: 'Sports Equipment' },
    { value: 'Apparel', label: 'Apparel' },
    { value: 'Entertainment', label: 'Entertainment' },
    { value: 'Media', label: 'Media' },
    { value: 'Telecommunications', label: 'Telecommunications' },
    { value: 'Automotive', label: 'Automotive' },
    { value: 'Food and Beverage', label: 'Food and Beverage' },
    { value: 'Insurance', label: 'Insurance' },
    { value: 'Retail', label: 'Retail' },
    { value: 'Healthcare', label: 'Healthcare' },
    { value: 'Energy', label: 'Energy' },
    
    // Additional industries for broadcast/production
    { value: 'Media', label: 'Media' },
    { value: 'Broadcast', label: 'Broadcasting' },
    { value: 'Production', label: 'Production Services' },
    { value: 'Sports', label: 'Sports' },
    { value: 'Other', label: 'Other' }
  ];
  
  // Company type options
  const companyTypeOptions = [
    { value: '', label: 'None' },
    { value: 'Broadcaster', label: 'Broadcast Company' },
    { value: 'Production Company', label: 'Production Company' },
    { value: 'Agency', label: 'Agency' },
    { value: 'Sponsor', label: 'Sponsor' },
    { value: 'Advertiser', label: 'Advertiser' },
    { value: 'Vendor', label: 'Vendor' },
    { value: 'Other', label: 'Other' }
  ];
  
  // Country options (most common first)
  const countryOptions = [
    { value: 'USA', label: 'United States' },
    { value: 'Canada', label: 'Canada' },
    { value: 'Mexico', label: 'Mexico' },
    { value: 'UK', label: 'United Kingdom' },
    { value: 'France', label: 'France' },
    { value: 'Germany', label: 'Germany' },
    { value: 'Japan', label: 'Japan' },
    { value: 'China', label: 'China' },
    { value: 'India', label: 'India' },
    { value: 'Brazil', label: 'Brazil' },
    { value: 'Australia', label: 'Australia' },
    { value: 'Global', label: 'Global (International)' },
    { value: 'Other', label: 'Other' }
  ];
  
  // Relationship type options
  const relationshipTypeOptions = [
    { value: 'sponsor', label: 'Sponsor' },
    { value: 'partner', label: 'Partner' },
    { value: 'supplier', label: 'Supplier' },
    { value: 'broadcaster', label: 'Broadcaster' },
    { value: 'advertiser', label: 'Advertiser' },
    { value: 'naming_rights', label: 'Naming Rights' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <>
      <FormField
        field="name"
        label="Brand Name"
        type="text"
        value={entity.name || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
      />
      <FormField
        field="industry"
        label="Industry"
        type="select"
        value={(entity as any).industry || ''}
        onChange={onChange}
        isEditing={isEditing}
        options={industryOptions}
        isRequired={true}
        allowCustomEntry={true}
        placeholder="Select or enter industry..."
        helpText="Select an industry from the list or enter a custom value"
      />
      <FormField
        field="company_type"
        label="Company Type"
        type="select"
        value={(entity as any).company_type || ''}
        onChange={onChange}
        isEditing={isEditing}
        options={companyTypeOptions}
        allowCustomEntry={true}
        placeholder="Select or enter company type..."
        helpText="Categorizes the company's role (e.g., Broadcaster, Production Company)"
      />
      <FormField
        field="country"
        label="Country"
        type="select"
        value={(entity as any).country || ''}
        onChange={onChange}
        isEditing={isEditing}
        options={countryOptions}
        allowCustomEntry={true}
        placeholder="Select or enter country..."
      />
      
      {/* New fields for partner relationship */}
      <FormField
        field="partner"
        label="Partner"
        type="text"
        value={(entity as any).partner || ''}
        onChange={onChange}
        isEditing={isEditing}
        helpText="Enter the name of a partner entity (League, Division/Conference, Team, Player, Game, or Stadium)"
      />
      <FormField
        field="partner_relationship"
        label="Partner Relationship"
        type="select"
        value={(entity as any).partner_relationship || ''}
        onChange={onChange}
        isEditing={isEditing}
        options={relationshipTypeOptions}
        allowCustomEntry={true}
        placeholder="Select or enter relationship type..."
        helpText="Describes the relationship with the partner entity"
      />
    </>
  );
};

export default BrandFields;