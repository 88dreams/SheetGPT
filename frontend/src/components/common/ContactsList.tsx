import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApiClient } from '../../hooks/useApiClient';
import { useNotification } from '../../contexts/NotificationContext';
import { FaEnvelope, FaLinkedin, FaBuilding, FaUser, FaSort, FaSortUp, FaSortDown, FaSearch, FaTimes, FaSpinner, FaColumns, FaSync, FaAddressBook, FaFileUpload } from 'react-icons/fa';
import { useDragAndDrop } from '../../components/data/DataTable/hooks/useDragAndDrop';
import { Modal, InputNumber, Tooltip, Input } from 'antd';
import { useQueryClient } from '@tanstack/react-query';

interface Brand {
  id: string;
  name: string;
  industry?: string;
  representative_entity_type?: string;
}

interface ContactBrandAssociation {
  id: string;
  contact_id: string;
  brand_id: string;
  brand?: Brand;
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
  import_source_tag?: string;
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
  const queryClient = useQueryClient();
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [displayContacts, setDisplayContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('last_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [isThresholdModalVisible, setIsThresholdModalVisible] = useState(false);
  const [rescanThreshold, setRescanThreshold] = useState(0.8);
  const [refetchKey, setRefetchKey] = useState(0);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [isRetagModalVisible, setIsRetagModalVisible] = useState(false);
  const [retagValue, setRetagValue] = useState('');
  const [isRetagging, setIsRetagging] = useState(false);
  
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    select: true,
    name: true,
    email: true,
    company: true,
    position: true,
    connected_on: true,
    import_source_tag: true,
    brand_count: true
  });

  // Define the column definitions with width and a display name
  const columnDefinitions = {
    select: { width: 60, display: 'Select', sortField: null },
    name: { width: 250, display: 'Name', sortField: 'last_name' },
    email: { width: 200, display: 'Email' },
    company: { width: 100, display: 'Company' },
    position: { width: 100, display: 'Position' },
    connected_on: { width: 150, display: 'Connected On' },
    import_source_tag: { width: 180, display: 'Import Tag', sortField: 'import_source_tag' },
    brand_count: { width: 200, display: 'Matched Brands', sortField: 'brand_name' }
  };

  // Save/load column visibility settings and page size
  useEffect(() => {
    const savedColumns = localStorage.getItem('contactList_columns');
    if (savedColumns) {
      try {
        setVisibleColumns(JSON.parse(savedColumns));
      } catch (e) {
        console.error('Error parsing saved columns:', e);
      }
    }
    
    // Load saved page size preference
    const savedPageSize = localStorage.getItem('contactList_pageSize');
    if (savedPageSize) {
      const size = parseInt(savedPageSize, 10);
      if (!isNaN(size) && [20, 50, 100].includes(size)) {
        setLimit(size);
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
      select: true,
      name: true,
      email: true,
      company: true,
      position: true,
      connected_on: true,
      import_source_tag: true,
      brand_count: true
    });
  }, []);
  
