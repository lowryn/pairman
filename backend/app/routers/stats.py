from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Device, Home, Room, Manufacturer

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("")
def get_stats(db: Session = Depends(get_db)):
    devices       = db.query(Device).all()
    homes         = db.query(Home).all()
    rooms         = db.query(Room).all()
    manufacturers = db.query(Manufacturer).all()

    home_counts: dict[str, int] = {}
    room_counts: dict[str, int] = {}
    protocol_counts: dict[str, int] = {}
    type_counts: dict[str, int] = {}

    for d in devices:
        home_counts[d.home_id] = home_counts.get(d.home_id, 0) + 1
        if d.room_id:
            room_counts[d.room_id] = room_counts.get(d.room_id, 0) + 1
        p = d.protocol or "Unknown"
        protocol_counts[p] = protocol_counts.get(p, 0) + 1
        t = d.device_type or "Unknown"
        type_counts[t] = type_counts.get(t, 0) + 1

    by_home = []
    for home in sorted(homes, key=lambda h: h.name):
        home_rooms = [r for r in rooms if r.home_id == home.id]
        by_home.append({
            "home_id":   home.id,
            "home_name": home.name,
            "count":     home_counts.get(home.id, 0),
            "rooms": [
                {
                    "room_id":   r.id,
                    "room_name": r.name,
                    "count":     room_counts.get(r.id, 0),
                }
                for r in sorted(home_rooms, key=lambda r: r.name)
            ],
        })

    today = date.today()
    soon = today + timedelta(days=30)
    warranty_expired = []
    warranty_expiring_soon = []
    for d in devices:
        if not d.warranty_expiry:
            continue
        entry = {"id": d.id, "name": d.name, "warranty_expiry": str(d.warranty_expiry)}
        if d.warranty_expiry < today:
            warranty_expired.append(entry)
        elif d.warranty_expiry <= soon:
            warranty_expiring_soon.append(entry)

    recently_added = sorted(devices, key=lambda d: d.created_at, reverse=True)[:5]

    return {
        "total_devices":       len(devices),
        "total_homes":         len(homes),
        "total_rooms":         len(rooms),
        "total_manufacturers": len(manufacturers),
        "recently_added": [
            {
                "id":          d.id,
                "name":        d.name,
                "protocol":    d.protocol,
                "device_type": d.device_type,
            }
            for d in recently_added
        ],
        "by_home": by_home,
        "by_protocol": [
            {"protocol": k, "count": v}
            for k, v in sorted(protocol_counts.items(), key=lambda x: -x[1])
        ],
        "by_device_type": [
            {"device_type": k, "count": v}
            for k, v in sorted(type_counts.items(), key=lambda x: -x[1])
        ],
        "warranty_expired": sorted(warranty_expired, key=lambda x: x["warranty_expiry"]),
        "warranty_expiring_soon": sorted(warranty_expiring_soon, key=lambda x: x["warranty_expiry"]),
    }
