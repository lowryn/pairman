import csv
import io
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Device, Home, Room, Manufacturer
from ..schemas import DeviceCreate, DeviceUpdate, DeviceRead
from ..services.qr_service import generate_qr_png
from ..services.label_service import generate_single_label

router = APIRouter(prefix="/devices", tags=["devices"])

# CSV column order (human-readable, no internal IDs)
_CSV_FIELDS = [
    "name", "home", "room", "manufacturer", "model", "device_type", "protocol",
    "pairing_code", "qr_code_data", "setup_code_type", "serial_number",
    "mac_address", "firmware_version", "admin_url", "purchase_date",
    "retailer", "warranty_expiry", "notes",
]


def _device_to_row(device: Device, db: Session) -> dict:
    home = db.get(Home, device.home_id) if device.home_id else None
    room = db.get(Room, device.room_id) if device.room_id else None
    mfr  = db.get(Manufacturer, device.manufacturer_id) if device.manufacturer_id else None
    return {
        "name":             device.name,
        "home":             home.name if home else "",
        "room":             room.name if room else "",
        "manufacturer":     mfr.name  if mfr  else "",
        "model":            device.model or "",
        "device_type":      device.device_type or "",
        "protocol":         device.protocol or "",
        "pairing_code":     device.pairing_code or "",
        "qr_code_data":     device.qr_code_data or "",
        "setup_code_type":  device.setup_code_type or "",
        "serial_number":    device.serial_number or "",
        "mac_address":      device.mac_address or "",
        "firmware_version": device.firmware_version or "",
        "admin_url":        device.admin_url or "",
        "purchase_date":    str(device.purchase_date) if device.purchase_date else "",
        "retailer":         device.retailer or "",
        "warranty_expiry":  str(device.warranty_expiry) if device.warranty_expiry else "",
        "notes":            device.notes or "",
    }


def _resolve_home(name: str, db: Session) -> str | None:
    if not name:
        return None
    home = db.query(Home).filter(Home.name == name).first()
    if not home:
        home = Home(id=str(uuid.uuid4()), name=name)
        db.add(home)
        db.flush()
    return home.id


def _resolve_room(name: str, home_id: str | None, db: Session) -> str | None:
    if not name or not home_id:
        return None
    room = db.query(Room).filter(Room.name == name, Room.home_id == home_id).first()
    if not room:
        room = Room(id=str(uuid.uuid4()), name=name, home_id=home_id)
        db.add(room)
        db.flush()
    return room.id


def _resolve_manufacturer(name: str, db: Session) -> str | None:
    if not name:
        return None
    mfr = db.query(Manufacturer).filter(Manufacturer.name == name).first()
    if not mfr:
        mfr = Manufacturer(id=str(uuid.uuid4()), name=name)
        db.add(mfr)
        db.flush()
    return mfr.id


def _row_to_device(row: dict, db: Session) -> Device:
    home_id = _resolve_home(row.get("home", ""), db)
    room_id = _resolve_room(row.get("room", ""), home_id, db)
    mfr_id  = _resolve_manufacturer(row.get("manufacturer", ""), db)
    return Device(
        id=str(uuid.uuid4()),
        name=row.get("name", "Unnamed"),
        home_id=home_id or "",
        room_id=room_id,
        manufacturer_id=mfr_id,
        model=row.get("model") or None,
        device_type=row.get("device_type") or None,
        protocol=row.get("protocol") or None,
        pairing_code=row.get("pairing_code") or None,
        qr_code_data=row.get("qr_code_data") or None,
        setup_code_type=row.get("setup_code_type") or None,
        serial_number=row.get("serial_number") or None,
        mac_address=row.get("mac_address") or None,
        firmware_version=row.get("firmware_version") or None,
        admin_url=row.get("admin_url") or None,
        purchase_date=row.get("purchase_date") or None,
        retailer=row.get("retailer") or None,
        warranty_expiry=row.get("warranty_expiry") or None,
        notes=row.get("notes") or None,
    )


