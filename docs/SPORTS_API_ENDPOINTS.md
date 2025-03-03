# Sports Database API Endpoints

This document outlines the API endpoints for the sports database functionality.

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

### Brand Relationships

- `GET /api/v1/sports/brand-relationships` - Get all brand relationships
- `GET /api/v1/sports/brand-relationships/{id}` - Get a specific brand relationship by ID
- `POST /api/v1/sports/brand-relationships` - Create a new brand relationship
- `PUT /api/v1/sports/brand-relationships/{id}` - Update a brand relationship
- `DELETE /api/v1/sports/brand-relationships/{id}` - Delete a brand relationship

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
```

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
```

**Supported Operators**:
- String fields: "eq" (equals), "neq" (not equals), "contains", "startswith", "endswith"
- Number fields: "eq" (equals), "neq" (not equals), "gt" (greater than), "lt" (less than)
- Date fields: "eq" (equals), "neq" (not equals), "gt" (greater than), "lt" (less than)
- Boolean fields: "eq" (equals), "neq" (not equals)

**Example Request**:
```
GET /api/v1/sports/entities/team?filters=[{"field":"name","operator":"contains","value":"New York"},{"field":"founded_year","operator":"gt","value":1980}]&sort_by=name&sort_direction=asc&page=1&limit=10
```

This request will return teams with "New York" in their name that were founded after 1980, sorted by name in ascending order, and limited to 10 results per page.

## Batch Import

- `POST /api/v1/sports/batch/import` - Import multiple entities of the same type

## Field Mapping and Validation

- `GET /api/v1/sports/fields/{entity_type}` - Get available fields for an entity type
- `POST /api/v1/sports/validate/{entity_type}` - Validate entity data without saving

## Export Endpoints

- `POST /api/v1/export/sheets` - Export data to Google Sheets
- `GET /api/v1/export/preview/{data_id}` - Preview export data format
- `GET /api/v1/export/templates` - Get available export templates

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
```

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
```

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
```

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
```

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
```

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
```

### Get Available Fields for Entity Type

**Request:**
```http
GET /api/v1/sports/fields/team
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

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
```

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
```

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
```

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
```

**Not Found Error:**
```json
{
  "detail": "Resource not found"
}
```

**Permission Error:**
```json
{
  "detail": "Not authorized to access this resource"
}
```

**Database Error:**
```json
{
  "detail": "Database operation failed"
}
```

## Authentication

All endpoints require authentication using a JWT token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

To obtain a token, use the `/api/v1/auth/login` endpoint with valid credentials.

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
```

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
```

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
```

**Notes:**
- If a league name is provided instead of UUID, the system will:
  1. Look up the league by name
  2. Create a new league if it doesn't exist
  3. Use the resulting UUID
- Same behavior applies for stadium references
- The system maintains referential integrity while allowing flexible input 