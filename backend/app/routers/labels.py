from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from ..models import Device
from ..services.label_service import generate_label_sheet

router = APIRouter(prefix="/devices", tags=["labels"])


@router.get("/labels")
def get_label_sheet(
    home_id: str | None = Query(None),
    room_id: str | None = Query(None),
    protocol: str | None = Query(None),
    device_type: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Device)
    if home_id:
        q = q.filter(Device.home_id == home_id)
    if room_id:
        q = q.filter(Device.room_id == room_id)
    if protocol:
        q = q.filter(Device.protocol == protocol)
    if device_type:
        q = q.filter(Device.device_type == device_type)
    devices = q.options(
        joinedload(Device.room),
        joinedload(Device.manufacturer),
    ).order_by(Device.name).all()
    pdf = generate_label_sheet(devices)
    return Response(content=pdf, media_type="application/pdf")
