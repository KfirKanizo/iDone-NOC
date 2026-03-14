"""
Pytest configuration and fixtures for integration testing.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.types import Uuid, UUID as BaseUUID
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app
from app import models


# Tell SQLAlchemy to compile PostgreSQL UUID as VARCHAR(32) for SQLite
@compiles(PG_UUID, 'sqlite')
@compiles(BaseUUID, 'sqlite')
@compiles(Uuid, 'sqlite')
def compile_uuid_sqlite(type_, compiler, **kw):
    return "VARCHAR(32)"

# Tell SQLAlchemy to compile JSONB as TEXT for SQLite
@compiles(JSONB, 'sqlite')
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "TEXT"


# Create in-memory SQLite database for testing
TEST_DATABASE_URL = "sqlite:///:memory:"

# Create test engine
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# Create test session maker
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    """Override get_db to use test database."""
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def db_session():
    """
    Provides a fresh database session for each test.
    Creates all tables before the test and drops them after.
    """
    # Create all tables
    Base.metadata.create_all(bind=test_engine)
    
    # Create a new session for the test
    db = TestSessionLocal()
    
    try:
        yield db
    finally:
        db.close()
        # Drop all tables after the test
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db_session):
    """
    Provides a FastAPI TestClient with overridden dependencies.
    """
    # Override the get_db dependency to use test database
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    # Clear dependency overrides after test
    app.dependency_overrides.clear()
