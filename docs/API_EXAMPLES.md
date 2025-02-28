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
    "is_admin": false
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
    "is_admin": false
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

## Sports Database Endpoints

### 1. Get Leagues
```http
GET /api/v1/sports/leagues
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response (200 OK):
```json
[
    {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "National Football League",
        "sport": "Football",
        "country": "United States",
        "founded_year": 1920,
        "description": "Professional American football league"
    },
    {
        "id": "223e4567-e89b-12d3-a456-426614174001",
        "name": "National Basketball Association",
        "sport": "Basketball",
        "country": "United States",
        "founded_year": 1946,
        "description": "Professional basketball league"
    }
]
```

### 2. Create League
```http
POST /api/v1/sports/leagues
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "name": "Major League Soccer",
    "sport": "Soccer",
    "country": "United States",
    "founded_year": 1993,
    "description": "Professional soccer league in the US and Canada"
}
```

Response (201 Created):
```json
{
    "id": "323e4567-e89b-12d3-a456-426614174002",
    "name": "Major League Soccer",
    "sport": "Soccer",
    "country": "United States",
    "founded_year": 1993,
    "description": "Professional soccer league in the US and Canada"
}
```

### 3. Get Teams by League
```http
GET /api/v1/sports/teams?league_id=123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response (200 OK):
```json
[
    {
        "id": "423e4567-e89b-12d3-a456-426614174003",
        "name": "Kansas City Chiefs",
        "league_id": "123e4567-e89b-12d3-a456-426614174000",
        "city": "Kansas City",
        "state": "Missouri",
        "country": "United States",
        "stadium_id": "523e4567-e89b-12d3-a456-426614174004",
        "founded_year": 1960,
        "logo_url": "https://example.com/chiefs_logo.png",
        "primary_color": "#E31837",
        "secondary_color": "#FFB81C"
    },
    {
        "id": "623e4567-e89b-12d3-a456-426614174005",
        "name": "San Francisco 49ers",
        "league_id": "123e4567-e89b-12d3-a456-426614174000",
        "city": "San Francisco",
        "state": "California",
        "country": "United States",
        "stadium_id": "723e4567-e89b-12d3-a456-426614174006",
        "founded_year": 1946,
        "logo_url": "https://example.com/49ers_logo.png",
        "primary_color": "#AA0000",
        "secondary_color": "#B3995D"
    }
]
```

### 4. Batch Import Teams
```http
POST /api/v1/sports/batch/import
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "entity_type": "team",
    "data": [
        {
            "name": "Seattle Seahawks",
            "league_name": "National Football League",
            "city": "Seattle",
            "state": "Washington",
            "country": "United States",
            "stadium_name": "Lumen Field",
            "founded_year": 1974,
            "primary_color": "#002244",
            "secondary_color": "#69BE28"
        },
        {
            "name": "Los Angeles Rams",
            "league_name": "National Football League",
            "city": "Los Angeles",
            "state": "California",
            "country": "United States",
            "stadium_name": "SoFi Stadium",
            "founded_year": 1936,
            "primary_color": "#003594",
            "secondary_color": "#FFA300"
        }
    ]
}
```

Response (200 OK):
```json
{
    "success_count": 2,
    "error_count": 0,
    "errors": [],
    "created_entities": [
        {
            "id": "823e4567-e89b-12d3-a456-426614174007",
            "name": "Seattle Seahawks",
            "league_id": "123e4567-e89b-12d3-a456-426614174000",
            "city": "Seattle",
            "state": "Washington",
            "country": "United States",
            "stadium_id": "923e4567-e89b-12d3-a456-426614174008",
            "founded_year": 1974,
            "primary_color": "#002244",
            "secondary_color": "#69BE28"
        },
        {
            "id": "a23e4567-e89b-12d3-a456-426614174009",
            "name": "Los Angeles Rams",
            "league_id": "123e4567-e89b-12d3-a456-426614174000",
            "city": "Los Angeles",
            "state": "California",
            "country": "United States",
            "stadium_id": "b23e4567-e89b-12d3-a456-426614174010",
            "founded_year": 1936,
            "primary_color": "#003594",
            "secondary_color": "#FFA300"
        }
    ]
}
```