  // Initial column order
  const initialColumnOrder = [
    'select',           // Checkbox column
    'name',             // Name
    'brand_count',      // Matched Brands
    'company',          // Company
    'position',         // Position
    'email',            // Email
    'import_source_tag',// Import Tag
    'connected_on'      // Connected On
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
  const lastRequest = useRef({
    currentPage: -1,
    limit: -1,
    sortBy: '',
    sortOrder: '',
    searchQuery: '',
    brandId: ''
  });
  const skipChangeSource = useRef<'page' | 'skip' | null>(null);
  // Create a ref to hold the latest fetchContacts function
  const fetchContactsRef = useRef<() => Promise<void>>(async () => {});
  
  // Track component mount state
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchContacts = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('Skipping contacts fetch - already loading');
      return;
    }
    isLoadingRef.current = true;
    setLoading(true);
    setError(null);
    const thisRequestId = ++requestIdRef.current;
    try {
      const calculatedSkip = (currentPage - 1) * limit;
      let url = `/api/v1/contacts/?skip=${calculatedSkip}&limit=${limit}&sort_by=${sortBy !== 'brand_name' ? sortBy : 'last_name'}&sort_order=${sortOrder}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (brandId) url += `&brand_id=${brandId}`;
      console.log(`Fetching contacts for page ${currentPage}, URL:`, url, 'requestId:', thisRequestId);
      const response = await apiClient.get<ContactsResponse>(url, { requiresAuth: true });
      console.log(`Received ${response.data?.items?.length || 0} contacts, requestId:`, thisRequestId);
      if (thisRequestId === requestIdRef.current && isMounted.current) {
        console.log('Setting contacts data from response, requestId:', thisRequestId);
        const items = response.data?.items || [];
        const totalCount = response.data?.total || 0;
        setContacts(items);
        setTotal(totalCount);
        if (calculatedSkip !== skip) {
          skipChangeSource.current = 'skip';
          setSkip(calculatedSkip);
        }
      } else {
        console.log('Ignoring stale contacts response, requestId:', thisRequestId);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err, 'requestId:', thisRequestId);
      
      // Only update error state if this is still the current request
      // and the component is still mounted
      if (thisRequestId === requestIdRef.current && isMounted.current) {
        // Check if it's a 500 error - likely due to no contacts
        const axiosError = err as any;
        if (axiosError?.response?.status === 500) {
          console.log('Server error - possibly due to no contacts in database');
          // Set empty data rather than error state
          setContacts([]);
          setTotal(0);
          setSkip(0);
        } else {
          // For other errors, show error message
          setError('Failed to load contacts. Please try again.');
          showNotification('error', 'Failed to load contacts.');
        }
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
  }, [apiClient, currentPage, limit, sortBy, sortOrder, searchQuery, brandId, showNotification, skip]);

  // Update the ref whenever fetchContacts changes
  useEffect(() => {
    fetchContactsRef.current = fetchContacts;
  }, [fetchContacts]);

  // Apply client-side sorting for brand names only on the current page of data
  useEffect(() => {
    // Safety check - ensure contacts is an array
    if (!Array.isArray(contacts)) {
      console.warn('Expected contacts to be an array but got:', typeof contacts);
      setDisplayContacts([]);
      return;
    }
    
    if (contacts.length > 0) {
      let sortedContacts = [...contacts];
      
      if (sortBy === 'brand_name') {
        console.log('Applying client-side sort for brand names on current page');
        
        // Sort just the current page by alphabetical order of brand names
        sortedContacts.sort((a, b) => {
          // Safety check - ensure brand_associations is an array
          if (!Array.isArray(a.brand_associations)) a.brand_associations = [];
          if (!Array.isArray(b.brand_associations)) b.brand_associations = [];
          
          // Get best brand name from each contact (or empty string if none)
          const getBestBrandName = (contact: Contact): string => {
            if (!contact.brand_associations || contact.brand_associations.length === 0) {
              return '';
            }
            
            // First try to find primary association
            const primaryAssociation = contact.brand_associations.find(assoc => assoc.is_primary);
            // Access nested brand name
            if (primaryAssociation?.brand?.name) {
              return primaryAssociation.brand.name.toLowerCase();
            }
            
            // Otherwise sort by all brand names and get the first alphabetically
            const sortedNames = contact.brand_associations
              .map(assoc => assoc.brand?.name || '') // Access nested brand name
              .filter(name => name) // Remove empty names
              .sort();
              
            return sortedNames[0]?.toLowerCase() || '';
          };
          
          const brandNameA = getBestBrandName(a);
          const brandNameB = getBestBrandName(b);
          
          // Sort alphabetically
          if (sortOrder === 'asc') {
            return brandNameA.localeCompare(brandNameB);
          } else {
            return brandNameB.localeCompare(brandNameA);
          }
        });
      }
      
      setDisplayContacts(sortedContacts);
    } else {
      setDisplayContacts([]);
    }
  }, [contacts, sortBy, sortOrder]);
  
  // Calculate total pages based on total items and current page size
  const totalPages = Math.ceil(total / limit);
  
  // Sync skip with currentPage when page changes
  useEffect(() => {
    // Only update skip if the change originated from page
    if (skipChangeSource.current !== 'skip') {
      skipChangeSource.current = 'page';
      const calculatedSkip = (currentPage - 1) * limit;
      setSkip(calculatedSkip);
    }
    // Reset the source after the update
    setTimeout(() => {
      skipChangeSource.current = null;
    }, 0);
  }, [currentPage, limit]);
  
  // This effect is actually not needed anymore since we're directly changing currentPage
  // in our navigation handlers, not skip

  // Use a more carefully controlled effect with specific dependencies
  // that should trigger a data refetch
  useEffect(() => {
    if (!isMounted.current) return;
    const currentRequest = {
      currentPage,
      limit,
      sortBy,
      sortOrder,
      searchQuery: searchQuery || '',
      brandId: brandId || ''
    };
    const lastReq = lastRequest.current;
    const isDuplicate = 
      lastReq.currentPage === currentRequest.currentPage &&
      lastReq.limit === currentRequest.limit &&
      lastReq.sortBy === currentRequest.sortBy &&
      lastReq.sortOrder === currentRequest.sortOrder &&
      lastReq.searchQuery === currentRequest.searchQuery &&
      lastReq.brandId === currentRequest.brandId;
    if (!isDuplicate) {
      console.log('ContactsList effect triggered (dependencies changed), fetching contacts...');
      lastRequest.current = {...currentRequest};
      // Directly call fetch, removed setTimeout
      if (isMounted.current) {
          fetchContactsRef.current(); 
      }
    } else {
      console.log('Skipping duplicate data fetch request due to unchanged dependencies.');
    }
  }, [currentPage, limit, sortBy, sortOrder, searchQuery, brandId, fetchContacts, refetchKey]);

  const handleSortChange = useCallback((field: string) => {
    // Toggle order if clicking the same field, otherwise default to ascending
    setSortOrder(sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc');
    setSortBy(field);
    
    // Reset to first page when sorting changes
    setCurrentPage(1);
    
    console.log(`Sorting by ${field} in ${sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc'} order`);
  }, [sortBy, sortOrder]);

