import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApiClient } from '../../hooks/useApiClient';
import { useNotification } from '../../contexts/NotificationContext';
import { FaEnvelope, FaLinkedin, FaBuilding, FaBriefcase, FaCalendarAlt, FaStickyNote, FaEdit, FaTrash, FaSpinner, FaPen, FaCheck, FaTimes, FaPlus } from 'react-icons/fa';

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
  representative_entity_type?: string;
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

interface Brand {
  id: string;
  name: string;
  industry: string;
  representative_entity_type?: string;
}

interface ContactDetailProps {
  contactId: string;
  onBack?: () => void;
  onDelete?: () => void;
  onUpdate?: (contact: Contact) => void;
}

const ContactDetail: React.FC<ContactDetailProps> = ({ contactId, onBack, onDelete, onUpdate }) => {
  const apiClient = useApiClient();
  const { showNotification } = useNotification();
  
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Contact>>({});
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [deletingAssociation, setDeletingAssociation] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Add refs to track component mount state and prevent duplicate requests
  const isMounted = useRef(true);
  const isLoadingContactRef = useRef(false);
  const isLoadingBrandsRef = useRef(false);
  
  // Track component mount state
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchContact = useCallback(async () => {
    // Prevent duplicate requests
    if (isLoadingContactRef.current) {
      console.log('Skipping contact fetch - already loading');
      return;
    }
    
    isLoadingContactRef.current = true;
    setLoading(true);
    
    try {
      console.log(`Fetching contact details for ID: ${contactId}`);
      const response = await apiClient.get<Contact>(`/v1/contacts/${contactId}`, { requiresAuth: true });
      
      if (isMounted.current) {
        console.log('Setting contact data from response');
        setContact(response.data);
        setEditData({
          first_name: response.data.first_name,
          last_name: response.data.last_name,
          email: response.data.email,
          linkedin_url: response.data.linkedin_url,
          company: response.data.company,
          position: response.data.position,
          notes: response.data.notes
        });
      }
    } catch (err) {
      console.error('Error fetching contact:', err);
      if (isMounted.current) {
        showNotification({
          type: 'error',
          message: 'Failed to load contact details.'
        });
      }
    } finally {
      isLoadingContactRef.current = false;
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [apiClient, contactId, showNotification]);

  const fetchBrands = useCallback(async () => {
    // Prevent duplicate requests
    if (isLoadingBrandsRef.current) {
      console.log('Skipping brands fetch - already loading');
      return;
    }
    
    isLoadingBrandsRef.current = true;
    setLoadingBrands(true);
    
    try {
      console.log('Fetching brands list');
      const response = await apiClient.get<{ items: Brand[] }>('/v1/sports/brands?limit=1000', { requiresAuth: true });
      
      if (isMounted.current) {
        console.log(`Loaded ${response.data.items.length} brands`);
        setBrands(response.data.items);
      }
    } catch (err) {
      console.error('Error fetching brands:', err);
    } finally {
      isLoadingBrandsRef.current = false;
      if (isMounted.current) {
        setLoadingBrands(false);
      }
    }
  }, [apiClient]);

  // Use separate effect with contactId dependency
  useEffect(() => {
    if (isMounted.current && contactId) {
      console.log('ContactDetail effect triggered - fetching contact');
      // Only fetch if we don't already have this contact or it's a different one
      if (!contact || contact.id !== contactId) {
        fetchContact();
      }
    }
  }, [contactId, fetchContact, contact]);

  // Only fetch brands when edit mode changes
  useEffect(() => {
    if (isMounted.current && editMode) {
      console.log('Edit mode enabled - fetching brands');
      fetchBrands();
    }
  }, [editMode, fetchBrands]);

  const handleEditChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!contact) return;
    
    setSavingEdit(true);
    try {
      const response = await apiClient.put<Contact>(`/v1/contacts/${contactId}`, editData, { requiresAuth: true });
      setContact(response.data);
      setEditMode(false);
      showNotification({
        type: 'success',
        message: 'Contact updated successfully'
      });
      if (onUpdate) {
        onUpdate(response.data);
      }
    } catch (err) {
      console.error('Error updating contact:', err);
      showNotification({
        type: 'error',
        message: 'Failed to update contact.'
      });
    } finally {
      setSavingEdit(false);
    }
  }, [apiClient, contact, contactId, editData, onUpdate, showNotification]);

  const handleAddBrandAssociation = useCallback(async () => {
    if (!contact || !selectedBrandId) return;
    
    try {
      const response = await apiClient.post<ContactBrandAssociation>(
        `/v1/contacts/${contactId}/brands/${selectedBrandId}`,
        {
          contact_id: contactId,
          brand_id: selectedBrandId,
          confidence_score: 1.0,
          association_type: 'employed_at',
          is_current: true,
          is_primary: true
        },
        { requiresAuth: true }
      );
      
      // Refresh contact to get updated associations
      fetchContact();
      setSelectedBrandId('');
      
      showNotification({
        type: 'success',
        message: 'Brand association added successfully'
      });
    } catch (err) {
      console.error('Error adding brand association:', err);
      showNotification({
        type: 'error',
        message: 'Failed to add brand association.'
      });
    }
  }, [apiClient, contact, contactId, fetchContact, selectedBrandId, showNotification]);

  const handleRemoveBrandAssociation = useCallback(async (brandId: string) => {
    if (!contact) return;
    
    setDeletingAssociation(brandId);
    try {
      await apiClient.delete(`/v1/contacts/${contactId}/brands/${brandId}`, { requiresAuth: true });
      
      // Refresh contact to get updated associations
      fetchContact();
      
      showNotification({
        type: 'success',
        message: 'Brand association removed successfully'
      });
    } catch (err) {
      console.error('Error removing brand association:', err);
      showNotification({
        type: 'error',
        message: 'Failed to remove brand association.'
      });
    } finally {
      setDeletingAssociation(null);
    }
  }, [apiClient, contact, contactId, fetchContact, showNotification]);

  const handleDeleteContact = useCallback(async () => {
    if (!contact) return;
    
    if (window.confirm(`Are you sure you want to delete ${contact.first_name} ${contact.last_name}?`)) {
      setDeleteLoading(true);
      try {
        await apiClient.delete(`/v1/contacts/${contactId}`, { requiresAuth: true });
        
        showNotification({
          type: 'success',
          message: 'Contact deleted successfully'
        });
        
        if (onDelete) {
          onDelete();
        }
      } catch (err) {
        console.error('Error deleting contact:', err);
        showNotification({
          type: 'error',
          message: 'Failed to delete contact.'
        });
      } finally {
        setDeleteLoading(false);
      }
    }
  }, [apiClient, contact, contactId, onDelete, showNotification]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center min-h-[300px]">
        <FaSpinner className="animate-spin text-blue-500 text-2xl" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8 text-gray-500">
          Contact not found or was deleted.
        </div>
        {onBack && (
          <button 
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Back to List
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">
          {editMode ? 'Edit Contact' : `${contact.first_name} ${contact.last_name}`}
        </h2>
        <div className="flex">
          {!editMode ? (
            <>
              <button
                onClick={() => setEditMode(true)}
                className="mr-2 p-2 text-blue-600 hover:bg-blue-50 rounded"
                title="Edit contact"
              >
                <FaEdit />
              </button>
              <button
                onClick={handleDeleteContact}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
                title="Delete contact"
                disabled={deleteLoading}
              >
                {deleteLoading ? <FaSpinner className="animate-spin" /> : <FaTrash />}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSaveEdit}
                className="mr-2 p-2 text-green-600 hover:bg-green-50 rounded flex items-center"
                disabled={savingEdit}
              >
                {savingEdit ? <FaSpinner className="animate-spin mr-1" /> : <FaCheck className="mr-1" />}
                Save
              </button>
              <button
                onClick={() => {
                  setEditMode(false);
                  // Reset edit data
                  setEditData({
                    first_name: contact.first_name,
                    last_name: contact.last_name,
                    email: contact.email,
                    linkedin_url: contact.linkedin_url,
                    company: contact.company,
                    position: contact.position,
                    notes: contact.notes
                  });
                }}
                className="p-2 text-gray-600 hover:bg-gray-50 rounded flex items-center"
              >
                <FaTimes className="mr-1" />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      <div className="p-4">
        {editMode ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                name="first_name"
                value={editData.first_name || ''}
                onChange={handleEditChange}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                name="last_name"
                value={editData.last_name || ''}
                onChange={handleEditChange}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={editData.email || ''}
                onChange={handleEditChange}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
              <input
                type="url"
                name="linkedin_url"
                value={editData.linkedin_url || ''}
                onChange={handleEditChange}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                name="company"
                value={editData.company || ''}
                onChange={handleEditChange}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <input
                type="text"
                name="position"
                value={editData.position || ''}
                onChange={handleEditChange}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                name="notes"
                value={editData.notes || ''}
                onChange={handleEditChange}
                rows={3}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row">
              <div className="sm:w-1/2 space-y-3">
                {contact.email && (
                  <div className="flex items-center">
                    <FaEnvelope className="text-gray-400 mr-2" />
                    <a href={`mailto:${contact.email}`} className="text-blue-600 hover:text-blue-800">
                      {contact.email}
                    </a>
                  </div>
                )}
                
                {contact.linkedin_url && (
                  <div className="flex items-center">
                    <FaLinkedin className="text-blue-600 mr-2" />
                    <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                      LinkedIn Profile
                    </a>
                  </div>
                )}
                
                {contact.company && (
                  <div className="flex items-center">
                    <FaBuilding className="text-gray-400 mr-2" />
                    <span>{contact.company}</span>
                  </div>
                )}
                
                {contact.position && (
                  <div className="flex items-center">
                    <FaBriefcase className="text-gray-400 mr-2" />
                    <span>{contact.position}</span>
                  </div>
                )}
              </div>
              
              <div className="sm:w-1/2 mt-4 sm:mt-0 space-y-3">
                {contact.connected_on && (
                  <div className="flex items-center">
                    <FaCalendarAlt className="text-gray-400 mr-2" />
                    <span>Connected on: {new Date(contact.connected_on).toLocaleDateString()}</span>
                  </div>
                )}
                
                {contact.notes && (
                  <div className="flex items-start">
                    <FaStickyNote className="text-gray-400 mr-2 mt-1" />
                    <div>
                      <h4 className="text-sm font-medium">Notes</h4>
                      <p className="text-gray-600 whitespace-pre-line">{contact.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h3 className="text-md font-medium mb-3">Brand Associations</h3>
              
              {contact.brand_associations && contact.brand_associations.length > 0 ? (
                <div className="space-y-2">
                  {contact.brand_associations.map((association) => (
                    <div key={association.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          association.is_primary 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {association.is_primary && 'Primary'}
                        </span>
                        <span className="ml-2">{association.brand_name}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          {Math.round(association.confidence_score * 100)}% confidence
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveBrandAssociation(association.brand_id)}
                        disabled={deletingAssociation === association.brand_id}
                        className="text-red-500 hover:text-red-700"
                      >
                        {deletingAssociation === association.brand_id ? (
                          <FaSpinner className="animate-spin" />
                        ) : (
                          <FaTrash />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500">No brand associations.</div>
              )}
              
              {editMode && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">Add Brand Association</h4>
                  <div className="flex">
                    <select
                      value={selectedBrandId}
                      onChange={(e) => setSelectedBrandId(e.target.value)}
                      className="flex-grow px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loadingBrands}
                    >
                      <option value="">Select a brand...</option>
                      {loadingBrands ? (
                        <option disabled>Loading brands...</option>
                      ) : (
                        brands.map((brand) => (
                          <option key={brand.id} value={brand.id}>
                            {brand.name} ({brand.industry})
                          </option>
                        ))
                      )}
                    </select>
                    <button
                      onClick={handleAddBrandAssociation}
                      disabled={!selectedBrandId || loadingBrands}
                      className="ml-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaPlus />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {onBack && (
        <div className="p-4 border-t">
          <button 
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Back to List
          </button>
        </div>
      )}
    </div>
  );
};

export default ContactDetail;