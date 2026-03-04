# Pairman — Self-Hosted Smart Home Pairing Code Manager

> "Spoolman for your smart home pairing codes"

## Project Overview

Pairman is a self-hosted web application for storing, organising, and managing smart home device pairing codes (Matter, HomeKit, Z-Wave, Zigbee, etc.). It runs in Docker and provides a clean web UI for scanning, cataloguing, and reprinting QR/barcode labels for all your smart home devices.

Think of it as a vault for every pairing code, setup QR, and manual code that comes with your smart home gear — so you never lose one again.

---

## Inspiration & References

- **Spoolman** (github.com/Donkie/Spoolman) — Architecture model: FastAPI backend, React frontend, SQLite/Postgres, Docker deployment, QR label printing, REST API
- **Barcodes Matter** (iOS app) — Feature model: scan & store Matter/HomeKit barcodes, categorise by type/room/home, print QR labels, multi-home support
- **HomePass** (iOS app) — Feature model: store HomeKit/Matter setup codes, QR code display, iCloud sync, export to PDF/CSV

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Backend | Python 3.11+ / FastAPI | REST API, mirrors Spoolman's approach |
| Database | SQLite (default), optional PostgreSQL | SQLite for simplicity, Postgres for scaling |
| ORM | SQLAlchemy | Database abstraction |
| Frontend | React + TypeScript | Single-page app |
| UI Framework | Ant Design or Tailwind + shadcn/ui | Clean, modern look |
| QR/Barcode | `python-barcode`, `qrcode`, `pyzbar` | Generation & decoding |
| Containerisation | Docker + docker-compose | Single container deployment |
| API Docs | OpenAPI/Swagger (auto via FastAPI) | Interactive API explorer |

---

## Data Model

### Home

Supports multiple homes/locations (e.g. Home, Office, Holiday Cabin).

```
Home
├── id: UUID (primary key)
├── name: string (e.g. "Main House", "Office")
├── description: string (optional)
├── created_at: datetime
└── updated_at: datetime
```

### Room / Location

```
Room
├── id: UUID (primary key)
├── home_id: UUID (foreign key → Home)
├── name: string (e.g. "Living Room", "Kitchen")
├── icon: string (optional, icon identifier)
├── created_at: datetime
└── updated_at: datetime
```

### Manufacturer

```
Manufacturer
├── id: UUID (primary key)
├── name: string (e.g. "IKEA", "Philips Hue", "Eve")
├── website: string (optional)
├── created_at: datetime
└── updated_at: datetime
```

### Device

The core entity — represents a single smart home device.

```
Device
├── id: UUID (primary key)
├── name: string (e.g. "Living Room Lamp", "Front Door Lock")
├── home_id: UUID (foreign key → Home)
├── room_id: UUID (foreign key → Room, optional)
├── manufacturer_id: UUID (foreign key → Manufacturer, optional)
├── model: string (optional, e.g. "TRADFRI LED Bulb E27")
├── device_type: enum (see Device Types below)
├── protocol: enum (Matter, HomeKit, Z-Wave, Zigbee, WiFi, Bluetooth, Thread, Other)
│
│   — Pairing Code Fields —
├── pairing_code: string (the manual numeric/alphanumeric pairing code)
├── qr_code_data: string (raw QR code payload, e.g. "MT:Y.K9042C00KA0648G00")
├── barcode_image: blob/path (stored image of scanned barcode, optional)
├── setup_code_type: enum (QR, NFC, Manual, Barcode, Other)
│
│   — Additional Device Info —
├── serial_number: string (optional)
├── mac_address: string (optional)
├── firmware_version: string (optional)
├── admin_url: string (optional, device admin/config URL)
├── purchase_date: date (optional)
├── retailer: string (optional)
├── warranty_expiry: date (optional)
├── notes: text (optional, free-form notes)
│
│   — Metadata —
├── custom_image: blob/path (optional, user photo of device or placement)
├── created_at: datetime
└── updated_at: datetime
```

### Device Types (enum)

