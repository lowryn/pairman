"""Utility helpers for barcode reading/writing."""
import io

try:
    from pyzbar.pyzbar import decode as zbar_decode
    from PIL import Image
    PYZBAR_AVAILABLE = True
except ImportError:
    PYZBAR_AVAILABLE = False


def decode_image_bytes(image_bytes: bytes) -> list[str]:
    """Return all barcode/QR payloads found in the image."""
    if not PYZBAR_AVAILABLE:
        return []
    img = Image.open(io.BytesIO(image_bytes))
    results = zbar_decode(img)
    return [r.data.decode("utf-8", errors="replace") for r in results]
