# Sports Database API Endpoints

This document outlines the API endpoints for the sports database functionality.

> **PRODUCTION DEPLOYMENT**: The sports database API is deployed in production at `https://api.88gpts.com/api/v1/sports/` with comprehensive error handling, rate limiting, and cross-domain authentication. All production requests should use the base URL `https://api.88gpts.com` instead of relative paths.

## Production Environment Configuration

In production, all sports database API endpoints have the following characteristics:

- **Base URL**: `https://api.88gpts.com/api/v1/sports/`
- **Authentication**: JWT token required in Authorization header
- **Rate Limiting**: 100 requests per minute per authenticated user
- **CORS**: Configured to allow requests only from 88gpts.com domains
- **Caching**: GET requests for entity lists are cached for 5 minutes
- **Compression**: All responses are automatically compressed (gzip)
- **Error Handling**: Standardized error responses with proper HTTP status codes
- **Logging**: All requests are logged with unique request IDs for troubleshooting

- **Request Timeout**: 30-second timeout for all database operations

### Production Request Headers

When making requests to the production API, include these headers:

```http
Authorization: Bearer {jwt_token}
Origin: https://88gpts.com
Accept: application/json
Accept-Encoding: gzip, deflate
Content-Type: application/json
```text


## Entity Management Endpoints


### Leagues


- `GET /api/v1/sports/leagues` - Get all leagues
- `GET /api/v1/sports/leagues/{league_id}` - Get a specific league by ID
- `POST /api/v1/sports/leagues` - Create a new league
- `PUT /api/v1/sports/leagues/{league_id}` - Update a league
- `DELETE /api/v1/sports/leagues/{league_id}` - Delete a league

### Teams


- `GET /api/v1/sports/teams` - Get all teams
- `GET /api/v1/sports/teams/{team_id}` - Get a specific team by ID
- `POST /api/v1/sports/teams` - Create a new team
- `PUT /api/v1/sports/teams/{team_id}` - Update a team
- `DELETE /api/v1/sports/teams/{team_id}` - Delete a team
- `GET /api/v1/sports/teams?league_id={league_id}` - Get teams for a specific league

### Players


- `GET /api/v1/sports/players` - Get all players
- `GET /api/v1/sports/players/{player_id}` - Get a specific player by ID
- `POST /api/v1/sports/players` - Create a new player
- `PUT /api/v1/sports/players/{player_id}` - Update a player
- `DELETE /api/v1/sports/players/{player_id}` - Delete a player
- `GET /api/v1/sports/players?team_id={team_id}` - Get players for a specific team

### Games


- `GET /api/v1/sports/games` - Get all games
- `GET /api/v1/sports/games/{game_id}` - Get a specific game by ID
- `POST /api/v1/sports/games` - Create a new game
- `PUT /api/v1/sports/games/{game_id}` - Update a game
- `DELETE /api/v1/sports/games/{game_id}` - Delete a game

- `GET /api/v1/sports/games?team_id={team_id}` - Get games for a specific team
- `GET /api/v1/sports/games?league_id={league_id}` - Get games for a specific league

### Stadiums


- `GET /api/v1/sports/stadiums` - Get all stadiums

- `GET /api/v1/sports/stadiums/{stadium_id}` - Get a specific stadium by ID
- `POST /api/v1/sports/stadiums` - Create a new stadium
- `PUT /api/v1/sports/stadiums/{stadium_id}` - Update a stadium
- `DELETE /api/v1/sports/stadiums/{stadium_id}` - Delete a stadium

### Broadcast Companies


- `GET /api/v1/sports/broadcast-companies` - Get all broadcast companies
- `GET /api/v1/sports/broadcast-companies/{id}` - Get a specific broadcast company by ID
- `POST /api/v1/sports/broadcast-companies` - Create a new broadcast company
- `PUT /api/v1/sports/broadcast-companies/{id}` - Update a broadcast company
- `DELETE /api/v1/sports/broadcast-companies/{id}` - Delete a broadcast company

### Broadcast Rights


- `GET /api/v1/sports/broadcast-rights` - Get all broadcast rights
- `GET /api/v1/sports/broadcast-rights/{id}` - Get specific broadcast rights by ID
- `POST /api/v1/sports/broadcast-rights` - Create new broadcast rights
- `PUT /api/v1/sports/broadcast-rights/{id}` - Update broadcast rights
- `DELETE /api/v1/sports/broadcast-rights/{id}` - Delete broadcast rights

### Production Companies


- `GET /api/v1/sports/production-companies` - Get all production companies
- `GET /api/v1/sports/production-companies/{id}` - Get a specific production company by ID
- `POST /api/v1/sports/production-companies` - Create a new production company
- `PUT /api/v1/sports/production-companies/{id}` - Update a production company
- `DELETE /api/v1/sports/production-companies/{id}` - Delete a production company


### Production Services


- `GET /api/v1/sports/production-services` - Get all production services

