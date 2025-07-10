from pydantic import BaseModel, Field, validator, model_validator
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
from datetime import date, datetime

# Base schemas for League
class LeagueBase(BaseModel):
    name: str
    sport: str
    country: str
    nickname: Optional[str] = None
    broadcast_start_date: Optional[date] = None
    broadcast_end_date: Optional[date] = None
    tags: Optional[List[str]] = None

class LeagueCreate(LeagueBase):
    pass

class LeagueUpdate(BaseModel):
    name: Optional[str] = None
    sport: Optional[str] = None
    country: Optional[str] = None
    nickname: Optional[str] = None
    broadcast_start_date: Optional[date] = None
    broadcast_end_date: Optional[date] = None
    tags: Optional[List[str]] = None

class LeagueResponse(LeagueBase):
    id: UUID
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

# Base schemas for DivisionConference
class DivisionConferenceBase(BaseModel):
    name: str
    league_id: UUID
    type: str
    nickname: Optional[str] = None
    region: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None

class DivisionConferenceCreate(DivisionConferenceBase):
    pass

class DivisionConferenceUpdate(BaseModel):
    name: Optional[str] = None
    league_id: Optional[UUID] = None
    type: Optional[str] = None
    nickname: Optional[str] = None
    region: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None

class DivisionConferenceResponse(DivisionConferenceBase):
    id: UUID
    created_at: str
    updated_at: str
    league_name: Optional[str] = None
    league_sport: Optional[str] = None

    class Config:
        from_attributes = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

# Base schemas for Stadium
class StadiumBase(BaseModel):
    name: str
    city: str
    state: Optional[str] = None
    country: str
    capacity: Optional[int] = None
    owner: Optional[str] = None
    naming_rights_holder: Optional[str] = None
    host_broadcaster: Optional[str] = None
    host_broadcaster_id: Optional[UUID] = None
    sport: Optional[str] = None
    tags: Optional[List[str]] = None

class StadiumCreate(StadiumBase):
    pass

class StadiumUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    capacity: Optional[int] = None
    owner: Optional[str] = None
    naming_rights_holder: Optional[str] = None
    host_broadcaster: Optional[str] = None
    host_broadcaster_id: Optional[UUID] = None
    sport: Optional[str] = None
    tags: Optional[List[str]] = None

class StadiumResponse(StadiumBase):
    id: UUID
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

# Base schemas for Team
class TeamBase(BaseModel):
    league_id: UUID
    stadium_id: Optional[UUID] = None
    division_conference_id: UUID
    name: str
    city: Optional[str] = None
    state: Optional[str] = None
    country: str
    founded_year: Optional[int] = None
    stadium_name_to_resolve: Optional[str] = None
    tags: Optional[List[str]] = None

class TeamCreate(TeamBase):
    pass

class TeamUpdate(BaseModel):
    league_id: Optional[UUID] = None
    stadium_id: Optional[UUID] = None
    division_conference_id: Optional[UUID] = None
    name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    founded_year: Optional[int] = None
    tags: Optional[List[str]] = None

class TeamResponse(TeamBase):
    id: UUID
    created_at: str
    updated_at: str
    league_name: Optional[str] = None
    league_sport: Optional[str] = None
    division_conference_name: Optional[str] = None
    stadium_name: Optional[str] = None

    class Config:
        from_attributes = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

# Base schemas for Player
class PlayerBase(BaseModel):
    team_id: Optional[UUID] = None
    name: str
    position: str
    jersey_number: Optional[int] = None
    college: Optional[str] = None
    sport: Optional[str] = None
    sponsor_id: Optional[UUID] = None
    tags: Optional[List[str]] = None

class PlayerCreate(PlayerBase):
    pass

class PlayerUpdate(BaseModel):
    team_id: Optional[UUID] = None
    name: Optional[str] = None
    position: Optional[str] = None
    jersey_number: Optional[int] = None
    college: Optional[str] = None
    sport: Optional[str] = None
    sponsor_id: Optional[UUID] = None
    tags: Optional[List[str]] = None

class PlayerResponse(PlayerBase):
    id: UUID
    created_at: str
    updated_at: str
    sponsor_name: Optional[str] = None

    class Config:
        from_attributes = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

