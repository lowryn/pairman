from fastapi import APIRouter, UploadFile, File
from fastapi.responses import FileResponse
from ..services.backup_service import create_backup, restore_backup

router = APIRouter(prefix="/backup", tags=["backup"])


@router.get("")
def backup():
    path = create_backup()
    return FileResponse(path, media_type="application/octet-stream", filename="pairman-backup.db")


@router.post("/restore", status_code=204)
async def restore(file: UploadFile = File(...)):
    data = await file.read()
    restore_backup(data)
