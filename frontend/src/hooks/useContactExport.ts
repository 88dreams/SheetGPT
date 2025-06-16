import { useState, useCallback } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { apiClient } from '../utils/apiClient';
import { saveCsvFile } from '../components/sports/database/EntityList/utils/csvExport';

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
      
      setExportState('saving');
      const suggestedName = `contacts-export-${new Date().toISOString().split('T')[0]}`;
      const columns = Object.keys(allContacts[0] || {});

      const success = await saveCsvFile(allContacts, columns, suggestedName);

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