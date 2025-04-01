from datetime import datetime, date
from sqlalchemy import String, Boolean, ForeignKey, JSON, Text, Integer, Date, Time, Numeric, Float, Enum, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID as SQLUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List
from uuid import UUID, uuid4
import enum

from src.models.base import TimestampedBase

class League(TimestampedBase):
    """Model for sports leagues."""
    
    __tablename__ = "leagues"
    __table_args__ = (
        UniqueConstraint('name', name='uq_leagues_name'),
        Index('ix_leagues_name', 'name'),
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
    broadcast_start_date: Mapped[Optional[datetime.date]] = mapped_column(
        Date,
        nullable=True
    )
    broadcast_end_date: Mapped[Optional[datetime.date]] = mapped_column(
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
        Index('ix_stadiums_name', 'name'),
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
        ForeignKey("broadcast_companies.id"),
        nullable=True
    )

    # Relationships
    host_broadcaster_company: Mapped[Optional["BroadcastCompany"]] = relationship(
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
        Index('ix_teams_name', 'name'),
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
    stadium_id: Mapped[UUID] = mapped_column(
        ForeignKey("stadiums.id"),
        nullable=False
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True,
        index=True
    )
    city: Mapped[str] = mapped_column(
        String(100),
        nullable=False
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
    team_id: Mapped[UUID] = mapped_column(
        ForeignKey("teams.id"),
        nullable=False
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
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

    # Relationships
    team: Mapped["Team"] = relationship(
        back_populates="players"
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
    date: Mapped[datetime.date] = mapped_column(
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


class BroadcastCompany(TimestampedBase):
    """Model for broadcast companies."""
    
    __tablename__ = "broadcast_companies"

    id: Mapped[UUID] = mapped_column(
        SQLUUID,
        primary_key=True,
        default=uuid4
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    country: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    # Relationships
    broadcast_rights: Mapped[List["BroadcastRights"]] = relationship(
        back_populates="broadcast_company",
        cascade="all, delete-orphan"
    )
    game_broadcasts: Mapped[List["GameBroadcast"]] = relationship(
        back_populates="broadcast_company",
        cascade="all, delete-orphan"
    )


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
        ForeignKey("broadcast_companies.id"),
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
    start_date: Mapped[datetime.date] = mapped_column(
        Date,
        nullable=False
    )
    end_date: Mapped[datetime.date] = mapped_column(
        Date,
        nullable=False
    )
    is_exclusive: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )

    # Relationships
    broadcast_company: Mapped["BroadcastCompany"] = relationship(
        back_populates="broadcast_rights"
    )
    brand: Mapped["Brand"] = relationship(
        foreign_keys=[broadcast_company_id],
        primaryjoin="BroadcastRights.broadcast_company_id == Brand.id",
        overlaps="broadcast_company,broadcast_rights"
    )
    division_conference: Mapped[Optional["DivisionConference"]] = relationship(
        back_populates="broadcast_rights"
    )


class ProductionCompany(TimestampedBase):
    """Model for production companies."""
    
    __tablename__ = "production_companies"

    id: Mapped[UUID] = mapped_column(
        SQLUUID,
        primary_key=True,
        default=uuid4
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    # Relationships
    # Note: This relationship is now maintained only for backwards compatibility
    # Production services now point to brands directly
    game_broadcasts: Mapped[List["GameBroadcast"]] = relationship(
        back_populates="production_company",
        cascade="all, delete-orphan"
    )


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
    start_date: Mapped[datetime.date] = mapped_column(
        Date,
        nullable=False
    )
    end_date: Mapped[datetime.date] = mapped_column(
        Date,
        nullable=False
    )

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

    # Relationships
    brand_relationships: Mapped[List["BrandRelationship"]] = relationship(
        back_populates="brand",
        cascade="all, delete-orphan"
    )
    production_services: Mapped[List["ProductionService"]] = relationship(
        back_populates="production_company",
        foreign_keys="[ProductionService.production_company_id]",
        primaryjoin="Brand.id == ProductionService.production_company_id"
    )
    broadcast_rights: Mapped[List["BroadcastRights"]] = relationship(
        back_populates="brand",
        foreign_keys="[BroadcastRights.broadcast_company_id]",
        overlaps="broadcast_company,broadcast_rights",
        primaryjoin="Brand.id == BroadcastRights.broadcast_company_id"
    )


class BrandRelationship(TimestampedBase):
    """Model for brand relationships."""
    
    __tablename__ = "brand_relationships"

    id: Mapped[UUID] = mapped_column(
        SQLUUID,
        primary_key=True,
        default=uuid4
    )
    brand_id: Mapped[UUID] = mapped_column(
        SQLUUID,
        ForeignKey("brands.id"),
        nullable=False
    )
    entity_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    entity_id: Mapped[UUID] = mapped_column(
        SQLUUID,
        nullable=False
    )
    relationship_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    start_date: Mapped[datetime.date] = mapped_column(
        Date,
        nullable=False
    )
    end_date: Mapped[datetime.date] = mapped_column(
        Date,
        nullable=False
    )

    # Relationships
    brand: Mapped["Brand"] = relationship(
        back_populates="brand_relationships"
    )


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
    acquisition_date: Mapped[Optional[datetime.date]] = mapped_column(
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
    position: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    start_date: Mapped[Optional[datetime.date]] = mapped_column(
        Date,
        nullable=True
    )
    end_date: Mapped[Optional[datetime.date]] = mapped_column(
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
        ForeignKey("broadcast_companies.id"),
        nullable=False
    )
    production_company_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("production_companies.id"),
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

    # Relationships
    game: Mapped["Game"] = relationship(
        back_populates="broadcasts"
    )
    broadcast_company: Mapped["BroadcastCompany"] = relationship(
        back_populates="game_broadcasts"
    )
    production_company: Mapped[Optional["ProductionCompany"]] = relationship(
        back_populates="game_broadcasts"
    ) 