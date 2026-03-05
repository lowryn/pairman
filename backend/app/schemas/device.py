from datetime import datetime, date
from pydantic import BaseModel


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
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
