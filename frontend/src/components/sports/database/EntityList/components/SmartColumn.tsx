import React, { useMemo } from 'react';
import { FaSort, FaSortUp, FaSortDown, FaLink } from 'react-icons/fa';
import { EntityType } from '../../../../../types/sports';
import { isSortableRelationshipField } from '../utils/formatters';

interface SmartColumnProps {
  field: string;
  sortField: string;
  sortDirection: 'asc' | 'desc' | 'none';
  handleSort: (field: string) => void;
  entities: any[];
  selectedEntityType: EntityType;
  handleResizeStart: (e: React.MouseEvent, field: string) => void;
  columnWidth: number;
  draggedHeader: string | null;
  dragOverHeader: string | null;
  handleColumnDragStart: (e: React.DragEvent, field: string) => void;
  handleColumnDragOver: (e: React.DragEvent, field: string) => void;
  handleColumnDrop: (e: React.DragEvent, field: string) => void;
  handleColumnDragEnd: () => void;
}

// Using the imported isSortableRelationshipField from formatters.ts

/**
 * SmartColumn component that renders a table column header
 * with visual indicators for sortable relationship fields.
 */
const SmartColumn: React.FC<SmartColumnProps> = ({
  field,
  sortField,
  sortDirection,
  handleSort,
  entities,
  selectedEntityType,
  handleResizeStart,
  columnWidth,
  draggedHeader,
  dragOverHeader,
  handleColumnDragStart,
  handleColumnDragOver,
  handleColumnDrop,
  handleColumnDragEnd
}) => {
  
  // Check if this is a relationship field
  const isRelationship = useMemo(() => 
    isSortableRelationshipField(field, entities), 
    [field, entities]
  );
  
  // Format field name for display (e.g., "league_id" -> "League")
  const displayName = field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
  
  // Render sort icon
  const renderSortIcon = () => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        return <FaSortUp className="ml-1 text-blue-500" />;
      } else if (sortDirection === 'desc') {
        return <FaSortDown className="ml-1 text-blue-500" />;
      }
      return <FaSort className="ml-1 text-blue-500" />;
    }
    return <FaSort className="ml-1 text-gray-400" />;
  };
  
  return (
    <th 
      scope="col" 
      className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer relative border-r border-gray-200 hover:bg-gray-100 ${
        dragOverHeader === field ? 'bg-blue-100' : ''
      }`}
      onClick={() => handleSort(field)}
      style={{ 
        width: columnWidth || (field === 'name' ? 300 : 120),
        minWidth: field === 'name' ? '150px' : '100px'
      }}
      draggable="true"
      onDragStart={(e) => handleColumnDragStart(e, field)}
      onDragOver={(e) => handleColumnDragOver(e, field)}
      onDrop={(e) => handleColumnDrop(e, field)}
      onDragEnd={handleColumnDragEnd}
    >
      <div className="flex items-center">
        {/* Display the field name */}
        <span className={`${isRelationship ? 'text-blue-600' : ''}`}>
          {displayName}
        </span>
        
        {/* Relationship indicator */}
        {isRelationship && (
          <FaLink className="ml-1 text-blue-400 text-xs" title="Relationship field" />
        )}
        
        {/* Sort icon */}
        {renderSortIcon()}
        
        {/* Resize handle */}
        <div 
          className="absolute top-0 right-0 h-full w-4 cursor-col-resize z-20"
          onMouseDown={(e) => handleResizeStart(e, field)}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-full w-0 mx-auto hover:bg-blue-500 hover:w-2 transition-all"></div>
        </div>
      </div>
    </th>
  );
};

export default React.memo(SmartColumn);