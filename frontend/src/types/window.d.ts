// Google API Type definitions for TypeScript
interface Window {
  searchTimeout?: ReturnType<typeof setTimeout>;
  googleApiLoaded?: boolean;
  onGoogleApiLoad?: () => void;
  gapi: {
    load: (api: string, options: { 
      callback: () => void, 
      onerror: (error: any) => void 
    }) => void;
    client: any;
  };
  google: {
    picker: {
      DocsView: new (viewId: string) => {
        setIncludeFolders: (include: boolean) => any;
        setSelectFolderEnabled: (enabled: boolean) => any;
        setMode: (mode: string) => any;
      };
      ViewId: {
        FOLDERS: string;
        DOCS: string;
      };
      DocsViewMode: {
        LIST: string;
        GRID: string;
      };
      PickerBuilder: new () => {
        addView: (view: any) => any;
        setOAuthToken: (token: string) => any;
        setDeveloperKey: (key: string) => any;
        setTitle: (title: string) => any;
        setCallback: (callback: (data: any) => void) => any;
        build: () => any;
        setVisible: (visible: boolean) => void;
      };
      Action: {
        PICKED: string;
        CANCEL: string;
      };
    };
  };
  
  // File System Access API definitions
  showSaveFilePicker?: (options?: { 
    suggestedName?: string;
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<FileSystemFileHandle>;
}

// File System Access API interfaces
interface FileSystemFileHandle {
  createWritable: () => Promise<FileSystemWritableFileStream>;
  getFile: () => Promise<File>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write: (data: any) => Promise<void>;
  close: () => Promise<void>;
}