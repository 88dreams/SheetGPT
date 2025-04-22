import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApiClient } from '../../hooks/useApiClient';
import { useNotification } from '../../contexts/NotificationContext';
import { FaEnvelope, FaLinkedin, FaBuilding, FaUser, FaSortAlphaDown, FaSortAlphaUp, FaSearch, FaTimes, FaSpinner } from 'react-icons/fa';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [limit] = useState(20);
  const [sortBy, setSortBy] = useState('last_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
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
      // Remove the /api prefix since the proxy in vite.config.ts or apiClient will add it
      let url = `/v1/contacts/?skip=${skip}&limit=${limit}&sort_by=${sortBy}&sort_order=${sortOrder}`;
      
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      
      if (brandId) {
        url += `&brand_id=${brandId}`;
      }
      
      console.log('Fetching contacts from URL:', url, 'requestId:', thisRequestId);
      const response = await apiClient.get<ContactsResponse>(url, { requiresAuth: true });
      console.log('Contacts API response received, requestId:', thisRequestId);
      
      // Only update state if this is still the current request
      // and the component is still mounted
      if (thisRequestId === requestIdRef.current && isMounted.current) {
        console.log('Setting contacts data from response, requestId:', thisRequestId);
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

  // Use a more carefully controlled effect with specific dependencies
  // that should trigger a data refetch
  useEffect(() => {
    if (isMounted.current) {
      console.log('ContactsList effect triggered, fetching contacts...');
      fetchContacts();
    }
  }, [skip, limit, sortBy, sortOrder, searchQuery, brandId]);

  const handleSortChange = useCallback((field: string) => {
    setSortOrder(sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc');
    setSortBy(field);
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

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-2">Contacts</h2>
        
        <div className="flex">
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
        </div>
      </div>

      {loading && contacts.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <FaSpinner className="animate-spin text-blue-500 text-2xl" />
        </div>
      ) : error ? (
        <div className="text-center py-6 text-red-500">{error}</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchQuery ? 'No contacts found matching your search criteria.' : 'No contacts yet. Import your LinkedIn contacts to get started.'}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('last_name')}>
                    <div className="flex items-center">
                      <span>Name</span>
                      {sortBy === 'last_name' && (
                        <span className="ml-1">
                          {sortOrder === 'asc' ? <FaSortAlphaDown className="text-blue-500" /> : <FaSortAlphaUp className="text-blue-500" />}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('company')}>
                    <div className="flex items-center">
                      <span>Company</span>
                      {sortBy === 'company' && (
                        <span className="ml-1">
                          {sortOrder === 'asc' ? <FaSortAlphaDown className="text-blue-500" /> : <FaSortAlphaUp className="text-blue-500" />}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('position')}>
                    <div className="flex items-center">
                      <span>Position</span>
                      {sortBy === 'position' && (
                        <span className="ml-1">
                          {sortOrder === 'asc' ? <FaSortAlphaDown className="text-blue-500" /> : <FaSortAlphaUp className="text-blue-500" />}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSortChange('connected_on')}>
                    <div className="flex items-center">
                      <span>Connected On</span>
                      {sortBy === 'connected_on' && (
                        <span className="ml-1">
                          {sortOrder === 'asc' ? <FaSortAlphaDown className="text-blue-500" /> : <FaSortAlphaUp className="text-blue-500" />}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Matched Brands
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contacts.map((contact) => (
                  <tr 
                    key={contact.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onContactSelect && onContactSelect(contact)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <FaUser className="text-gray-500" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {contact.first_name} {contact.last_name}
                          </div>
                          <div className="flex text-xs text-gray-500 mt-1">
                            {contact.email && (
                              <div className="flex items-center mr-3" title={contact.email}>
                                <FaEnvelope className="mr-1" />
                                <span className="truncate max-w-xs">{contact.email}</span>
                              </div>
                            )}
                            {contact.linkedin_url && (
                              <a 
                                href={contact.linkedin_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <FaLinkedin />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contact.company ? (
                        <div className="flex items-center text-sm text-gray-900">
                          <FaBuilding className="mr-1 text-gray-400" />
                          {contact.company}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contact.position ? (
                        <span className="text-sm text-gray-900">{contact.position}</span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contact.connected_on ? (
                        <span className="text-sm text-gray-900">{new Date(contact.connected_on).toLocaleDateString()}</span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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