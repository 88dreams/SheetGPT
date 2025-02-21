# Web Interface Implementation

## Overview
SheetGPT's web interface provides a user-friendly way to interact with ChatGPT and manage Google Sheets exports. The interface is built using React with TypeScript for type safety and Tailwind CSS for styling.

## Technology Stack
- **Frontend Framework**: React 18
- **Type System**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query + Context
- **UI Components**: Headless UI + Heroicons
- **API Client**: Fetch API
- **Router**: React Router v6
- **Build Tool**: Vite

## Directory Structure
```
src/frontend/
├── components/          # React components
│   ├── auth/           # Authentication components
│   │   ├── Login.tsx
│   │   └── Register.tsx
│   ├── chat/           # Chat interface components
│   │   ├── ConversationList.tsx
│   │   ├── MessageThread.tsx
│   │   └── InputBox.tsx
│   ├── data/           # Data management components
│   │   ├── DataGrid.tsx
│   │   ├── ColumnManager.tsx
│   │   └── RowManager.tsx
│   ├── export/         # Export components
│   │   ├── TemplateSelector.tsx
│   │   └── ExportPreview.tsx
│   ├── Layout.tsx      # Main layout component
│   └── Navbar.tsx      # Navigation component
├── hooks/              # Custom React hooks
│   ├── useAuth.ts      # Authentication hook
│   ├── useChat.ts      # Chat management hook
│   └── useData.ts      # Data management hook
├── pages/              # Page components
│   ├── Login.tsx       # Login page
│   ├── Register.tsx    # Registration page
│   └── Chat.tsx        # Main chat page
└── utils/              # Utility functions
    ├── api.ts          # API client
    └── helpers.ts      # Helper functions
```

## Implemented Features

### Authentication
- [x] User registration with email and password
- [x] User login with JWT token
- [x] Protected route handling
- [x] Automatic token refresh
- [x] Logout functionality

### Layout and Navigation
- [x] Responsive navigation bar
- [x] Protected route wrapper
- [x] Loading states
- [x] Error handling

### Components
1. **Navbar**
   - Dynamic navigation based on auth state
   - Mobile-responsive design
   - User status indication

2. **Layout**
   - Container layout with proper spacing
   - Responsive design
   - Content organization

3. **Authentication Forms**
   - Form validation
   - Error messaging
   - Loading states
   - Redirect handling

## Planned Features

### Chat Interface
- [ ] Conversation list with search
- [ ] Real-time message updates
- [ ] Message formatting
- [ ] Command suggestions
- [ ] Structured data preview

### Data Management
- [ ] Data grid with sorting and filtering
- [ ] Column type management
- [ ] Formula support
- [ ] Row operations
- [ ] Change history

### Export Integration
- [ ] Template browser
- [ ] Export configuration
- [ ] Preview functionality
- [ ] Progress tracking

## State Management
- Authentication state using Context
- API state using React Query
- Form state using local state
- Navigation state using React Router

## Styling
- Consistent color scheme
- Responsive design patterns
- Component-specific styles
- Dark mode support (planned)

## Error Handling
- Form validation errors
- API error responses
- Network error handling
- Fallback UI components

## Performance Considerations
- Code splitting
- Lazy loading
- Memoization
- Debounced inputs
- Optimistic updates

## Key Features

### 1. Authentication Flow
- Login/Register forms with validation
- JWT token management
- Protected route handling
- Session persistence
- Password reset flow

### 2. Chat Interface
- Real-time message display
- Markdown rendering for responses
- Code syntax highlighting
- Structured data preview panel
- Conversation history
- New conversation creation
- Conversation search/filter

### 3. Google Sheets Integration
- OAuth authorization flow
- Template selection interface
- Data preview before export
- Export progress tracking
- Sheet link sharing
- Template management

## Component Specifications

### ChatWindow Component
```typescript
interface ChatWindowProps {
  conversationId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversationId }) => {
  // State management for messages and structured data
  // Real-time updates handling
  // Export functionality
};
```

### Message Input Component
```typescript
interface MessageInputProps {
  onSend: (message: string) => Promise<void>;
  isLoading: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSend, isLoading }) => {
  // Message composition
  // File attachment handling
  // Loading state management
};
```