# Base schemas for Game
class GameBase(BaseModel):
    league_id: UUID
    home_team_id: UUID
    away_team_id: UUID
    stadium_id: UUID
    date: date
    time: Optional[str] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    status: str = "Scheduled"
    season_year: int
    season_type: str = "Regular Season"
    tags: Optional[List[str]] = None

class GameCreate(GameBase):
    pass

class GameUpdate(BaseModel):
    league_id: Optional[UUID] = None
    home_team_id: Optional[UUID] = None
    away_team_id: Optional[UUID] = None
    stadium_id: Optional[UUID] = None
    date: Optional[date] = None
    time: Optional[str] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    status: Optional[str] = None
    season_year: Optional[int] = None
    season_type: Optional[str] = None
    tags: Optional[List[str]] = None

class GameResponse(GameBase):
    id: UUID
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

# Base schemas for BroadcastCompany
class BroadcastCompanyBase(BaseModel):
    name: str
    type: str
    country: str
    tags: Optional[List[str]] = None

class BroadcastCompanyCreate(BroadcastCompanyBase):
    pass

class BroadcastCompanyUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    country: Optional[str] = None
    tags: Optional[List[str]] = None

class BroadcastCompanyResponse(BroadcastCompanyBase):
    id: UUID
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

# Base schemas for BroadcastRights
class BroadcastRightsBase(BaseModel):
    entity_type: str
    entity_id: UUID
    broadcast_company_id: UUID
    territory: str
    start_date: date
    end_date: date
    is_exclusive: bool = False
    division_conference_id: Optional[UUID] = None
    tags: Optional[List[str]] = None

class BroadcastRightsCreate(BroadcastRightsBase):
    pass

class BroadcastRightsUpdate(BaseModel):
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    broadcast_company_id: Optional[UUID] = None
    territory: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_exclusive: Optional[bool] = None
    division_conference_id: Optional[UUID] = None
    tags: Optional[List[str]] = None

class BroadcastRightsResponse(BroadcastRightsBase):
    id: UUID
    created_at: str
    updated_at: str
    division_conference_name: Optional[str] = None
    entity_name: Optional[str] = None
    broadcast_company_name: Optional[str] = None
    league_id: Optional[UUID] = None
    league_name: Optional[str] = None
    league_sport: Optional[str] = None
    name: Optional[str] = None

    class Config:
        from_attributes = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

# Base schemas for ProductionCompany
class ProductionCompanyBase(BaseModel):
    name: str
    tags: Optional[List[str]] = None

class ProductionCompanyCreate(ProductionCompanyBase):
    pass

class ProductionCompanyUpdate(BaseModel):
    name: Optional[str] = None
    tags: Optional[List[str]] = None

class ProductionCompanyResponse(ProductionCompanyBase):
    id: UUID
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

# Base schemas for ProductionService
class ProductionServiceBase(BaseModel):
    entity_type: str
    entity_id: Union[UUID, str]  # Allow either UUID or string
    production_company_id: UUID
    service_type: str
    start_date: date
    end_date: date
    secondary_brand_id: Optional[UUID] = None
    tags: Optional[List[str]] = None

class ProductionServiceCreate(ProductionServiceBase):
    @validator('entity_id')
    def validate_entity_id(cls, value, values):
        """Validate entity_id based on context.
        
        For normal entity types, if it's a string (not UUID), it will be resolved to an ID later.
        For special types like Championship/Playoff, allow strings.
        """
        entity_type = values.get('entity_type', '').lower()
        
        # For UUID values, no validation needed
        if isinstance(value, UUID):
            return value
            
        # For string values, check if it could be converted to UUID
        try:
            # Try to convert to UUID
            return UUID(str(value))
        except ValueError:
            # Not a UUID, will be treated as an entity name to be resolved later
            # Just return the original value
            return value

class ProductionServiceUpdate(BaseModel):
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    production_company_id: Optional[UUID] = None
    service_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    secondary_brand_id: Optional[UUID] = None
    tags: Optional[List[str]] = None

class ProductionServiceResponse(ProductionServiceBase):
    id: UUID
    created_at: str
    updated_at: str
    production_company_name: Optional[str] = None
    secondary_brand_name: Optional[str] = None
    entity_name: Optional[str] = None
    name: Optional[str] = None
    league_id: Optional[UUID] = None
    league_name: Optional[str] = None
    league_sport: Optional[str] = None

    class Config:
        from_attributes = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

