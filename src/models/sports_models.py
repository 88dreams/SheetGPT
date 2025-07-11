from datetime import datetime, date as DateType
from sqlalchemy import String, Boolean, ForeignKey, JSON, Text, Integer, Date, DateTime, Time, Numeric, Float, Enum, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID as SQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List, TYPE_CHECKING
from uuid import UUID, uuid4
import enum

from src.models.base import TimestampedBase

if TYPE_CHECKING:
    from src.models.models import User

class League(TimestampedBase):
    """Model for sports leagues."""
    
    __tablename__ = "leagues"
    __table_args__ = (
        UniqueConstraint('name', name='uq_leagues_name'),
        Index('ix_leagues_name', 'name', unique=True),
    )

    id: Mapped[UUID] = mapped_column(
        SQLUUID,
        primary_key=True,
        default=uuid4
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True,
        index=True
    )
    nickname: Mapped[Optional[str]] = mapped_column(
        String(20), 
        nullable=True,
        index=True
    )
    sport: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    country: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    broadcast_start_date: Mapped[Optional[DateType]] = mapped_column(
        Date,
        nullable=True
    )
    broadcast_end_date: Mapped[Optional[DateType]] = mapped_column(
        Date,
        nullable=True
    )

    # Relationships
    divisions_conferences: Mapped[List["DivisionConference"]] = relationship(
        back_populates="league",
        cascade="all, delete-orphan"
    )
    teams: Mapped[List["Team"]] = relationship(
        back_populates="league"
    )
    games: Mapped[List["Game"]] = relationship(
        back_populates="league",
        cascade="all, delete-orphan"
    )
    executives: Mapped[List["LeagueExecutive"]] = relationship(
        back_populates="league",
        cascade="all, delete-orphan"
    )


class DivisionConference(TimestampedBase):
    """Model for sports divisions and conferences within leagues."""
    
    __tablename__ = "divisions_conferences"
    __table_args__ = (
        UniqueConstraint('league_id', 'name', name='uq_division_conference_name_per_league'),
        Index('ix_divisions_conferences_name', 'name'),
    )

    id: Mapped[UUID] = mapped_column(
        SQLUUID,
        primary_key=True,
        default=uuid4
    )
    league_id: Mapped[UUID] = mapped_column(
        ForeignKey("leagues.id"),
        nullable=False
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )
    nickname: Mapped[Optional[str]] = mapped_column(
        String(20), 
        nullable=True,
        index=True
    )
    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    region: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )

    # Relationships
    league: Mapped["League"] = relationship(
        back_populates="divisions_conferences"
    )
    teams: Mapped[List["Team"]] = relationship(
        back_populates="division_conference",
        cascade="all, delete-orphan"
    )
    broadcast_rights: Mapped[List["BroadcastRights"]] = relationship(
        back_populates="division_conference",
        cascade="all, delete-orphan"
    )


class Stadium(TimestampedBase):
    """Model for sports stadiums."""
    
    __tablename__ = "stadiums"
    __table_args__ = (
        UniqueConstraint('name', name='uq_stadiums_name'),
        Index('ix_stadiums_name', 'name', unique=True),
    )

    id: Mapped[UUID] = mapped_column(
        SQLUUID,
        primary_key=True,
        default=uuid4
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True,
        index=True
    )
    nickname: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True
    )
    city: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    state: Mapped[str] = mapped_column(
        String(100),
        nullable=True
    )
    country: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    capacity: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )
    owner: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    naming_rights_holder: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    host_broadcaster: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    host_broadcaster_id: Mapped[Optional[UUID]] = mapped_column(
        SQLUUID,
        ForeignKey("brands.id"),
        nullable=True
    )
    sport: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True
    )

    # Relationships
    host_broadcaster_company: Mapped[Optional["Brand"]] = relationship(
        "Brand",
        foreign_keys=[host_broadcaster_id]
    )
    teams: Mapped[List["Team"]] = relationship(
        back_populates="stadium"
    )
    games: Mapped[List["Game"]] = relationship(
        back_populates="stadium"
    )


