"""
Pytest configuration file for SheetGPT tests.
"""
import os
import sys
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient

# Add the src directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import app and database utilities
from src.main import app
from src.utils.database import get_db, Base

# Create test database URL
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sheetgpt_test"
)

# Create test engine and session
engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def db_engine():
    """Create and return a test database engine."""
    # Create the test database tables
    Base.metadata.create_all(bind=engine)
    
    yield engine
    
    # Drop all tables after tests are complete
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Return a test database session."""
    # Create a new connection for each test function
    connection = db_engine.connect()
    
    # Begin a transaction
    transaction = connection.begin()
    
    # Create a session bound to the connection
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    # Rollback the transaction and close the connection
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Return a FastAPI test client with overridden database dependency."""
    # Override the get_db dependency to use the test database
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    # Create test client
    with TestClient(app) as client:
        yield client
    
    # Reset the dependency override
    app.dependency_overrides = {}


@pytest.fixture(scope="function")
def auth_client(client):
    """Return an authenticated test client."""
    # Test user credentials
    credentials = {
        "email": "test@example.com",
        "password": "testpassword"
    }
    
    # Create test user if it doesn't exist
    response = client.post("/api/auth/register", json={
        **credentials,
        "name": "Test User",
        "confirm_password": "testpassword"
    })
    
    # Get auth token
    response = client.post("/api/auth/login", data=credentials)
    token = response.json()["access_token"]
    
    # Add auth header to all requests
    client.headers["Authorization"] = f"Bearer {token}"
    
    return client


@pytest.fixture(scope="function")
def test_data_factory(db_session):
    """Factory fixture for creating test data."""
    created_data = []
    
    def _create_entity(entity_class, **kwargs):
        """Create a test entity and store it for cleanup."""
        entity = entity_class(**kwargs)
        db_session.add(entity)
        db_session.commit()
        db_session.refresh(entity)
        created_data.append(entity)
        return entity
    
    yield _create_entity
    
    # Clean up created data
    for entity in reversed(created_data):  # Reverse to handle dependencies
        db_session.delete(entity)
    
    db_session.commit()