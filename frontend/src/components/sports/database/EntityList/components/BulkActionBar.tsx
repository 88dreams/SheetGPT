import React from 'react';

interface BulkActionBarProps {
  selectedCount: number;
  deselectAllEntities: () => void;
  setBulkEditModalVisible: (visible: boolean) => void;
  handleBulkDelete: () => void;
  isDeleting: boolean;
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  deselectAllEntities,
  setBulkEditModalVisible,
  handleBulkDelete,
  isDeleting
}) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
      <div className="text-sm text-gray-700">
        {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
      </div>
      <div className="flex space-x-2">
        <button
          onClick={deselectAllEntities}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
        >
          Clear Selection
        </button>
        <button
          onClick={() => setBulkEditModalVisible(true)}
          className="px-3 py-1 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded"
        >
          Bulk Edit {selectedCount} {selectedCount === 1 ? 'Item' : 'Items'}
        </button>
        <button
          onClick={() => {
            if (window.confirm(`Are you sure you want to delete ${selectedCount} selected items?`)) {
              handleBulkDelete();
            }
          }}
          disabled={isDeleting}
          className="px-3 py-1 text-sm text-white bg-red-500 hover:bg-red-600 rounded disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : `Delete ${selectedCount} Selected`}
        </button>
      </div>
    </div>
  );
};

export default BulkActionBar;