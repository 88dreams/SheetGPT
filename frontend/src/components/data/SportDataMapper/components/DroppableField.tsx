import React from 'react';
import { useDrop } from 'react-dnd';

// Define the ItemType constant for drag and drop
const ItemType = 'FIELD';

// Define drag item interface
interface DragItem {
  type: string;
  field: string;
}

interface DroppableFieldProps {
  field: { name: string, required: boolean };
  sourceField: string | undefined;
  isMapped: boolean;
  onFieldMapping: (sourceField: string, targetField: string) => void;
  onRemoveMapping: (targetField: string) => void;
  onShowFieldHelp: (fieldName: string) => void;
  sourceFieldValues: Record<string, any> | any[];
  sourceFields?: string[]; // Add source fields array for index lookup
  formatFieldValue: (value: any) => string;
}

const DroppableField: React.FC<DroppableFieldProps> = ({
  field,
  sourceField,
  isMapped,
  onFieldMapping,
  onRemoveMapping,
  onShowFieldHelp,
  sourceFieldValues,
  sourceFields = [],
  formatFieldValue
}) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemType,
    drop: (item: DragItem) => {
      // Verify we have the correct value before mapping
      let valueToMap;
      
      // Handle both array and object source field values
      if (Array.isArray(sourceFieldValues)) {
        // Get the index of this field in the sourceFields array
        const index = sourceFields.indexOf(item.field);
        if (index >= 0 && index < sourceFieldValues.length) {
          valueToMap = sourceFieldValues[index];
        }
      } else {
        // Traditional object access
        valueToMap = sourceFieldValues[item.field];
      }
      
      if (valueToMap !== undefined) {
        onFieldMapping(item.field, field.name);
      } else {
        console.warn(`No value found for source field ${item.field}`);
      }
      return { field: field.name };
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
    canDrop: (item: DragItem) => item.field !== field.name,
  });

  // Get the mapped value from source field values using the sourceField prop
  let mappedValue;
  if (sourceField) {
    if (Array.isArray(sourceFieldValues)) {
      // For arrays, use the sourceFields array to find the index
      const index = sourceFields.indexOf(sourceField);
      if (index >= 0 && index < sourceFieldValues.length) {
        mappedValue = sourceFieldValues[index];
      }
    } else {
      // Object access
      mappedValue = sourceFieldValues[sourceField];
    }
  }
  
  // If we have a specific value, format it, otherwise just show the field name
  const displayValue = mappedValue !== undefined ? formatFieldValue(mappedValue) : sourceField;

  return (
    <div 
      ref={drop}
      className={`mb-2 p-2 rounded-md border ${
        isMapped 
          ? 'bg-blue-100 border-blue-400 border-2' 
          : isOver && canDrop 
            ? 'bg-green-100 border-green-400 border-2' 
            : 'bg-white border-gray-200'
      }`}
    >
      <div className="grid grid-cols-12 gap-2 items-center">
        {/* Field Name */}
        <div className="col-span-5 flex items-center">
          <div className="font-medium text-indigo-700 text-sm">{field.name}</div>
          {field.required && (
            <span className="ml-1 text-red-500">*</span>
          )}
          <button
            onClick={() => onShowFieldHelp(field.name)}
            className="ml-1 text-gray-400 hover:text-indigo-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
        
        {/* Status */}
        <div className="col-span-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            field.required ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}>
            {field.required ? 'Required' : 'Optional'}
          </span>
        </div>
        
        {/* Mapping */}
        <div className="col-span-4 flex items-center justify-between overflow-hidden">
          <div className="flex-1 min-w-0 pr-1">
            {isMapped ? (
              <div className="relative group">
                <span 
                  className="text-xs font-medium text-blue-700 truncate block"
                  title={displayValue} // Native HTML tooltip
                >
                  {displayValue}
                </span>
                {/* Custom tooltip for better styling */}
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10">
                  <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 max-w-xs break-words">
                    {displayValue}
                  </div>
                  <div className="w-2 h-2 bg-gray-900 transform rotate-45 translate-x-2 translate-y-[-4px] absolute left-0"></div>
                </div>
              </div>
            ) : (
              <span className="text-xs text-gray-500">Not mapped</span>
            )}
          </div>
          
          {isMapped && (
            <button
              onClick={() => onRemoveMapping(field.name)}
              className="flex-shrink-0 text-red-500 hover:text-red-700"
              title="Remove mapping"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DroppableField; 