import React, { useState, useEffect, useRef } from 'react';
import { FaLinkedin, FaFileUpload, FaAddressBook, FaTags } from 'react-icons/fa';
import { Modal, Input, Select, Form, Button } from 'antd';
// import LinkedInCSVImport from '../components/common/LinkedInCSVImport'; // Old import
import CustomCSVImport from '../components/common/CustomCSVImport'; // New import
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
  total_contacts_in_file: number;
  processed_rows: number;
  imported_contacts: number;
  updated_contacts: number;
  matched_brands_associated: number;
  import_errors: Array<{
    row_number?: number | string;
    original_row?: Record<string, string>;
    error: string;
    field?: string;
    value?: string;
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
  
  const [selectedFileForImport, setSelectedFileForImport] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
    setRefreshKey(prev => prev + 1);
    setView('list');
    setSelectedFileForImport(null);
  };

  const handleContactSelect = (contact: Contact) => {
    setSelectedContactId(contact.id);
    setView('detail');
  };

  const handleBackToList = () => {
    setSelectedContactId(null);
    setView('list');
    setRefreshKey(prev => prev + 1);
  };

  const handleDeleteContact = () => {
    setSelectedContactId(null);
    setView('list');
    setRefreshKey(prev => prev + 1);
  };

  const handleContactUpdate = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleFileSelectedForImportLogic = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFileForImport(file);
      setView('import');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      setSelectedFileForImport(null);
    }
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
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        onChange={handleFileSelectedForImportLogic}
        style={{ display: 'none' }}
      />

      <PageHeader 
        title="Contacts" 
        actions={
          <div className="flex space-x-2">
            <Button
              onClick={() => setView('list')}
              type={view === 'list' ? 'primary' : 'default'}
              icon={<FaAddressBook className="mr-1" />}
              style={{ display: 'inline-flex', alignItems: 'center', flexDirection: 'row' }}
            >
              View Contacts
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              type={(view === 'import' && selectedFileForImport) ? 'primary' : 'default'}
              icon={<FaFileUpload className="mr-1" />}
              style={{ display: 'inline-flex', alignItems: 'center', flexDirection: 'row' }}
            >
              Import CSV
            </Button>
            <Button
              onClick={showBulkTagModal}
              icon={<FaTags className="mr-1" />}
              className={`px-4 py-2 flex items-center bg-purple-600 text-white hover:bg-purple-700 rounded-md`}
              style={{ display: 'inline-flex', alignItems: 'center', flexDirection: 'row' }}
            >
              Bulk Update Tags
            </Button>
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
        
        {view === 'import' && selectedFileForImport && (
          <CustomCSVImport 
            initialFile={selectedFileForImport} 
            onImportComplete={handleImportComplete} 
          />
        )}
        
        {view === 'import' && !selectedFileForImport && (
          <div className="text-center py-8">
            <p className="text-gray-500 italic text-lg">CSV import cancelled or no file selected.</p>
            <p className="mt-2 text-gray-400">Click "Import CSV" again to choose a file.</p>
          </div>
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