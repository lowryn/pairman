import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class Home(Base):
    __tablename__ = "homes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    rooms: Mapped[list["Room"]] = relationship("Room", back_populates="home", cascade="all, delete-orphan")
    devices: Mapped[list["Device"]] = relationship("Device", back_populates="home", cascade="all, delete-orphan")
