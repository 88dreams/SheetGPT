import React, { useEffect, useRef, useState } from 'react';
import { Input, Button } from 'antd';
import { SearchOutlined, CloseCircleFilled } from '@ant-design/icons';
import { FaFileExport, FaColumns, FaKey, FaSearch, FaTimes } from 'react-icons/fa';
import { getEntityTypeName } from '../utils/formatters';
import { EntityType } from '../../../../../types/sports';

interface EntityListHeaderProps {
  selectedEntityType: EntityType;
  showColumnSelector: boolean;
  setShowColumnSelector: (show: boolean) => void;
  showFullUuids: boolean;
  setShowFullUuids: (show: boolean) => void;
  openExportDialog: () => void;
  onSearch?: (query: string) => void;
  searchValue?: string; // Current search value for controlling the input
}

const EntityListHeader: React.FC<EntityListHeaderProps> = ({
  selectedEntityType,
  showColumnSelector,
  setShowColumnSelector,
  showFullUuids,
  setShowFullUuids,
  openExportDialog,
  onSearch,
  searchValue = '' // Default to empty string if not provided
}) => {
  // Create a ref to the input element so we can set its value programmatically
  const searchInputRef = useRef<Input>(null);
  
  // Internal state to track input value before search is submitted
  const [inputValue, setInputValue] = useState(searchValue);
  
  // When searchValue prop changes (especially to ''), update the input value and internal state
  useEffect(() => {
    setInputValue(searchValue); // Update internal state
    
    // If we have a ref to the input and the searchValue is explicitly provided
    if (searchInputRef.current && searchInputRef.current.input) {
      // Set the value of the input element directly to match searchValue
      searchInputRef.current.input.value = searchValue;
    }
  }, [searchValue]);
  
  // Handle search submission
  const handleSearchSubmit = () => {
    if (onSearch && inputValue) {
      console.log(`Search submitted with query: "${inputValue}"`);
      onSearch(inputValue.toLowerCase());
    } else if (onSearch && !inputValue) {
      // Clear search when input is empty
      onSearch('');
    }
  };
  
  // Handle clearing the search input and results
  const handleClearSearch = (e?: React.MouseEvent) => {
    // Stop event propagation to prevent any parent handlers
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    console.log('EntityListHeader: Clear search button clicked');
    
    // First clear our local input state
    setInputValue('');
    
    // Then tell the parent component to clear search results
    if (onSearch) {
      console.log('EntityListHeader: Calling parent onSearch with empty string');
      onSearch(''); // This should trigger handleSearchSelect('') in the parent
    }
    
    // Also directly clear the input field via the ref for immediate feedback
    if (searchInputRef.current && searchInputRef.current.input) {
      searchInputRef.current.input.value = '';
    }
    
    // Add a small delay to ensure state updates propagate
    setTimeout(() => {
      console.log('EntityListHeader: Final check - ensuring search is cleared');
      if (onSearch) {
        onSearch(''); // Second attempt to clear search
      }
    }, 100);
  };
  
  // Handle input keydown (pressing Enter)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };
  
  return (
    <div className="p-4 border-b border-gray-200">
      <div className="flex justify-between items-center space-x-4">
        <h2 className="text-lg font-semibold min-w-[100px]">
          {getEntityTypeName(selectedEntityType)}
        </h2>
        <div className="flex-grow max-w-xl">
          {/* Search input with button for explicit submission */}
          <div className="w-full flex">
            <Input 
              ref={searchInputRef}
              prefix={<SearchOutlined />} 
              placeholder={`Search ${getEntityTypeName(selectedEntityType)} (min 3 chars)`}
              defaultValue={searchValue}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="rounded-r-none"
              suffix={
                inputValue ? (
                  <CloseCircleFilled
                    className="cursor-pointer text-gray-400 hover:text-gray-600"
                    onClick={handleClearSearch}
                  />
                ) : null
              }
            />
            <Button 
              type="primary" 
              icon={<FaSearch />}
              onClick={handleSearchSubmit}
              className="rounded-l-none bg-blue-600 hover:bg-blue-700 border-blue-600"
            />
          </div>
        </div>
        <div className="flex space-x-1">
          <button
            onClick={openExportDialog}
            className="px-2 py-1 text-sm font-medium rounded flex items-center bg-green-600 hover:bg-green-700 text-white"
          >
            <FaFileExport className="mr-1" />
            Export
          </button>
          <button
            onClick={() => setShowColumnSelector(!showColumnSelector)}
            className={`px-2 py-1 text-sm font-medium rounded flex items-center ${
              showColumnSelector
                ? 'bg-blue-600 text-white'
                : 'bg-blue-600 bg-opacity-90 text-white hover:bg-blue-700'
            }`}
          >
            <FaColumns className="mr-1" />
            Columns
          </button>
          <button
            onClick={() => setShowFullUuids(!showFullUuids)}
            className={`px-2 py-1 text-sm font-medium rounded flex items-center ${
              showFullUuids
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-600 bg-opacity-90 text-white hover:bg-indigo-700'
            }`}
          >
            <FaKey className="mr-1" />
            {showFullUuids ? 'IDs' : 'Names'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EntityListHeader;