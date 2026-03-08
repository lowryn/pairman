from datetime import datetime, date
from pydantic import BaseModel, field_validator


class DeviceBase(BaseModel):
    name: str
    home_id: str
    room_id: str | None = None
    manufacturer_id: str | None = None
    model: str | None = None
    device_type: str | None = None
    protocol: str | None = None
    pairing_code: str | None = None
    qr_code_data: str | None = None
    setup_code_type: str | None = None
    serial_number: str | None = None
    mac_address: str | None = None
    firmware_version: str | None = None
    admin_url: str | None = None
    purchase_date: date | None = None
    retailer: str | None = None
    warranty_expiry: date | None = None
    notes: str | None = None


class DeviceCreate(DeviceBase):
    pass


class DeviceUpdate(BaseModel):
    name: str | None = None
    room_id: str | None = None
    manufacturer_id: str | None = None
    model: str | None = None
    device_type: str | None = None
    protocol: str | None = None
    pairing_code: str | None = None
    qr_code_data: str | None = None
    setup_code_type: str | None = None
    serial_number: str | None = None
    mac_address: str | None = None
    firmware_version: str | None = None
    admin_url: str | None = None
    purchase_date: date | None = None
    retailer: str | None = None
    warranty_expiry: date | None = None
    notes: str | None = None


class DeviceRead(DeviceBase):
    id: str
    barcode_image: str | None = None
    custom_image: str | None = None
    thumbnail_attachment_id: str | None = None
    derived_qr_data: str | None = None
    tags: list[str] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_validator('tags', mode='before')
    @classmethod
    def coerce_tags(cls, v: list) -> list[str]:
        return [t.name if hasattr(t, 'name') else t for t in v]
