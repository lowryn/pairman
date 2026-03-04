from fastapi import APIRouter
from pydantic import BaseModel
from ..services.matter_parser import decode_payload

router = APIRouter(prefix="/scan", tags=["scan"])


class DecodeRequest(BaseModel):
    payload: str


@router.post("/decode")
def decode_code(body: DecodeRequest):
    return decode_payload(body.payload)
