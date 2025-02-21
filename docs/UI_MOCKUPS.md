# UI Mockups

## 1. Main Chat Interface
```
+--------------------------------------------------------------+
|                         SheetGPT                              |
+------------------------+-------------------------------------+
| Conversations          |  Current Conversation               |
|------------------------|-------------------------------------|
| + New Conversation     |  Title: Sales Analysis Q1 2024     |
|                        |-------------------------------------|
| Recent:                |                                     |
| > Sales Analysis      →|  You: Analyze Q1 sales data        |
| > Customer Feedback    |                                     |
| > Marketing Stats      |  AI: Here's the analysis of Q1...  |
|                        |  [Table Preview]                    |
|                        |  • Total Sales: $1.2M              |
|                        |  • Growth: 15%                      |
|                        |                                     |
|                        |  You: Export this to sheets        |
|                        |                                     |
|                        +-------------------------------------|
|                        |  Message input...         [Send]    |
+------------------------+-------------------------------------+
```

## 2. Structured Data Panel (Right Sidebar)
```
+----------------------------------+
|   Structured Data       [×]      |
|----------------------------------|
| Status: Stored in Database       |
|----------------------------------|
| Preview:                         |
| +----------------------------+   |
| | Quarter | Sales  | Growth |   |
| |---------|--------|--------|   |
| | Q1 2024 | $1.2M  | 15%   |   |
| +----------------------------+   |
|                                 |
|----------------------------------|
| [Export to Sheets]              |
|                                 |
| Recent Exports:                 |
| • Yesterday, 3:45 PM            |
|   [Open in Sheets]              |
| • Jan 15, 2:30 PM              |
|   [Open in Sheets]              |
+----------------------------------+
```

## 3. Template Selection Modal
```
+------------------------------------------+
|   Select Export Template        [×]       |
|------------------------------------------|
| Available Templates:                      |
|                                          |
| ○ Default                                |
| ● Sales Report                           |
| ○ Financial Summary                      |
| ○ Custom Template...                     |
|------------------------------------------|
| Preview:                                 |
| +------------------------------------+   |
| |          Sales Report Q1           |   |
| |------------------------------------|   |
| | Product | Units | Revenue | Growth |   |
| |---------|-------|----------|-------|   |
| |  ...sample data preview...        |   |
| +------------------------------------+   |
|                                          |
| [Cancel]                    [Export]     |
+------------------------------------------+
```

## 4. Mobile Chat Interface
```
+------------------------+
|      SheetGPT     [≡] |
|------------------------|
| Sales Analysis Q1     |
|------------------------|
|                       |
| You: Analyze Q1 data  |
|                       |
| AI: Here's the...     |
| [Table Preview]       |
|                       |
| [View Structured Data]|
|                       |
|------------------------|
| Message...    [Send]  |
+------------------------+

// When "View Structured Data" is tapped:

+------------------------+
| Structured Data   [×] |
|------------------------|
| Status: Stored        |
|------------------------|
| [Preview Table]       |
|                       |
| [Export to Sheets]    |
|                       |
| Recent Exports:       |
| • Yesterday [Open]    |
| • Jan 15    [Open]   |
+------------------------+
```

## 5. Template Management Interface
```
+----------------------------------------------------------+
|   Template Management                                      |
|----------------------------------------------------------|
| Templates                    | Template Editor             |
|-------------------------    |----------------------------- |
| + New Template              | Name: Sales Report          |
|                            |                              |
| Active Templates:           | Header Format:              |
| > Sales Report           → | [Color] [Font] [Alignment]  |
| > Financial Summary        | Body Format:                 |
| > Marketing Report         | [Color] [Font] [Alignment]  |
|                            |                              |
|                            | Alternate Row Format:        |
|                            | [Color] [Font] [Alignment]  |
|                            |                              |
|                            | Preview:                     |
|                            | [Template Preview Area]      |
|                            |                              |
|                            | [Save] [Test] [Delete]      |
+----------------------------------------------------------+
```

## 6. Export History Dashboard
```
+----------------------------------------------------------+
|   Export History                                          |
|----------------------------------------------------------|
| Filters: [Date ▼] [Template ▼] [Status ▼]    [Search]    |
|----------------------------------------------------------|
| Date          | Template      | Status    | Actions       |
|---------------|---------------|-----------|---------------|
| Feb 21, 2024  | Sales Report  | Success   | [Open] [↻]   |
| Feb 20, 2024  | Custom        | Failed    | [Retry]      |
| Feb 19, 2024  | Financial     | Success   | [Open] [↻]   |
|----------------------------------------------------------|
| Statistics:                                               |
| • Total Exports: 45                                      |
| • Success Rate: 98%                                      |
| • Most Used Template: Sales Report                       |
+----------------------------------------------------------+
```

