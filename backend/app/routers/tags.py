from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Device
from ..models.tag import Tag

router = APIRouter(tags=["tags"])


class TagsUpdate(BaseModel):
    tags: list[str]


@router.get("/tags")
def list_tags(db: Session = Depends(get_db)) -> list[str]:
    return [t.name for t in db.query(Tag).order_by(Tag.name).all()]


@router.put("/devices/{device_id}/tags")
def set_device_tags(device_id: str, body: TagsUpdate, db: Session = Depends(get_db)) -> list[str]:
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    names = [n.strip() for n in body.tags if n.strip()]
    tags = []
    for name in names:
        tag = db.query(Tag).filter(Tag.name == name).first()
        if not tag:
            tag = Tag(name=name)
            db.add(tag)
            db.flush()
        tags.append(tag)

    device.tags = tags
    db.commit()
    return [t.name for t in device.tags]
