"""
Tests for sports API endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import uuid

from src.main import app
from src.models.sports_models import Brand, League, Team


@pytest.fixture(scope="module")
def test_client():
    """Return a FastAPI test client."""
    with TestClient(app) as client:
        yield client


@pytest.fixture(scope="function")
def mock_sports_service():
    """Create a mock sports service."""
    with patch("src.api.routes.sports.get_sports_service") as mock_get_service:
        # Create the mock service
        mock_service = MagicMock()
        mock_get_service.return_value = mock_service
        
        # Return both the service factory and the service itself
        yield mock_get_service, mock_service


class TestBrandEndpoints:
    """Tests for brand endpoints."""

    async def test_get_brands(self, test_client, mock_sports_service):
        """Test GET /api/sports/brands endpoint."""
        # Unpack the mock service
        _, mock_service = mock_sports_service
        
        # Set up mock response
        brand_id = str(uuid.uuid4())
        mock_brands = [
            Brand(
                id=brand_id,
                name="Test Brand",
                description="Test Description",
                logo_url="https://example.com/logo.png",
                website="https://example.com"
            )
        ]
        mock_service.brand_service.get_all.return_value = mock_brands
        
        # Make the request
        response = test_client.get("/api/sports/brands")
        
        # Assert response
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["id"] == brand_id
        assert response.json()[0]["name"] == "Test Brand"
        
        # Assert the service was called correctly
        mock_service.brand_service.get_all.assert_called_once()

    async def test_get_brand_by_id(self, test_client, mock_sports_service):
        """Test GET /api/sports/brands/{brand_id} endpoint."""
        # Unpack the mock service
        _, mock_service = mock_sports_service
        
        # Set up mock response
        brand_id = str(uuid.uuid4())
        mock_brand = Brand(
            id=brand_id,
            name="Test Brand",
            description="Test Description",
            logo_url="https://example.com/logo.png",
            website="https://example.com"
        )
        mock_service.brand_service.get_by_id.return_value = mock_brand
        
        # Make the request
        response = test_client.get(f"/api/sports/brands/{brand_id}")
        
        # Assert response
        assert response.status_code == 200
        assert response.json()["id"] == brand_id
        assert response.json()["name"] == "Test Brand"
        
        # Assert the service was called correctly
        mock_service.brand_service.get_by_id.assert_called_once_with(brand_id)

    async def test_get_brand_by_id_not_found(self, test_client, mock_sports_service):
        """Test GET /api/sports/brands/{brand_id} with non-existent ID."""
        # Unpack the mock service
        _, mock_service = mock_sports_service
        
        # Set up mock response for not found
        brand_id = str(uuid.uuid4())
        mock_service.brand_service.get_by_id.return_value = None
        
        # Make the request
        response = test_client.get(f"/api/sports/brands/{brand_id}")
        
        # Assert response
        assert response.status_code == 404
        assert "detail" in response.json()
        
        # Assert the service was called correctly
        mock_service.brand_service.get_by_id.assert_called_once_with(brand_id)

    async def test_create_brand(self, test_client, mock_sports_service):
        """Test POST /api/sports/brands endpoint."""
        # Unpack the mock service
        _, mock_service = mock_sports_service
        
        # Set up mock response
        brand_id = str(uuid.uuid4())
        brand_data = {
            "name": "New Brand",
            "description": "New Description",
            "logo_url": "https://example.com/newlogo.png",
            "website": "https://newexample.com"
        }
        
        mock_created_brand = Brand(
            id=brand_id,
            **brand_data
        )
        mock_service.brand_service.create.return_value = mock_created_brand
        
        # Make the request
        response = test_client.post("/api/sports/brands", json=brand_data)
        
        # Assert response
        assert response.status_code == 201
        assert response.json()["id"] == brand_id
        assert response.json()["name"] == "New Brand"
        
        # Assert the service was called correctly (the argument would be a Pydantic model, not directly comparable)
        mock_service.brand_service.create.assert_called_once()

    async def test_update_brand(self, test_client, mock_sports_service):
        """Test PUT /api/sports/brands/{brand_id} endpoint."""
        # Unpack the mock service
        _, mock_service = mock_sports_service
        
        # Set up mock response
        brand_id = str(uuid.uuid4())
        update_data = {
            "name": "Updated Brand",
            "description": "Updated Description"
        }
        
        mock_updated_brand = Brand(
            id=brand_id,
            name="Updated Brand",
            description="Updated Description",
            logo_url="https://example.com/logo.png",
            website="https://example.com"
        )
        mock_service.brand_service.update.return_value = mock_updated_brand
        
        # Make the request
        response = test_client.put(f"/api/sports/brands/{brand_id}", json=update_data)
        
        # Assert response
        assert response.status_code == 200
        assert response.json()["id"] == brand_id
        assert response.json()["name"] == "Updated Brand"
        
        # Assert the service was called correctly (the argument would be a Pydantic model)
        mock_service.brand_service.update.assert_called_once()

    async def test_delete_brand(self, test_client, mock_sports_service):
        """Test DELETE /api/sports/brands/{brand_id} endpoint."""
        # Unpack the mock service
        _, mock_service = mock_sports_service
        
        # Set up mock response
        brand_id = str(uuid.uuid4())
        mock_service.brand_service.delete.return_value = True
        
        # Make the request
        response = test_client.delete(f"/api/sports/brands/{brand_id}")
        
        # Assert response
        assert response.status_code == 204
        
        # Assert the service was called correctly
        mock_service.brand_service.delete.assert_called_once_with(brand_id)


class TestLeagueEndpoints:
    """Tests for league endpoints."""

    async def test_get_leagues(self, test_client, mock_sports_service):
        """Test GET /api/sports/leagues endpoint."""
        # Unpack the mock service
        _, mock_service = mock_sports_service
        
        # Set up mock response
        league_id = str(uuid.uuid4())
        mock_leagues = [
            League(
                id=league_id,
                name="Test League",
                sport="Football",
                country="USA",
                level="Professional"
            )
        ]
        mock_service.league_service.get_all.return_value = mock_leagues
        
        # Make the request
        response = test_client.get("/api/sports/leagues")
        
        # Assert response
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["id"] == league_id
        assert response.json()[0]["name"] == "Test League"
        
        # Assert the service was called correctly
        mock_service.league_service.get_all.assert_called_once()


class TestTeamEndpoints:
    """Tests for team endpoints."""

    async def test_get_teams_by_league(self, test_client, mock_sports_service):
        """Test GET /api/sports/leagues/{league_id}/teams endpoint."""
        # Unpack the mock service
        _, mock_service = mock_sports_service
        
        # Set up mock response
        league_id = str(uuid.uuid4())
        team_id = str(uuid.uuid4())
        mock_teams = [
            Team(
                id=team_id,
                name="Test Team",
                city="Test City",
                league_id=league_id
            )
        ]
        mock_service.team_service.get_by_league.return_value = mock_teams
        
        # Make the request
        response = test_client.get(f"/api/sports/leagues/{league_id}/teams")
        
        # Assert response
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["id"] == team_id
        assert response.json()[0]["name"] == "Test Team"
        
        # Assert the service was called correctly
        mock_service.team_service.get_by_league.assert_called_once_with(league_id)