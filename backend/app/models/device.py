import enum
import uuid
from datetime import datetime, date
from sqlalchemy import String, Text, ForeignKey, DateTime, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class Protocol(str, enum.Enum):
    MATTER = "Matter"
    HOMEKIT = "HomeKit"
    ZWAVE = "Z-Wave"
    ZIGBEE = "Zigbee"
    WIFI = "WiFi"
    BLUETOOTH = "Bluetooth"
    THREAD = "Thread"
    OTHER = "Other"


class DeviceType(str, enum.Enum):
    LIGHT = "Light"
    SWITCH = "Switch"
    PLUG = "Plug"
    DIMMER = "Dimmer"
    SENSOR = "Sensor"
    THERMOSTAT = "Thermostat"
    LOCK = "Lock"
    CAMERA = "Camera"
    DOORBELL = "Doorbell"
    SPEAKER = "Speaker"
    BLIND_SHADE = "Blind/Shade"
    FAN = "Fan"
    GARAGE_DOOR = "Garage Door"
    BRIDGE_HUB = "Bridge/Hub"
    REMOTE_BUTTON = "Remote/Button"
    AIR_PURIFIER = "Air Purifier"
    SMOKE_DETECTOR = "Smoke Detector"
    CO2_DETECTOR = "CO2 Detector"
    MOTION_SENSOR = "Motion Sensor"
    CONTACT_SENSOR = "Contact Sensor"
    WATER_LEAK_SENSOR = "Water Leak Sensor"
    SECURITY_SYSTEM = "Security System"
    TV_DISPLAY = "TV/Display"
    ROBOT_VACUUM = "Robot Vacuum"
    OTHER = "Other"


class SetupCodeType(str, enum.Enum):
    QR = "QR"
    NFC = "NFC"
    MANUAL = "Manual"
    BARCODE = "Barcode"
    OTHER = "Other"


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    home_id: Mapped[str] = mapped_column(String, ForeignKey("homes.id"), nullable=False, index=True)
    room_id: Mapped[str | None] = mapped_column(String, ForeignKey("rooms.id"), nullable=True, index=True)
    manufacturer_id: Mapped[str | None] = mapped_column(String, ForeignKey("manufacturers.id"), nullable=True, index=True)
    model: Mapped[str | None] = mapped_column(String, nullable=True)
    device_type: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    protocol: Mapped[str | None] = mapped_column(String, nullable=True, index=True)

    pairing_code: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    qr_code_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    barcode_image: Mapped[str | None] = mapped_column(String, nullable=True)
    setup_code_type: Mapped[str | None] = mapped_column(String, nullable=True)

    serial_number: Mapped[str | None] = mapped_column(String, nullable=True)
    mac_address: Mapped[str | None] = mapped_column(String, nullable=True)
    firmware_version: Mapped[str | None] = mapped_column(String, nullable=True)
    admin_url: Mapped[str | None] = mapped_column(String, nullable=True)
    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    retailer: Mapped[str | None] = mapped_column(String, nullable=True)
    warranty_expiry: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    custom_image: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    home: Mapped["Home"] = relationship("Home", back_populates="devices")
    room: Mapped["Room"] = relationship("Room", back_populates="devices")
    manufacturer: Mapped["Manufacturer"] = relationship("Manufacturer", back_populates="devices")
    custom_fields: Mapped[list["CustomField"]] = relationship("CustomField", back_populates="device", cascade="all, delete-orphan")
    attachments: Mapped[list["Attachment"]] = relationship("Attachment", back_populates="device", cascade="all, delete-orphan")
    tags: Mapped[list["Tag"]] = relationship("Tag", secondary="device_tags", lazy="selectin")
