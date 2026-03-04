from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Device
from ..schemas import DeviceCreate, DeviceUpdate, DeviceRead
from ..services.qr_service import generate_qr_png
from ..services.label_service import generate_single_label

router = APIRouter(prefix="/devices", tags=["devices"])


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
