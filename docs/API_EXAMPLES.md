# API Examples

## Authentication Endpoints

### 1. User Registration
```http
POST /api/v1/auth/register
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "securePassword123"
}
```

Response (201 Created):
```json
{
    "email": "user@example.com",
    "is_active": true,
    "is_superuser": false
}
```

### 2. User Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "securePassword123"
}
```

Response (200 OK):
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 1800
}
```

### 3. Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response (200 OK):
```json
{
    "email": "user@example.com",
    "is_active": true,
    "is_superuser": false
}
```

## Chat Endpoints

### 1. Create New Conversation
```http
POST /api/v1/chat/conversations
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "title": "Data Analysis Discussion",
    "description": "Analyzing sales data for Q1 2024"
}
```

Response (201 Created):
```json
{
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Data Analysis Discussion",
    "description": "Analyzing sales data for Q1 2024",
    "user_id": "123e4567-e89b-12d3-a456-426614174001",
    "created_at": "2024-02-21T10:00:00Z",
    "updated_at": "2024-02-21T10:00:00Z",
    "messages": [],
    "meta_data": {}
}
```

### 2. List Conversations
```http
GET /api/v1/chat/conversations?skip=0&limit=10
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response (200 OK):
```json
{
    "items": [
        {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "title": "Data Analysis Discussion",
            "description": "Analyzing sales data for Q1 2024",
            "user_id": "123e4567-e89b-12d3-a456-426614174001",
            "created_at": "2024-02-21T10:00:00Z",
            "updated_at": "2024-02-21T10:00:00Z",
            "messages": [],
            "meta_data": {}
        }
    ],
    "total": 1,
    "skip": 0,
    "limit": 10
}
```

### 3. Get Specific Conversation
```http
GET /api/v1/chat/conversations/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response (200 OK):
```json
{
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Data Analysis Discussion",
    "description": "Analyzing sales data for Q1 2024",
    "user_id": "123e4567-e89b-12d3-a456-426614174001",
    "created_at": "2024-02-21T10:00:00Z",
    "updated_at": "2024-02-21T10:00:00Z",
    "messages": [
        {
            "id": "123e4567-e89b-12d3-a456-426614174002",
            "role": "user",
            "content": "Analyze this sales data and create a summary",
            "created_at": "2024-02-21T10:01:00Z",
            "updated_at": "2024-02-21T10:01:00Z",
            "meta_data": {}
        }
    ],
    "meta_data": {}
}
```

### 4. Send Message
```http
POST /api/v1/chat/conversations/123e4567-e89b-12d3-a456-426614174000/messages
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "role": "user",
    "content": "Analyze this sales data and create a summary",
    "structured_format": {
        "summary": "string",
        "key_metrics": {
            "total_sales": "number",
            "growth_rate": "number",
            "top_products": ["string"]
        }
    }
}
```

Response (200 OK):
```json
{
    "message": "Based on the sales data, I can provide the following analysis...",
    "structured_data": {
        "summary": "Q1 2024 showed strong growth in overall sales...",
        "key_metrics": {
            "total_sales": 1250000,
            "growth_rate": 15.3,
            "top_products": ["Product A", "Product B", "Product C"]
        }
    }
}
```

### 5. Update Conversation
```http
PATCH /api/v1/chat/conversations/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "title": "Q1 2024 Sales Analysis",
    "description": "Detailed analysis of Q1 2024 sales performance"
}
```

Response (200 OK):
```json
{
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Q1 2024 Sales Analysis",
    "description": "Detailed analysis of Q1 2024 sales performance",
    "user_id": "123e4567-e89b-12d3-a456-426614174001",
    "created_at": "2024-02-21T10:00:00Z",
    "updated_at": "2024-02-21T10:05:00Z",
    "messages": [...],
    "meta_data": {}
}
```

## Error Responses

### 1. Authentication Error
```json
{
    "detail": "Could not validate credentials"
}
```

### 2. Not Found Error
```json
{
    "detail": "Conversation not found"
}
```

### 3. Permission Error
```json
{
    "detail": "Not authorized to access this conversation"
}
```

