from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Device
from ..services.label_service import generate_label_sheet

router = APIRouter(prefix="/devices", tags=["labels"])


@router.get("/labels")
def get_label_sheet(
    home_id: str | None = Query(None),
    room_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Device)
    if home_id:
        q = q.filter(Device.home_id == home_id)
    if room_id:
        q = q.filter(Device.room_id == room_id)
    devices = q.order_by(Device.name).all()
    pdf = generate_label_sheet(devices)
    return Response(content=pdf, media_type="application/pdf")