### Export Dialog Component
```typescript
interface ExportDialogProps {
  structuredData: StructuredData;
  onExport: (template: string) => Promise<void>;
}

const ExportDialog: React.FC<ExportDialogProps> = ({ structuredData, onExport }) => {
  // Template selection
  // Data preview
  // Export confirmation
};
```

## API Integration

### Authentication Service
```typescript
export const authService = {
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (userData: RegisterData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string>;
};
```

### Chat Service
```typescript
export const chatService = {
  createConversation: (title: string) => Promise<Conversation>;
  sendMessage: (conversationId: string, message: ChatMessage) => Promise<MessageResponse>;
  getConversations: () => Promise<Conversation[]>;
  getMessages: (conversationId: string) => Promise<Message[]>;
};
```

### Sheets Service
```typescript
export const sheetsService = {
  authorize: () => void;  // Redirects to Google OAuth
  exportToSheet: (data: StructuredData) => Promise<SheetResponse>;
  getTemplates: () => Promise<Template[]>;
  createTemplate: (template: TemplateData) => Promise<Template>;
};
```

## User Interface Flows

### 1. New Conversation Flow
1. User clicks "New Conversation"
2. Enters conversation title
3. ChatWindow component is initialized
4. Message input is focused
5. User starts chatting

### 2. Export Flow
1. AI response includes structured data
2. Structured data preview appears
3. User clicks "Export to Sheets"
4. Template selection dialog opens
5. User previews and confirms export
6. Export progress is shown
7. Success message with sheet link

### 3. Template Management Flow
1. User accesses template management
2. Views existing templates
3. Creates/modifies templates
4. Sets default templates
5. Tests template with sample data

## Development Phases

### Phase 1: Core Setup
- Project initialization with Vite
- Basic routing setup
- Authentication implementation
- Component library setup

### Phase 2: Chat Interface
- Basic chat functionality
- Message rendering
- Structured data handling
- Real-time updates

### Phase 3: Sheets Integration
- Google OAuth flow
- Export functionality
- Template management
- Export status tracking

### Phase 4: Polish & Enhancement
- Error handling
- Loading states
- Animations
- Responsive design
- Performance optimization

## Testing Strategy
- Unit tests for components
- Integration tests for API services
- End-to-end tests for critical flows
- Performance testing
- Cross-browser testing

## Deployment Considerations
- Environment configuration
- Build optimization
- CDN setup
- API endpoint configuration
- Analytics integration
- Error tracking setup

## Future Enhancements
- Collaborative features
- Real-time sheet updates
- Advanced template designer
- Data visualization
- Keyboard shortcuts
- Mobile optimization

## Data Flow UI

### Structured Data Handling

#### 1. Chat Interface with Data Preview
```typescript
interface StructuredDataPanel {
  data: StructuredData;
  status: 'stored' | 'exporting' | 'exported';
  lastExport?: {
    timestamp: string;
    sheetUrl?: string;
  };
}
```

- Split screen layout:
  ```
  +------------------------+------------------+
  |                       |                  |
  |    Chat Messages      | Structured Data  |
  |                       |    Preview       |
  |                       |                  |
  |                       | [Export Button]  |
  |                       |                  |
  +------------------------+------------------+
  |     Message Input                        |
  +-------------------------------------------+
  ```

#### 2. Structured Data States
- **Initial Storage**:
  - Data preview appears in right panel
  - "Stored in Database" indicator
  - Export to Sheets button enabled

- **During Export**:
  - Export progress indicator
  - Template selection modal
  - Cancel export option

- **After Export**:
  - Success confirmation
  - Google Sheets link
  - Re-export option
  - Export history

### Export Management Interface

#### 1. Template Selection Modal
```typescript
interface TemplateSelectionModal {
  structuredData: StructuredData;
  templates: Template[];
  onSelect: (template: Template) => void;
  onPreview: (data: StructuredData, template: Template) => void;
}
```

- Features:
  - Template preview with data
  - Custom template creation
  - Default template selection
  - Recently used templates

#### 2. Export History
```typescript
interface ExportHistory {
  structuredDataId: string;
  exports: {
    timestamp: string;
    sheetUrl: string;
    template: string;
    status: string;
  }[];
}
```

