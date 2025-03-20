import { EntityType } from '../../../types/sports';

export interface BulkEditModalProps {
  visible: boolean;
  onCancel: () => void;
  // For entity-based bulk editing
  entityType?: EntityType;
  selectedIds?: string[];
  // For query-based bulk editing
  queryResults?: any[];
  selectedIndexes?: Set<number>;
  // Common props
  onSuccess: (updatedData?: any) => void;
}

export interface FieldDefinition {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface FieldCategoryMap {
  [category: string]: FieldDefinition[];
}

export interface RelatedEntitiesMap {
  [fieldName: string]: any[];
}

export interface SelectedFieldsMap {
  [fieldName: string]: boolean;
}

export interface FieldValuesMap {
  [fieldName: string]: any;
}

export interface UpdateResults {
  success: number;
  failed: number;
}

export interface FieldProps {
  field: FieldDefinition;
  selected: boolean;
  value: any;
  relatedEntities?: any[];
  onToggle: (fieldName: string) => void;
  onValueChange: (fieldName: string, value: any) => void;
  disabled?: boolean;
}