```
Light, Switch, Plug, Dimmer, Sensor, Thermostat, Lock, Camera,
Doorbell, Speaker, Blind/Shade, Fan, Garage Door, Bridge/Hub,
Remote/Button, Air Purifier, Smoke Detector, CO2 Detector,
Motion Sensor, Contact Sensor, Water Leak Sensor, Security System,
TV/Display, Robot Vacuum, Other
```

### Custom Fields

Allow users to add arbitrary key-value metadata to any device.

```
CustomField
├── id: UUID (primary key)
├── device_id: UUID (foreign key → Device)
├── key: string
├── value: string
├── created_at: datetime
└── updated_at: datetime
```

### Attachment

File attachments per device (manuals, photos, receipts).

```
Attachment
├── id: UUID (primary key)
├── device_id: UUID (foreign key → Device)
├── filename: string
├── file_path: string
├── file_type: string (mime type)
├── description: string (optional)
├── created_at: datetime
└── updated_at: datetime
```

---

## REST API Endpoints

### Homes
```
GET    /api/v1/homes           — List all homes
POST   /api/v1/homes           — Create home
GET    /api/v1/homes/{id}      — Get home
PUT    /api/v1/homes/{id}      — Update home
DELETE /api/v1/homes/{id}      — Delete home
```

### Rooms
```
GET    /api/v1/rooms           — List rooms (filter by home_id)
POST   /api/v1/rooms           — Create room
GET    /api/v1/rooms/{id}      — Get room
PUT    /api/v1/rooms/{id}      — Update room
DELETE /api/v1/rooms/{id}      — Delete room
```

### Manufacturers
```
GET    /api/v1/manufacturers           — List manufacturers
POST   /api/v1/manufacturers           — Create manufacturer
GET    /api/v1/manufacturers/{id}      — Get manufacturer
PUT    /api/v1/manufacturers/{id}      — Update manufacturer
DELETE /api/v1/manufacturers/{id}      — Delete manufacturer
```

### Devices
```
GET    /api/v1/devices                 — List devices (filter by home, room, type, protocol, manufacturer)
POST   /api/v1/devices                 — Create device
GET    /api/v1/devices/{id}            — Get device (includes custom fields & attachments)
PUT    /api/v1/devices/{id}            — Update device
DELETE /api/v1/devices/{id}            — Delete device
GET    /api/v1/devices/{id}/qr         — Generate QR code image for device
GET    /api/v1/devices/{id}/label      — Generate printable label (QR + device info)
```

### Bulk Operations
```
GET    /api/v1/devices/labels          — Generate printable label sheet (16 per page PDF)
POST   /api/v1/devices/import          — Import devices from CSV/JSON
GET    /api/v1/devices/export          — Export all devices as CSV/JSON
```

### Attachments
```
POST   /api/v1/devices/{id}/attachments      — Upload attachment
GET    /api/v1/devices/{id}/attachments       — List attachments
DELETE /api/v1/attachments/{id}               — Delete attachment
```

### Scanning / Decode
```
POST   /api/v1/scan/decode             — Decode a QR/barcode payload string
                                         Returns parsed info (protocol, vendor, product ID, etc.)
                                         Recognises Matter (MT:...), HomeKit, Z-Wave SmartStart formats
```

### Backup & Restore
```
GET    /api/v1/backup                  — Download full database backup (SQLite file or JSON dump)
POST   /api/v1/restore                 — Restore from backup file
```

---

## Frontend Features

### Dashboard / Device List
- Grid or list view of all devices
- Filter by: Home, Room, Device Type, Protocol, Manufacturer
- Search by name, model, serial number, pairing code
- Sort by name, date added, room, type
- Device count summaries per home/room
- Quick-scan button (floating action button) to add new devices

### Add Device Flow
1. **Scan** — Open camera, scan QR code or barcode
   - Auto-detect protocol (Matter, HomeKit, Z-Wave, etc.)
   - Parse and pre-fill known fields from code data
