import React, { useState, useEffect } from 'react';
import { FaLinkedin, FaFileUpload, FaAddressBook } from 'react-icons/fa';
import LinkedInCSVImport from '../components/common/LinkedInCSVImport';
import ContactsList from '../components/common/ContactsList';
import ContactDetail from '../components/common/ContactDetail';
import PageContainer from '../components/common/PageContainer';
import PageHeader from '../components/common/PageHeader';

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

  return (
    <PageContainer>
      <PageHeader 
        title="Contacts" 
        icon={<FaAddressBook className="mr-2" />}
        actions={
          <div className="flex">
            <button
              onClick={() => setView('list')}
              className={`mr-2 px-4 py-2 rounded-md flex items-center ${
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
    </PageContainer>
  );
};

export default ContactsPage;