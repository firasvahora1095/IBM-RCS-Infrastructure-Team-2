import os
from contextlib import contextmanager
from typing import Iterator

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker


load_dotenv()


def require_environment_variable(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


engine = create_engine(
    require_environment_variable("DATABASE_URL"),
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)


@contextmanager
def database_session() -> Iterator[Session]:
    """Provide a transaction-scoped session for scripts and later backend services."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
