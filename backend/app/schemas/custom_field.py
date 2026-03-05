from datetime import datetime
from pydantic import BaseModel


class CustomFieldCreate(BaseModel):
    key: str
    value: str


class CustomFieldUpdate(BaseModel):
    key: str | None = None
    value: str | None = None


class CustomFieldRead(BaseModel):
    id: str
    device_id: str
    key: str
    value: str
    created_at: datetime

    model_config = {"from_attributes": True}