## 7. Settings Interface
```
+----------------------------------------------------------+
|   Settings                                                |
|----------------------------------------------------------|
| User Preferences         | Google Sheets Integration      |
|-------------------------|--------------------------------|
| □ Dark Mode             | Status: Connected              |
| □ Compact View          | Account: user@example.com      |
| □ Auto-export           | [Disconnect] [Reconnect]       |
|                         |                                |
| Default Template:       | Export Defaults:               |
| [Sales Report   ▼]     | □ Include Headers              |
|                         | □ Auto-format                  |
| Notifications:          | □ Share with me                |
| □ Export Complete       |                                |
| □ Export Failed         | Rate Limits:                   |
| □ New Templates         | Max Exports/Day: [50]          |
+----------------------------------------------------------+
```

## Color Scheme
```
Primary Colors:
- Background: #FFFFFF
- Primary: #2563EB
- Secondary: #64748B
- Accent: #3B82F6

Status Colors:
- Success: #22C55E
- Warning: #F59E0B
- Error: #EF4444
- Info: #3B82F6

Text Colors:
- Primary: #1F2937
- Secondary: #64748B
- Muted: #9CA3AF
```

## Typography
```
Font Hierarchy:
- Headings: Inter (600)
- Body: Inter (400)
- Monospace: JetBrains Mono (for code/data)

Sizes:
- H1: 24px
- H2: 20px
- H3: 18px
- Body: 16px
- Small: 14px
- Tiny: 12px
```

## 8. Enhanced Message Input Interface
```
+----------------------------------------------------------+
|                     Message Input                          |
|----------------------------------------------------------|
| [Normal Chat ▼]                                           |
|----------------------------------------------------------|
|  Message input...                                 [Send]   |
|----------------------------------------------------------|
| [+ Add Structure] [+ Upload File] [+ Draw Table]          |
+----------------------------------------------------------+

// When "Add Structure" is clicked:
+----------------------------------------------------------+
|                     Message Input                          |
|----------------------------------------------------------|
| [Structured Data ▼]                                       |
|----------------------------------------------------------|
| Request Type:                                             |
| ○ Table Data     ○ List Data    ○ Key-Value Pairs        |
|----------------------------------------------------------|
| Quick Formats:                                            |
| [Sales Report] [Financial Data] [Custom Format...]        |
|----------------------------------------------------------|
|  Message input...                                         |
|                                                          |
|  Example: "Create a sales report with columns for         |
|           Product, Units Sold, and Revenue"               |
|                                                          |
|  - Or paste table data directly:                         |
|    Product | Units | Revenue                             |
|    A       | 100   | 5000                               |
|    B       | 150   | 7500                               |
|----------------------------------------------------------|
| [Preview Structure]                         [Send]         |
+----------------------------------------------------------+

// When "Preview Structure" is clicked:
+----------------------------------------------------------+
|                    Structure Preview                       |
|----------------------------------------------------------|
| Detected Format:                                          |
| Table with 3 columns: Product, Units, Revenue             |
|----------------------------------------------------------|
| Preview:                                                  |
| +-------------------+                                     |
| | Product | Units | Revenue |                            |
| |---------|-------|---------|                            |
| | A       | 100   | $5,000  |                            |
| | B       | 150   | $7,500  |                            |
| +-------------------+                                     |
|----------------------------------------------------------|
| ✓ Save to database                                       |
| ✓ Make available for export                              |
|----------------------------------------------------------|
| [Modify Structure]                          [Confirm]      |
+----------------------------------------------------------+
```

## Structured Data Creation Methods

### 1. Natural Language Request
Users can simply describe what they want:
```
"Create a sales report with columns for Product, Units Sold, and Revenue"
```

### 2. Direct Table Input
Users can paste formatted table data:
```
Product | Units | Revenue
A       | 100   | 5000
B       | 150   | 7500
```

### 3. Quick Format Templates
Predefined structures for common data types:
- Sales Report (Product, Units, Revenue, Growth)
- Financial Data (Category, Amount, Date, Notes)
- Custom Format (User-defined columns)

### 4. File Upload
Support for:
- CSV files
- Excel files
- Text files with table data
- JSON data

### 5. Visual Table Builder
Interactive grid where users can:
- Define columns
- Set data types
- Add sample data
- Preview formatting

Would you like me to:
1. Create more detailed mockups for any specific interface?
2. Add interaction details for specific components?
3. Create a new file for component-specific styling details?
4. Move forward with implementing a specific interface? 

