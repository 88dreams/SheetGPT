"""
Tests for the sports schemas.
"""
import uuid
import datetime
from typing import Dict, Any, List
import pytest
from pydantic import ValidationError

from src.schemas.sports import (
    LeagueBase, LeagueCreate, LeagueUpdate, LeagueResponse,
    TeamBase, TeamCreate, TeamUpdate, TeamResponse,
    BroadcastRightsBase, BroadcastRightsCreate, BroadcastRightsUpdate, BroadcastRightsResponse,
    BrandRelationshipBase, BrandRelationshipCreate, BrandRelationshipUpdate, BrandRelationshipResponse,
    DivisionConferenceBase, DivisionConferenceCreate, DivisionConferenceUpdate, DivisionConferenceResponse,
    EntityExportRequest, EntityExportResponse,
)


class TestLeagueSchemas:
    """Test cases for League schemas."""
    
    def test_league_base_valid(self):
        """Test creation of LeagueBase with valid data."""
        # Arrange
        valid_data = {
            "name": "Test League",
            "sport": "Football",
            "country": "USA"
        }
        
        # Act
        league = LeagueBase(**valid_data)
        
        # Assert
        assert league.name == "Test League"
        assert league.sport == "Football"
        assert league.country == "USA"
    
    def test_league_base_missing_required(self):
        """Test creation of LeagueBase with missing required fields."""
        # Arrange
        invalid_data = {
            "name": "Test League",
            # Missing sport and country
        }
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            LeagueBase(**invalid_data)
        
        errors = exc_info.value.errors()
        field_errors = {error["loc"][0]: error for error in errors}
        
        assert "sport" in field_errors
        assert "country" in field_errors
    
    def test_league_create_valid(self):
        """Test creation of LeagueCreate with valid data."""
        # Arrange
        valid_data = {
            "name": "Test League",
            "sport": "Football",
            "country": "USA",
            "nickname": "TestNick"
        }
        
        # Act
        league = LeagueCreate(**valid_data)
        
        # Assert
        assert league.name == "Test League"
        assert league.sport == "Football"
        assert league.country == "USA"
        assert league.nickname == "TestNick"
    
    def test_league_update_partial(self):
        """Test updating a league with partial data."""
        # Arrange
        update_data = {
            "name": "Updated League"
            # Other fields should be None by default
        }
        
        # Act
        league_update = LeagueUpdate(**update_data)
        
        # Assert
        assert league_update.name == "Updated League"
        assert league_update.sport is None
        assert league_update.country is None
    
    def test_league_response_from_orm(self):
        """Test creating a LeagueResponse from ORM model."""
        # Arrange - simulate an ORM model with attributes
        class LeagueORM:
            id = str(uuid.uuid4())
            name = "Test League"
            sport = "Football"
            country = "USA"
            nickname = "TestNick"
            created_at = datetime.datetime(2023, 1, 1, 12, 0)
            updated_at = datetime.datetime(2023, 1, 2, 12, 0)
        
        orm_obj = LeagueORM()
        
        # Act
        response = LeagueResponse.from_orm(orm_obj)
        
        # Assert
        assert response.id == orm_obj.id
        assert response.name == "Test League"
        assert response.sport == "Football"
        assert response.country == "USA"
        assert response.created_at == "2023-01-01T12:00:00"
        assert response.updated_at == "2023-01-02T12:00:00"


class TestTeamSchemas:
    """Test cases for Team schemas."""
    
    def test_team_base_valid(self):
        """Test creation of TeamBase with valid data."""
        # Arrange
        valid_data = {
            "name": "Test Team",
            "city": "Test City",
            "country": "USA",
            "league_id": str(uuid.uuid4()),
            "stadium_id": str(uuid.uuid4()),
            "division_conference_id": str(uuid.uuid4())
        }
        
        # Act
        team = TeamBase(**valid_data)
        
        # Assert
        assert team.name == "Test Team"
        assert team.city == "Test City"
        assert team.country == "USA"
        assert team.league_id == valid_data["league_id"]
        assert team.stadium_id == valid_data["stadium_id"]
        assert team.division_conference_id == valid_data["division_conference_id"]
    
    def test_team_base_invalid_uuid(self):
        """Test creation of TeamBase with invalid UUID."""
        # Arrange
        invalid_data = {
            "name": "Test Team",
            "city": "Test City",
            "country": "USA",
            "league_id": "not-a-uuid",  # Invalid UUID
            "stadium_id": str(uuid.uuid4()),
            "division_conference_id": str(uuid.uuid4())
        }
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            TeamBase(**invalid_data)
        
        errors = exc_info.value.errors()
        assert any(error["loc"][0] == "league_id" for error in errors)
    
    def test_team_update_partial(self):
        """Test updating a team with partial data."""
        # Arrange
        update_data = {
            "name": "Updated Team"
            # Other fields should be None by default
        }
        
        # Act
        team_update = TeamUpdate(**update_data)
        
        # Assert
        assert team_update.name == "Updated Team"
        assert team_update.city is None
        assert team_update.league_id is None
        assert team_update.stadium_id is None
        assert team_update.division_conference_id is None


