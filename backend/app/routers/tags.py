from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Device
from ..models.tag import Tag

router = APIRouter(tags=["tags"])


class TagsUpdate(BaseModel):
    tags: list[str]


class TagRename(BaseModel):
    name: str


@router.get("/tags")
def list_tags(db: Session = Depends(get_db)) -> list[str]:
    return [t.name for t in db.query(Tag).order_by(Tag.name).all()]


@router.put("/tags/{tag_name}")
def rename_tag(tag_name: str, body: TagRename, db: Session = Depends(get_db)) -> str:
    tag = db.query(Tag).filter(Tag.name == tag_name).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    if db.query(Tag).filter(Tag.name == body.name).first():
        raise HTTPException(status_code=409, detail="Tag name already exists")
    tag.name = body.name.strip()
    db.commit()
    return tag.name


@router.delete("/tags/{tag_name}", status_code=204)
def delete_tag(tag_name: str, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.name == tag_name).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.delete(tag)
    db.commit()


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
