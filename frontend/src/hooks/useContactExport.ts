import { useState, useCallback } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { apiClient } from '../utils/apiClient';
import { saveCsvFile } from '../components/sports/database/EntityList/utils/csvExport';

interface Brand {
  id: string;
  name: string;
}

interface BrandAssociation {
  id: string;
  brand_id: string;
  brand?: Brand; // The brand object is nested here
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
  brand_associations?: BrandAssociation[];
}

interface PaginatedContactsResponse {
  items: Contact[];
  total: number;
}

export function useContactExport() {
  const { showNotification } = useNotification();
  const [exportState, setExportState] = useState<'idle' | 'fetching' | 'saving'>('idle');

  const handleCsvExport = useCallback(async () => {
    setExportState('fetching');
    showNotification('info', 'Preparing full contact data export...');

    try {
      const response = await apiClient.get<PaginatedContactsResponse>('/contacts', {
        params: { limit: 10000, skip: 0 }, // Fetch up to 10,000 contacts
      });

      const allContacts = response.data.items || [];
      if (allContacts.length === 0) {
        showNotification('warning', 'No contact data available to export.');
        setExportState('idle');
        return;
      }
      
      // Format data for export: transform brand_associations array into a string
      const formattedContacts = allContacts.map(contact => {
        const associations = contact.brand_associations || [];
        const brandNames = associations
          .map(assoc => assoc.brand?.name)
          .filter(Boolean) // Filter out any undefined names
          .join(', ');
        
        return {
          ...contact,
          brand_associations: brandNames,
        };
      });
      
      setExportState('saving');
      const suggestedName = `contacts-export-${new Date().toISOString().split('T')[0]}`;
      const columns = Object.keys(formattedContacts[0] || {});

      const success = await saveCsvFile(formattedContacts, columns, suggestedName);

      if (success) {
        showNotification('success', `Successfully exported ${allContacts.length} contacts.`);
      } else {
        showNotification('info', 'CSV export was cancelled by the user.');
      }

    } catch (error) {
      console.error('Full contact fetch for CSV export failed:', error);
      showNotification('error', 'Could not fetch full dataset for export.');
    } finally {
      setExportState('idle');
    }
  }, [showNotification]);

  // Placeholder for future implementation
  const handleSheetsExport = useCallback(async () => {
    showNotification('info', 'Google Sheets export for contacts is not yet implemented.');
  }, [showNotification]);

  return {
    exportState,
    handleCsvExport,
    handleSheetsExport,
  };
} 