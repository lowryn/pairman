from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Room
from ..schemas import RoomCreate, RoomUpdate, RoomRead

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.get("", response_model=list[RoomRead])
def list_rooms(home_id: str | None = Query(None), db: Session = Depends(get_db)):
    q = db.query(Room)
    if home_id:
        q = q.filter(Room.home_id == home_id)
    return q.all()


@router.post("", response_model=RoomRead, status_code=201)
def create_room(body: RoomCreate, db: Session = Depends(get_db)):
    room = Room(**body.model_dump())
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


@router.get("/{room_id}", response_model=RoomRead)
def get_room(room_id: str, db: Session = Depends(get_db)):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@router.put("/{room_id}", response_model=RoomRead)
def update_room(room_id: str, body: RoomUpdate, db: Session = Depends(get_db)):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(room, key, value)
    db.commit()
    db.refresh(room)
    return room


@router.delete("/{room_id}", status_code=204)
def delete_room(room_id: str, db: Session = Depends(get_db)):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    db.delete(room)
    db.commit()
