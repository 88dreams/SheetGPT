import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApiClient } from '../../hooks/useApiClient';
import { useNotification } from '../../contexts/NotificationContext';
import { FaEnvelope, FaLinkedin, FaBuilding, FaUser, FaSort, FaSortUp, FaSortDown, FaSearch, FaTimes, FaSpinner, FaColumns } from 'react-icons/fa';
import { useDragAndDrop } from '../../components/data/DataTable/hooks/useDragAndDrop';

interface ContactBrandAssociation {
  id: string;
  contact_id: string;
  brand_id: string;
  brand_name?: string;
  confidence_score: number;
  association_type: string;
  is_current: boolean;
  is_primary: boolean;
  start_date?: string;
  end_date?: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  linkedin_url?: string;
  company?: string;
  position?: string;
  connected_on?: string;
  notes?: string;
  brand_associations: ContactBrandAssociation[];
}

interface ContactsResponse {
  items: Contact[];
  total: number;
  skip: number;
  limit: number;
}

interface ContactsListProps {
  brandId?: string;
  onContactSelect?: (contact: Contact) => void;
}

const ContactsList: React.FC<ContactsListProps> = ({ brandId, onContactSelect }) => {
  const apiClient = useApiClient();
  const { showNotification } = useNotification();
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [displayContacts, setDisplayContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [limit] = useState(20);
  const [sortBy, setSortBy] = useState('last_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    name: true,
    email: true,
    company: true,
    position: true,
    connected_on: true,
    brand_count: true
  });

  // Define the column definitions with width and a display name
  const columnDefinitions = {
    name: { width: 250, display: 'Name', sortField: 'last_name' },
    email: { width: 200, display: 'Email' },
    company: { width: 200, display: 'Company' },
    position: { width: 200, display: 'Position' },
    connected_on: { width: 150, display: 'Connected On' },
    brand_count: { width: 200, display: 'Matched Brands', sortField: 'brand_count' }
  };

  // Save/load column visibility settings
  useEffect(() => {
    const savedColumns = localStorage.getItem('contactList_columns');
    if (savedColumns) {
      try {
        setVisibleColumns(JSON.parse(savedColumns));
      } catch (e) {
        console.error('Error parsing saved columns:', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('contactList_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Toggle column visibility
  const toggleColumnVisibility = useCallback((column: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  }, []);

  // Show all columns
  const showAllColumns = useCallback(() => {
    setVisibleColumns({
      name: true,
      email: true,
      company: true,
      position: true,
      connected_on: true,
      brand_count: true
    });
  }, []);
  
  // Initial column order
  const initialColumnOrder = [
    'name',
    'email',
    'company',
    'position',
    'connected_on',
    'brand_count'
  ];

  // Column drag and drop
  const {
    reorderedItems: columnOrder,
    draggedItem,
    dragOverItem,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd
  } = useDragAndDrop<string>({
    items: initialColumnOrder,
    storageKey: 'contactList_columnOrder'
  });
  
  // Add refs to track component mount state and prevent duplicate requests
  const isMounted = useRef(true);
  const isLoadingRef = useRef(false);
  const requestIdRef = useRef(0);
  
  // Track component mount state
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchContacts = useCallback(async () => {
    // Prevent duplicate or overlapping requests
    if (isLoadingRef.current) {
      console.log('Skipping contacts fetch - already loading');
      return;
    }
    
    // Set loading state and track that we're in a request
    isLoadingRef.current = true;
    setLoading(true);
    setError(null);
    
    // Create a unique ID for this request to track race conditions
    const thisRequestId = ++requestIdRef.current;
    
    try {
      // For all sorting types, including brand_count, use the server's pagination and sorting
      // For brand_count, we'll just apply additional client-side sorting to the current page
      let url = `/v1/contacts/?skip=${skip}&limit=${limit}&sort_by=${sortBy !== 'brand_count' ? sortBy : 'last_name'}&sort_order=${sortOrder}`;
      
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      
      if (brandId) {
        url += `&brand_id=${brandId}`;
      }
      
      console.log('Fetching contacts, URL:', url, 'requestId:', thisRequestId);
      const response = await apiClient.get<ContactsResponse>(url, { requiresAuth: true });
      console.log(`Received ${response.data.items.length} contacts, requestId:`, thisRequestId);
      
      // Only update state if this is still the current request
      // and the component is still mounted
      if (thisRequestId === requestIdRef.current && isMounted.current) {
        console.log('Setting contacts data from response, requestId:', thisRequestId);
        
        // Save contacts for client-side operations
        setContacts(response.data.items);
        setTotal(response.data.total);
      } else {
        console.log('Ignoring stale contacts response, requestId:', thisRequestId);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err, 'requestId:', thisRequestId);
      
      // Only update error state if this is still the current request
      // and the component is still mounted
      if (thisRequestId === requestIdRef.current && isMounted.current) {
        setError('Failed to load contacts. Please try again.');
        showNotification({
          type: 'error',
          message: 'Failed to load contacts.'
        });
      }
    } finally {
      // Mark request as complete if this is still the current request
      if (thisRequestId === requestIdRef.current) {
        isLoadingRef.current = false;
      }
      
      // Always update loading state if component is mounted
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [apiClient, skip, limit, sortBy, sortOrder, searchQuery, brandId, showNotification]);
  
  // Apply client-side sorting for brand_count only on the current page of data
  useEffect(() => {
    if (contacts.length > 0) {
      let sortedContacts = [...contacts];
      
      if (sortBy === 'brand_count') {
        console.log('Applying client-side sort for brand_count on current page');
        
        // Sort just the current page by brand association count
        sortedContacts.sort((a, b) => {
          const countA = a.brand_associations?.length || 0;
          const countB = b.brand_associations?.length || 0;
          
          return sortOrder === 'asc' 
            ? countA - countB 
            : countB - countA;
        });
      }
      
      setDisplayContacts(sortedContacts);
    } else {
      setDisplayContacts([]);
    }
  }, [contacts, sortBy, sortOrder]);
  
  // Store the last request parameters to avoid unnecessary fetches
  const lastRequest = useRef({
    skip: -1,
    limit: -1,
    sortBy: '',
    sortOrder: '',
    searchQuery: '',
    brandId: ''
  });

  // Use a more carefully controlled effect with specific dependencies
  // that should trigger a data refetch
  useEffect(() => {
    if (!isMounted.current) return;
    
    const currentRequest = {
      skip,
      limit,
      sortBy,
      sortOrder,
      searchQuery: searchQuery || '',
      brandId: brandId || ''
    };
    
    // Check if this is a duplicate request
    const lastReq = lastRequest.current;
    const isDuplicate = 
      lastReq.skip === currentRequest.skip &&
      lastReq.limit === currentRequest.limit &&
      lastReq.sortBy === currentRequest.sortBy &&
      lastReq.sortOrder === currentRequest.sortOrder &&
      lastReq.searchQuery === currentRequest.searchQuery &&
      lastReq.brandId === currentRequest.brandId;
    
    if (!isDuplicate) {
      console.log('ContactsList effect triggered, fetching contacts...');
      // Update the last request ref BEFORE making the fetch
      lastRequest.current = {...currentRequest};
      // Call fetch outside the effect to prevent effect cycles
      setTimeout(() => {
        if (isMounted.current) {
          fetchContacts();
        }
      }, 0);
    } else {
      console.log('Skipping duplicate data fetch request');
    }
  }, [skip, limit, sortBy, sortOrder, searchQuery, brandId]);

  const handleSortChange = useCallback((field: string) => {
    // Toggle order if clicking the same field, otherwise default to ascending
    setSortOrder(sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc');
    setSortBy(field);
    
    // Reset to first page when sorting changes
    setSkip(0);
    
    console.log(`Sorting by ${field} in ${sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc'} order`);
  }, [sortBy, sortOrder]);

  const handleNextPage = useCallback(() => {
    if (skip + limit < total) {
      setSkip(skip + limit);
    }
  }, [skip, limit, total]);

  const handlePreviousPage = useCallback(() => {
    if (skip > 0) {
      setSkip(Math.max(0, skip - limit));
    }
  }, [skip, limit]);

  const handleSearch = useCallback(() => {
    setSearchQuery(searchTerm);
    setSkip(0); // Reset pagination on new search
  }, [searchTerm]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchQuery('');
    setSkip(0);
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  // Render sort icon
  const renderSortIcon = (field: string) => {
    if (sortBy !== field) {
      return <FaSort className="ml-1 text-gray-400" />;
    }
    return sortOrder === 'asc' ? (
      <FaSortUp className="ml-1 text-blue-500" />
    ) : (
      <FaSortDown className="ml-1 text-blue-500" />
    );
  };

  // Column resizing
  const tableRef = useRef<HTMLTableElement>(null);
  const [resizing, setResizing] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const currentColumn = useRef<string | null>(null);

  // This function sets up column resizing by storing the starting position
  // and adding event listeners for mousemove and mouseup
  const startResize = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get the table element and header cell
    const table = tableRef.current;
    if (!table) return;
    
    // Find the column index in the current order of visible columns
    const visibleCols = columnOrder.filter(col => visibleColumns[col] !== false);
    const colIndex = visibleCols.indexOf(column);
    if (colIndex === -1) return;
    
    // Get the columns collection from the table
    const columns = table.querySelectorAll('col');
    if (!columns || colIndex >= columns.length) return;
    
    // Store current values
    const col = columns[colIndex] as HTMLElement;
    startWidth.current = parseInt(col.style.width || columnDefinitions[column].width.toString(), 10);
    startX.current = e.clientX;
    currentColumn.current = column;
    setResizing(true);
    
    // Add event listeners
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    
    // Change cursor and disable text selection while resizing
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // This function handles the resizing by calculating the new width
  // based on the mouse position and updating the column's width
  const handleResize = useCallback((e: MouseEvent) => {
    if (!resizing || !currentColumn.current) return;
    
    // Calculate the new width based on the mouse movement
    const delta = e.clientX - startX.current;
    const newWidth = Math.max(80, startWidth.current + delta);
    
    // Get the table and columns
    const table = tableRef.current;
    if (!table) return;
    
    // Find the column index
    const visibleCols = columnOrder.filter(col => visibleColumns[col] !== false);
    const colIndex = visibleCols.indexOf(currentColumn.current);
    if (colIndex === -1) return;
    
    // Get the column and update its width
    const columns = table.querySelectorAll('col');
    if (!columns || colIndex >= columns.length) return;
    
    const col = columns[colIndex] as HTMLElement;
    col.style.width = `${newWidth}px`;
    
    // Store updated width in local storage
    localStorage.setItem(`contactList_${currentColumn.current}_width`, newWidth.toString());
  }, [resizing, columnOrder, visibleColumns]);

  // This function cleans up the event listeners and resets the state
  // when the resize operation is complete
  const stopResize = useCallback(() => {
    setResizing(false);
    currentColumn.current = null;
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    
    // Reset cursor and user-select
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleResize]);

  // Clean up event listeners when the component unmounts
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', stopResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [handleResize, stopResize]);

  // Load stored column widths from localStorage
  const getColumnWidth = useCallback((column: string) => {
    const storedWidth = localStorage.getItem(`contactList_${column}_width`);
    if (storedWidth) {
      const width = parseInt(storedWidth, 10);
      if (!isNaN(width) && width > 0) {
        return width;
      }
    }
    return columnDefinitions[column].width;
  }, []);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b flex flex-col md:flex-row md:items-center justify-between">
        <h2 className="text-lg font-semibold mb-2 md:mb-0">Contacts</h2>
        
        <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-2">
          <div className="relative flex-grow">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search contacts..."
              className="w-full px-4 py-2 pr-10 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            )}
            <button 
              onClick={handleSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FaSearch />
            </button>
          </div>
          
          <button
            onClick={() => setShowColumnSelector(!showColumnSelector)}
            className="px-3 py-2 rounded-md flex items-center bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            title="Column Visibility"
          >
            <FaColumns className="mr-2" />
            Columns
          </button>
        </div>
      </div>
      
      {/* Column Selector */}
      {showColumnSelector && (
        <div className="bg-white p-2 border-b border-gray-200 shadow-md">
          <div className="flex justify-between items-center mb-1">
            <button 
              className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
              onClick={showAllColumns}
            >
              <FaTimes className="mr-1" /> Show All
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-1">
            {columnOrder.map(column => (
              <div key={column} className="flex items-center">
                <input
                  type="checkbox"
                  id={`col-${column}`}
                  checked={visibleColumns[column] !== false}
                  onChange={() => toggleColumnVisibility(column)}
                  className="mr-1"
                />
                <label htmlFor={`col-${column}`} className="text-xs text-gray-700 truncate">
                  {columnDefinitions[column].display}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && displayContacts.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <FaSpinner className="animate-spin text-blue-500 text-2xl" />
        </div>
      ) : error ? (
        <div className="text-center py-6 text-red-500">{error}</div>
      ) : displayContacts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchQuery ? 'No contacts found matching your search criteria.' : 'No contacts yet. Import your LinkedIn contacts to get started.'}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table
              ref={tableRef}
              className="min-w-full divide-y divide-gray-200 border-collapse border border-gray-200"
            >
              <colgroup>
                {columnOrder.map(column => 
                  visibleColumns[column] !== false ? (
                    <col 
                      key={column}
                      style={{
                        width: `${getColumnWidth(column)}px`,
                        minWidth: "80px"
                      }}
                    />
                  ) : null
                )}
              </colgroup>
              <thead className="bg-gray-50 select-none">
                <tr className="border-b border-gray-200">
                  {columnOrder.map(column => {
                    if (visibleColumns[column] === false) return null;
                    
                    // Get the proper sort field (special case for name)
                    const sortField = columnDefinitions[column].sortField || column;
                    
                    return (
                      <th 
                        key={column}
                        className={`
                          px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                          cursor-pointer
                          relative border-r border-gray-200 hover:bg-gray-100 group
                          ${dragOverItem === column ? 'bg-blue-50' : ''}
                        `}
                        onClick={() => handleSortChange(sortField)}
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, column)}
                        onDragOver={(e) => handleDragOver(e, column)}
                        onDrop={(e) => handleDrop(e, column)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="flex items-center">
                          <span>{columnDefinitions[column].display}</span>
                          {renderSortIcon(sortField)}
                          
                          {/* Resize handle */}
                          <div 
                            className="absolute top-0 right-0 h-full w-4 cursor-col-resize"
                            onMouseDown={(e) => startResize(e, column)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="h-full flex items-center justify-center">
                              <div className="h-4/5 w-0.5 bg-gray-300 group-hover:bg-blue-500 hover:bg-blue-500"></div>
                            </div>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayContacts.map((contact) => (
                  <tr 
                    key={contact.id}
                    className="hover:bg-gray-50 cursor-pointer border-b border-gray-200"
                    onClick={() => onContactSelect && onContactSelect(contact)}
                  >
                    {/* Name column */}
                    {visibleColumns.name !== false && (
                      <td className="px-3 py-3 whitespace-nowrap border-r border-gray-200">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <FaUser className="text-gray-500" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {contact.first_name} {contact.last_name}
                            </div>
                            {contact.email && visibleColumns.email === false && (
                              <div className="flex text-xs text-gray-500 mt-1">
                                <div className="flex items-center mr-3" title={contact.email}>
                                  <FaEnvelope className="mr-1" />
                                  <span className="truncate max-w-xs">{contact.email}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    )}
                    
                    {/* Email column */}
                    {visibleColumns.email !== false && (
                      <td className="px-3 py-3 whitespace-nowrap border-r border-gray-200">
                        {contact.email ? (
                          <div className="flex items-center text-sm text-gray-900">
                            <FaEnvelope className="mr-1 text-gray-400" />
                            <a href={`mailto:${contact.email}`} className="text-blue-600 hover:text-blue-800" onClick={(e) => e.stopPropagation()}>
                              {contact.email}
                            </a>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                    )}
                    
                    {/* Company column */}
                    {visibleColumns.company !== false && (
                      <td className="px-3 py-3 whitespace-nowrap border-r border-gray-200">
                        {contact.company ? (
                          <div className="flex items-center text-sm text-gray-900">
                            <FaBuilding className="mr-1 text-gray-400" />
                            {contact.company}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                    )}
                    
                    {/* Position column */}
                    {visibleColumns.position !== false && (
                      <td className="px-3 py-3 whitespace-nowrap border-r border-gray-200">
                        {contact.position ? (
                          <span className="text-sm text-gray-900">{contact.position}</span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                    )}
                    
                    {/* Connected On column */}
                    {visibleColumns.connected_on !== false && (
                      <td className="px-3 py-3 whitespace-nowrap border-r border-gray-200">
                        {contact.connected_on ? (
                          <span className="text-sm text-gray-900">{new Date(contact.connected_on).toLocaleDateString()}</span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                    )}
                    
                    {/* Brand Count column */}
                    {visibleColumns.brand_count !== false && (
                      <td className="px-3 py-3 whitespace-nowrap border-r border-gray-200">
                        <div className="flex flex-wrap gap-1">
                          {contact.brand_associations && contact.brand_associations.length > 0 ? (
                            contact.brand_associations.map((association) => (
                              <span 
                                key={association.id}
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  association.is_primary 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                                title={`Confidence: ${Math.round(association.confidence_score * 100)}%`}
                              >
                                {association.brand_name}
                                {association.is_primary && ' (Primary)'}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-sm">No brand matches</span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="px-4 py-3 border-t flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {searchQuery ? (
                <span>
                  Showing {skip + 1}-{Math.min(skip + limit, total)} of {total} matching contacts
                  <button 
                    onClick={clearSearch}
                    className="ml-2 text-blue-500 hover:text-blue-700"
                  >
                    Clear search
                  </button>
                </span>
              ) : (
                <span>Showing {skip + 1}-{Math.min(skip + limit, total)} of {total} contacts</span>
              )}
            </div>
            <div className="flex items-center">
              <button
                onClick={handlePreviousPage}
                disabled={skip === 0}
                className="px-3 py-1 border rounded mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={skip + limit >= total}
                className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ContactsList;