class Team(TimestampedBase):
    """Model for sports teams."""
    
    __tablename__ = "teams"
    __table_args__ = (
        UniqueConstraint('name', name='uq_teams_name'),
        Index('ix_teams_name', 'name', unique=True),
    )

    id: Mapped[UUID] = mapped_column(
        SQLUUID,
        primary_key=True,
        default=uuid4
    )
    league_id: Mapped[UUID] = mapped_column(
        ForeignKey("leagues.id"),
        nullable=False
    )
    division_conference_id: Mapped[UUID] = mapped_column(
        ForeignKey("divisions_conferences.id"),
        nullable=False
    )
    stadium_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("stadiums.id"),
        nullable=True
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True,
        index=True
    )
    nickname: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        index=True
    )
    city: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    state: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    country: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    founded_year: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )

    # Relationships
    league: Mapped["League"] = relationship(
        back_populates="teams"
    )
    division_conference: Mapped["DivisionConference"] = relationship(
        back_populates="teams"
    )
    stadium: Mapped["Stadium"] = relationship(
        back_populates="teams"
    )
    players: Mapped[List["Player"]] = relationship(
        back_populates="team",
        cascade="all, delete-orphan"
    )
    home_games: Mapped[List["Game"]] = relationship(
        "Game",
        primaryjoin="Team.id == Game.home_team_id",
        back_populates="home_team"
    )
    away_games: Mapped[List["Game"]] = relationship(
        "Game",
        primaryjoin="Team.id == Game.away_team_id",
        back_populates="away_team"
    )
    records: Mapped[List["TeamRecord"]] = relationship(
        back_populates="team",
        cascade="all, delete-orphan"
    )
    ownerships: Mapped[List["TeamOwnership"]] = relationship(
        back_populates="team",
        cascade="all, delete-orphan"
    )


class Player(TimestampedBase):
    """Model for sports players."""
    
    __tablename__ = "players"

    id: Mapped[UUID] = mapped_column(
        SQLUUID,
        primary_key=True,
        default=uuid4
    )
    team_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("teams.id"),
        nullable=True,
        index=True
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    nickname: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True
    )
    position: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    jersey_number: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )
    college: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    sport: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True
    )
    sponsor_id: Mapped[Optional[UUID]] = mapped_column(
        SQLUUID,
        ForeignKey("brands.id"),
        nullable=True,
        index=True
    )

    # Relationships
    team: Mapped[Optional["Team"]] = relationship(
        back_populates="players"
    )
    sponsor: Mapped[Optional["Brand"]] = relationship(
        "Brand",
        foreign_keys=[sponsor_id]
    )


class Game(TimestampedBase):
    """Model for sports games."""
    
    __tablename__ = "games"

    id: Mapped[UUID] = mapped_column(
        SQLUUID,
        primary_key=True,
        default=uuid4
    )
    league_id: Mapped[UUID] = mapped_column(
        ForeignKey("leagues.id"),
        nullable=False
    )
    home_team_id: Mapped[UUID] = mapped_column(
        ForeignKey("teams.id"),
        nullable=False
    )
    away_team_id: Mapped[UUID] = mapped_column(
        ForeignKey("teams.id"),
        nullable=False
    )
    stadium_id: Mapped[UUID] = mapped_column(
        ForeignKey("stadiums.id"),
        nullable=False
    )
    date: Mapped[DateType] = mapped_column(
        Date,
        nullable=False
    )
    time: Mapped[Optional[str]] = mapped_column(
        String(10),
        nullable=True
    )
    home_score: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )
    away_score: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Scheduled"
    )
    season_year: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    season_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Regular Season"
    )

    # Relationships
    league: Mapped["League"] = relationship(
        back_populates="games"
    )
    home_team: Mapped["Team"] = relationship(
        "Team",
        foreign_keys=[home_team_id],
        back_populates="home_games"
    )
    away_team: Mapped["Team"] = relationship(
        "Team",
        foreign_keys=[away_team_id],
        back_populates="away_games"
    )
    stadium: Mapped["Stadium"] = relationship(
        back_populates="games"
    )
    broadcasts: Mapped[List["GameBroadcast"]] = relationship(
        back_populates="game",
        cascade="all, delete-orphan"
    )


# The BroadcastCompany model has been removed
# All broadcast company functionality is now handled by the Brand model


class BroadcastRights(TimestampedBase):
    """Model for broadcast rights."""
    
    __tablename__ = "broadcast_rights"

    id: Mapped[UUID] = mapped_column(
        SQLUUID,
        primary_key=True,
        default=uuid4
    )
    entity_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    entity_id: Mapped[UUID] = mapped_column(
        SQLUUID,
        nullable=False
    )
    broadcast_company_id: Mapped[UUID] = mapped_column(
        SQLUUID,
        ForeignKey("brands.id"),
        nullable=False
    )
    division_conference_id: Mapped[Optional[UUID]] = mapped_column(
        SQLUUID,
        ForeignKey("divisions_conferences.id"),
        nullable=True
    )
    territory: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    start_date: Mapped[DateType] = mapped_column(
        Date,
        nullable=False
    )
    end_date: Mapped[DateType] = mapped_column(
        Date,
        nullable=False
    )
    is_exclusive: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    nickname: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Relationships
    broadcaster: Mapped["Brand"] = relationship(
        "Brand",
        foreign_keys=[broadcast_company_id]
    )
    division_conference: Mapped[Optional["DivisionConference"]] = relationship(
        back_populates="broadcast_rights"
    )


