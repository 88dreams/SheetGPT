export interface FileAttachment {
  name: string;
  content: string;
  type: 'csv' | 'text' | 'json' | 'markdown';
  size: number;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ExtractedData {
  headers?: string[];
  rows?: Array<Record<string, unknown>>;
  schema?: Record<string, string>;
  summary?: string;
  entityType?: string;
  format?: string;
  source?: string;
  extractionMethod?: string;
  confidence?: number;
}

export interface MessageMetadata {
  isProcessing?: boolean;
  extractedData?: ExtractedData;
  message_id?: string;
  conversation_id?: string;
  extracted_at?: string;
  source?: string;
  is_test_data?: boolean;
  note?: string;
  fileAttachment?: FileAttachment;
  model?: string;
  tokenCount?: number;
  processingTime?: number;
  error?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  role: MessageRole;
  timestamp: string;
  metadata?: MessageMetadata;
}

export interface ConversationStats {
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  averageResponseTime?: number;
  firstMessageTimestamp?: string;
  lastMessageTimestamp?: string;
  extractedDataCount?: number;
}

export interface ConversationTopic {
  name: string;
  score: number;
  mentions: number;
}

export interface ConversationAnalysis {
  topics?: ConversationTopic[];
  sentiment?: number;
  complexity?: number;
  entities?: string[];
}

export interface ConversationSettings {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  dataExtractionEnabled?: boolean;
  dataAutoUpdate?: boolean;
}