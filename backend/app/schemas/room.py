from datetime import datetime
from pydantic import BaseModel


class RoomBase(BaseModel):
    home_id: str
    name: str
    icon: str | None = None


class RoomCreate(RoomBase):
    pass


class RoomUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None


class RoomRead(RoomBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
