import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv()


def get_environment_variable(variable_name):
    value = os.getenv(variable_name)

    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {variable_name}"
        )

    return value


engine = create_engine(get_environment_variable("DATABASE_URL"))
SessionLocal = sessionmaker(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
