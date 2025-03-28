export interface FileAttachment {
  name: string;
  content: string;
  type: 'csv' | 'text' | 'json' | 'markdown';
  size: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  metadata?: {
    isProcessing?: boolean;
    extractedData?: any;
    message_id?: string;
    conversation_id?: string;
    extracted_at?: string;
    source?: string;
    is_test_data?: boolean;
    note?: string;
    fileAttachment?: FileAttachment;
  };
} 