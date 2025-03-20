import React from 'react';
import { FieldCategoryMap, FieldValuesMap, RelatedEntitiesMap, SelectedFieldsMap } from '../types';
import FieldInput from './FieldInput';

interface FieldSelectorProps {
  fieldsByCategory: FieldCategoryMap;
  selectedFields: SelectedFieldsMap;
  fieldValues: FieldValuesMap; 
  relatedEntities: RelatedEntitiesMap;
  onToggleField: (fieldName: string) => void;
  onUpdateFieldValue: (fieldName: string, value: any) => void;
  disabled?: boolean;
}

/**
 * Component for selecting and editing fields in bulk edit modal
 */
const FieldSelector: React.FC<FieldSelectorProps> = ({
  fieldsByCategory,
  selectedFields,
  fieldValues,
  relatedEntities,
  onToggleField,
  onUpdateFieldValue,
  disabled = false
}) => {
  return (
    <div className="grid grid-cols-1 max-h-[70vh] overflow-y-auto pr-2">
      {Object.entries(fieldsByCategory).map(([category, fields]) => (
        <div key={category} className="mb-4">
          <h3 className="text-lg font-medium mb-2 text-gray-700">{category}</h3>
          <div>
            {fields.map((field) => (
              <div key={field.name} className="border border-gray-200 rounded-md p-3 mb-2">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id={`field-${field.name}`}
                    checked={!!selectedFields[field.name]}
                    onChange={() => onToggleField(field.name)}
                    className="h-4 w-4 mr-2"
                    disabled={disabled}
                  />
                  <label
                    htmlFor={`field-${field.name}`}
                    className="font-medium text-gray-700 cursor-pointer"
                  >
                    {field.name === 'division_conference_id' 
                      ? 'Division / Conference' 
                      : field.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                </div>
                
                <div className="ml-6">
                  <p className="text-sm text-gray-500 mb-2">
                    {field.name === 'division_conference_id' 
                      ? 'Select the division or conference this team belongs to' 
                      : field.description}
                  </p>
                  <FieldInput
                    field={field}
                    selected={!!selectedFields[field.name]}
                    value={fieldValues[field.name]}
                    relatedEntities={relatedEntities[field.name]}
                    onToggle={onToggleField}
                    onValueChange={onUpdateFieldValue}
                    disabled={disabled}
                  />
                  {selectedFields[field.name] && fieldValues[field.name] === '' && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ This field will be cleared if left empty
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FieldSelector;