class TestBroadcastRightsSchemas:
    """Test cases for BroadcastRights schemas."""
    
    def test_broadcast_rights_base_valid(self):
        """Test creation of BroadcastRightsBase with valid data."""
        # Arrange
        valid_data = {
            "broadcast_company_id": str(uuid.uuid4()),
            "entity_type": "league",
            "entity_id": str(uuid.uuid4()),
            "territory": "USA",
            "start_date": datetime.date(2023, 1, 1),
            "end_date": datetime.date(2023, 12, 31),
            "is_exclusive": True
        }
        
        # Act
        rights = BroadcastRightsBase(**valid_data)
        
        # Assert
        assert rights.broadcast_company_id == valid_data["broadcast_company_id"]
        assert rights.entity_type == "league"
        assert rights.entity_id == valid_data["entity_id"]
        assert rights.territory == "USA"
        assert rights.start_date == datetime.date(2023, 1, 1)
        assert rights.end_date == datetime.date(2023, 12, 31)
        assert rights.is_exclusive is True
    
    def test_broadcast_rights_base_invalid_entity_type(self):
        """Test creation of BroadcastRightsBase with invalid entity_type."""
        # Arrange
        invalid_data = {
            "broadcast_company_id": str(uuid.uuid4()),
            "entity_type": "invalid_type",  # Invalid entity type
            "entity_id": str(uuid.uuid4()),
            "territory": "USA",
            "start_date": datetime.date(2023, 1, 1),
            "end_date": datetime.date(2023, 12, 31)
        }
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            BroadcastRightsBase(**invalid_data)
        
        errors = exc_info.value.errors()
        assert any(error["loc"][0] == "entity_type" for error in errors)
    
    def test_broadcast_rights_base_defaults(self):
        """Test default values for BroadcastRightsBase."""
        # Arrange
        minimal_data = {
            "broadcast_company_id": str(uuid.uuid4()),
            "entity_type": "league",
            "entity_id": str(uuid.uuid4()),
            "territory": "USA",
            "start_date": datetime.date(2023, 1, 1),
            "end_date": datetime.date(2023, 12, 31),
        }
        
        # Act
        rights = BroadcastRightsBase(**minimal_data)
        
        # Assert
        assert rights.is_exclusive is False  # Default value
    
    def test_broadcast_rights_response_additional_fields(self):
        """Test BroadcastRightsResponse includes additional fields."""
        # Arrange - simulate an ORM model with attributes
        class BroadcastRightsORM:
            id = str(uuid.uuid4())
            broadcast_company_id = str(uuid.uuid4())
            entity_type = "league"
            entity_id = str(uuid.uuid4())
            territory = "USA"
            start_date = datetime.date(2023, 1, 1)
            end_date = datetime.date(2023, 12, 31)
            is_exclusive = True
            created_at = datetime.datetime(2023, 1, 1, 12, 0)
            updated_at = datetime.datetime(2023, 1, 2, 12, 0)
            
            # Additional fields for response
            broadcast_company_name = "Test Broadcaster"
            entity_name = "Test League"
            division_conference_id = str(uuid.uuid4())
            division_conference_name = "Test Division"
        
        orm_obj = BroadcastRightsORM()
        
        # Act
        response = BroadcastRightsResponse.from_orm(orm_obj)
        
        # Assert
        assert response.id == orm_obj.id
        assert response.broadcast_company_id == orm_obj.broadcast_company_id
        assert response.broadcast_company_name == "Test Broadcaster"
        assert response.entity_name == "Test League"
        assert response.division_conference_id == orm_obj.division_conference_id
        assert response.division_conference_name == "Test Division"