- `GET /api/v1/sports/production-services/{id}` - Get a specific production service by ID
- `POST /api/v1/sports/production-services` - Create a new production service

- `PUT /api/v1/sports/production-services/{id}` - Update a production service

- `DELETE /api/v1/sports/production-services/{id}` - Delete a production service

### Brands


- `GET /api/v1/sports/brands` - Get all brands

- `GET /api/v1/sports/brands/{id}` - Get a specific brand by ID

- `POST /api/v1/sports/brands` - Create a new brand

- `PUT /api/v1/sports/brands/{id}` - Update a brand

- `DELETE /api/v1/sports/brands/{id}` - Delete a brand


> **Note**: The Brand model now includes `partner` and `partner_relationship` fields that allow direct relationship specification without requiring a separate brand relationship entity. Brand relationships are now managed directly through the Brand endpoints.

> **Important**: Brand Relationship endpoints have been removed. The functionality has been integrated into the Brand model with partner fields.

## Generic Entity Endpoints


### Get Entities

`GET /api/v1/sports/entities/{entity_type}`

Gets a paginated list of entities of a specific type.

**Query Parameters**:

- `page`: Page number (default: 1, min: 1)

- `limit`: Number of items per page (default: 50, min: 1, max: 100)

- `sort_by`: Field to sort by (default: "id")
- `sort_direction`: Sort direction ("asc" or "desc", default: "asc")
- `filters`: JSON string of filter configurations (optional)

**Response Format**:

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "string",
      ...
    }
  ],
  "total": 100,
  "page": 1,
  "page_size": 50,
  "total_pages": 2
}
```text


**Response Fields**:

- `items`: Array of entities for the current page
- `total`: Total number of entities matching the query
- `page`: Current page number

- `page_size`: Number of items per page

- `total_pages`: Total number of pages available

### Advanced Filtering


The `/api/v1/sports/entities/{entity_type}` endpoint supports advanced filtering capabilities:

**Query Parameters**:

- `filters`: JSON string of filter configurations
- `page`: Page number for pagination (default: 1)
- `limit`: Number of items per page (default: 50, max: 100)
- `sort_by`: Field to sort by (default: "id")

- `sort_direction`: Sort direction ("asc" or "desc", default: "asc")


**Filter Format**:

```json
[
  {
    "field": "name",
    "operator": "contains",
    "value": "New York"
  },
  {
    "field": "founded_year",
    "operator": "gt",
    "value": 1980
  }
]
```text


**Supported Operators**:

- String fields: "eq" (equals), "neq" (not equals), "contains", "startswith", "endswith"
- Number fields: "eq" (equals), "neq" (not equals), "gt" (greater than), "lt" (less than)
- Date fields: "eq" (equals), "neq" (not equals), "gt" (greater than), "lt" (less than)

- Boolean fields: "eq" (equals), "neq" (not equals)


**Example Request**:

```text
GET /api/v1/sports/entities/team?filters=[{"field":"name","operator":"contains","value":"New York"},{"field":"founded_year","operator":"gt","value":1980}]&sort_by=name&sort_direction=asc&page=1&limit=10
```text


This request will return teams with "New York" in their name that were founded after 1980, sorted by name in ascending order, and limited to 10 results per page.

## Batch Import


- `POST /api/v1/sports/batch/import` - Import multiple entities of the same type


## Field Mapping and Validation


- `GET /api/v1/sports/fields/{entity_type}` - Get available fields for an entity type

- `POST /api/v1/sports/validate/{entity_type}` - Validate entity data without saving

## Export Endpoints


### Google Sheets Export

`POST /api/v1/export/sheets`

Exports data to Google Sheets with advanced features for column selection and folder organization.

**Request Body:**

```json
{
  "data": "Array of data objects (required)",
  "sheet_name": "String name for the sheet (required)",
  "folder_id": "Google Drive folder ID (optional)",
  "folder_name": "Google Drive folder name to create/use (optional)",
  "visible_columns": ["Array of column keys to include (optional)"],
  "format": "Boolean to apply formatting (default: true)"
}
```text


**Parameters:**

- `data`: Array of objects to export

- `sheet_name`: Name for the Google Sheet

- `folder_id`: Specific Google Drive folder ID to export to

- `folder_name`: Folder name to export to (will be created if it doesn't exist)

- `visible_columns`: Array of column keys to include in export (omit to include all columns)

- `format`: Whether to apply formatting to the sheet (colors, column widths, etc.)


**Response:**

```json
{
  "success": true,
  "sheet_url": "https://docs.google.com/spreadsheets/d/1x2y3z...",
  "sheet_id": "1x2y3z...",
  "column_count": 10,
  "row_count": 250,
  "folder_id": "abcd1234...",
  "folder_url": "https://drive.google.com/drive/folders/abcd1234..."
}
```text


**Fallback CSV Response (when Google auth fails):**

```json
{
  "success": true,
  "format": "csv",
  "data": "CSV data as string",
  "filename": "export_20250326.csv"
}
```text


### Preview Export

`GET /api/v1/export/preview/{data_id}`

Preview how data will be formatted for export without actually exporting.

### Export Templates

`GET /api/v1/export/templates`

Get available export templates for different entity types.

## Request and Response Examples


### Create League


**Request:**

```http
POST /api/v1/sports/leagues
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "National Football League",
  "sport": "Football",
  "country": "United States",
  "founded_year": 1920,
  "description": "Professional American football league"
}
```text


**Response:**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "National Football League",
  "sport": "Football",
  "country": "United States",
  "founded_year": 1920,
  "description": "Professional American football league",
  "created_at": "2024-05-15T10:30:00Z",
  "updated_at": "2024-05-15T10:30:00Z"
}
```text


