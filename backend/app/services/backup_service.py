import shutil
import sqlite3
from pathlib import Path
from ..config import settings

_SQLITE_MAGIC = b"SQLite format 3\x00"


def create_backup() -> Path:
    db_path = Path(settings.db_url.replace("sqlite:///", ""))
    backup_path = settings.data_dir / "pairman-backup.db"
    shutil.copy2(db_path, backup_path)
    return backup_path


def restore_backup(data: bytes) -> None:
    if not data.startswith(_SQLITE_MAGIC):
        raise ValueError("Not a valid SQLite database file")

    db_path = Path(settings.db_url.replace("sqlite:///", ""))
    db_path.parent.mkdir(parents=True, exist_ok=True)

    # Write to a temp file and integrity-check before touching the live DB
    tmp_path = db_path.with_suffix(".restore_tmp")
    tmp_path.write_bytes(data)
    try:
        conn = sqlite3.connect(str(tmp_path))
        result = conn.execute("PRAGMA integrity_check").fetchone()
        conn.close()
        if result[0] != "ok":
            raise ValueError(f"Integrity check failed: {result[0]}")
    except sqlite3.Error as e:
        tmp_path.unlink(missing_ok=True)
        raise ValueError(f"Could not open database: {e}")

    # Drop all SQLAlchemy connections, then atomically replace the DB file
    from ..database import engine
    engine.dispose()
    tmp_path.replace(db_path)
