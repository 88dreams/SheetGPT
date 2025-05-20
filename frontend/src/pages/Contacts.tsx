import React, { useState, useEffect } from 'react';
import { FaLinkedin, FaFileUpload, FaAddressBook, FaTags } from 'react-icons/fa';
import { Modal, Input, Select, Form } from 'antd';
import LinkedInCSVImport from '../components/common/LinkedInCSVImport';
import ContactsList from '../components/common/ContactsList';
import ContactDetail from '../components/common/ContactDetail';
import PageContainer from '../components/common/PageContainer';
import PageHeader from '../components/common/PageHeader';
import { useApiClient } from '../hooks/useApiClient';
import { useNotification } from '../contexts/NotificationContext';

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
  brand_associations: any[];
}

interface ImportStats {
  total_contacts: number;
  imported_contacts: number;
  matched_brands: number;
  import_errors: Array<{
    row: Record<string, string>;
    error: string;
  }>;
}

const ContactsPage: React.FC = () => {
  const [view, setView] = useState<'list' | 'import' | 'detail'>('list');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isBulkTagModalVisible, setIsBulkTagModalVisible] = useState(false);
  const [bulkTagForm] = Form.useForm();
  const apiClient = useApiClient();
  const { showNotification } = useNotification();
  
  // Add event listener for empty state "Import Contacts" button
  useEffect(() => {
    const handleImportClick = () => {
      setView('import');
    };
    
    window.addEventListener('contact-import-click', handleImportClick);
    
    return () => {
      window.removeEventListener('contact-import-click', handleImportClick);
    };
  }, []);

  const handleImportComplete = (stats: ImportStats) => {
    // Refresh the contacts list
    setRefreshKey(prev => prev + 1);
    // Switch to list view after importing
    setView('list');
  };

  const handleContactSelect = (contact: Contact) => {
    setSelectedContactId(contact.id);
    setView('detail');
  };

  const handleBackToList = () => {
    setSelectedContactId(null);
    setView('list');
    // Refresh the list in case details were updated
    setRefreshKey(prev => prev + 1);
  };

  const handleDeleteContact = () => {
    setSelectedContactId(null);
    setView('list');
    // Refresh the list
    setRefreshKey(prev => prev + 1);
  };

  const handleContactUpdate = () => {
    // No need to navigate, just refresh the list for when they go back
    setRefreshKey(prev => prev + 1);
  };

  const showBulkTagModal = () => {
    bulkTagForm.resetFields();
    setIsBulkTagModalVisible(true);
  };

  const handleBulkTagOk = async () => {
    try {
      const values = await bulkTagForm.validateFields();
      const response = await apiClient.post('/api/v1/contacts/bulk-update-tag', values, { requiresAuth: true });
      
      showNotification('success', response.data.message || 'Bulk tag update initiated.');
      setRefreshKey(prev => prev + 1);
      setIsBulkTagModalVisible(false);
    } catch (error: any) {
      console.error('Bulk tag update error:', error);
      const message = error.response?.data?.detail || error.message || 'Failed to update tags.';
      showNotification('error', message);
    }
  };

  const handleBulkTagCancel = () => {
    setIsBulkTagModalVisible(false);
  };

  return (
    <PageContainer title="Contacts Management">
      <PageHeader 
        title="Contacts" 
        actions={
          <div className="flex space-x-2">
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-md flex items-center ${
                view === 'list' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FaAddressBook className="mr-2" />
              View Contacts
            </button>
            <button
              onClick={() => setView('import')}
              className={`px-4 py-2 rounded-md flex items-center ${
                view === 'import' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FaFileUpload className="mr-2" />
              Import CSV
            </button>
            <button
              onClick={showBulkTagModal}
              className={`px-4 py-2 rounded-md flex items-center bg-purple-600 text-white hover:bg-purple-700`}
            >
              <FaTags className="mr-2" />
              Bulk Update Tags
            </button>
          </div>
        }
      />

      <div className="mt-6">
        {view === 'list' && (
          <ContactsList 
            key={refreshKey}
            onContactSelect={handleContactSelect}
          />
        )}
        
        {view === 'import' && (
          <LinkedInCSVImport onImportComplete={handleImportComplete} />
        )}
        
        {view === 'detail' && selectedContactId && (
          <ContactDetail
            contactId={selectedContactId}
            onBack={handleBackToList}
            onDelete={handleDeleteContact}
            onUpdate={handleContactUpdate}
          />
        )}
      </div>

      <Modal
        title="Bulk Update Contact Tags"
        open={isBulkTagModalVisible}
        onOk={handleBulkTagOk}
        onCancel={handleBulkTagCancel}
        okText="Update Tags"
      >
        <Form form={bulkTagForm} layout="vertical" name="bulk_tag_form">
          <Form.Item
            name="new_tag"
            label="New Import Tag"
            rules={[{ required: true, message: 'Please input the tag!' }]}
          >
            <Input placeholder="e.g., Legacy Data Q1 2024" />
          </Form.Item>
          <Form.Item
            name="target_contacts"
            label="Apply to"
            initialValue="all_untagged"
            rules={[{ required: true, message: 'Please select target contacts!' }]}
          >
            <Select>
              <Select.Option value="all_untagged">All Untagged Contacts</Select.Option>
              <Select.Option value="all">All Contacts</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default ContactsPage;