- Per-conversation export log
- Quick re-export options
- Export status tracking
- Error history

### Component Updates

#### 1. ChatWindow Component (Updated)
```typescript
interface ChatWindowProps {
  conversationId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversationId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [structuredData, setStructuredData] = useState<StructuredData[]>([]);
  const [activeDataPanel, setActiveDataPanel] = useState<string | null>(null);

  // Handle new structured data
  const handleNewStructuredData = (data: StructuredData) => {
    setStructuredData(prev => [...prev, data]);
    setActiveDataPanel(data.id);
  };

  // Handle export request
  const handleExport = async (dataId: string) => {
    const data = structuredData.find(d => d.id === dataId);
    if (data) {
      const template = await showTemplateModal(data);
      if (template) {
        await exportToSheets(data, template);
      }
    }
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1 overflow-y-auto">
        <MessageList 
          messages={messages} 
          onStructuredDataClick={setActiveDataPanel} 
        />
        <MessageInput />
      </div>
      {activeDataPanel && (
        <StructuredDataPanel
          data={structuredData.find(d => d.id === activeDataPanel)}
          onExport={handleExport}
        />
      )}
    </div>
  );
};
```

#### 2. StructuredDataPanel Component (New)
```typescript
interface StructuredDataPanelProps {
  data: StructuredData;
  onExport: (dataId: string) => Promise<void>;
}

const StructuredDataPanel: React.FC<StructuredDataPanelProps> = ({ data, onExport }) => {
  const [exportStatus, setExportStatus] = useState<ExportStatus>('stored');
  const [exportHistory, setExportHistory] = useState<ExportRecord[]>([]);

  return (
    <div className="w-1/3 border-l p-4">
      <div className="flex justify-between items-center">
        <h3>Structured Data</h3>
        <StatusBadge status={exportStatus} />
      </div>
      
      <DataPreview data={data} />
      
      <ExportControls
        onExport={() => onExport(data.id)}
        status={exportStatus}
      />
      
      {exportHistory.length > 0 && (
        <ExportHistoryList exports={exportHistory} />
      )}
    </div>
  );
};
```

#### 3. ExportControls Component (New)
```typescript
interface ExportControlsProps {
  onExport: () => Promise<void>;
  status: ExportStatus;
}

const ExportControls: React.FC<ExportControlsProps> = ({ onExport, status }) => {
  return (
    <div className="mt-4">
      <Button
        onClick={onExport}
        disabled={status === 'exporting'}
        variant="primary"
      >
        {status === 'stored' && 'Export to Sheets'}
        {status === 'exporting' && 'Exporting...'}
        {status === 'exported' && 'Re-export'}
      </Button>
      
      {status === 'exported' && (
        <LinkButton
          href={lastExport.sheetUrl}
          target="_blank"
          variant="secondary"
        >
          Open in Sheets
        </LinkButton>
      )}
    </div>
  );
};
```

### User Experience Flows

#### 1. Structured Data Creation
1. User sends message requesting structured data
2. AI responds with both conversation and structured format
3. Right panel automatically opens with data preview
4. "Stored" status indicator appears
5. Export options become available

#### 2. Export Process
1. User clicks "Export to Sheets"
2. Template selection modal appears
3. User selects or creates template
4. Preview of formatted data shown
5. User confirms export
6. Progress indicator shows export status
7. Success message appears with sheet link
8. Export history updates

#### 3. Historical Access
1. User can view previous structured data from conversation
2. Export history shows all previous exports
3. Quick re-export option available
4. Links to all exported sheets maintained

### Error Handling

#### 1. Storage Errors
- Database storage failure notifications
- Retry options for failed storage
- Temporary local storage backup

#### 2. Export Errors
- Google Sheets API error handling
- Authentication renewal prompts
- Export retry mechanisms
- Error logs for debugging

### Mobile Considerations

#### 1. Responsive Layout
- Collapsible data panel on mobile
- Touch-friendly controls
- Simplified template selection
- Optimized data preview

#### 2. Progressive Enhancement
- Basic functionality without advanced features
- Reduced animation on mobile
- Simplified export process
- Mobile-optimized sheet links 