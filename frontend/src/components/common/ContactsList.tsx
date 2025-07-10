import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApiClient } from '../../hooks/useApiClient';
import { useNotification } from '../../contexts/NotificationContext';
import { FaEnvelope, FaBuilding, FaSort, FaSortUp, FaSortDown, FaSearch, FaTimes, FaSpinner, FaColumns, FaSync, FaAddressBook, FaFileUpload } from 'react-icons/fa';
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

export interface Contact {
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

export interface ContactsResponse {
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
  const [limit, setLimit] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('last_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [rescanDisplayMessage, setRescanDisplayMessage] = useState<string | null>(null);
  const [isThresholdModalVisible, setIsThresholdModalVisible] = useState(false);
  const [rescanThreshold, setRescanThreshold] = useState(0.8);
  const [refetchKey, setRefetchKey] = useState(0);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [isRetagModalVisible, setIsRetagModalVisible] = useState(false);
  const [retagValue, setRetagValue] = useState('');
  const [isRetagging, setIsRetagging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [importProgress, setImportProgress] = useState<any>(null);
  
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

  const columnDefinitions: Record<string, { width: number; display: string; sortField: string | null }> = {
    select: { width: 60, display: 'Select', sortField: null },
    name: { width: 250, display: 'Name', sortField: 'last_name' },
    email: { width: 200, display: 'Email', sortField: 'email' },
    company: { width: 150, display: 'Company', sortField: 'company' },
    position: { width: 150, display: 'Position', sortField: 'position' },
    connected_on: { width: 150, display: 'Connected On', sortField: 'connected_on' },
    import_source_tag: { width: 180, display: 'Import Tag', sortField: 'import_source_tag' },
    brand_count: { width: 200, display: 'Matched Brands', sortField: 'brand_name' }
  };

  useEffect(() => {
    const savedColumns = localStorage.getItem('contactList_columns');
    if (savedColumns) {
      try {
        setVisibleColumns(JSON.parse(savedColumns));
      } catch (e) {
        console.error('Error parsing saved columns:', e);
      }
    }
    
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

  const toggleColumnVisibility = useCallback((column: string) => {
    setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }));
  }, []);

  const showAllColumns = useCallback(() => {
    setVisibleColumns({
      select: true, name: true, email: true, company: true, position: true,
      connected_on: true, import_source_tag: true, brand_count: true
    });
  }, []);
  
  const initialColumnOrder = Object.keys(columnDefinitions);
  const [columnOrder, setColumnOrder] = useState<string[]>(initialColumnOrder);

  const {
    draggedItem, dragOverItem, handleDragStart, handleDragOver, handleDrop, handleDragEnd
  } = useDragAndDrop<string>({
    items: columnOrder,
    onReorder: setColumnOrder
  });
  
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const skip = (currentPage - 1) * limit;
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (searchQuery) params.append('search', searchQuery);
      if (brandId) params.append('brand_id', brandId);

      const response = await apiClient.get<ContactsResponse>(`/api/v1/contacts/?${params.toString()}`, { requiresAuth: true });
      
      setContacts(response.data?.items || []);
      setTotal(response.data?.total || 0);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError('Failed to load contacts. Please try again.');
      showNotification('error', 'Failed to load contacts.');
    } finally {
      setLoading(false);
    }
  }, [apiClient, currentPage, limit, sortBy, sortOrder, searchQuery, brandId, showNotification]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts, refetchKey]);

  useEffect(() => {
    if (!Array.isArray(contacts)) {
      setDisplayContacts([]);
      return;
    }
    
    let sortedContacts = [...contacts];
    if (sortBy === 'brand_name') {
      sortedContacts.sort((a, b) => {
        const getBestBrandName = (contact: Contact): string => {
          if (!contact.brand_associations || contact.brand_associations.length === 0) return '';
          const primary = contact.brand_associations.find(assoc => assoc.is_primary);
          if (primary?.brand?.name) return primary.brand.name.toLowerCase();
          const sorted = contact.brand_associations.map(a => a.brand?.name || '').filter(Boolean).sort();
          return sorted[0]?.toLowerCase() || '';
        };
        const nameA = getBestBrandName(a);
        const nameB = getBestBrandName(b);
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });
    }
    setDisplayContacts(sortedContacts);
  }, [contacts, sortBy, sortOrder]);
  
  const totalPages = Math.ceil(total / limit);
  
  const handleSortChange = useCallback((field: string) => {
    setSortOrder(sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc');
    setSortBy(field);
    setCurrentPage(1);
  }, [sortBy, sortOrder]);

  const changePagePreservingScroll = useCallback((newPage: number) => {
    const currentScrollY = window.scrollY;
    setCurrentPage(newPage);
    setTimeout(() => window.scrollTo(0, currentScrollY), 10);
  }, []);
  
  const handleFirstPage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage !== 1) changePagePreservingScroll(1);
  }, [currentPage, changePagePreservingScroll]);
  
  const handlePreviousPage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage > 1) changePagePreservingScroll(currentPage - 1);
  }, [currentPage, changePagePreservingScroll]);
  
  const handleNextPage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage < totalPages) changePagePreservingScroll(currentPage + 1);
  }, [currentPage, totalPages, changePagePreservingScroll]);
  
  const handleLastPage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage !== totalPages) changePagePreservingScroll(totalPages);
  }, [currentPage, totalPages, changePagePreservingScroll]);
  
  const handlePageSizeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = parseInt(e.target.value, 10);
    const firstItemIndex = (currentPage - 1) * limit + 1;
    const newPage = Math.ceil(firstItemIndex / newLimit);
    setLimit(newLimit);
    setCurrentPage(newPage);
    localStorage.setItem('contactList_pageSize', newLimit.toString());
  }, [currentPage, limit]);

  const handleSearch = useCallback(() => {
    setSearchQuery(searchTerm);
    setCurrentPage(1);
  }, [searchTerm]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchQuery('');
    setCurrentPage(1);
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  }, [handleSearch]);
  
  const handleRescanContacts = useCallback(() => {
    if (rescanning) return;
    setRescanThreshold(0.8);
    setIsThresholdModalVisible(true);
  }, [rescanning]);

  const confirmRescanWithThreshold = useCallback(async () => {
    setIsThresholdModalVisible(false);
    setRescanning(true);
    const requestBody: { match_threshold: number; contact_ids?: string[] } = {
      match_threshold: rescanThreshold,
    };
    if (selectedContactIds.size > 0) {
      requestBody.contact_ids = Array.from(selectedContactIds);
      setRescanDisplayMessage(`Re-scanning ${selectedContactIds.size} selected contact(s)...`);
    } else {
      setRescanDisplayMessage("Re-scanning all contacts...");
    }
    try {
      const response = await apiClient.post('/api/v1/contacts/rematch-brands', requestBody, { requiresAuth: true });
      if (response.data.success) {
        const stats = response.data.stats;
        showNotification('success', `Re-scan complete! Added ${stats.associations_added}, Removed ${stats.associations_removed}.`);
        setRefetchKey(prev => prev + 1);
      } else {
        showNotification('error', 'Backend reported failure during re-scan.');
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'An unknown error occurred during re-scan.');
    } finally {
      setRescanning(false);
    }
  }, [apiClient, rescanThreshold, showNotification, selectedContactIds]);

  const handleOpenRetagModal = () => {
    if (selectedContactIds.size === 0) {
      showNotification('info', 'Please select at least one contact to retag.');
      return;
    }
    setRetagValue('');
    setIsRetagModalVisible(true);
  };

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
      showNotification('success', response.data.message || `Successfully retagged contacts.`);
      setSelectedContactIds(new Set());
      setIsRetagModalVisible(false);
      fetchContacts();
    } catch (err: any) {
      console.error('Error retagging contacts:', err);
      showNotification('error', err.response?.data?.detail || 'Failed to retag contacts.');
    } finally {
      setIsRetagging(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedContactIds.size === 0) {
      showNotification('info', 'Please select at least one contact to delete.');
      return;
    }
    Modal.confirm({
      title: 'Are you sure?',
      content: `This will permanently delete ${selectedContactIds.size} contact(s).`,
      okText: 'Yes, Delete',
      okType: 'danger',
      onOk: async () => {
        setIsDeleting(true);
        try {
          const response = await apiClient.post('/api/v1/contacts/bulk-delete', {
            contact_ids: Array.from(selectedContactIds),
          }, { requiresAuth: true });
          showNotification('success', response.data.message || `Successfully deleted contacts.`);
          setSelectedContactIds(new Set());
          fetchContacts();
        } catch (err: any) {
          console.error('Error deleting contacts:', err);
          showNotification('error', err.response?.data?.detail || 'Failed to delete contacts.');
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) return <FaSort className="ml-1 text-gray-400" />;
    return sortOrder === 'asc' ? <FaSortUp className="ml-1 text-blue-500" /> : <FaSortDown className="ml-1 text-blue-500" />;
  };

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

  const handleToggleSelectAll = () => {
    if (selectedContactIds.size === displayContacts.length && displayContacts.length > 0) {
      setSelectedContactIds(new Set());
    } else {
      setSelectedContactIds(new Set(displayContacts.map(c => c.id)));
    }
  };

  const handleImport = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    setImportProgress({ processed_count: 0, total_contacts: 'N/A', status: 'uploading' });
    try {
      await apiClient.postStreaming('/api/v1/contacts/import/linkedin', formData, {
        onProgress: (progress) => setImportProgress(progress),
      });
      showNotification('success', 'Contact import completed successfully.');
      fetchContacts();
    } catch (error: any) {
      showNotification('error', `Import failed: ${error.message}`);
      setImportProgress({ status: 'error', message: error.message });
    } finally {
      setTimeout(() => setImportProgress(null), 10000);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Header Section */}
        <div className="p-4 border-b flex flex-col md:flex-row md:items-center justify-between">
            <div className="flex items-center">
                <h2 className="text-lg font-semibold mb-2 md:mb-0">Contacts</h2>
                <button onClick={handleRescanContacts} disabled={rescanning} className="ml-4 px-3 py-1 rounded-md flex items-center bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 disabled:opacity-50 text-sm">
                    {rescanning ? <FaSpinner className="mr-2 animate-spin" /> : <FaSync className="mr-2" />}
                    Re-scan
                </button>
                {selectedContactIds.size > 0 && (
                    <>
                        <button onClick={handleOpenRetagModal} className="ml-4 px-3 py-1 rounded-md flex items-center bg-green-50 text-green-700 border border-green-300 hover:bg-green-100 text-sm">
                            Retag ({selectedContactIds.size})
                        </button>
                        <button onClick={handleDeleteSelected} disabled={isDeleting} className="ml-2 px-3 py-1 rounded-md flex items-center bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 text-sm">
                            {isDeleting ? <FaSpinner className="mr-2 animate-spin" /> : null}
                            Delete ({selectedContactIds.size})
                        </button>
                    </>
                )}
            </div>
            <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-2">
                <div className="relative flex-grow">
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyPress={handleKeyPress} placeholder="Search..." className="w-full px-4 py-2 pr-10 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    {searchTerm && <button onClick={clearSearch} className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"><FaTimes /></button>}
                    <button onClick={handleSearch} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"><FaSearch /></button>
                </div>
                <button onClick={() => setShowColumnSelector(!showColumnSelector)} className="px-3 py-2 rounded-md flex items-center bg-white text-gray-700 border border-gray-300 hover:bg-gray-50">
                    <FaColumns className="mr-2" /> Columns
                </button>
            </div>
        </div>

        {/* Column Selector */}
        {showColumnSelector && (
            <div className="bg-white p-2 border-b">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {Object.entries(columnDefinitions).map(([key, { display }]) => (
                        <div key={key} className="flex items-center">
                            <input type="checkbox" id={`col-${key}`} checked={visibleColumns[key] !== false} onChange={() => toggleColumnVisibility(key)} className="mr-2" />
                            <label htmlFor={`col-${key}`} className="text-xs">{display}</label>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Main Content */}
        {loading && contacts.length === 0 ? (
            <div className="flex justify-center items-center py-12"><FaSpinner className="animate-spin text-blue-500 text-3xl" /></div>
        ) : error ? (
            <div className="text-center py-8 text-red-600">{error}</div>
        ) : contacts.length === 0 ? (
             <div className="text-center py-8">
              <div className="mb-4"><FaAddressBook className="inline-block text-gray-300 text-6xl" /></div>
              <p className="text-gray-500 mb-2">No contacts found.</p>
              <p className="text-sm text-gray-400">Import your LinkedIn contacts to get started.</p>
            </div>
        ) : (
            <>
                <div className="overflow-x-auto">
                    <table ref={tableRef} className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {columnOrder.map(key => visibleColumns[key] && (
                                    <th key={key} onClick={() => columnDefinitions[key].sortField && handleSortChange(columnDefinitions[key].sortField!)}
                                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                        <div className="flex items-center">
                                            {key === 'select' ? <input type="checkbox" onChange={handleToggleSelectAll} checked={selectedContactIds.size === displayContacts.length && displayContacts.length > 0} /> : columnDefinitions[key].display}
                                            {columnDefinitions[key].sortField && renderSortIcon(columnDefinitions[key].sortField!)}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {displayContacts.map(contact => (
                                <tr key={contact.id} className={`hover:bg-gray-50 ${selectedContactIds.has(contact.id) ? 'bg-yellow-50' : ''}`} onClick={() => onContactSelect && onContactSelect(contact)}>
                                    {columnOrder.map(key => visibleColumns[key] && (
                                        <td key={key} className="px-3 py-2 whitespace-nowrap text-sm">
                                            {key === 'select' ? <input type="checkbox" checked={selectedContactIds.has(contact.id)} onChange={() => handleToggleSelectContact(contact.id)} onClick={e => e.stopPropagation()} /> : null}
                                            {key === 'name' && `${contact.first_name} ${contact.last_name}`}
                                            {key === 'email' && contact.email}
                                            {key === 'company' && contact.company}
                                            {key === 'position' && contact.position}
                                            {key === 'connected_on' && contact.connected_on ? new Date(contact.connected_on).toLocaleDateString() : '-'}
                                            {key === 'import_source_tag' && contact.import_source_tag}
                                            {key === 'brand_count' && (contact.brand_associations?.length || 0)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-4 py-3 flex items-center justify-between border-t">
                    <span className="text-sm text-gray-700">Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, total)} of {total} results</span>
                    <div className="flex items-center space-x-1">
                        <button onClick={handleFirstPage} disabled={currentPage <= 1} className="p-1 border rounded disabled:opacity-50">First</button>
                        <button onClick={handlePreviousPage} disabled={currentPage <= 1} className="p-1 border rounded disabled:opacity-50">Prev</button>
                        <span className="px-2">Page {currentPage} of {totalPages}</span>
                        <button onClick={handleNextPage} disabled={currentPage >= totalPages} className="p-1 border rounded disabled:opacity-50">Next</button>
                        <button onClick={handleLastPage} disabled={currentPage >= totalPages} className="p-1 border rounded disabled:opacity-50">Last</button>
                    </div>
                </div>
            </>
        )}

        {/* Modals */}
        <Modal title="Set Re-scan Confidence Threshold" open={isThresholdModalVisible} onOk={confirmRescanWithThreshold} onCancel={() => setIsThresholdModalVisible(false)} confirmLoading={rescanning}>
            {/* ... modal content ... */}
        </Modal>
        <Modal title={`Retag ${selectedContactIds.size} Selected Contact(s)`} open={isRetagModalVisible} onOk={handleConfirmRetag} onCancel={() => setIsRetagModalVisible(false)} confirmLoading={isRetagging}>
            {/* ... modal content ... */}
        </Modal>
    </div>
  );
};

export default ContactsList;