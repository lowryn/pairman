from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from alembic.config import Config
from alembic import command

from .config import settings
from .database import engine, Base
from . import models  # ensure all models are registered  # noqa: F401
from .routers import homes, rooms, manufacturers, devices, scan, labels, backup, stats, attachments, custom_fields, tags


def _run_migrations():
    alembic_cfg = Config(str(Path(__file__).parent.parent / "alembic.ini"))
    alembic_cfg.set_main_option("sqlalchemy.url", settings.db_url)
    alembic_cfg.set_main_option("script_location", str(Path(__file__).parent.parent / "alembic"))
    command.upgrade(alembic_cfg, "head")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    _run_migrations()
    yield


app = FastAPI(
    title="Pairman",
    description="Self-hosted smart home pairing code manager",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"
app.include_router(homes.router, prefix=API_PREFIX)
app.include_router(rooms.router, prefix=API_PREFIX)
app.include_router(manufacturers.router, prefix=API_PREFIX)
app.include_router(labels.router, prefix=API_PREFIX)
app.include_router(devices.router, prefix=API_PREFIX)
app.include_router(scan.router, prefix=API_PREFIX)
app.include_router(backup.router, prefix=API_PREFIX)
app.include_router(stats.router, prefix=API_PREFIX)
app.include_router(attachments.router, prefix=API_PREFIX)
app.include_router(custom_fields.router, prefix=API_PREFIX)
app.include_router(tags.router, prefix=API_PREFIX)

# Serve built frontend (production)
_frontend = Path(__file__).parent.parent.parent / "frontend" / "dist"
if _frontend.exists():
    app.mount("/", StaticFiles(directory=str(_frontend), html=True), name="frontend")
