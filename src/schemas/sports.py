from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import date, datetime

# Base schemas for League
class LeagueBase(BaseModel):
    name: str
    sport: str
    country: str
    broadcast_start_date: Optional[date] = None
    broadcast_end_date: Optional[date] = None

class LeagueCreate(LeagueBase):
    pass

class LeagueUpdate(BaseModel):
    name: Optional[str] = None
    sport: Optional[str] = None
    country: Optional[str] = None
    broadcast_start_date: Optional[date] = None
    broadcast_end_date: Optional[date] = None

class LeagueResponse(LeagueBase):
    id: UUID
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True
        
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
    host_broadcaster_id: Optional[UUID] = None

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
    host_broadcaster_id: Optional[UUID] = None

class StadiumResponse(StadiumBase):
    id: UUID
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

# Base schemas for Team
class TeamBase(BaseModel):
    league_id: UUID
    stadium_id: UUID
    name: str
    city: str
    state: Optional[str] = None
    country: str
    founded_year: Optional[int] = None

class TeamCreate(TeamBase):
    pass

class TeamUpdate(BaseModel):
    league_id: Optional[UUID] = None
    stadium_id: Optional[UUID] = None
    name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    founded_year: Optional[int] = None

class TeamResponse(TeamBase):
    id: UUID
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

# Base schemas for Player
class PlayerBase(BaseModel):
    team_id: UUID
    name: str
    position: str
    jersey_number: Optional[int] = None
    college: Optional[str] = None

class PlayerCreate(PlayerBase):
    pass

class PlayerUpdate(BaseModel):
    team_id: Optional[UUID] = None
    name: Optional[str] = None
    position: Optional[str] = None
    jersey_number: Optional[int] = None
    college: Optional[str] = None

class PlayerResponse(PlayerBase):
    id: UUID
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True
        
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

class GameResponse(GameBase):
    id: UUID
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True
        
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

class BroadcastCompanyCreate(BroadcastCompanyBase):
    pass

class BroadcastCompanyUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    country: Optional[str] = None

class BroadcastCompanyResponse(BroadcastCompanyBase):
    id: UUID
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True
        
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

class BroadcastRightsResponse(BroadcastRightsBase):
    id: UUID
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

# Base schemas for ProductionCompany
class ProductionCompanyBase(BaseModel):
    name: str

class ProductionCompanyCreate(ProductionCompanyBase):
    pass

class ProductionCompanyUpdate(BaseModel):
    name: Optional[str] = None

class ProductionCompanyResponse(ProductionCompanyBase):
    id: UUID
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

# Base schemas for ProductionService
class ProductionServiceBase(BaseModel):
    entity_type: str
    entity_id: UUID
    production_company_id: UUID
    service_type: str
    start_date: date
    end_date: date

class ProductionServiceCreate(ProductionServiceBase):
    pass

class ProductionServiceUpdate(BaseModel):
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    production_company_id: Optional[UUID] = None
    service_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class ProductionServiceResponse(ProductionServiceBase):
    id: UUID
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

# Base schemas for Brand
class BrandBase(BaseModel):
    name: str
    industry: str

class BrandCreate(BrandBase):
    pass

class BrandUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None

class BrandResponse(BrandBase):
    id: UUID
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

# Base schemas for BrandRelationship
class BrandRelationshipBase(BaseModel):
    brand_id: UUID
    entity_type: str
    entity_id: UUID
    relationship_type: str
    start_date: date
    end_date: date

class BrandRelationshipCreate(BrandRelationshipBase):
    pass

class BrandRelationshipUpdate(BaseModel):
    brand_id: Optional[UUID] = None
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    relationship_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class BrandRelationshipResponse(BrandRelationshipBase):
    id: UUID
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True
        
    @validator('created_at', 'updated_at', pre=True)
    def parse_datetime(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return value

# Base schemas for GameBroadcast
class GameBroadcastBase(BaseModel):
    game_id: UUID
    broadcast_company_id: UUID
    broadcast_type: str
    territory: str
    production_company_id: Optional[UUID] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None

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

class GameBroadcastResponse(GameBroadcastBase):
    id: UUID
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True
        
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

class LeagueExecutiveCreate(LeagueExecutiveBase):
    pass

class LeagueExecutiveUpdate(BaseModel):
    league_id: Optional[UUID] = None
    name: Optional[str] = None
    position: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class LeagueExecutiveResponse(LeagueExecutiveBase):
    id: UUID
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True
        
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

class EntityExportResponse(BaseModel):
    spreadsheet_id: str
    spreadsheet_url: str
    entity_count: int 