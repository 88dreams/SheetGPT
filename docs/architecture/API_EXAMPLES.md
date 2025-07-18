# API Examples

> **PRODUCTION DEPLOYMENT**: The API is deployed in production at [api.88gpts.com](https://api.88gpts.com) with the frontend application at [88gpts.com/sheetgpt](https://88gpts.com/sheetgpt). All API requests in production should use the `https://api.88gpts.com` base URL with proper authentication.

## Production Configuration

These examples use relative URLs but in production, the full URL should be used:

```sh
Development: /api/v1/auth/login
Production: https://api.88gpts.com/api/v1/auth/login
```http

Production environment features:

- **Cross-Domain Authentication**: JWT tokens work across domains
- **Rate Limiting**: API endpoints have request rate limits
- **HTTPS Only**: All requests must use HTTPS
- **Enhanced Logging**: Detailed request logging with unique request IDs
- **Response Compression**: Automatic gzip compression for large responses
- **CORS Configuration**: Specific origin allowlist with proper preflight handling

### Environment-Specific Headers

Production requests should include these additional headers:

```http
Origin: https://88gpts.com
X-Request-Source: frontend
Accept-Encoding: gzip, deflate

```http

## Authentication Endpoints

### 1. User Registration

```http
POST /api/v1/auth/register
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "securePassword123"
}

```http


Response (201 Created):

```json
{
    "email": "user@example.com",
    "is_active": true,
    "is_admin": false
}

```http

### 2. User Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "securePassword123"
}
```http
Response (200 OK):

```json
{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 1800
}

```http

### 3. Get Current User

```http
GET /api/v1/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

```http

Response (200 OK):

```json
{
    "email": "user@example.com",
    "is_active": true,
    "is_admin": false
}

```http

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

```http

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

```http

### 2. List Conversations

```http
GET /api/v1/chat/conversations?skip=0&limit=10
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

```http

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

```http



### 3. Get Specific Conversation



```http
GET /api/v1/chat/conversations/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

```http



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

```http



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

```http



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

```http



### 5. Update Conversation



```http
PATCH /api/v1/chat/conversations/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "title": "Q1 2024 Sales Analysis",
    "description": "Detailed analysis of Q1 2024 sales performance"
}

```http



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

```http



## Sports Database Endpoints



### 1. Get Leagues



```http
GET /api/v1/sports/leagues
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

```http



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

```http



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

```http



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

```http



### 3. Get Teams by League



```http
GET /api/v1/sports/teams?league_id=123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

```http



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

```http



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

```http



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

```http



### 5. Get Available Fields for Entity Type



```http
GET /api/v1/sports/fields/team
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

```http



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

```http



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

```http



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

```http



## Export Service Endpoints



### 1. Get Export Preview



```http
GET /api/v1/export/preview/123e4567-e89b-12d3-a456-426614174012?template_name=default
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

```http



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

```http



### 2. Start Google OAuth Flow



```http
GET /api/v1/export/auth/google
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

```http



Response: Redirects to Google OAuth consent screen

### 3. OAuth Callback



```http
GET /api/v1/export/auth/callback?code={auth_code}

```http



Response (200 OK):

```json
{
    "status": "success",
    "message": "Google Sheets authorization successful"
}

```http



### 4. Check Authorization Status



```http
GET /api/v1/export/auth/status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

```http



Response (200 OK):

```json
{
    "authenticated": true
}

```http



### 5. Create New Spreadsheet



```http
POST /api/v1/export/sheets
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "data": [
        {
            "name": "Kansas City Chiefs",
            "city": "Kansas City",
            "state": "Missouri",
            "founded_year": 1960
        },
        {
            "name": "San Francisco 49ers",
            "city": "San Francisco",
            "state": "California",
            "founded_year": 1946
        }
    ],
    "sheet_name": "NFL Teams",
    "visible_columns": ["name", "city", "state", "founded_year"],
    "format": true,
    "folder_name": "Sports Database Exports"
}

```http



Response (200 OK):

```json
{
    "success": true,
    "sheet_url": "https://docs.google.com/spreadsheets/d/1Xpfp4pRCC-6R_HlnXA7bQqrGbusi6q4gUUG93WJQqio/edit",
    "sheet_id": "1Xpfp4pRCC-6R_HlnXA7bQqrGbusi6q4gUUG93WJQqio",
    "column_count": 4,
    "row_count": 3,
    "folder_id": "1Y2Z3456-abcdef",
    "folder_url": "https://drive.google.com/drive/folders/1Y2Z3456-abcdef"
}

```http



### 5a. Export with Specific Folder ID



```http
POST /api/v1/export/sheets
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "data": [{...}, {...}],
    "sheet_name": "NFL Teams 2025",
    "folder_id": "1Y2Z3456-abcdef",
    "visible_columns": ["name", "city", "state", "founded_year", "league_sport"]
}

```http



