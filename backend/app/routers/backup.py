from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from ..services.backup_service import create_backup, restore_backup

router = APIRouter(prefix="/backup", tags=["backup"])


@router.get("")
def backup():
    path = create_backup()
    return FileResponse(path, media_type="application/octet-stream", filename="pairman-backup.db")


@router.post("/restore")
async def restore(file: UploadFile = File(...)):
    data = await file.read()
    try:
        restore_backup(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "Restore successful"}