### 5. Get Available Fields for Entity Type
```http
GET /api/v1/sports/fields/team
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response (200 OK):
```json
{
    "fields": [
        {
            "name": "name",
            "type": "string",
            "required": true,
            "description": "Team name"
        },
        {
            "name": "league_id",
            "type": "uuid",
            "required": true,
            "description": "League ID",
            "relationship": true,
            "entity_type": "league"
        },
        {
            "name": "city",
            "type": "string",
            "required": true,
            "description": "City where the team is based"
        },
        {
            "name": "state",
            "type": "string",
            "required": false,
            "description": "State/province where the team is based"
        },
        {
            "name": "country",
            "type": "string",
            "required": true,
            "description": "Country where the team is based"
        },
        {
            "name": "stadium_id",
            "type": "uuid",
            "required": false,
            "description": "Stadium ID",
            "relationship": true,
            "entity_type": "stadium"
        },
        {
            "name": "founded_year",
            "type": "integer",
            "required": false,
            "description": "Year the team was founded"
        },
        {
            "name": "logo_url",
            "type": "string",
            "required": false,
            "description": "URL to the team's logo"
        },
        {
            "name": "primary_color",
            "type": "string",
            "required": false,
            "description": "Primary team color (hex code)"
        },
        {
            "name": "secondary_color",
            "type": "string",
            "required": false,
            "description": "Secondary team color (hex code)"
        }
    ]
}
```

### 6. Validate Entity Data
```http
POST /api/v1/sports/validate/team
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "name": "Dallas Cowboys",
    "league_name": "National Football League",
    "city": "Dallas",
    "state": "Texas",
    "country": "United States",
    "stadium_name": "AT&T Stadium",
    "founded_year": 1960
}
```

Response (200 OK):
```json
{
    "is_valid": true,
    "mapped_data": {
        "name": "Dallas Cowboys",
        "league_id": "123e4567-e89b-12d3-a456-426614174000",
        "city": "Dallas",
        "state": "Texas",
        "country": "United States",
        "stadium_id": "c23e4567-e89b-12d3-a456-426614174011",
        "founded_year": 1960
    },
    "errors": []
}
```

## Export Service Endpoints

### 1. Get Export Preview
```http
GET /api/v1/export/preview/123e4567-e89b-12d3-a456-426614174012?template_name=default
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response (200 OK):
```json
{
    "columns": ["Team", "City", "State", "Founded Year"],
    "sampleData": [
        ["Kansas City Chiefs", "Kansas City", "Missouri", 1960],
        ["San Francisco 49ers", "San Francisco", "California", 1946],
        ["Seattle Seahawks", "Seattle", "Washington", 1974],
        ["Los Angeles Rams", "Los Angeles", "California", 1936],
        ["Dallas Cowboys", "Dallas", "Texas", 1960]
    ]
}
```

### 2. Start Google OAuth Flow
```http
GET /api/v1/export/auth/google
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response: Redirects to Google OAuth consent screen

### 3. OAuth Callback
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

### 4. Check Authorization Status
```http
GET /api/v1/export/auth/status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response (200 OK):
```json
{
    "authenticated": true
}
```

### 5. Create New Spreadsheet
```http
POST /api/v1/export/sheets
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "title": "NFL Teams",
    "template_name": "sports_teams",
    "data_id": "123e4567-e89b-12d3-a456-426614174012"
}
```

Response (200 OK):
```json
{
    "spreadsheet_id": "1Xpfp4pRCC-6R_HlnXA7bQqrGbusi6q4gUUG93WJQqio",
    "title": "NFL Teams",
    "template": "sports_teams",
    "url": "https://docs.google.com/spreadsheets/d/1Xpfp4pRCC-6R_HlnXA7bQqrGbusi6q4gUUG93WJQqio/edit"
}
```

### 6. Update Spreadsheet Values
```http
PUT /api/v1/export/sheets/1Xpfp4pRCC-6R_HlnXA7bQqrGbusi6q4gUUG93WJQqio
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "range": "Sheet1!A1:B2",
    "values": [
        ["Team", "Founded Year"],
        ["Green Bay Packers", 1919]
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

### 7. Read Spreadsheet Values
```http
GET /api/v1/export/sheets/1Xpfp4pRCC-6R_HlnXA7bQqrGbusi6q4gUUG93WJQqio/values/Sheet1!A1:B2
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response (200 OK):
```json
{
    "status": "success",
    "values": [
        ["Team", "Founded Year"],
        ["Green Bay Packers", 1919]
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
    "sports_teams",
    "financial_summary"
]
```

### 2. Create Template
```http
POST /api/v1/export/templates
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "name": "sports_teams",
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
    "message": "Template 'sports_teams' created successfully"
}
```

### 3. Apply Template to Existing Spreadsheet
```http
POST /api/v1/export/sheets/1Xpfp4pRCC-6R_HlnXA7bQqrGbusi6q4gUUG93WJQqio/template
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "template_name": "sports_teams",
    "data_range": "A1:F20"
}
```

Response (200 OK):
```json
{
    "status": "success",
    "message": "Template 'sports_teams' applied successfully",
    "spreadsheet_id": "1Xpfp4pRCC-6R_HlnXA7bQqrGbusi6q4gUUG93WJQqio"
}
```

## Admin Endpoints

### 1. Clean Database
```http
POST /api/v1/admin/clean-database
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "preserve_users": true,
    "tables": ["structured_data", "sports_entities"]
}
```

Response (200 OK):
```json
{
    "success": true,
    "results": {
        "structured_data": "Success",
        "sports_entities": "Success"
    },
    "message": "Database cleaned successfully"
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
    "detail": "Resource not found"
}
```

### 3. Permission Error
```json
{
    "detail": "Not authorized to access this resource"
}
```

### 4. Validation Error
```json
{
    "detail": [
        {
            "loc": ["body", "name"],
            "msg": "field required",
            "type": "value_error.missing"
        }
    ]
}
```

### 5. Database Error
```json
{
    "detail": "Database operation failed"
} 