### 4. Validation Error
```json
{
    "detail": [
        {
            "loc": ["body", "title"],
            "msg": "field required",
            "type": "value_error.missing"
        }
    ]
}
```

## Google Sheets Integration

### 1. Start OAuth Flow
```http
GET /api/v1/export/auth/google
```

Response: Redirects to Google OAuth consent screen

### 2. OAuth Callback
```http
GET /api/v1/export/auth/callback?code={auth_code}
```

Response (200 OK):
```json
{
    "status": "success",
    "message": "Google Sheets authorization successful"
}
```

### 3. Check Authorization Status
```http
GET /api/v1/export/auth/status
```

Response (200 OK):
```json
{
    "is_authorized": true
}
```

### 4. Create New Spreadsheet
```http
POST /api/v1/export/sheets
Content-Type: application/json

{
    "title": "Test Spreadsheet"
}
```

Response (200 OK):
```json
{
    "status": "success",
    "spreadsheet_id": "1Xpfp4pRCC-6R_HlnXA7bQqrGbusi6q4gUUG93WJQqio",
    "message": "Spreadsheet 'Test Spreadsheet' created successfully"
}
```

### 5. Update Spreadsheet Values
```http
PUT /api/v1/export/sheets/{spreadsheet_id}
Content-Type: application/json

{
    "range": "Sheet1!A1:B2",
    "values": [
        ["Name", "Value"],
        ["Test", "123"]
    ]
}
```

Response (200 OK):
```json
{
    "status": "success",
    "message": "Updated 4 cells"
}
```

### 6. Read Spreadsheet Values
```http
GET /api/v1/export/sheets/{spreadsheet_id}/values/Sheet1!A1:B2
```

Response (200 OK):
```json
{
    "status": "success",
    "values": [
        ["Name", "Value"],
        ["Test", "123"]
    ]
}
```

## Template Management

### 1. List Templates
```http
GET /api/v1/export/templates
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response (200 OK):
```json
[
    "default",
    "sales_report",
    "financial_summary"
]
```

### 2. Create Template
```http
POST /api/v1/export/templates
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "name": "sales_report",
    "header": {
        "backgroundColor": {
            "red": 0.2,
            "green": 0.2,
            "blue": 0.2
        },
        "textFormat": {
            "foregroundColor": {
                "red": 1.0,
                "green": 1.0,
                "blue": 1.0
            },
            "bold": true,
            "fontSize": 12
        }
    },
    "body": {
        "backgroundColor": {
            "red": 1.0,
            "green": 1.0,
            "blue": 1.0
        },
        "textFormat": {
            "foregroundColor": {
                "red": 0.0,
                "green": 0.0,
                "blue": 0.0
            },
            "fontSize": 11
        }
    },
    "alternateRow": {
        "backgroundColor": {
            "red": 0.95,
            "green": 0.95,
            "blue": 0.95
        }
    }
}
```

Response (200 OK):
```json
{
    "status": "success",
    "message": "Template 'sales_report' created successfully"
}
```

### 3. Create Spreadsheet with Template
```http
POST /api/v1/export/sheets
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "title": "Q1 2024 Sales Report",
    "template_name": "sales_report",
    "data": [
        ["Product", "Units Sold", "Revenue"],
        ["Product A", 100, 5000],
        ["Product B", 150, 7500],
        ["Product C", 200, 10000]
    ]
}
```

Response (200 OK):
```json
{
    "spreadsheet_id": "1Xpfp4pRCC-6R_HlnXA7bQqrGbusi6q4gUUG93WJQqio",
    "title": "Q1 2024 Sales Report",
    "template": "sales_report"
}
```

### 4. Apply Template to Existing Spreadsheet
```http
POST /api/v1/export/sheets/{spreadsheet_id}/template
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "template_name": "sales_report",
    "data_range": "A1:C4"
}
```

Response (200 OK):
```json
{
    "status": "success",
    "message": "Template 'sales_report' applied successfully",
    "spreadsheet_id": "1Xpfp4pRCC-6R_HlnXA7bQqrGbusi6q4gUUG93WJQqio"
}
``` 