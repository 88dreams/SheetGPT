import React from 'react';
import { FaKeyboard, FaPlay, FaTrash, FaCheck } from 'react-icons/fa';
import LoadingSpinner from '../common/LoadingSpinner';

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
}) => {
  return (
    <div className="bg-white overflow-hidden rounded-lg border border-gray-200">
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-medium">Query Editor</h3>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <label htmlFor="queryNameInput" className="block text-sm font-medium text-gray-700 mb-1">
            Query Name (for saving & export default)
          </label>
          <input
            id="queryNameInput"
            type="text"
            value={queryName}
            onChange={(e) => setQueryName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Enter a name for this query"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="nlqInput" className="block text-sm font-medium text-gray-700">Question</label>
              <button 
                onClick={onClearNLQ}
                className="text-gray-400 hover:text-gray-600 px-1 text-xs"
                title="Clear Question"
              >
                <FaTrash className="inline mr-1" /> Clear
              </button>
            </div>
            <textarea
              id="nlqInput"
              value={naturalLanguageQuery}
              onChange={(e) => setNaturalLanguageQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 h-48"
              placeholder="E.g., Show me all users who signed up last month with their email addresses"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="sqlInput" className="block text-sm font-medium text-gray-700">SQL Query</label>
              <div>
                {suggestedSql && (
                  <button 
                    onClick={onApplyFix}
                    className="bg-green-600 text-white px-2 py-1 rounded text-xs mr-2 hover:bg-green-700 transition-colors"
                    title="Apply suggested SQL fix"
                  >
                    <FaCheck className="inline mr-1" /> Apply Fix
                  </button>
                )}
                <button 
                  onClick={onClearSQL}
                  className="text-gray-400 hover:text-gray-600 px-1 text-xs"
                  title="Clear SQL Query"
                >
                  <FaTrash className="inline mr-1" /> Clear
                </button>
              </div>
            </div>
            <textarea
              id="sqlInput"
              value={generatedSql || ''}
              onChange={(e) => setGeneratedSql(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md font-mono h-48 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                validationError ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-300'
              }`}
              placeholder="Enter SQL directly or use the Translate button to generate SQL from your question"
            />
            {validationError && (
              <div className="mt-2 p-3 border border-red-300 bg-red-50 rounded text-sm text-red-700">
                <div className="font-semibold mb-1">SQL Validation Issues:</div>
                <pre className="whitespace-pre-wrap text-xs font-mono">{validationError}</pre>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-4 flex justify-end space-x-3">
          <button
            onClick={onTranslateQuery}
            disabled={!naturalLanguageQuery.trim() || isTranslating || isLoadingExecution}
            className={`px-4 py-2 text-sm font-medium rounded-md shadow-sm flex items-center justify-center transition-colors ${
              !naturalLanguageQuery.trim() || isTranslating || isLoadingExecution
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-600 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500'
            }`}
          >
            {isTranslating ? <LoadingSpinner size="small" /> : <FaKeyboard className="mr-2" />}
            {isTranslating ? 'Translating...' : 'Translate to SQL'}
          </button>
          <button
            onClick={onExecuteQuery}
            disabled={(!naturalLanguageQuery.trim() && !generatedSql?.trim()) || isLoadingExecution || isTranslating}
            className={`px-4 py-2 text-sm font-medium rounded-md shadow-sm flex items-center justify-center transition-colors ${
              (!naturalLanguageQuery.trim() && !generatedSql?.trim()) || isLoadingExecution || isTranslating
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {isLoadingExecution ? <LoadingSpinner size="small" /> : <FaPlay className="mr-2" />}
            {isLoadingExecution ? 'Executing...' : 'Execute Query'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QueryInputPanel; 