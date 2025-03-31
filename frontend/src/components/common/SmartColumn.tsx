import React, { useMemo } from 'react';
import { FaSort, FaSortUp, FaSortDown, FaLink } from 'react-icons/fa';

interface SmartColumnProps {
  field: string;
  sortField: string;
  sortDirection: 'asc' | 'desc' | 'none';
  handleSort: (field: string) => void;
  entities: any[];
  handleResizeStart?: (e: React.MouseEvent, field: string) => void;
  columnWidth?: number;
  draggable?: boolean;
  draggedHeader?: string | null;
  dragOverHeader?: string | null;
  handleColumnDragStart?: (e: React.DragEvent, field: string) => void;
  handleColumnDragOver?: (e: React.DragEvent, field: string) => void;
  handleColumnDrop?: (e: React.DragEvent, field: string) => void;
  handleColumnDragEnd?: () => void;
  additionalHeaderContent?: React.ReactNode;
  className?: string;
}

/**
 * Determines if a field is a relationship field that can be sorted by
 * checking if it ends with _id and has a corresponding _name field or
 * is a known relationship field like league_name or league_sport.
 */
export const isRelationshipSortField = (field: string, entities: any[]): boolean => {
  if (entities.length === 0) return false;
  
  // Known relationship fields
  const knownRelationshipFields = [
    'league_name', 
    'league_sport',
    'division_conference_name',
    'team_name',
    'stadium_name',
    'broadcast_company_name',
    'production_company_name',
    'entity_name',
    'entity_type'
  ];
  
  if (knownRelationshipFields.includes(field)) {
    return true;
  }
  
  // Check if it's an ID field with a corresponding _name field
  if (field.endsWith('_id') && entities[0]?.hasOwnProperty(field.replace('_id', '_name'))) {
    return true;
  }
  
  return false;
};

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
  handleResizeStart,
  columnWidth = 150,
  draggable = true,
  draggedHeader,
  dragOverHeader,
  handleColumnDragStart,
  handleColumnDragOver,
  handleColumnDrop,
  handleColumnDragEnd,
  additionalHeaderContent,
  className = ''
}) => {
  
  // Check if this is a relationship field
  const isRelationship = useMemo(() => 
    isRelationshipSortField(field, entities), 
    [field, entities]
  );
  
  // Format field name for display (e.g., "league_id" -> "League")
  const displayName = field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
  
  // Render sort icon
  const renderSortIcon = () => {
    if (sortField !== field) {
      return <FaSort className="ml-1 text-gray-400" size={12} />;
    }
    return sortDirection === 'asc' ? (
      <FaSortUp className="ml-1 text-blue-500" size={16} />
    ) : (
      <FaSortDown className="ml-1 text-blue-500" size={16} />
    );
  };
  
  // Properties for draggable functionality
  const dragProps = draggable ? {
    draggable: "true",
    onDragStart: (e: React.DragEvent) => handleColumnDragStart && handleColumnDragStart(e, field),
    onDragOver: (e: React.DragEvent) => handleColumnDragOver && handleColumnDragOver(e, field),
    onDrop: (e: React.DragEvent) => handleColumnDrop && handleColumnDrop(e, field),
    onDragEnd: handleColumnDragEnd,
  } : {};
  
  return (
    <th 
      scope="col" 
      className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer relative border-r border-gray-200 hover:bg-gray-100 ${
        dragOverHeader === field ? 'bg-blue-100' : ''
      } ${className}`}
      onClick={() => handleSort(field)}
      style={{ 
        width: `${columnWidth}px`,
        minWidth: field === 'name' ? '150px' : '100px'
      }}
      {...dragProps}
      data-header={field}
    >
      <div className="flex items-center justify-between">
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
        </div>
        
        {/* Additional header content (e.g., hide column button) */}
        {additionalHeaderContent}
      </div>
      
      {/* Resize handle */}
      {handleResizeStart && (
        <div 
          className="absolute top-0 right-0 h-full w-4 cursor-col-resize z-20"
          onMouseDown={(e) => handleResizeStart(e, field)}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-full w-0 mx-auto hover:bg-blue-500 hover:w-2 transition-all"></div>
        </div>
      )}
    </th>
  );
};

export default React.memo(SmartColumn);