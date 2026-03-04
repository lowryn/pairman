from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from .config import settings


def _connect_args() -> dict:
    if "sqlite" in settings.db_url:
        return {"check_same_thread": False}
    return {}


engine = create_engine(settings.db_url, connect_args=_connect_args())
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
