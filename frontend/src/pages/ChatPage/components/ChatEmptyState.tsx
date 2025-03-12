import React from 'react';

const ChatEmptyState: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-700">Select a conversation or create a new one</h2>
        <p className="text-gray-500 mt-2">Choose from the sidebar or click "New" to start a conversation</p>
      </div>
    </div>
  );
};

export default ChatEmptyState;