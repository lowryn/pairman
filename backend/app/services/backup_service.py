import shutil
from pathlib import Path
from ..config import settings


def create_backup() -> Path:
    db_path = Path(settings.db_url.replace("sqlite:///", ""))
    backup_path = settings.data_dir / "pairman-backup.db"
    shutil.copy2(db_path, backup_path)
    return backup_path


def restore_backup(data: bytes) -> None:
    db_path = Path(settings.db_url.replace("sqlite:///", ""))
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db_path.write_bytes(data)
