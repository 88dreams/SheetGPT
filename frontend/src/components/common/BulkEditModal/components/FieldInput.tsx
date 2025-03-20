import React from 'react';
import { FieldProps } from '../types';

/**
 * Component for rendering different types of field inputs
 */
const FieldInput: React.FC<FieldProps> = ({
  field,
  selected,
  value,
  relatedEntities,
  onValueChange,
  disabled = false
}) => {
  const { name, type } = field;
  
  // Handle foreign key/relationship fields with dropdowns
  if (name.endsWith('_id') && relatedEntities?.length > 0) {
    // Get the entity type from the field name (e.g., league_id -> League)
    const entityLabel = name.replace('_id', '').replace(/^\w/, c => c.toUpperCase());
    
    // For division_conference_id, sort by league name and then division name
    let sortedEntities = [...relatedEntities];
    if (name === 'division_conference_id') {
      sortedEntities.sort((a, b) => {
        // First sort by league name
        const leagueA = a.league_name || '';
        const leagueB = b.league_name || '';
        
        if (leagueA !== leagueB) {
          return leagueA.localeCompare(leagueB);
        }
        
        // Then sort by division name
        return (a.name || '').localeCompare(b.name || '');
      });
    }
    
    return (
      <select
        value={value || ''}
        onChange={(e) => onValueChange(name, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        disabled={disabled || !selected}
      >
        <option value="">{`Select ${entityLabel}...`}</option>
        {sortedEntities.map(entity => (
          <option key={entity.id} value={entity.id}>
            {name === 'division_conference_id' 
              ? `${entity.name} (${entity.league_name || 'Unknown League'})` 
              : entity.name || entity.id}
          </option>
        ))}
      </select>
    );
  }
  
  // Special handling for nickname field
  if (name === 'nickname') {
    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onValueChange(name, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        disabled={disabled || !selected}
        placeholder={selected ? "Enter league nickname (e.g., NFL, NBA)" : ""}
      />
    );
  }
  
  // Number fields
  if (type === 'number') {
    return (
      <input
        type="number"
        value={value || ''}
        onChange={(e) => onValueChange(name, e.target.value === '' ? '' : Number(e.target.value))}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        disabled={disabled || !selected}
      />
    );
  }
  
  // Date fields
  if (type === 'date') {
    return (
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onValueChange(name, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        disabled={disabled || !selected}
      />
    );
  }
  
  // Datetime fields
  if (type === 'datetime') {
    return (
      <input
        type="datetime-local"
        value={value || ''}
        onChange={(e) => onValueChange(name, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        disabled={disabled || !selected}
      />
    );
  }
  
  // Boolean fields
  if (type === 'boolean') {
    return (
      <select
        value={value?.toString() || ''}
        onChange={(e) => onValueChange(name, e.target.value === 'true')}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        disabled={disabled || !selected}
      >
        <option value="">Select...</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }
  
  // Default to text input
  return (
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onValueChange(name, e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md"
      disabled={disabled || !selected}
      placeholder={selected ? "Enter value or leave empty to clear" : ""}
    />
  );
};

export default FieldInput;