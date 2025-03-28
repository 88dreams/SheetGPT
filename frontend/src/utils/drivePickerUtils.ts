// Google Drive Picker Utility
// This file handles Google Drive Picker integration

/**
 * Load the Google Drive Picker API script dynamically
 */
export function loadGoogleDrivePickerApi(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof gapi !== 'undefined' && gapi.load) {
      // API already loaded, just load picker
      gapi.load('picker', {
        callback: () => resolve(),
        onerror: () => reject(new Error('Failed to load Google Picker API')),
      });
      return;
    }

    // Need to load the gapi script first
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      gapi.load('picker', {
        callback: () => resolve(),
        onerror: () => reject(new Error('Failed to load Google Picker API')),
      });
    };
    script.onerror = () => reject(new Error('Failed to load Google API'));
    document.body.appendChild(script);
  });
}

/**
 * Create and open the Google Drive Picker
 * 
 * @param apiKey Google API Key
 * @param accessToken OAuth access token
 * @param callback Function to call with the selected folder ID
 */
export function openGoogleDrivePicker(
  apiKey: string,
  accessToken: string, 
  callback: (folderId: string, folderName: string) => void
): void {
  if (!gapi || !google || !google.picker) {
    console.error('Google APIs not loaded');
    return;
  }

  // Create the folder view with proper settings
  const docsView = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
    .setIncludeFolders(true)
    .setSelectFolderEnabled(true)
    .setMode(google.picker.DocsViewMode.LIST);

  // Create a more robust picker with proper features
  const pickerBuilder = new google.picker.PickerBuilder()
    .addView(docsView)
    .enableFeature(google.picker.Feature.NAV_HIDDEN)
    .enableFeature(google.picker.Feature.MINE_ONLY)
    .setOAuthToken(accessToken)
    .setDeveloperKey(apiKey)
    .setTitle('Select a folder for your spreadsheet')
    .setCallback((data) => {
      console.log('Picker callback data:', data);
      if (data.action === google.picker.Action.PICKED) {
        const folder = data.docs[0];
        console.log('Selected folder:', folder);
        callback(folder.id, folder.name);
      }
    });

  // Build and display the picker
  const picker = pickerBuilder.build();

  picker.setVisible(true);
}

/**
 * Move a file to the selected folder
 * 
 * @param fileId Google Drive file ID
 * @param folderId Target folder ID
 * @param accessToken OAuth access token
 * @returns Promise resolving with the updated file metadata
 */
export async function moveFileToFolder(
  fileId: string, 
  folderId: string, 
  accessToken: string
): Promise<any> {
  try {
    // Add the file to the target folder
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${folderId}`, 
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Error moving file: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error moving file to folder:', error);
    throw error;
  }
}

// Define a global type for the Google Picker API
declare global {
  interface Window {
    gapi: any;
    google: {
      picker: any;
    };
  }
  const gapi: any;
  const google: {
    picker: any;
  };
}