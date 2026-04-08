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

MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB
CHUNK_SIZE = 1024 * 1024             # 1 MB

# Allow-list of MIME prefixes/values. Anything else → application/octet-stream.
_ALLOWED_MIME = {
    "image/png", "image/jpeg", "image/gif", "image/webp", "image/heic", "image/heif",
    "application/pdf", "text/plain", "text/csv",
}


def _safe_mime(content_type: str | None) -> str:
    if not content_type:
        return "application/octet-stream"
    ct = content_type.split(";")[0].strip().lower()
    return ct if ct in _ALLOWED_MIME else "application/octet-stream"


def _attachments_dir() -> Path:
    p = settings.data_dir / "attachments"
    p.mkdir(parents=True, exist_ok=True)
    return p


def _resolve_attachment_path(attachment_id: str) -> Path:
    """Always build the path from the attachment UUID rooted at data_dir/attachments.
    Never trust a stored file_path column — guards against path traversal if the DB
    is ever restored from an untrusted backup."""
    # UUIDs only — reject anything else defensively.
    try:
        uuid.UUID(attachment_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid attachment id")
    base = _attachments_dir().resolve()
    path = (base / attachment_id).resolve()
    if base not in path.parents and path != base:
        raise HTTPException(status_code=400, detail="Invalid attachment path")
    return path


@router.post("/devices/{device_id}/attachments", response_model=AttachmentRead, status_code=201)
async def upload_attachment(
    device_id: str,
    file: UploadFile = File(...),
    description: str = Form(None),
    db: Session = Depends(get_db),
):
    if not db.get(Device, device_id):
        raise HTTPException(status_code=404, detail="Device not found")

    attachment_id = str(uuid.uuid4())
    file_path = _resolve_attachment_path(attachment_id)

    # Stream to disk in chunks, enforce size limit
    total = 0
    try:
        with file_path.open("wb") as out:
            while True:
                chunk = await file.read(CHUNK_SIZE)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    out.close()
                    file_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds maximum size of {MAX_UPLOAD_BYTES // (1024*1024)} MB",
                    )
                out.write(chunk)
    except HTTPException:
        raise
    except Exception:
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Failed to write upload")

    attachment = Attachment(
        id=attachment_id,
        device_id=device_id,
        filename=file.filename or "upload",
        file_path=str(file_path),
        file_type=_safe_mime(file.content_type),
        file_size=total,
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
    path = _resolve_attachment_path(attachment_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(str(path), media_type=att.file_type, filename=att.filename)


@router.delete("/attachments/{attachment_id}", status_code=204)
def delete_attachment(attachment_id: str, db: Session = Depends(get_db)):
    att = db.get(Attachment, attachment_id)
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")
    # Delete DB row first. If this fails the file stays — better than an
    # orphaned row pointing at a missing file.
    db.delete(att)
    db.commit()
    try:
        _resolve_attachment_path(attachment_id).unlink(missing_ok=True)
    except Exception:
        # Best effort — row is already gone.
        pass
