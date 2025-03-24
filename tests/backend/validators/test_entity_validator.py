"""
Tests for the EntityValidator class.
"""
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import SQLAlchemyError

from src.services.sports.validators import EntityValidator
from src.models.sports_models import (
    League, Team, Player, Stadium, Brand, BroadcastCompany, 
    ProductionCompany, DivisionConference, BroadcastRights,
)


@pytest.fixture
def mock_session():
    """Create a mock database session with proper AsyncMock returns."""
    session = AsyncMock(spec=AsyncSession)
    
    # Set up mock execute result with nested mocks for the sqlalchemy query result structure
    mock_result = AsyncMock()
    mock_scalars = AsyncMock()
    mock_first = AsyncMock()
    
    # Create the chain: execute() returns result, result.scalars() returns scalars, scalars.first() returns None
    session.execute.return_value = mock_result
    mock_result.scalars.return_value = mock_scalars
    mock_scalars.first.return_value = None
    
    # Set up add, commit, and rollback methods
    session.add = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    
    return session


@pytest.fixture
def mock_logger():
    """Create a mock logger."""
    return MagicMock()


@pytest.mark.asyncio
class TestEntityValidator:
    """Test cases for the EntityValidator class."""
    
    # ----- Entity Existence Tests -----
    
    async def test_validate_league_exists(self, mock_session, mock_logger):
        """Test league validation when the league exists."""
        # Arrange
        league_id = str(uuid.uuid4())
        mock_league = League(id=league_id, name="Test League")
        mock_session.execute.return_value.scalars.return_value.first.return_value = mock_league
        
        # Act
        result = await EntityValidator.validate_league(mock_session, league_id)
        
        # Assert
        assert result == mock_league
        mock_session.execute.assert_called_once()
    
    async def test_validate_league_not_exists(self, mock_session, mock_logger):
        """Test league validation when the league doesn't exist."""
        # Arrange
        league_id = str(uuid.uuid4())
        mock_session.execute.return_value.scalars().first.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match=f"League with ID {league_id} not found"):
            await EntityValidator.validate_league(mock_session, league_id)
    
    async def test_validate_team_exists(self, mock_session, mock_logger):
        """Test team validation when the team exists."""
        # Arrange
        team_id = str(uuid.uuid4())
        mock_team = Team(id=team_id, name="Test Team")
        mock_session.execute.return_value.scalars().first.return_value = mock_team
        
        # Act
        result = await EntityValidator.validate_team(mock_session, team_id)
        
        # Assert
        assert result == mock_team
        mock_session.execute.assert_called_once()
    
    async def test_validate_stadium_exists(self, mock_session, mock_logger):
        """Test stadium validation when the stadium exists."""
        # Arrange
        stadium_id = str(uuid.uuid4())
        mock_stadium = Stadium(id=stadium_id, name="Test Stadium")
        mock_session.execute.return_value.scalars().first.return_value = mock_stadium
        
        # Act
        result = await EntityValidator.validate_stadium(mock_session, stadium_id)
        
        # Assert
        assert result == mock_stadium
        mock_session.execute.assert_called_once()
    
    async def test_validate_division_conference_exists(self, mock_session, mock_logger):
        """Test division/conference validation when it exists."""
        # Arrange
        div_id = str(uuid.uuid4())
        mock_div = DivisionConference(id=div_id, name="Test Division")
        mock_session.execute.return_value.scalars().first.return_value = mock_div
        
        # Act
        result = await EntityValidator.validate_division_conference(mock_session, div_id)
        
        # Assert
        assert result == mock_div
        mock_session.execute.assert_called_once()
    
    # ----- Broadcast Company Tests -----
    
    async def test_validate_broadcast_company_exists(self, mock_session, mock_logger):
        """Test broadcast company validation when it exists."""
        # Arrange
        company_id = str(uuid.uuid4())
        mock_company = BroadcastCompany(id=company_id, name="Test Broadcast")
        mock_session.execute.return_value.scalars().first.return_value = mock_company
        
        # Act
        result = await EntityValidator.validate_broadcast_company(mock_session, company_id)
        
        # Assert
        assert result == mock_company
        mock_session.execute.assert_called_once()
    
    async def test_validate_broadcast_company_with_brand_fallback(self, mock_session, mock_logger):
        """Test broadcast company validation with brand fallback."""
        # Arrange - broadcast company doesn't exist but brand does
        company_id = str(uuid.uuid4())
        mock_brand = Brand(
            id=company_id, 
            name="Test Brand",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # First query returns None for broadcast company
        mock_session.execute.return_value.scalars().first.side_effect = [
            None,  # First call - no broadcast company found
            mock_brand,  # Second call - brand found
            None,  # Third call - check for existing mapping (none found)
        ]
        
        # Act
        result = await EntityValidator.validate_broadcast_company(mock_session, company_id)
        
        # Assert
        assert isinstance(result, BroadcastCompany)
        mock_session.add.assert_called_once()
        mock_session.commit.assert_called_once()
        
        # The actual logging statements in the validator are different:
        mock_logger.info.assert_any_call(f"No broadcast company found with ID {company_id}, checking if it's a brand ID")
    
    async def test_validate_broadcast_company_with_existing_mapping(self, mock_session, mock_logger):
        """Test broadcast company validation with existing brand mapping."""
        # Arrange
        company_id = str(uuid.uuid4())
        brand_id = str(uuid.uuid4())
        
        # Create mock brand and existing broadcast company
        mock_brand = Brand(id=brand_id, name="Test Brand")
        mock_existing_company = BroadcastCompany(
            id=str(uuid.uuid4()),
            name="Existing Broadcast",
            brand_id=brand_id
        )
        
        # Set up multiple return values
        mock_session.execute.return_value.scalar_one_or_none.side_effect = [
            None,  # First call - no broadcast company found with company_id
            mock_brand,  # Second call - brand found
            mock_existing_company,  # Third call - existing mapping found
        ]
        
        # Act
        result = await EntityValidator.validate_broadcast_company(brand_id, mock_session, mock_logger)
        
        # Assert
        assert result == mock_existing_company
        mock_session.add.assert_not_called()
        
        # Check log message
        mock_logger.info.assert_called_with(
            f"Found existing broadcast company for brand {brand_id}"
        )
    
    async def test_validate_broadcast_company_not_found(self, mock_session, mock_logger):
        """Test broadcast company validation when neither company nor brand exists."""
        # Arrange
        company_id = str(uuid.uuid4())
        mock_session.execute.return_value.scalar_one_or_none.side_effect = [
            None,  # No broadcast company found
            None,  # No brand found
        ]
        
        # Act & Assert
        with pytest.raises(ValueError, match=f"Broadcast company with ID {company_id} not found"):
            await EntityValidator.validate_broadcast_company(company_id, mock_session, mock_logger)
    
    async def test_validate_broadcast_company_exception_handling(self, mock_session, mock_logger):
        """Test broadcast company validation with database exception."""
        # Arrange
        company_id = str(uuid.uuid4())
        mock_brand = Brand(id=company_id, name="Test Brand")
        
        # First query returns None for broadcast company, second returns brand
        mock_session.execute.return_value.scalar_one_or_none.side_effect = [
            None,  # First call - no broadcast company found
            mock_brand,  # Second call - brand found
            None,  # Third call - check for existing mapping (none found)
        ]
        
        # Make commit throw an exception
        mock_session.commit.side_effect = SQLAlchemyError("Test DB Error")
        
        # Act & Assert
        with pytest.raises(ValueError, match="Failed to create broadcast company"):
            await EntityValidator.validate_broadcast_company(company_id, mock_session, mock_logger)
        
        # Verify rollback was called
        mock_session.rollback.assert_called_once()
        
        # Check error log
        mock_logger.error.assert_called()
    
    # ----- Relationship Validation Tests -----
    
    async def test_validate_team_league_relationship_valid(self, mock_session, mock_logger):
        """Test team-league relationship validation when valid."""
        # Arrange
        team_id = str(uuid.uuid4())
        league_id = str(uuid.uuid4())
        mock_team = Team(id=team_id, name="Test Team", league_id=league_id)
        mock_session.execute.return_value.scalar_one_or_none.return_value = mock_team
        
        # Act
        result = await EntityValidator.validate_team_league_relationship(
            team_id, league_id, mock_session, mock_logger
        )
        
        # Assert
        assert result is True
        mock_session.execute.assert_called_once()
    
    async def test_validate_team_league_relationship_invalid(self, mock_session, mock_logger):
        """Test team-league relationship validation when invalid."""
        # Arrange
        team_id = str(uuid.uuid4())
        league_id = str(uuid.uuid4())
        different_league_id = str(uuid.uuid4())
        mock_team = Team(id=team_id, name="Test Team", league_id=different_league_id)
        mock_session.execute.return_value.scalar_one_or_none.return_value = mock_team
        
        # Act & Assert
        with pytest.raises(ValueError, match=f"Team {team_id} does not belong to league {league_id}"):
            await EntityValidator.validate_team_league_relationship(
                team_id, league_id, mock_session, mock_logger
            )
    
    async def test_validate_division_conference_league_relationship_valid(self, mock_session, mock_logger):
        """Test division/conference-league relationship validation when valid."""
        # Arrange
        div_id = str(uuid.uuid4())
        league_id = str(uuid.uuid4())
        mock_div = DivisionConference(id=div_id, name="Test Division", league_id=league_id)
        mock_session.execute.return_value.scalar_one_or_none.return_value = mock_div
        
        # Act
        result = await EntityValidator.validate_division_conference_league_relationship(
            div_id, league_id, mock_session, mock_logger
        )
        
        # Assert
        assert result is True
        mock_session.execute.assert_called_once()
    
    async def test_validate_division_conference_league_relationship_invalid(self, mock_session, mock_logger):
        """Test division/conference-league relationship validation when invalid."""
        # Arrange
        div_id = str(uuid.uuid4())
        league_id = str(uuid.uuid4())
        different_league_id = str(uuid.uuid4())
        mock_div = DivisionConference(id=div_id, name="Test Division", league_id=different_league_id)
        mock_session.execute.return_value.scalar_one_or_none.return_value = mock_div
        
        # Act & Assert
        with pytest.raises(ValueError, match=f"Division/Conference {div_id} does not belong to league {league_id}"):
            await EntityValidator.validate_division_conference_league_relationship(
                div_id, league_id, mock_session, mock_logger
            )
    
    # ----- Complex Validation Tests -----
    
    async def test_validate_team_update_with_valid_data(self, mock_session, mock_logger):
        """Test team update validation with valid data."""
        # Arrange
        league_id = str(uuid.uuid4())
        div_id = str(uuid.uuid4())
        
        # Mock the results for division validation
        mock_div = DivisionConference(id=div_id, name="Test Division", league_id=league_id)
        mock_session.execute.return_value.scalar_one_or_none.return_value = mock_div
        
        # Create team data with division_conference_id
        team_data = {
            "league_id": league_id, 
            "division_conference_id": div_id
        }
        
        # Act
        await EntityValidator.validate_team_update(team_data, mock_session, mock_logger)
        
        # Assert - no exception raised
        mock_session.execute.assert_called_once()
    
    async def test_validate_team_update_with_mismatched_league(self, mock_session, mock_logger):
        """Test team update validation with division from different league."""
        # Arrange
        league_id = str(uuid.uuid4())
        div_id = str(uuid.uuid4())
        different_league_id = str(uuid.uuid4())
        
        # Mock the results for division validation - belongs to different league
        mock_div = DivisionConference(id=div_id, name="Test Division", league_id=different_league_id)
        mock_session.execute.return_value.scalar_one_or_none.return_value = mock_div
        
        # Create team data with division_conference_id and different league_id
        team_data = {
            "league_id": league_id, 
            "division_conference_id": div_id
        }
        
        # Act & Assert
        with pytest.raises(ValueError, match=f"Division/Conference {div_id} does not belong to league {league_id}"):
            await EntityValidator.validate_team_update(team_data, mock_session, mock_logger)
    
    async def test_validate_team_update_without_division(self, mock_session, mock_logger):
        """Test team update validation without division_conference_id."""
        # Arrange
        league_id = str(uuid.uuid4())
        
        # Create team data without division_conference_id
        team_data = {"league_id": league_id}
        
        # Act
        await EntityValidator.validate_team_update(team_data, mock_session, mock_logger)
        
        # Assert - no exception raised, no DB calls needed
        mock_session.execute.assert_not_called()
    
    # ----- Entity Type and ID Validation Tests -----
    
    @pytest.mark.parametrize("entity_type,model_class", [
        ("league", League),
        ("team", Team),
        ("player", Player),
        ("stadium", Stadium),
        ("brand", Brand),
        ("broadcast", BroadcastCompany),
        ("production", ProductionCompany),
        ("division", DivisionConference),
        ("conference", DivisionConference),
        ("division_conference", DivisionConference),
    ])
    async def test_validate_entity_type_and_id_valid_types(
        self, entity_type, model_class, mock_session, mock_logger
    ):
        """Test entity type and ID validation with various valid entity types."""
        # Arrange
        entity_id = str(uuid.uuid4())
        mock_entity = model_class(id=entity_id, name=f"Test {entity_type.capitalize()}")
        mock_session.execute.return_value.scalar_one_or_none.return_value = mock_entity
        
        # Act
        result = await EntityValidator.validate_entity_type_and_id(
            entity_type, entity_id, mock_session, mock_logger
        )
        
        # Assert
        assert result == mock_entity
        mock_session.execute.assert_called_once()
    
    async def test_validate_entity_type_and_id_invalid_type(self, mock_session, mock_logger):
        """Test entity type and ID validation with invalid entity type."""
        # Arrange
        entity_id = str(uuid.uuid4())
        invalid_type = "invalid_entity_type"
        
        # Act & Assert
        with pytest.raises(ValueError, match=f"Unknown entity type: {invalid_type}"):
            await EntityValidator.validate_entity_type_and_id(
                invalid_type, entity_id, mock_session, mock_logger
            )
    
    async def test_validate_entity_type_and_id_not_found(self, mock_session, mock_logger):
        """Test entity type and ID validation when entity doesn't exist."""
        # Arrange
        entity_id = str(uuid.uuid4())
        entity_type = "league"
        mock_session.execute.return_value.scalar_one_or_none.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match=f"Entity of type {entity_type} with ID {entity_id} not found"):
            await EntityValidator.validate_entity_type_and_id(
                entity_type, entity_id, mock_session, mock_logger
            )
    
    # ----- Edge Case Tests -----
    
    async def test_validate_entity_type_normalization(self, mock_session, mock_logger):
        """Test entity type normalization in validate_entity_type_and_id."""
        # Arrange
        entity_id = str(uuid.uuid4())
        mock_div = DivisionConference(id=entity_id, name="Test Division")
        
        # Mock both 'division' and 'conference' to return the same object
        mock_session.execute.return_value.scalar_one_or_none.return_value = mock_div
        
        # Act
        result_div = await EntityValidator.validate_entity_type_and_id(
            "division", entity_id, mock_session, mock_logger
        )
        
        # Reset mock and act again with 'conference'
        mock_session.reset_mock()
        mock_session.execute.return_value.scalar_one_or_none.return_value = mock_div
        
        result_conf = await EntityValidator.validate_entity_type_and_id(
            "conference", entity_id, mock_session, mock_logger
        )
        
        # Assert both calls normalize to the same model
        assert result_div == mock_div
        assert result_conf == mock_div
    
    async def test_validate_entity_type_and_id_with_invalid_uuid(self, mock_session, mock_logger):
        """Test entity type and ID validation with invalid UUID format."""
        # Arrange
        invalid_id = "not-a-uuid"
        entity_type = "team"
        
        # Act & Assert
        with pytest.raises(ValueError, match="Invalid UUID format"):
            await EntityValidator.validate_entity_type_and_id(
                entity_type, invalid_id, mock_session, mock_logger
            )
    
    @patch('src.services.sports.validators.EntityValidator.validate_broadcast_company')
    async def test_entity_type_broadcast_uses_correct_validator(
        self, mock_validate_broadcast, mock_session, mock_logger
    ):
        """Test that 'broadcast' entity type uses validate_broadcast_company."""
        # Arrange
        entity_id = str(uuid.uuid4())
        mock_company = BroadcastCompany(id=entity_id, name="Test Broadcast")
        mock_validate_broadcast.return_value = mock_company
        
        # Act
        result = await EntityValidator.validate_entity_type_and_id(
            "broadcast", entity_id, mock_session, mock_logger
        )
        
        # Assert
        assert result == mock_company
        mock_validate_broadcast.assert_called_once_with(
            entity_id, mock_session, mock_logger
        )