class TestDivisionConferenceSchemas:
    """Test cases for DivisionConference schemas."""
    
    def test_division_conference_base_valid(self):
        """Test creation of DivisionConferenceBase with valid data."""
        # Arrange
        valid_data = {
            "name": "Test Division",
            "type": "Division",
            "league_id": str(uuid.uuid4()),
            "nickname": "TestDiv"
        }
        
        # Act
        division = DivisionConferenceBase(**valid_data)
        
        # Assert
        assert division.name == "Test Division"
        assert division.type == "Division"
        assert division.league_id == valid_data["league_id"]
        assert division.nickname == "TestDiv"
    
    def test_division_conference_base_invalid_type(self):
        """Test creation of DivisionConferenceBase with invalid type."""
        # Arrange
        invalid_data = {
            "name": "Test Division",
            "type": "InvalidType",  # Not 'Division' or 'Conference'
            "league_id": str(uuid.uuid4())
        }
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            DivisionConferenceBase(**invalid_data)
        
        errors = exc_info.value.errors()
        assert any(error["loc"][0] == "type" for error in errors)
    
    def test_division_conference_update_partial(self):
        """Test updating a division with partial data."""
        # Arrange
        update_data = {
            "name": "Updated Division",
            "nickname": "Updated"
        }
        
        # Act
        division_update = DivisionConferenceUpdate(**update_data)
        
        # Assert
        assert division_update.name == "Updated Division"
        assert division_update.nickname == "Updated"
        assert division_update.league_id is None
        assert division_update.type is None


class TestBrandRelationshipSchemas:
    """Test cases for BrandRelationship schemas."""
    
    def test_brand_relationship_base_valid(self):
        """Test creation of BrandRelationshipBase with valid data."""
        # Arrange
        valid_data = {
            "brand_id": str(uuid.uuid4()),
            "entity_type": "league",
            "entity_id": str(uuid.uuid4()),
            "relationship_type": "sponsor",
            "start_date": datetime.date(2023, 1, 1),
            "end_date": datetime.date(2023, 12, 31)
        }
        
        # Act
        relationship = BrandRelationshipBase(**valid_data)
        
        # Assert
        assert relationship.brand_id == valid_data["brand_id"]
        assert relationship.entity_type == "league"
        assert relationship.entity_id == valid_data["entity_id"]
        assert relationship.relationship_type == "sponsor"
        assert relationship.start_date == datetime.date(2023, 1, 1)
        assert relationship.end_date == datetime.date(2023, 12, 31)
    
    def test_brand_relationship_base_invalid_relationship_type(self):
        """Test creation of BrandRelationshipBase with invalid relationship_type."""
        # Arrange
        invalid_data = {
            "brand_id": str(uuid.uuid4()),
            "entity_type": "league",
            "entity_id": str(uuid.uuid4()),
            "relationship_type": "invalid_type",  # Invalid relationship type
            "start_date": datetime.date(2023, 1, 1),
            "end_date": datetime.date(2023, 12, 31)
        }
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            BrandRelationshipBase(**invalid_data)
        
        errors = exc_info.value.errors()
        assert any(error["loc"][0] == "relationship_type" for error in errors)
    
    def test_brand_relationship_date_range(self):
        """Test valid date range for BrandRelationshipBase."""
        # Arrange
        valid_data = {
            "brand_id": str(uuid.uuid4()),
            "entity_type": "league",
            "entity_id": str(uuid.uuid4()),
            "relationship_type": "sponsor",
            "start_date": datetime.date(2023, 1, 1),
            "end_date": datetime.date(2023, 12, 31)
        }
        
        # Act
        relationship = BrandRelationshipBase(**valid_data)
        
        # Assert
        assert relationship.start_date < relationship.end_date
        
        # TODO: If schema has date range validation, test with end_date before start_date


class TestEntityExportSchemas:
    """Test cases for EntityExport schemas."""
    
    def test_entity_export_request_valid(self):
        """Test creation of EntityExportRequest with valid data."""
        # Arrange
        valid_data = {
            "entity_type": "league",
            "format": "json",
            "options": {
                "filename": "test_export",
                "include_related": True
            }
        }
        
        # Act
        export_request = EntityExportRequest(**valid_data)
        
        # Assert
        assert export_request.entity_type == "league"
        assert export_request.format == "json"
        assert export_request.options["filename"] == "test_export"
        assert export_request.options["include_related"] is True
    
    def test_entity_export_request_invalid_format(self):
        """Test creation of EntityExportRequest with invalid format."""
        # Arrange
        invalid_data = {
            "entity_type": "league",
            "format": "invalid_format",  # Not a valid format
            "options": {
                "filename": "test_export"
            }
        }
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            EntityExportRequest(**invalid_data)
        
        errors = exc_info.value.errors()
        assert any(error["loc"][0] == "format" for error in errors)
    
    def test_entity_export_response_valid(self):
        """Test creation of EntityExportResponse with valid data."""
        # Arrange
        valid_data = {
            "export_id": str(uuid.uuid4()),
            "file_url": "https://example.com/exports/test.json",
            "format": "json"
        }
        
        # Act
        export_response = EntityExportResponse(**valid_data)
        
        # Assert
        assert export_response.export_id == valid_data["export_id"]
        assert export_response.file_url == "https://example.com/exports/test.json"
        assert export_response.format == "json"