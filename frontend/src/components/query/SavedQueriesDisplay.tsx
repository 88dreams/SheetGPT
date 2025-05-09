import React from 'react';
import { FaTrash } from 'react-icons/fa'; // FaSave, FaPlay are for editor actions, not display
import { SavedQuery } from '../../hooks/useSavedQueries'; // Adjust path as needed

interface SavedQueriesDisplayProps {
  savedQueries: SavedQuery[];
  onLoadQuery: (query: SavedQuery) => void;
  onDeleteQuery: (queryId: string | number) => void;
}

const SavedQueriesDisplay: React.FC<SavedQueriesDisplayProps> = ({
  savedQueries,
  onLoadQuery,
  onDeleteQuery,
}) => {
  if (savedQueries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-gray-500">
        <p>Your saved queries will appear here.</p>
        <p className="text-sm mt-1">Save a query from the editor to add it to your collection.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {savedQueries.map((query) => (
        <div 
          key={query.id} 
          className="border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-gray-800 break-all">{query.name}</h4>
              <span 
                className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${query.isNaturalLanguage 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'}`}
              >
                {query.isNaturalLanguage ? 'Natural Language' : 'SQL'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2 overflow-hidden overflow-ellipsis h-10 leading-tight" title={query.query}>
              {query.query.length > 80 ? query.query.substring(0, 80) + '...' : query.query}
            </p>
            <p className="text-xs text-gray-400 mb-3">
              Saved on {new Date(query.timestamp).toLocaleDateString()}
            </p>
          </div>
          <div className="flex space-x-2 mt-auto pt-2 border-t border-gray-100">
            <button
              className="px-3 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors w-full"
              onClick={() => onLoadQuery(query)}
              title={`Load "${query.name}" into editor`}
            >
              Load Query
            </button>
            <button
              className="p-2 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors"
              onClick={() => onDeleteQuery(query.id)}
              title={`Delete "${query.name}"`}
            >
              <FaTrash />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SavedQueriesDisplay; 