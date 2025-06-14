// @ts-nocheck
import React from 'react';
import { FaKeyboard, FaPlay, FaTrash, FaCheck } from 'react-icons/fa';
import LoadingSpinner from '../common/LoadingSpinner';
import { Button, Input, Tooltip } from 'antd';
import { SaveOutlined, SendOutlined, ClearOutlined, QuestionCircleOutlined, SettingOutlined } from '@ant-design/icons';

interface QueryInputPanelProps {
  queryName: string;
  setQueryName: (name: string) => void;
  naturalLanguageQuery: string;
  setNaturalLanguageQuery: (query: string) => void;
  generatedSql: string | null;
  setGeneratedSql: (sql: string | null) => void;
  validationError: string | null;
  suggestedSql: string | null;
  isTranslating: boolean;
  isLoadingExecution: boolean;
  onTranslateQuery: () => void;
  onExecuteQuery: () => void;
  onClearNLQ: () => void;
  onClearSQL: () => void;
  onApplyFix: () => void;
  limit: number;
  setLimit: (limit: number) => void;
  onSave: () => void;
  isExecuting: boolean;
  isSaving: boolean;
  hasResults: boolean;
  onClear: () => void;
  onShowHelper: () => void;
}

const QueryInputPanel: React.FC<QueryInputPanelProps> = ({
  queryName,
  setQueryName,
  naturalLanguageQuery,
  setNaturalLanguageQuery,
  generatedSql,
  setGeneratedSql,
  validationError,
  suggestedSql,
  isTranslating,
  isLoadingExecution,
  onTranslateQuery,
  onExecuteQuery,
  onClearNLQ,
  onClearSQL,
  onApplyFix,
  limit,
  setLimit,
  onSave,
  isExecuting,
  isSaving,
  hasResults,
  onClear,
  onShowHelper,
}) => {
  return (
    <div className="bg-white overflow-hidden rounded-lg border border-gray-200">
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-medium">Query Editor</h3>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-center mb-4 space-x-4">
          <Input
            placeholder="Enter Query Name (optional)"
            value={queryName}
            onChange={(e) => setQueryName(e.target.value)}
            className="flex-grow"
            prefix={<SaveOutlined className="text-gray-400" />}
          />
          <div className="flex items-center space-x-2">
            <label htmlFor="row-limit" className="text-sm font-medium text-gray-700">Row Limit:</label>
            <Input
              id="row-limit"
              type="number"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              min={1}
              max={5000}
              className="w-24"
              prefix={<SettingOutlined className="text-gray-400" />}
            />
          </div>
        </div>

        <div className="relative mb-2">
          <Input.TextArea
            placeholder="Ask a question in natural language... (e.g., 'Show me all contacts from Apple')"
            value={naturalLanguageQuery}
            onChange={(e) => setNaturalLanguageQuery(e.target.value)}
            rows={3}
            className="pr-24"
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={onTranslateQuery}
            loading={isTranslating}
            className="absolute right-2 top-1/2 -translate-y-1/2"
          >
            Translate
          </Button>
        </div>

        <div className="relative">
          <Input.TextArea
            placeholder="Or enter a SQL query directly..."
            value={generatedSql || ''}
            onChange={(e) => setGeneratedSql(e.target.value)}
            rows={5}
            className="font-mono text-sm"
          />
          <Tooltip title="Need help building a query?">
            <Button
              shape="circle"
              icon={<QuestionCircleOutlined />}
              onClick={onShowHelper}
              className="absolute right-2 top-2"
            />
          </Tooltip>
        </div>

        <div className="mt-4 flex justify-end space-x-3">
          <Button
            icon={<ClearOutlined />}
            onClick={onClear}
            danger
          >
            Clear All
          </Button>
          <Button
            onClick={onSave}
            icon={<SaveOutlined />}
            loading={isSaving}
            disabled={!generatedSql || isExecuting}
          >
            Save Query
          </Button>
          <Button
            type="primary"
            onClick={onExecuteQuery}
            icon={<SendOutlined />}
            loading={isExecuting}
            disabled={!naturalLanguageQuery}
            className="w-32"
          >
            Execute
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QueryInputPanel; 