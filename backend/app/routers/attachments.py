import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Attachment, Device
from ..schemas import AttachmentRead

router = APIRouter(tags=["attachments"])


@router.post("/devices/{device_id}/attachments", response_model=AttachmentRead, status_code=201)
async def upload_attachment(
    device_id: str,
    file: UploadFile = File(...),
    description: str = Form(None),
    db: Session = Depends(get_db),
):
    if not db.get(Device, device_id):
        raise HTTPException(status_code=404, detail="Device not found")

    data = await file.read()
    attachment_id = str(uuid.uuid4())

    upload_dir = settings.data_dir / "attachments"
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / attachment_id
    file_path.write_bytes(data)

    attachment = Attachment(
        id=attachment_id,
        device_id=device_id,
        filename=file.filename or "upload",
        file_path=str(file_path),
        file_type=file.content_type or "application/octet-stream",
        file_size=len(data),
        description=description,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


@router.get("/devices/{device_id}/attachments", response_model=list[AttachmentRead])
def list_attachments(device_id: str, db: Session = Depends(get_db)):
    if not db.get(Device, device_id):
        raise HTTPException(status_code=404, detail="Device not found")
    return (
        db.query(Attachment)
        .filter(Attachment.device_id == device_id)
        .order_by(Attachment.created_at)
        .all()
    )


@router.get("/attachments/{attachment_id}/download")
def download_attachment(attachment_id: str, db: Session = Depends(get_db)):
    att = db.get(Attachment, attachment_id)
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")
    path = Path(att.file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(str(path), media_type=att.file_type, filename=att.filename)


@router.delete("/attachments/{attachment_id}", status_code=204)
def delete_attachment(attachment_id: str, db: Session = Depends(get_db)):
    att = db.get(Attachment, attachment_id)
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")
    Path(att.file_path).unlink(missing_ok=True)
    db.delete(att)
    db.commit()
