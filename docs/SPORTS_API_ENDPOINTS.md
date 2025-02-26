# Sports Database API Endpoints

This document outlines the API endpoints required for the sports database functionality.

## Entity Management Endpoints

### Leagues

- `GET /api/sports/leagues` - Get all leagues
- `GET /api/sports/leagues/{id}` - Get a specific league by ID
- `POST /api/sports/leagues` - Create a new league
- `PUT /api/sports/leagues/{id}` - Update a league
- `DELETE /api/sports/leagues/{id}` - Delete a league
- `GET /api/sports/leagues/{id}/teams` - Get teams for a specific league

### Teams

- `GET /api/sports/teams` - Get all teams
- `GET /api/sports/teams/{id}` - Get a specific team by ID
- `POST /api/sports/teams` - Create a new team
- `PUT /api/sports/teams/{id}` - Update a team
- `DELETE /api/sports/teams/{id}` - Delete a team
- `GET /api/sports/teams/{id}/players` - Get players for a specific team
- `GET /api/sports/teams/{id}/games` - Get games for a specific team

### Players

- `GET /api/sports/players` - Get all players
- `GET /api/sports/players/{id}` - Get a specific player by ID
- `POST /api/sports/players` - Create a new player
- `PUT /api/sports/players/{id}` - Update a player
- `DELETE /api/sports/players/{id}` - Delete a player

### Games

- `GET /api/sports/games` - Get all games
- `GET /api/sports/games/{id}` - Get a specific game by ID
- `POST /api/sports/games` - Create a new game
- `PUT /api/sports/games/{id}` - Update a game
- `DELETE /api/sports/games/{id}` - Delete a game

### Stadiums

- `GET /api/sports/stadiums` - Get all stadiums
- `GET /api/sports/stadiums/{id}` - Get a specific stadium by ID
- `POST /api/sports/stadiums` - Create a new stadium
- `PUT /api/sports/stadiums/{id}` - Update a stadium
- `DELETE /api/sports/stadiums/{id}` - Delete a stadium
- `GET /api/sports/stadiums/{id}/games` - Get games for a specific stadium

### Broadcast Rights

- `GET /api/sports/broadcast` - Get all broadcast rights
- `GET /api/sports/broadcast/{id}` - Get specific broadcast rights by ID
- `POST /api/sports/broadcast` - Create new broadcast rights
- `PUT /api/sports/broadcast/{id}` - Update broadcast rights
- `DELETE /api/sports/broadcast/{id}` - Delete broadcast rights

### Production Services

- `GET /api/sports/production` - Get all production services
- `GET /api/sports/production/{id}` - Get a specific production service by ID
- `POST /api/sports/production` - Create a new production service
- `PUT /api/sports/production/{id}` - Update a production service
- `DELETE /api/sports/production/{id}` - Delete a production service

### Brand Relationships

- `GET /api/sports/brand` - Get all brand relationships
- `GET /api/sports/brand/{id}` - Get a specific brand relationship by ID
- `POST /api/sports/brand` - Create a new brand relationship
- `PUT /api/sports/brand/{id}` - Update a brand relationship
- `DELETE /api/sports/brand/{id}` - Delete a brand relationship

## Query Endpoints

- `GET /api/sports/entities/{type}` - Get entities of a specific type
- `GET /api/sports/entities/{type}/with-relationships` - Get entities with their relationships
- `GET /api/sports/search/{type}` - Search entities of a specific type

## Export Endpoints

- `POST /api/sports/export` - Export selected entities to Google Sheets
- `GET /api/sports/export/templates` - Get available export templates
- `POST /api/sports/export/preview` - Preview export data format

## Request and Response Examples

### Create League

**Request:**
```json
POST /api/sports/leagues
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
  "id": "league-123",
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
```json
POST /api/sports/teams
{
  "name": "Dallas Cowboys",
  "city": "Dallas",
  "state": "Texas",
  "country": "United States",
  "founded_year": 1960,
  "league_id": "league-123",
  "stadium_id": "stadium-456"
}
```

**Response:**
```json
{
  "id": "team-789",
  "name": "Dallas Cowboys",
  "city": "Dallas",
  "state": "Texas",
  "country": "United States",
  "founded_year": 1960,
  "league_id": "league-123",
  "stadium_id": "stadium-456",
  "created_at": "2024-05-15T11:15:00Z",
  "updated_at": "2024-05-15T11:15:00Z"
}
```

### Export Entities

**Request:**
```json
POST /api/sports/export
{
  "entity_type": "team",
  "entity_ids": ["team-789", "team-790", "team-791"],
  "include_relationships": true,
  "template_id": "team-roster-template",
  "sheet_title": "NFL Teams 2024"
}
```

**Response:**
```json
{
  "export_id": "export-123",
  "status": "processing",
  "sheet_url": null,
  "estimated_completion_time": "2024-05-15T11:20:00Z"
}
```

## Error Responses

**Validation Error:**
```json
{
  "status_code": 400,
  "error": "validation_error",
  "message": "Validation failed",
  "details": {
    "name": ["This field is required"],
    "founded_year": ["Value must be a positive integer"]
  }
}
```

**Not Found Error:**
```json
{
  "status_code": 404,
  "error": "not_found",
  "message": "Entity not found",
  "details": {
    "entity_id": "team-999",
    "entity_type": "team"
  }
}
```

**Relationship Error:**
```json
{
  "status_code": 400,
  "error": "relationship_error",
  "message": "Invalid relationship",
  "details": {
    "field": "league_id",
    "value": "league-999",
    "reason": "Referenced league does not exist"
  }
}
``` 