# The ProductionCompany model has been removed
# All production company functionality is now handled by the Brand model


class ProductionService(TimestampedBase):
    """Model for production services."""
    
    __tablename__ = "production_services"

    id: Mapped[UUID] = mapped_column(
        SQLUUID,
        primary_key=True,
        default=uuid4
    )
    entity_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    entity_id: Mapped[UUID] = mapped_column(
        SQLUUID,
        nullable=False
    )
    production_company_id: Mapped[UUID] = mapped_column(
        SQLUUID,
        ForeignKey("brands.id"),
        nullable=False
    )
    service_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    start_date: Mapped[DateType] = mapped_column(
        Date,
        nullable=False
    )
    end_date: Mapped[DateType] = mapped_column(
        Date,
        nullable=False
    )

    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    nickname: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    secondary_brand_id: Mapped[Optional[UUID]] = mapped_column(
        SQLUUID,
        ForeignKey("brands.id"),
        nullable=True,
        index=True
    )

    # Relationships
    production_company: Mapped["Brand"] = relationship(
        "Brand",
        foreign_keys=[production_company_id],
        back_populates="production_services"
    )
    secondary_brand: Mapped[Optional["Brand"]] = relationship(
        "Brand",
        foreign_keys=[secondary_brand_id]
    )


class Brand(TimestampedBase):
    """Model for brands - universal entity for all companies."""
    
    __tablename__ = "brands"
    __table_args__ = (
        Index('ix_brands_name', 'name'),
        Index('ix_brands_industry', 'industry'),
    )

    id: Mapped[UUID] = mapped_column(
        SQLUUID,
        primary_key=True,
        default=uuid4
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )
    nickname: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        index=True
    )
    industry: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )
    company_type: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        index=True
    )
    country: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    # New fields for partner relationship
    partner: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    partner_relationship: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    # New field to indicate if Brand represents another entity type
    representative_entity_type: Mapped[Optional[str]] = mapped_column(
        String(50), 
        nullable=True, 
        index=True
    )
    media_department: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )

    # Relationships
    production_services: Mapped[List["ProductionService"]] = relationship(
        back_populates="production_company",
        foreign_keys="[ProductionService.production_company_id]",
        primaryjoin="Brand.id == ProductionService.production_company_id"
    )
    broadcast_rights: Mapped[List["BroadcastRights"]] = relationship(
        back_populates="broadcaster",
        foreign_keys="[BroadcastRights.broadcast_company_id]",
        primaryjoin="Brand.id == BroadcastRights.broadcast_company_id"
    )
    contact_associations: Mapped[List["ContactBrandAssociation"]] = relationship(
        back_populates="brand",
        cascade="all, delete-orphan"
    )


# BrandRelationship model has been removed
# The functionality has been integrated into the Brand model with partner fields


class TeamRecord(TimestampedBase):
    """Model for team records by season."""
    
    __tablename__ = "team_records"

    id: Mapped[UUID] = mapped_column(
        SQLUUID,
        primary_key=True,
        default=uuid4
    )
    team_id: Mapped[UUID] = mapped_column(
        SQLUUID,
        ForeignKey("teams.id"),
        nullable=False
    )
    season_year: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    wins: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    losses: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    ties: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    playoff_result: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )

    # Relationships
    team: Mapped["Team"] = relationship(
        back_populates="records"
    )


class TeamOwnership(TimestampedBase):
    """Model for team ownership."""
    
    __tablename__ = "team_ownerships"

    id: Mapped[UUID] = mapped_column(
        SQLUUID,
        primary_key=True,
        default=uuid4
    )
    team_id: Mapped[UUID] = mapped_column(
        ForeignKey("teams.id"),
        nullable=False
    )
    owner_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    ownership_percentage: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 2),
        nullable=True
    )
    acquisition_date: Mapped[Optional[DateType]] = mapped_column(
        Date,
        nullable=True
    )

    # Relationships
    team: Mapped["Team"] = relationship(
        back_populates="ownerships"
    )