# ── Export ──────────────────────────────────────────────────────────────────

@router.get("/export")
def export_devices(format: str = Query("json"), db: Session = Depends(get_db)):
    devices = db.query(Device).order_by(Device.name).all()
    rows = [_device_to_row(d, db) for d in devices]

    if format == "csv":
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=_CSV_FIELDS)
        writer.writeheader()
        writer.writerows(rows)
        return Response(
            content=buf.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=pairman-export.csv"},
        )

    return Response(
        content=json.dumps(rows, indent=2, default=str),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=pairman-export.json"},
    )


# ── Import ──────────────────────────────────────────────────────────────────

@router.post("/import")
async def import_devices(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    filename = (file.filename or "").lower()

    try:
        if filename.endswith(".csv"):
            text = content.decode("utf-8-sig")  # handle BOM from Excel
            reader = csv.DictReader(io.StringIO(text))
            rows = list(reader)
        elif filename.endswith(".json"):
            rows = json.loads(content)
            if isinstance(rows, dict):
                rows = [rows]
        else:
            raise HTTPException(status_code=400, detail="File must be .csv or .json")
    except (UnicodeDecodeError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=400, detail=f"Could not parse file: {e}")

    if not rows:
        return {"imported": 0, "skipped": 0}

    imported = 0
    skipped = 0
    for row in rows:
        if not row.get("name"):
            skipped += 1
            continue
        try:
            device = _row_to_device(row, db)
            db.add(device)
            imported += 1
        except Exception:
            skipped += 1

    db.commit()
    return {"imported": imported, "skipped": skipped}


# ── Standard CRUD ────────────────────────────────────────────────────────────

@router.get("", response_model=list[DeviceRead])
def list_devices(
    home_id: str | None = Query(None),
    room_id: str | None = Query(None),
    device_type: str | None = Query(None),
    protocol: str | None = Query(None),
    manufacturer_id: str | None = Query(None),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Device)
    if home_id:
        q = q.filter(Device.home_id == home_id)
    if room_id:
        q = q.filter(Device.room_id == room_id)
    if device_type:
        q = q.filter(Device.device_type == device_type)
    if protocol:
        q = q.filter(Device.protocol == protocol)
    if manufacturer_id:
        q = q.filter(Device.manufacturer_id == manufacturer_id)
    if search:
        like = f"%{search}%"
        q = q.filter(
            Device.name.ilike(like)
            | Device.model.ilike(like)
            | Device.serial_number.ilike(like)
            | Device.pairing_code.ilike(like)
        )
    return q.order_by(Device.name).all()


@router.post("", response_model=DeviceRead, status_code=201)
def create_device(body: DeviceCreate, db: Session = Depends(get_db)):
    device = Device(**body.model_dump())
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


@router.get("/{device_id}", response_model=DeviceRead)
def get_device(device_id: str, db: Session = Depends(get_db)):
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@router.put("/{device_id}", response_model=DeviceRead)
def update_device(device_id: str, body: DeviceUpdate, db: Session = Depends(get_db)):
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(device, key, value)
    db.commit()
    db.refresh(device)
    return device


@router.delete("/{device_id}", status_code=204)
def delete_device(device_id: str, db: Session = Depends(get_db)):
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    db.delete(device)
    db.commit()


@router.get("/{device_id}/qr")
def get_device_qr(device_id: str, db: Session = Depends(get_db)):
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    data = device.qr_code_data or device.pairing_code
    if not data:
        raise HTTPException(status_code=422, detail="Device has no QR or pairing code data")
    png = generate_qr_png(data)
    return Response(content=png, media_type="image/png")


@router.get("/{device_id}/label")
def get_device_label(device_id: str, db: Session = Depends(get_db)):
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    pdf = generate_single_label(device)
    return Response(content=pdf, media_type="application/pdf")