# Base schemas for Brand
class BrandBase(BaseModel):
    name: str
    industry: str
    company_type: Optional[str] = None
    country: Optional[str] = None
    partner: Optional[str] = None
    partner_relationship: Optional[str] = None
    representative_entity_type: Optional[str] = None
    tags: Optional[List[str]] = None

    class Config:
        orm_mode = True

class BrandCreate(BrandBase):
    pass

class BrandUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    company_type: Optional[str] = None
    country: Optional[str] = None
    partner: Optional[str] = None
    partner_relationship: Optional[str] = None
    representative_entity_type: Optional[str] = None
    tags: Optional[List[str]] = None

class BrandRead(BrandBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

# BrandRelationship schemas have been removed
# The functionality has been integrated into the Brand model with partner fields

# Base schemas for GameBroadcast
class GameBroadcastBase(BaseModel):
    game_id: UUID
    broadcast_company_id: UUID
    broadcast_type: str
    territory: str
    production_company_id: Optional[UUID] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    tags: Optional[List[str]] = None

class GameBroadcastCreate(GameBroadcastBase):
    pass

class GameBroadcastUpdate(BaseModel):
    game_id: Optional[UUID] = None
    broadcast_company_id: Optional[UUID] = None
    broadcast_type: Optional[str] = None
    territory: Optional[str] = None
    production_company_id: Optional[UUID] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    tags: Optional[List[str]] = None

class GameBroadcastResponse(GameBroadcastBase):
    id: UUID
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

# Base schemas for LeagueExecutive
class LeagueExecutiveBase(BaseModel):
    league_id: UUID
    name: str
    position: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    tags: Optional[List[str]] = None

class LeagueExecutiveCreate(LeagueExecutiveBase):
    pass

class LeagueExecutiveUpdate(BaseModel):
    league_id: Optional[UUID] = None
    name: Optional[str] = None
    position: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    tags: Optional[List[str]] = None

class LeagueExecutiveResponse(LeagueExecutiveBase):
    id: UUID
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

# Export schemas
class EntityExportRequest(BaseModel):
    entity_type: str
    entity_ids: List[UUID]
    include_relationships: bool = False
    visible_columns: Optional[List[str]] = None
    target_folder: Optional[str] = None
    # Add custom filename option
    file_name: Optional[str] = None
    # Add option to pick drive folder via picker instead of name
    use_drive_picker: bool = False

class EntityExportResponse(BaseModel):
    spreadsheet_id: str
    spreadsheet_url: str
    entity_count: int
    folder_id: Optional[str] = None
    folder_url: Optional[str] = None 

# New DivisionConferenceLookupResponse schema
class DivisionConferenceLookupResponse(BaseModel):
    name: str
    nickname: Optional[str] = None
    type: str
    region: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# Creator Schemas
class CreatorBase(BaseModel):
    first_name: str
    last_name: str
    genre: str
    platform: str
    url: Optional[str] = None
    followers: Optional[int] = None
    management_id: Optional[UUID] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class CreatorCreate(CreatorBase):
    pass

class CreatorUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    genre: Optional[str] = None
    platform: Optional[str] = None
    url: Optional[str] = None
    followers: Optional[int] = None
    management_id: Optional[UUID] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class CreatorResponse(CreatorBase):
    id: UUID
    created_at: str
    updated_at: str
    management_name: Optional[str] = None

    class Config:
        from_attributes = True

# Management Schemas
class ManagementBase(BaseModel):
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    industry: str
    url: Optional[str] = None
    founded_year: Optional[int] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class ManagementCreate(ManagementBase):
    @model_validator(mode='before')
    def check_name_or_names(cls, values: Dict[str, Any]) -> Dict[str, Any]:
        name = values.get('name')
        first_name = values.get('first_name')
        last_name = values.get('last_name')
        
        if not name and not (first_name and last_name):
            raise ValueError('Either name or both first_name and last_name are required')
        return values

class ManagementUpdate(BaseModel):
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    industry: Optional[str] = None
    url: Optional[str] = None
    founded_year: Optional[int] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class ManagementResponse(ManagementBase):
    id: UUID
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True 