2. **Manual Entry** — Enter pairing code manually (for devices without QR)
3. **From Image** — Upload a photo containing a QR/barcode, decode it
4. **Fill Details** — Name, home, room, type, manufacturer, model, etc.
   - Autocomplete on manufacturer and model from existing entries
   - Room dropdown filtered by selected home

### Device Detail View
- Display generated QR code from stored data (scannable)
- Show manual pairing code prominently
- Device metadata (type, protocol, manufacturer, model, serial, MAC, etc.)
- Custom fields section
- Attachments section (view/download/upload)
- Notes
- Edit / Delete buttons
- **Print Label** button — generates a single label with QR + device name + code
- **Long press QR** — save as PNG

### Label Printing
- Single device label (QR code + device name + manual code + room)
- Bulk print: all devices, or filtered by home/room
- Layout: 16 labels per A4/Letter page
- Export as PDF for printing
- Configurable label size for different label printers (e.g. Brother QL series)

### Settings
- Manage Homes
- Manage Rooms (per home)
- Manage Manufacturers
- Import / Export (CSV, JSON)
- Backup / Restore
- Theme: light / dark mode
- Accent colour picker

### Mobile Responsive
- Full functionality on mobile browsers
- Camera scanning works on mobile
- Touch-friendly interface

---

## QR Code & Barcode Intelligence

### Matter Code Parsing
Matter QR codes start with `MT:` and contain Base38-encoded data including:
- Vendor ID
- Product ID
- Discriminator
- PIN code
- Commission flow type
- Discovery capabilities

Pairman should parse these fields and display them in the device detail view.

### Manual Pairing Code Support
- Matter: 11-digit or 21-digit numeric codes
- HomeKit: 8-digit numeric codes (XXX-XX-XXX format)
- Z-Wave SmartStart: DSK codes (5-digit groups)
- Generic: any alphanumeric string

### Code Generation
- From stored `qr_code_data`, regenerate a scannable QR code at any time
- From stored `pairing_code`, generate appropriate barcode format
- Support generating Matter-format QR codes from manual codes where possible

---

## Docker Deployment

### docker-compose.yml
```yaml
version: '3.8'
services:
  pairman:
    image: ghcr.io/OWNER/pairman:latest
    container_name: pairman
    restart: unless-stopped
    ports:
      - "7070:8000"
    volumes:
      - ./data:/app/data    # SQLite DB + uploaded files
    environment:
      - TZ=Europe/London
      # Optional: PostgreSQL instead of SQLite
      # - PAIRMAN_DB_URL=postgresql://user:pass@db:5432/pairman
```

### Environment Variables
```
PAIRMAN_DB_URL          — Database URL (default: sqlite:///data/pairman.db)
PAIRMAN_SECRET_KEY      — Secret key for sessions (auto-generated if not set)
PAIRMAN_PORT            — Port to listen on (default: 8000)
PAIRMAN_DATA_DIR        — Data directory (default: /app/data)
TZ                      — Timezone
```

---

## File Structure