class LeagueExecutive(TimestampedBase):
    """Model for league executives."""
    
    __tablename__ = "league_executives"

    id: Mapped[UUID] = mapped_column(
        SQLUUID,
        primary_key=True,
        default=uuid4
    )
    league_id: Mapped[UUID] = mapped_column(
        SQLUUID,
        ForeignKey("leagues.id"),
        nullable=False
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    nickname: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True
    )
    position: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    start_date: Mapped[Optional[DateType]] = mapped_column(
        Date,
        nullable=True
    )
    end_date: Mapped[Optional[DateType]] = mapped_column(
        Date,
        nullable=True
    )

    # Relationships
    league: Mapped["League"] = relationship(
        back_populates="executives"
    )


class GameBroadcast(TimestampedBase):
    """Model for game broadcasts."""
    
    __tablename__ = "game_broadcasts"

    id: Mapped[UUID] = mapped_column(
        SQLUUID,
        primary_key=True,
        default=uuid4
    )
    game_id: Mapped[UUID] = mapped_column(
        ForeignKey("games.id"),
        nullable=False
    )
    broadcast_company_id: Mapped[UUID] = mapped_column(
        ForeignKey("brands.id"),
        nullable=False
    )
    production_company_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("brands.id"),
        nullable=True
    )
    broadcast_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    territory: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    start_time: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )
    end_time: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    nickname: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Relationships
    game: Mapped["Game"] = relationship(
        back_populates="broadcasts"
    )
    broadcaster: Mapped["Brand"] = relationship(
        "Brand",
        foreign_keys=[broadcast_company_id]
    )
    production_company: Mapped[Optional["Brand"]] = relationship(
        "Brand",
        foreign_keys=[production_company_id]
    )


class Contact(TimestampedBase):
    """Model for LinkedIn contacts imported from CSV."""
    
    __tablename__ = "contacts"
    __table_args__ = (
        Index('ix_contacts_first_name', 'first_name'),
        Index('ix_contacts_last_name', 'last_name'),
        Index('ix_contacts_email', 'email'),
        Index('ix_contacts_company', 'company'),
    )

    id: Mapped[UUID] = mapped_column(
        SQLUUID,
        primary_key=True,
        default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        SQLUUID,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )
    first_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )
    last_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )
    email: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True
    )
    linkedin_url: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    company: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True
    )
    position: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    connected_on: Mapped[Optional[DateType]] = mapped_column(
        Date,
        nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    import_source_tag: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User"
    )
    brand_associations: Mapped[List["ContactBrandAssociation"]] = relationship(
        back_populates="contact",
        cascade="all, delete-orphan"
    )


class ContactBrandAssociation(TimestampedBase):
    """Model for associating contacts with brands."""
    
    __tablename__ = "contact_brand_associations"
    __table_args__ = (
        UniqueConstraint('contact_id', 'brand_id', name='uq_contact_brand'),
    )

    id: Mapped[UUID] = mapped_column(
        SQLUUID,
        primary_key=True,
        default=uuid4
    )
    contact_id: Mapped[UUID] = mapped_column(
        SQLUUID,
        ForeignKey("contacts.id"),
        nullable=False,
        index=True
    )
    brand_id: Mapped[UUID] = mapped_column(
        SQLUUID,
        ForeignKey("brands.id"),
        nullable=False,
        index=True
    )
    confidence_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=1.0
    )
    association_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="employed_at"
    )
    start_date: Mapped[Optional[DateType]] = mapped_column(
        Date,
        nullable=True
    )
    end_date: Mapped[Optional[DateType]] = mapped_column(
        Date,
        nullable=True
    )
    is_current: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True
    )
    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # Relationships
    contact: Mapped["Contact"] = relationship(
        back_populates="brand_associations"
    )
    brand: Mapped["Brand"] = relationship(
        back_populates="contact_associations"
    )

class Creator(TimestampedBase):
    """Model for creators."""
    
    __tablename__ = "creators"

    id: Mapped[UUID] = mapped_column(SQLUUID, primary_key=True, default=uuid4)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    genre: Mapped[str] = mapped_column(String(100), nullable=False)
    platform: Mapped[str] = mapped_column(String(100), nullable=False)
    url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    followers: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    management_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("managements.id"), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    management: Mapped[Optional["Management"]] = relationship(back_populates="creators")


class Management(TimestampedBase):
    """Model for management companies or individuals."""
    
    __tablename__ = "managements"

    id: Mapped[UUID] = mapped_column(SQLUUID, primary_key=True, default=uuid4)
    name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    first_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    industry: Mapped[str] = mapped_column(String(100), nullable=False)
    url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    founded_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    creators: Mapped[List["Creator"]] = relationship(back_populates="management")