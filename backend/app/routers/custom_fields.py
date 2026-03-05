from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import CustomField, Device
from ..schemas.custom_field import CustomFieldCreate, CustomFieldUpdate, CustomFieldRead

router = APIRouter(tags=["custom_fields"])


@router.get("/devices/{device_id}/fields", response_model=list[CustomFieldRead])
def list_fields(device_id: str, db: Session = Depends(get_db)):
    if not db.get(Device, device_id):
        raise HTTPException(status_code=404, detail="Device not found")
    return (
        db.query(CustomField)
        .filter(CustomField.device_id == device_id)
        .order_by(CustomField.created_at)
        .all()
    )


@router.post("/devices/{device_id}/fields", response_model=CustomFieldRead, status_code=201)
def create_field(device_id: str, body: CustomFieldCreate, db: Session = Depends(get_db)):
    if not db.get(Device, device_id):
        raise HTTPException(status_code=404, detail="Device not found")
    field = CustomField(device_id=device_id, key=body.key, value=body.value)
    db.add(field)
    db.commit()
    db.refresh(field)
    return field


@router.put("/fields/{field_id}", response_model=CustomFieldRead)
def update_field(field_id: str, body: CustomFieldUpdate, db: Session = Depends(get_db)):
    field = db.get(CustomField, field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(field, k, v)
    db.commit()
    db.refresh(field)
    return field


@router.delete("/fields/{field_id}", status_code=204)
def delete_field(field_id: str, db: Session = Depends(get_db)):
    field = db.get(CustomField, field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    db.delete(field)
    db.commit()