```
pairman/
├── backend/
│   ├── app/
│   │   ├── main.py              — FastAPI app entry point
│   │   ├── config.py            — Configuration / env vars
│   │   ├── database.py          — SQLAlchemy setup
│   │   ├── models/              — SQLAlchemy models
│   │   │   ├── home.py
│   │   │   ├── room.py
│   │   │   ├── manufacturer.py
│   │   │   ├── device.py
│   │   │   ├── custom_field.py
│   │   │   └── attachment.py
│   │   ├── schemas/             — Pydantic schemas (request/response)
│   │   │   ├── home.py
│   │   │   ├── room.py
│   │   │   ├── manufacturer.py
│   │   │   ├── device.py
│   │   │   └── ...
│   │   ├── routers/             — API route handlers
│   │   │   ├── homes.py
│   │   │   ├── rooms.py
│   │   │   ├── manufacturers.py
│   │   │   ├── devices.py
│   │   │   ├── scan.py
│   │   │   ├── labels.py
│   │   │   └── backup.py
│   │   ├── services/            — Business logic
│   │   │   ├── qr_service.py    — QR generation & decoding
│   │   │   ├── matter_parser.py — Matter code parsing
│   │   │   ├── label_service.py — PDF label generation
│   │   │   └── backup_service.py
│   │   └── utils/
│   │       └── barcode_utils.py
│   ├── requirements.txt
│   └── alembic/                 — Database migrations
│       └── ...
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── DeviceList.tsx
│   │   │   ├── DeviceDetail.tsx
│   │   │   ├── AddDevice.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── Labels.tsx
│   │   ├── components/
│   │   │   ├── Scanner.tsx       — Camera QR/barcode scanner
│   │   │   ├── QRDisplay.tsx     — Render QR from data
│   │   │   ├── DeviceCard.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   ├── LabelPreview.tsx
│   │   │   └── ...
│   │   ├── services/
│   │   │   └── api.ts            — API client
│   │   └── types/
│   │       └── index.ts          — TypeScript types
│   ├── package.json
│   └── vite.config.ts
├── Dockerfile                    — Multi-stage: build frontend, serve with backend
├── docker-compose.yml
├── README.md
├── LICENSE                       — MIT
└── .github/
    └── workflows/
        └── docker-publish.yml    — CI/CD for Docker image
```

---

## Development Phases

### Phase 1 — Core MVP
- [ ] Backend: FastAPI with SQLite, full CRUD for all entities
- [ ] Data model with migrations (Alembic)
- [ ] Device management (create, read, update, delete)
- [ ] Home and Room management
- [ ] Manufacturer management
- [ ] QR code generation from stored data
- [ ] Basic Matter code parsing (MT: prefix detection, field extraction)
- [ ] Frontend: Device list with filters and search
- [ ] Frontend: Add device form (manual entry)
- [ ] Frontend: Device detail view with QR display
- [ ] Docker deployment working

### Phase 2 — Scanning & Intelligence
- [ ] Camera-based QR/barcode scanning in browser
- [ ] Auto-detect protocol from scanned code
- [ ] Matter QR code full parsing (vendor ID, product ID, discriminator, PIN)
- [ ] HomeKit code format recognition (XXX-XX-XXX)
- [ ] Z-Wave SmartStart DSK recognition
- [ ] Image upload + decode (scan QR from photo)
- [ ] Autocomplete for manufacturers and models

### Phase 3 — Labels & Export
- [ ] Single device label generation (PDF)
- [ ] Bulk label sheet (16 per page, A4/Letter)
- [ ] Configurable label layouts
- [ ] CSV import/export
- [ ] JSON import/export
- [ ] Database backup & restore

### Phase 4 — Polish
- [ ] Dark mode / light mode toggle
- [ ] Accent colour customisation
- [ ] File attachments per device
- [ ] Custom fields per device
- [ ] Mobile-optimised responsive layout
- [ ] Dashboard with device counts and summaries
- [ ] PWA support (installable on mobile)

---

## Key Design Principles

1. **Simple first** — Should be usable within 60 seconds of `docker compose up`
2. **Single container** — One Docker image, no external dependencies required
3. **Offline capable** — No cloud services, all data stays local
4. **Data portable** — Easy import/export, standard formats
5. **Scan-friendly** — Adding a device by scanning should be the fastest path
6. **Print-ready** — Labels should look good on standard label printers and A4 sheets

---

## Notes for Claude Code

- Start with the backend API and get the data model solid first
- Use Alembic for migrations from day one (makes future changes painless)
- The frontend can start simple — a working device list + add form is enough for Phase 1
- For the scanner component, use `html5-qrcode` or `@nicedoc/react-qr-reader` for browser-based scanning
- For PDF label generation, use `reportlab` (Python) or `jsPDF` (frontend)
- Keep the Dockerfile as a multi-stage build: Node for frontend → Python for backend
- SQLite file should live in a mounted volume so data persists across container restarts
- The Matter parsing logic can reference the CHIP/connectedhomeip project for the Base38 decoding spec
