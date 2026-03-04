from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Home
from ..schemas import HomeCreate, HomeUpdate, HomeRead

router = APIRouter(prefix="/homes", tags=["homes"])


@router.get("", response_model=list[HomeRead])
def list_homes(db: Session = Depends(get_db)):
    return db.query(Home).all()


@router.post("", response_model=HomeRead, status_code=201)
def create_home(body: HomeCreate, db: Session = Depends(get_db)):
    home = Home(**body.model_dump())
    db.add(home)
    db.commit()
    db.refresh(home)
    return home


@router.get("/{home_id}", response_model=HomeRead)
def get_home(home_id: str, db: Session = Depends(get_db)):
    home = db.get(Home, home_id)
    if not home:
        raise HTTPException(status_code=404, detail="Home not found")
    return home


@router.put("/{home_id}", response_model=HomeRead)
def update_home(home_id: str, body: HomeUpdate, db: Session = Depends(get_db)):
    home = db.get(Home, home_id)
    if not home:
        raise HTTPException(status_code=404, detail="Home not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(home, key, value)
    db.commit()
    db.refresh(home)
    return home


@router.delete("/{home_id}", status_code=204)
def delete_home(home_id: str, db: Session = Depends(get_db)):
    home = db.get(Home, home_id)
    if not home:
        raise HTTPException(status_code=404, detail="Home not found")
    db.delete(home)
    db.commit()
