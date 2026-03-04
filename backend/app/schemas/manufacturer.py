from datetime import datetime
from pydantic import BaseModel


class ManufacturerBase(BaseModel):
    name: str
    website: str | None = None


class ManufacturerCreate(ManufacturerBase):
    pass


class ManufacturerUpdate(BaseModel):
    name: str | None = None
    website: str | None = None


class ManufacturerRead(ManufacturerBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