  // Function to preserve scroll position when changing pages
  const changePagePreservingScroll = useCallback((newPage: number) => {
    // Store current scroll position
    const currentScrollY = window.scrollY;
    
    // Change the page
    console.log(`Changing to page ${newPage}`);
    setCurrentPage(newPage);
    
    // After a slight delay to allow re-rendering, restore scroll position
    setTimeout(() => {
      window.scrollTo(0, currentScrollY);
    }, 10);
  }, []);
  
  // Pagination navigation handlers
  const handleFirstPage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage !== 1) {
      changePagePreservingScroll(1);
    }
  }, [currentPage, changePagePreservingScroll]);
  
  const handlePreviousPage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage > 1) {
      changePagePreservingScroll(currentPage - 1);
    }
  }, [currentPage, changePagePreservingScroll]);
  
  const handleNextPage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage < totalPages) {
      changePagePreservingScroll(currentPage + 1);
    }
  }, [currentPage, totalPages, changePagePreservingScroll]);
  
  const handleLastPage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage !== totalPages) {
      changePagePreservingScroll(totalPages);
    }
  }, [currentPage, totalPages, changePagePreservingScroll]);
  
  const handlePageSizeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    // Store current scroll position
    const currentScrollY = window.scrollY;
    
    // Parse the new page size from the dropdown value
    const newLimit = parseInt(e.target.value, 10);
    
    // Calculate which item is at the top of the current page
    const firstItemIndex = (currentPage - 1) * limit + 1;
    
    // Calculate which page this item would be on with the new page size
    const newPage = Math.ceil(firstItemIndex / newLimit);
    
    // Update the page size first
    setLimit(newLimit);
    
    // Then update the current page to keep approximately the same position
    setCurrentPage(newPage);
    
    // Store the preference in localStorage
    localStorage.setItem('contactList_pageSize', newLimit.toString());
    
    // After a slight delay to allow re-rendering, restore scroll position
    setTimeout(() => {
      window.scrollTo(0, currentScrollY);
    }, 10);
  }, [currentPage, limit]);

  const handleSearch = useCallback(() => {
    setSearchQuery(searchTerm);
    setCurrentPage(1); // Reset pagination on new search
  }, [searchTerm]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchQuery('');
    setCurrentPage(1);
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);
  
  // Handle opening the modal instead of directly rescanning
  const handleRescanContacts = useCallback(() => {
    if (rescanning) return; // Prevent opening if already rescanning
    // Reset threshold to default when opening modal
    setRescanThreshold(0.8);
    setIsThresholdModalVisible(true);
  }, [rescanning]);

  // New function to actually perform the rescan after confirming threshold
  const confirmRescanWithThreshold = useCallback(async () => {
    setIsThresholdModalVisible(false);
    setRescanning(true);
    console.log(`Starting re-scan with threshold: ${rescanThreshold}`);
    try {
      const response = await apiClient.post('/api/v1/contacts/rematch-brands', 
        { match_threshold: rescanThreshold }, 
        { requiresAuth: true }
      );
      console.log('Re-scan API response:', response.data);
      if (response.data.success) {
        const stats = response.data.stats;
        let message = `Re-scan complete! Checked ${stats.total_contacts} contacts.`;
        if (stats.associations_added > 0 || stats.associations_removed > 0) {
          message += ` Added ${stats.associations_added}, Removed ${stats.associations_removed} associations.`;
        } else { message += ` No association changes needed.`; }
        message += ` Kept ${stats.associations_kept}. Total after: ${stats.total_brand_associations_after}.`;
        if (stats.errors && stats.errors.length > 0) {
           message += ` Encountered ${stats.errors.length} errors during DB operations.`
           showNotification('info', message);
        } else { showNotification('success', message); }
        
        console.log("Invalidating contacts query cache (if used elsewhere)...");
        await queryClient.invalidateQueries({ queryKey: ['contacts'], exact: false }); 

        console.log("Triggering contact list refetch...");
        if (currentPage === 1) {
          // If already on page 1, changing currentPage to 1 won't trigger useEffect.
          // In this case, use the refetchKey.
          setRefetchKey(prevKey => prevKey + 1);
        } else {
          // If not on page 1, going back to page 1 will change a dependency and trigger useEffect.
          setCurrentPage(1);
        }

      } else { showNotification('error', 'Backend reported failure during re-scan.'); }
    } catch (err: any) {
      console.error('Error re-scanning contacts:', err);
      let errorMsg = 'Failed to re-scan contacts. Please try again.';
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMsg = 'Re-scan operation timed out. It might be processing in the background. Please check back later.';
      }
      showNotification('error', errorMsg);
    } finally {
      setRescanning(false);
    }
  }, [apiClient, rescanThreshold, showNotification, queryClient, setRefetchKey, currentPage]);

  // Handler for opening the retag modal
  const handleOpenRetagModal = () => {
    if (selectedContactIds.size === 0) {
      showNotification('info', 'Please select at least one contact to retag.');
      return;
    }
    setRetagValue(''); // Clear previous tag value
    setIsRetagModalVisible(true);
  };

  // Handler for confirming the retag operation
  const handleConfirmRetag = async () => {
    if (!retagValue.trim()) {
      showNotification('error', 'Please enter a tag value.');
      return;
    }
    if (selectedContactIds.size === 0) {
      showNotification('error', 'No contacts selected.');
      return;
    }

    setIsRetagging(true);
    try {
      const response = await apiClient.post('/api/v1/contacts/bulk-update-specific-tags', {
        contact_ids: Array.from(selectedContactIds),
        new_tag: retagValue.trim(),
      }, { requiresAuth: true });

      showNotification('success', response.data.message || `Successfully retagged ${response.data.updated_count} contacts.`);
      setSelectedContactIds(new Set()); // Clear selection
      setIsRetagModalVisible(false); // Close modal
      
      // Directly refetch contacts data
      console.log("ContactsList: Retag successful, directly calling fetchContactsRef.current() to refresh data.");
      fetchContactsRef.current();

    } catch (err: any) {
      console.error('Error retagging contacts:', err);
      showNotification('error', err.response?.data?.detail || 'Failed to retag contacts.');
    } finally {
      setIsRetagging(false);
    }
  };

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

  // Toggle selection for a single contact
  const handleToggleSelectContact = (contactId: string) => {
    setSelectedContactIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  // Toggle selection for all currently displayed contacts
  const handleToggleSelectAll = () => {
    if (selectedContactIds.size === displayContacts.length && displayContacts.length > 0) {
      setSelectedContactIds(new Set());
    } else {
      setSelectedContactIds(new Set(displayContacts.map(c => c.id)));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b flex flex-col md:flex-row md:items-center justify-between">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold mb-2 md:mb-0">Contacts</h2>
          
          <button
            onClick={handleRescanContacts}
            disabled={rescanning}
            className="ml-4 px-3 py-1 rounded-md flex items-center bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            title="Re-scan contacts for brand matches"
          >
            {rescanning ? (
              <FaSpinner className="mr-2 animate-spin" />
            ) : (
              <FaSync className="mr-2" />
            )}
            Re-scan for brand matches
          </button>

          {/* Retag Selected Button - New */} 
          {selectedContactIds.size > 0 && (
            <button
              onClick={handleOpenRetagModal}
              className="ml-4 px-3 py-1 rounded-md flex items-center bg-green-50 text-green-700 border border-green-300 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Retag selected contacts"
            >
              Retag Selected ({selectedContactIds.size})
            </button>
          )}
        </div>
        
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
        <div className="text-center py-8">
          <div className="mb-4">
            <FaAddressBook className="inline-block text-gray-400 text-6xl" />
          </div>
          {searchQuery ? (
            <p className="text-gray-500 mb-2">No contacts found matching your search criteria.</p>
          ) : (
            <>
              <p className="text-gray-500 mb-2">No contacts yet. Import your LinkedIn contacts to get started.</p>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('contact-import-click'))}
                className="px-4 py-2 mt-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center mx-auto"
              >
                <FaFileUpload className="mr-2" />
                Import Contacts
              </button>
            </>
          )}
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
                    
                    const sortField = columnDefinitions[column].sortField || column;
                    
                    return (
                      <th 
                        key={column}
                        className={`
                          px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                          cursor-pointer
                          relative border-r border-gray-200 hover:bg-gray-100 group
                          ${
                            dragOverItem === column ? 'bg-blue-50' : ''
                          }
                        `}
                        onClick={() => column === 'select' ? {} : handleSortChange(sortField)}
                        draggable={column !== 'select'}
                        onDragStart={column !== 'select' ? (e) => handleDragStart(e, column) : undefined}
                        onDragOver={column !== 'select' ? (e) => handleDragOver(e, column) : undefined}
                        onDrop={column !== 'select' ? (e) => handleDrop(e, column) : undefined}
                        onDragEnd={column !== 'select' ? handleDragEnd : undefined}
                      >
                        {column === 'select' ? (
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={displayContacts.length > 0 && selectedContactIds.size === displayContacts.length}
                              onChange={handleToggleSelectAll}
                              title={selectedContactIds.size === displayContacts.length && displayContacts.length > 0 ? "Deselect all" : "Select all"}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <span>{columnDefinitions[column].display}</span>
                            {columnDefinitions[column].sortField !== null && renderSortIcon(sortField)}
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
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayContacts.map((contact) => (
                  <tr 
                    key={contact.id}
                    className={`hover:bg-gray-50 cursor-pointer border-b border-gray-200 ${
                      selectedContactIds.has(contact.id) ? 'bg-yellow-50' : ''
                    }`}
                    onClick={() => onContactSelect && onContactSelect(contact)}
                  >
                    {columnOrder.map(columnKey => {
                      if (visibleColumns[columnKey] === false) return null;

                      let cellContent;
                      if (columnKey === 'select') {
                        cellContent = (
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedContactIds.has(contact.id)}
                              onChange={() => handleToggleSelectContact(contact.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        );
                      } else {
                        switch (columnKey) {
                          case 'name':
                            cellContent = (
                              <div> 
                                <div className="text-sm font-medium text-gray-900 truncate" title={`${contact.first_name} ${contact.last_name}`}>
                                    {contact.first_name} {contact.last_name}
                                  </div>
                                  {contact.email && visibleColumns.email === false && (
                                    <div className="flex text-xs text-gray-500 mt-1">
                                      <div className="flex items-center mr-3" title={contact.email}>
                                      <FaEnvelope className="mr-1 flex-shrink-0" />
                                        <span className="truncate max-w-xs">{contact.email}</span>
                                      </div>
                                    </div>
                                  )}
                              </div>
                            );
                            break;
                          case 'email':
                            cellContent = contact.email ? (
                              <div className="flex items-center text-sm text-gray-900">
                                <FaEnvelope className="mr-1 text-gray-400 flex-shrink-0" />
                                <a href={`mailto:${contact.email}`} className="text-blue-600 hover:text-blue-800 truncate" title={contact.email} onClick={(e) => e.stopPropagation()}>
                                  {contact.email}
                                </a>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            );
                            break;
                          case 'company':
                            cellContent = contact.company ? (
                              <div className="flex items-center text-sm text-gray-900">
                                <FaBuilding className="mr-1 text-gray-400 flex-shrink-0" />
                                <span className="truncate" title={contact.company}>{contact.company}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            );
                            break;
                          case 'position':
                            cellContent = contact.position ? (
                              <span className="text-sm text-gray-900 truncate" title={contact.position}>{contact.position}</span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            );
                            break;
                          case 'connected_on':
                            cellContent = contact.connected_on ? (
                              <span className="text-sm text-gray-900">{new Date(contact.connected_on).toLocaleDateString()}</span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            );
                            break;
                          case 'import_source_tag':
                            cellContent = contact.import_source_tag ? (
                              <span className="text-sm text-gray-900 truncate max-w-xs" title={contact.import_source_tag}>{contact.import_source_tag}</span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            );
                            break;
                          case 'brand_count':
                            cellContent = (contact.brand_associations && contact.brand_associations.length > 0) ? (
                              <div className="flex flex-wrap gap-1">
                                {contact.brand_associations.map((association) => (
                                  <span 
                                    key={association.id}
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                      association.is_primary 
                                        ? 'bg-blue-100 text-blue-800' 
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                                    title={`Confidence: ${Math.round(association.confidence_score * 100)}%`}
                                  >
                                    {association.brand?.name || 'Unknown'}
                                    {association.brand?.representative_entity_type && (
                                      <span className="ml-1">({association.brand.representative_entity_type})</span>
                                    )}
                                    {association.is_primary && ' (Primary)'}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">No brand matches</span>
                            );
                            break;
                          default:
                            cellContent = null;
                        }
                      }

                      return (
                        <td key={columnKey} className="px-3 py-2 whitespace-nowrap border-r border-gray-200">
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm text-gray-700">
                  {searchQuery ? (
                    <>
                      Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, total)} of {total} matching 
                      "<span className="font-semibold">{searchQuery}</span>" contacts
                      <button 
                        onClick={clearSearch}
                        className="ml-2 text-blue-500 hover:text-blue-700"
                      >
                        Clear search
                      </button>
                    </>
                  ) : (
                    <>Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, total)} of {total} results</>
                  )}
                </span>
                
                {/* Page size select dropdown */}
                <select
                  value={limit.toString()}
                  onChange={handlePageSizeChange}
                  className="ml-4 border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="20">20 per page</option>
                  <option value="50">50 per page</option>
                  <option value="100">100 per page</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleFirstPage}
                  disabled={currentPage <= 1 || loading}
                  className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  First
                </button>
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage <= 1 || loading}
                  className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-700 flex items-center">
                  {loading && (
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></span>
                  )}
                  Page {currentPage} of {totalPages || 1}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages || loading}
                  className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
                <button
                  onClick={handleLastPage}
                  disabled={currentPage >= totalPages || loading}
                  className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Threshold Setting Modal */}
      <Modal
        title="Set Re-scan Confidence Threshold"
        open={isThresholdModalVisible}
        onOk={confirmRescanWithThreshold}
        onCancel={() => setIsThresholdModalVisible(false)}
        confirmLoading={rescanning}
        okText="Confirm Re-scan"
      >
        <p className="mb-4">
          Adjust the similarity threshold for matching contacts to brands and entities.
          A higher value requires a closer match (e.g., 0.8), while a lower value is more lenient (e.g., 0.6).
          Associations below this threshold will be removed.
        </p>
        <div className="flex items-center">
          <label htmlFor="thresholdInput" className="mr-2">Threshold:</label>
          <InputNumber
            id="thresholdInput"
            min={0.1} 
            max={1.0}
            step={0.05}
            value={rescanThreshold}
            onChange={(value) => setRescanThreshold(value ?? 0.8)}
            style={{ width: '100px' }}
          />
          <Tooltip title="0.0 (very loose) to 1.0 (exact match). Default: 0.8">
            <span className="ml-2 text-gray-400 cursor-help">(?)</span>
          </Tooltip>
        </div>
      </Modal>

      {/* Retag Modal - New */}
      <Modal
        title={`Retag ${selectedContactIds.size} Selected Contact(s)`}
        open={isRetagModalVisible}
        onOk={handleConfirmRetag}
        onCancel={() => setIsRetagModalVisible(false)}
        confirmLoading={isRetagging}
        okText="Confirm Retag"
        okButtonProps={{ disabled: !retagValue.trim() }}
      >
        <p className="mb-4">
          Enter the new 'Import Source Tag' to apply to the selected contacts.
          This will overwrite any existing tag on these contacts.
        </p>
        <Input
          placeholder="Enter new import tag"
          value={retagValue}
          onChange={(e) => setRetagValue(e.target.value)}
          onPressEnter={(e) => { if (retagValue.trim()) handleConfirmRetag(); }}
        />
      </Modal>
    </div>
  );
};

export default ContactsList;