## 9. Data Management Interface
```
+----------------------------------------------------------+
|   Structured Data Management                [Export] [⋮]   |
|----------------------------------------------------------|
| Data Preview                 | Change History              |
|------------------------     |----------------------------- |
| [+ Add Column] [+ Add Row]  | Recent Changes:             |
|                             | • Column "Growth" added      |
| +----------------------+    | • Row 3 updated             |
| |Product|Units|Revenue|    | • Cell B2 changed           |
| |-------|------|--------|  |   [Revert] [Details]        |
| |Prod A |  100 | $1000  |  |                             |
| |Prod B |  150 | $1500  |  | [View All History]          |
| |Prod C |  200 | $2000  |  |                             |
| +----------------------+    |                             |
|                            |                             |
| Selected: B2               | Validation:                 |
| [Edit] [Delete] [Format]   | ✓ All data valid           |
|                            |                             |
|------------------------    |----------------------------- |
| Column Properties          | Row Operations              |
| Name: Units                | [Insert Above]              |
| Type: Number               | [Insert Below]              |
| Format: ###,###            | [Delete Selected]           |
| [Update] [Delete Column]   | [Bulk Import]              |
+----------------------------------------------------------+

Context Menu (⋮):
+------------------+
| Refresh Data     |
| Download CSV     |
| Import Data      |
| Clear All        |
| View Schema      |
+------------------+

Column Add Modal:
+-------------------------+
| Add New Column          |
|------------------------|
| Name: [Growth Rate   ] |
| Type: [Number      ▼] |
| Format: [Percentage ▼] |
| Formula: [            ]|
| Order: [End         ▼] |
|                       |
| [Cancel] [Add Column] |
+-------------------------+

Cell Edit Modal:
+-------------------------+
| Edit Cell              |
|------------------------|
| Current Value: 150     |
|                       |
| New Value: [150      ]|
| Format: [###,###    ▼]|
|                       |
| [Cancel] [Update]     |
+-------------------------+

Change History Modal:
+----------------------------------------------------------+
| Change History                                    [Export] |
|----------------------------------------------------------|
| Date       | Type    | Details           | User    |Action|
|-----------|---------|-------------------|---------|------|
| 2024-02-21| Column  | Added "Growth"    | John    |[↺]   |
| 2024-02-21| Row     | Updated Row 3     | Sarah   |[↺]   |
| 2024-02-21| Cell    | B2: 100 → 150     | John    |[↺]   |
|----------------------------------------------------------|
| Filters: [Date ▼] [Type ▼] [User ▼]        [Search]      |
+----------------------------------------------------------+
```

## Key Features in Data Management Interface:

### 1. Column Management
- Add new columns with type and format
- Edit column properties
- Delete columns with confirmation
- Reorder columns via drag-and-drop
- Formula support for calculated columns

### 2. Row Operations
- Add single rows
- Bulk row import
- Delete rows with confirmation
- Reorder rows via drag-and-drop
- Copy/paste support

### 3. Cell Editing
- Direct cell editing
- Format validation
- Type checking
- Formula support
- Multi-cell selection

### 4. Change History
- Chronological list of changes
- Revert capability
- User attribution
- Change details
- Export change log

### 5. Data Validation
- Real-time validation
- Error highlighting
- Type checking
- Format verification
- Custom validation rules

### 6. Import/Export
- CSV import/export
- Bulk data operations
- Template-based import
- Custom data mapping
- Error handling

### Mobile Considerations
```
+------------------------+
| Data Management    [≡] |
|------------------------|
| [+ Column] [+ Row]    |
|------------------------|
| Table View            |
| [Scroll horizontally] |
|------------------------|
| Selected: B2          |
| [Edit] [Delete]       |
|------------------------|
| Recent Changes:       |
| • Column added        |
| • Row updated         |
|------------------------|
| [More Actions...]     |
+------------------------+
```

## Data Management Features

### 1. Column Operations
- **Add Columns**
  - Append new columns to existing data
  - Specify data type and format
  - Optional automatic calculations
  - Support for formulas and references

- **Modify Columns**
  - Rename columns
  - Change data type
  - Update format settings
  - Reorder columns

- **Delete Columns**
  - With confirmation
  - Option to keep in history
  - Cascade delete handling

### 2. Row Operations
- **Add Rows**
  - Append new data
  - Bulk import
  - Copy existing rows

- **Edit Rows**
  - Inline editing
  - Bulk updates
  - Data validation

- **Delete Rows**
  - Single or multiple selection
  - Soft delete with recovery option
  - Audit trail

### 3. Data Validation
- Type checking
- Format validation
- Required fields
- Custom validation rules
- Error highlighting

### 4. Change History
- Track all modifications
- Revert changes
- Audit log
- Change notifications

### 5. Import/Export
- Import from various formats
- Export to Google Sheets
- Backup/restore
- Template support

### 6. Automatic Updates
- Formula recalculation
- Dependent field updates
- Real-time collaboration
- Conflict resolution 