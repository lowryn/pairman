from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Manufacturer
from ..schemas import ManufacturerCreate, ManufacturerUpdate, ManufacturerRead

router = APIRouter(prefix="/manufacturers", tags=["manufacturers"])


@router.get("", response_model=list[ManufacturerRead])
def list_manufacturers(db: Session = Depends(get_db)):
    return db.query(Manufacturer).order_by(Manufacturer.name).all()


@router.post("", response_model=ManufacturerRead, status_code=201)
def create_manufacturer(body: ManufacturerCreate, db: Session = Depends(get_db)):
    mfr = Manufacturer(**body.model_dump())
    db.add(mfr)
    db.commit()
    db.refresh(mfr)
    return mfr


@router.get("/{mfr_id}", response_model=ManufacturerRead)
def get_manufacturer(mfr_id: str, db: Session = Depends(get_db)):
    mfr = db.get(Manufacturer, mfr_id)
    if not mfr:
        raise HTTPException(status_code=404, detail="Manufacturer not found")
    return mfr


@router.put("/{mfr_id}", response_model=ManufacturerRead)
def update_manufacturer(mfr_id: str, body: ManufacturerUpdate, db: Session = Depends(get_db)):
    mfr = db.get(Manufacturer, mfr_id)
    if not mfr:
        raise HTTPException(status_code=404, detail="Manufacturer not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(mfr, key, value)
    db.commit()
    db.refresh(mfr)
    return mfr


@router.delete("/{mfr_id}", status_code=204)
def delete_manufacturer(mfr_id: str, db: Session = Depends(get_db)):
    mfr = db.get(Manufacturer, mfr_id)
    if not mfr:
        raise HTTPException(status_code=404, detail="Manufacturer not found")
    db.delete(mfr)
    db.commit()
