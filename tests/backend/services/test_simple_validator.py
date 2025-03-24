"""
Basic tests for the EntityValidator to demonstrate working tests.
"""
import pytest
import uuid
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession
from src.services.sports.validators import EntityValidator
from src.models.sports_models import League, Team, Stadium


class MockQueryResult:
    """
    Simple mock for SQLAlchemy query result.
    """
    def __init__(self, entity=None):
        self.entity = entity
    
    def scalars(self):
        """Return a mock scalars result"""
        return self
    
    def first(self):
        """Return the entity or None"""
        return self.entity


@pytest.mark.asyncio
class TestEntityValidator:
    """Basic tests for EntityValidator class."""
    
    async def test_validate_league_exists(self):
        """Test league validation when it exists."""
        # Arrange
        league_id = str(uuid.uuid4())
        mock_league = League(id=league_id, name="Test League")
        
        # Create a session with a mock execute method
        mock_session = AsyncMock(spec=AsyncSession)
        # Make execute return a mock result with our league
        mock_session.execute.return_value = MockQueryResult(mock_league)
        
        # Act
        result = await EntityValidator.validate_league(mock_session, league_id)
        
        # Assert
        assert result == mock_league
        mock_session.execute.assert_called_once()
    
    async def test_validate_league_not_exists(self):
        """Test league validation when it doesn't exist."""
        # Arrange
        league_id = str(uuid.uuid4())
        
        # Create a session with a mock execute method
        mock_session = AsyncMock(spec=AsyncSession)
        # Make execute return a mock result with no league
        mock_session.execute.return_value = MockQueryResult(None)
        
        # Act & Assert
        with pytest.raises(ValueError, match=f"League with ID {league_id} not found"):
            await EntityValidator.validate_league(mock_session, league_id)
    
    async def test_validate_team_exists(self):
        """Test team validation when it exists."""
        # Arrange
        team_id = str(uuid.uuid4())
        mock_team = Team(id=team_id, name="Test Team")
        
        # Create a session with a mock execute method
        mock_session = AsyncMock(spec=AsyncSession)
        # Make execute return a mock result with our team
        mock_session.execute.return_value = MockQueryResult(mock_team)
        
        # Act
        result = await EntityValidator.validate_team(mock_session, team_id)
        
        # Assert
        assert result == mock_team
        mock_session.execute.assert_called_once()
    
    async def test_validate_stadium_exists(self):
        """Test stadium validation when it exists."""
        # Arrange
        stadium_id = str(uuid.uuid4())
        mock_stadium = Stadium(id=stadium_id, name="Test Stadium")
        
        # Create a session with a mock execute method
        mock_session = AsyncMock(spec=AsyncSession)
        # Make execute return a mock result with our stadium
        mock_session.execute.return_value = MockQueryResult(mock_stadium)
        
        # Act
        result = await EntityValidator.validate_stadium(mock_session, stadium_id)
        
        # Assert
        assert result == mock_stadium
        mock_session.execute.assert_called_once()
    
    async def test_team_league_relationship(self):
        """Test team-league relationship validation."""
        # Arrange
        team_id = str(uuid.uuid4())
        league_id = str(uuid.uuid4())
        mock_team = Team(id=team_id, name="Test Team", league_id=league_id)
        
        # Create a session with a mock execute method
        mock_session = AsyncMock(spec=AsyncSession)
        # Make execute return a mock result with our team
        mock_session.execute.return_value = MockQueryResult(mock_team)
        
        # Act
        result = await EntityValidator.validate_team_league_relationship(mock_session, team_id, league_id)
        
        # Assert
        assert result is True
        mock_session.execute.assert_called_once()
    
    async def test_team_league_relationship_invalid(self):
        """Test team-league relationship validation with wrong league."""
        # Arrange
        team_id = str(uuid.uuid4())
        league_id = str(uuid.uuid4())
        
        # Create a session with a mock execute method
        mock_session = AsyncMock(spec=AsyncSession)
        # Make execute return None to simulate team not found with the right league ID
        mock_session.execute.return_value = MockQueryResult(None)
        
        # Act & Assert
        with pytest.raises(ValueError, match=f"Team with ID {team_id} does not belong to League with ID {league_id}"):
            await EntityValidator.validate_team_league_relationship(mock_session, team_id, league_id)