### 5b. Export with CSV Fallback (Authentication Error Response)



```json
{
    "success": true,
    "format": "csv",
    "data": "name,city,state,founded_year\nKansas City Chiefs,Kansas City,Missouri,1960\nSan Francisco 49ers,San Francisco,California,1946",
    "filename": "NFL_Teams_20250326.csv"
}

```http



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

```http



Response (200 OK):

```json
{
    "status": "success",
    "message": "Updated 4 cells"
}

```http



### 7. Read Spreadsheet Values



```http
GET /api/v1/export/sheets/1Xpfp4pRCC-6R_HlnXA7bQqrGbusi6q4gUUG93WJQqio/values/Sheet1!A1:B2
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

```http



Response (200 OK):

```json
{
    "status": "success",
    "values": [
        ["Team", "Founded Year"],
        ["Green Bay Packers", 1919]
    ]
}

```http



## Template Management



### 1. List Templates



```http
GET /api/v1/export/templates
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

```http



Response (200 OK):

```json
[
    "default",
    "sports_teams",
    "financial_summary"
]

```http



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

```http



Response (200 OK):

```json
{
    "status": "success",
    "message": "Template 'sports_teams' created successfully"
}

```http



### 3. Apply Template to Existing Spreadsheet



```http
POST /api/v1/export/sheets/1Xpfp4pRCC-6R_HlnXA7bQqrGbusi6q4gUUG93WJQqio/template
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
    "template_name": "sports_teams",
    "data_range": "A1:F20"
}

```http



Response (200 OK):

```json
{
    "status": "success",
    "message": "Template 'sports_teams' applied successfully",
    "spreadsheet_id": "1Xpfp4pRCC-6R_HlnXA7bQqrGbusi6q4gUUG93WJQqio"
}

```http



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

```http



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

```http



## Database Management Endpoints (Updated/New Examples)



### Query Database (NLQ or SQL)



```http
POST /api/v1/db-management/query
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
    "query": "Show all leagues in the sport of Football",
    "natural_language": true,
    "translate_only": false
}

```http


Response (200 OK):

```json
{
    "success": true,
    "results": [
        {"id": "uuid-for-nfl", "name": "National Football League", "sport": "Football", ...},
        {"id": "uuid-for-ncaaf", "name": "NCAA Division I football", "sport": "Football", ...}
    ],
    "generated_sql": "SELECT leagues.id, leagues.name, leagues.sport FROM leagues WHERE LOWER(leagues.sport) = LOWER('Football') AND leagues.deleted_at IS NULL ORDER BY leagues.name LIMIT 100"
}

```http



### Translate NLQ to SQL Only



```http
POST /api/v1/db-management/query
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
    "query": "Which teams are in the SEC?",
    "natural_language": true,
    "translate_only": true
}

```http


Response (200 OK):

```json
{
    "success": true,
    "results": [],
    "generated_sql": "SELECT t.id, t.name AS team_name, l.name AS league_name, dc.name AS conference_name FROM teams t JOIN leagues l ON t.league_id = l.id JOIN divisions_conferences dc ON t.division_conference_id = dc.id WHERE dc.name ILIKE 'SEC' AND t.deleted_at IS NULL AND l.deleted_at IS NULL AND dc.deleted_at IS NULL ORDER BY t.name LIMIT 100"
}

```http



### Get Database Schema Summary (for UI Helpers)



```http
GET /api/v1/db-management/schema-summary
Authorization: Bearer <your_jwt_token>

```http


Response (200 OK):

```json
{
    "tables": [
        {
            "name": "leagues",
            "description": "Stores information about sports leagues...",
            "columns": [
                {
                    "name": "id",
                    "dataType": "UUID",
                    "description": "Unique identifier for the league.",
                    "isFilterable": false,
                    "isRelationalId": false,
                    "relatedTable": null
                },
                {
                    "name": "name",
                    "dataType": "VARCHAR",
                    "description": "Full name of the league...",
                    "isFilterable": true,
                    "isRelationalId": false,
                    "relatedTable": null
                }
                // ... other columns for leagues
            ]
        },
        {
            "name": "teams",
            "description": "Stores information about sports teams...",
            "columns": [
                // ... columns for teams
            ]
        }
        // ... other tables
    ]
}

```http



### Get Database Statistics (Admin)



```http
GET /api/v1/db-management/stats
Authorization: Bearer <admin_jwt_token>

```http


Response (200 OK):

```json
{
    "total_leagues": 25,
    "total_teams": 500,
    // ... other stats
}

```http



## Error Responses



### 1. Authentication Error



```json
{
    "detail": "Could not validate credentials"
}

```http



### 2. Not Found Error



```json
{
    "detail": "Resource not found"
}

```http



### 3. Permission Error



```json
{
    "detail": "Not authorized to access this resource"
}

```http



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

```http



### 5. Database Error



```json
{
    "detail": "Database operation failed"
}
