import logging

from fastapi import APIRouter
from pydantic import BaseModel
from ..services.matter_parser import decode_payload

logger = logging.getLogger("pairman.scan")
router = APIRouter(prefix="/scan", tags=["scan"])


class DecodeRequest(BaseModel):
    payload: str


@router.post("/decode")
def decode_code(body: DecodeRequest):
    try:
        return decode_payload(body.payload)
    except Exception as e:
        logger.warning("decode_payload failed for payload=%r: %s", body.payload[:80], e)
        return {"protocol": "Unknown", "pairing_code": None, "passcode": None}
