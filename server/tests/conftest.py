import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh SQLite in-memory database for each test.

    Uses StaticPool so that the single in-memory connection is shared
    across the session and all dependents — preventing tables from
    disappearing after commit() on SQLite :memory:.
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # StaticPool + create_all has a quirk in some SQLAlchemy versions
    # where the table-check query sees a stale pool connection.
    # Work around it by creating tables inside a connection.
    with engine.connect() as conn:
        Base.metadata.create_all(bind=conn)
        conn.commit()

    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Drop tables on the same connection to ensure they are cleaned up
        with engine.connect() as conn:
            Base.metadata.drop_all(bind=conn)
            conn.commit()


@pytest.fixture
def client(db_session):
    """Test client with database dependency override."""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()