### Create Team


**Request:**

```http
POST /api/v1/sports/teams
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "Dallas Cowboys",
  "city": "Dallas",
  "state": "Texas",
  "country": "United States",
  "founded_year": 1960,
  "league_id": "123e4567-e89b-12d3-a456-426614174000",
  "stadium_id": "523e4567-e89b-12d3-a456-426614174004"
}
```text


**Response:**

```json
{
  "id": "423e4567-e89b-12d3-a456-426614174003",
  "name": "Dallas Cowboys",
  "city": "Dallas",
  "state": "Texas",
  "country": "United States",
  "founded_year": 1960,
  "league_id": "123e4567-e89b-12d3-a456-426614174000",
  "stadium_id": "523e4567-e89b-12d3-a456-426614174004",
  "created_at": "2024-05-15T11:15:00Z",
  "updated_at": "2024-05-15T11:15:00Z"
}
```text


### Batch Import Teams


**Request:**

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
```text


**Response:**

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
```text


### Get Available Fields for Entity Type


**Request:**

```http
GET /api/v1/sports/fields/team
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```text


**Response:**

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
```text


### Validate Entity Data


**Request:**

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
```text


**Response:**

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
```text


## Error Responses


**Validation Error:**

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
```text


**Not Found Error:**

```json
{
  "detail": "Resource not found"
}
```text


**Permission Error:**

```json
{
  "detail": "Not authorized to access this resource"
}
```text


**Database Error:**

```json
{
  "detail": "Database operation failed"
}
```text


## Authentication


All endpoints require authentication using a JWT token in the Authorization header:

```text
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```text


To obtain a token, use the `/api/v1/auth/login` endpoint with valid credentials.

### Cross-Domain Authentication in Production


In the production environment with separate domains for frontend (88gpts.com) and backend (api.88gpts.com), these authentication considerations apply:

1. **Token Storage**: JWT tokens are stored in localStorage or sessionStorage on the frontend
2. **CORS Configuration**: The backend is configured to accept requests from the frontend domain
3. **SameSite Cookies**: Cookies are configured with SameSite=None and Secure=true
4. **Token Refresh**: Automatic token refresh is implemented before expiration
5. **Credential Handling**: All requests include credentials with `{ credentials: 'include' }`
6. **Error Handling**: Authentication failures have specialized handling with automatic redirect to login
7. **Preflight Requests**: OPTIONS requests are handled properly with authentication headers

Example production authentication request:

```http
POST https://api.88gpts.com/api/v1/auth/login
Origin: https://88gpts.com
Content-Type: application/json
Accept: application/json

{
    "email": "user@example.com",
    "password": "securePassword123"
}
```text


Example token refresh in production:

```http
POST https://api.88gpts.com/api/v1/auth/refresh
Origin: https://88gpts.com
Content-Type: application/json
Accept: application/json
Authorization: Bearer {refresh_token}
```text


## Team Endpoints


### Create Team

`POST /api/v1/sports/teams`

Creates a new team. Supports both UUID and name-based references for leagues and stadiums.

**Request Body:**

```json
{
  "name": "string (required)",
  "league_id": "UUID or league name (required)",
  "stadium_id": "UUID or stadium name (optional)",
  "city": "string (required)",
  "state": "string (optional)",
  "country": "string (required)",
  "founded_year": "number (optional)"
}
```text


**Examples:**

Using names:

```json
{
  "name": "Utah Jazz",
  "league_id": "National Basketball Association",
  "stadium_id": "Vivint Arena",
  "city": "Salt Lake City",
  "state": "Utah",
  "country": "USA",
  "founded_year": 1974
}
```text


Using UUIDs:

```json
{
  "name": "Utah Jazz",
  "league_id": "123e4567-e89b-12d3-a456-426614174000",
  "stadium_id": "123e4567-e89b-12d3-a456-426614174001",
  "city": "Salt Lake City",
  "state": "Utah",
  "country": "USA",
  "founded_year": 1974
}
```text


**Notes:**

- If a league name is provided instead of UUID, the system will:
  1. Look up the league by name
  2. Create a new league if it doesn't exist
  3. Use the resulting UUID

- Same behavior applies for stadium references
- The system maintains referential integrity while allowing flexible input
