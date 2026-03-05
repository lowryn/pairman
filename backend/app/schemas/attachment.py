from datetime import datetime
from pydantic import BaseModel


class AttachmentRead(BaseModel):
    id: str
    device_id: str
    filename: str
    file_type: str
    file_size: int
    description: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
