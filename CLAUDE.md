# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend
```bash
# Start backend (from /Coding/Pairman/backend/)
/Users/nigellowry/Coding/Pairman/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000

# Install dependencies
pip install -r backend/requirements.txt

# Run a specific migration manually
cd backend && alembic upgrade head
```

### Frontend
```bash
# Start dev server (from /Coding/Pairman/frontend/)
npm run dev

# Build for production
npm run build
```

### Docker (production)
```bash
docker compose up --build
```

## Architecture

### Overview
Pairman is a self-hosted smart home pairing code manager. It stores QR codes and pairing codes for Matter, HomeKit, Z-Wave, Zigbee, and similar protocols. No authentication — designed for trusted local networks only.

### Request Flow
- **Dev**: Frontend (Vite dev server, HTTPS) → proxy `/api` → FastAPI on port 8000
- **Prod**: All served by FastAPI; built frontend static files served from `backend/frontend/dist`

### Backend (`backend/app/`)
- **main.py** — FastAPI app; lifespan handler runs Alembic migrations on startup, creates `data/` dir
- **config.py** — Settings via `PAIRMAN_*` env vars; `PAIRMAN_DB_URL` supports SQLite (default) or PostgreSQL
- **database.py** — SQLAlchemy engine + `get_db()` dependency
- **models/** — SQLAlchemy ORM: `Home → Room → Device`, plus `Manufacturer`, `Tag` (many-to-many), `CustomField`, `Attachment`
- **schemas/** — Pydantic v2 request/response models; `DeviceRead` has a `derived_qr_data` computed field
- **routers/** — 12 routers mounted at `/api/v1`; `devices.py` is largest (CRUD + QR generation + label PDF + CSV/JSON import-export)
- **services/**
  - `matter_parser.py` — Full Matter QR spec (Base38 decode, bit-level parsing, Verhoeff checksum). `decode_payload()` handles Matter QR, HomeKit, and Z-Wave. Returns 11-digit Manual Pairing Code (what's on physical labels), not raw passcode.
  - `label_service.py` — ReportLab PDF generation; 6 Avery templates (L7160, L7161, L7163, L7164, L4732, Custom)
  - `qr_service.py` — PNG QR code generation via `qrcode` + PIL
  - `backup_service.py` — SQLite file backup/restore with integrity check

### Frontend (`frontend/src/`)
- **App.tsx** — React Router v6 routes: `/dashboard`, `/devices`, `/devices/new`, `/devices/bulk-add`, `/devices/:id`, `/devices/:id/edit`, `/labels`, `/settings`
- **services/api.ts** — Axios wrapper for all API calls, base URL `/api/v1`
- **components/Scanner.tsx** — Camera QR scanning via native `getUserMedia` + jsQR. Requires HTTPS + `playsInline` + `100dvh` for iOS Safari. Do NOT replace with html5-qrcode (breaks on iOS).
- **pages/** — 8 pages; notable ones:
  - `AddDevice.tsx` / `BulkAdd.tsx` — include the Scanner component, auto-detect protocol from QR
  - `Labels.tsx` — filter + select devices, choose Avery template, download PDF
  - `Settings.tsx` — manage Homes/Rooms/Manufacturers/Tags, import/export, backup/restore
- **hooks/useTheme.ts** — Dark mode toggle; persisted to localStorage, applied as `dark` class on `<html>`

### Data Directory
`/data/pairman.db` (SQLite) and attachments are stored here. Mounted as a Docker volume.

## Key Technical Notes

- **Matter Manual Pairing Code**: The 11-digit code (e.g. `3251-063-1299`) is computed from discriminator + passcode + Verhoeff check digit. This is what physical labels show. `pairing_code_to_qr_payload()` is best-effort (lower 8 bits of discriminator are unknown when reconstructing from the manual code).
- **`@vitejs/plugin-basic-ssl`** must stay at v1.x — not compatible with later versions under Vite 5.
- **Alembic migrations** run automatically at startup; no need to run manually during development unless adding new models.
- **Dark mode** uses Tailwind's `class` strategy — toggle by adding/removing `dark` on `<html>`.
