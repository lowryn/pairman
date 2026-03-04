from datetime import datetime
from pydantic import BaseModel


class HomeBase(BaseModel):
    name: str
    description: str | None = None


class HomeCreate(HomeBase):
    pass


class HomeUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class HomeRead(HomeBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
