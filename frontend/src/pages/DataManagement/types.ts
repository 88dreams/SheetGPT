import { StructuredData } from '../../types/data';

export interface ExtractedDataPreview {
  headers: string[];
  rows: any[];
  meta_data?: {
    conversation_id?: string;
    message_id?: string;
    [key: string]: any;
  };
}

export interface DataSelectionState {
  structuredData: StructuredData[] | null;
  selectedDataId: string | null;
  isLoading: boolean;
  error: any;
}

export interface DataManagementProps {
  // Add props if needed in the future
}