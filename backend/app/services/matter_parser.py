"""
Basic Matter QR code parser.
Matter QR payloads begin with 'MT:' and are Base38-encoded.
Full spec: github.com/project-chip/connectedhomeip — src/setup_payload
"""

MATTER_PREFIX = "MT:"
HOMEKIT_PATTERN_LEN = 8   # digits only, formatted XXX-XX-XXX
ZWAVE_DSK_GROUPS = 8      # 8 groups of 5 digits, e.g. 12345-12345-...

BASE38_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-."


def _base38_decode(s: str) -> int:
    value = 0
    for ch in reversed(s):
        if ch not in BASE38_CHARS:
            raise ValueError(f"Invalid Base38 character: {ch}")
        value = value * 38 + BASE38_CHARS.index(ch)
    return value


def _decode_matter(payload: str) -> dict:
    encoded = payload[len(MATTER_PREFIX):]
    try:
        raw = _base38_decode(encoded)
    except ValueError:
        return {"protocol": "Matter", "raw": payload, "error": "Base38 decode failed"}

    # Bit layout per Matter spec (connectedhomeip SetupPayload.h):
    # bits 0-2:   version (3 bits)
    # bits 3-18:  vendor_id (16 bits)
    # bits 19-34: product_id (16 bits)
    # bits 35-36: custom flow (2 bits)
    # bits 37-44: discovery capabilities (8 bits)  ← 8, not 7
    # bits 45-56: discriminator (12 bits)
    # bits 57-83: passcode (27 bits)
    # bits 84-87: padding (4 bits)
    version = raw & 0x7
    vendor_id = (raw >> 3) & 0xFFFF
    product_id = (raw >> 19) & 0xFFFF
    custom_flow = (raw >> 35) & 0x3
    discovery = (raw >> 37) & 0xFF
    discriminator = (raw >> 45) & 0xFFF
    passcode = (raw >> 57) & 0x7FFFFFF

    return {
        "protocol": "Matter",
        "version": version,
        "vendor_id": f"0x{vendor_id:04X}",
        "product_id": f"0x{product_id:04X}",
        "custom_flow": custom_flow,
        "discovery_capabilities": discovery,
        "discriminator": discriminator,
        "passcode": str(passcode).zfill(8),
        "raw": payload,
    }


def _decode_homekit(payload: str) -> dict:
    digits = payload.replace("-", "").replace(" ", "")
    return {
        "protocol": "HomeKit",
        "pairing_code": payload,
        "formatted": f"{digits[:3]}-{digits[3:5]}-{digits[5:]}",
        "raw": payload,
    }


def _decode_zwave(payload: str) -> dict:
    return {
        "protocol": "Z-Wave",
        "pairing_code": payload,
        "dsk": payload,
        "raw": payload,
    }


def _is_zwave_dsk(payload: str) -> bool:
    parts = payload.strip().split("-")
    return (
        len(parts) == ZWAVE_DSK_GROUPS
        and all(p.isdigit() and len(p) == 5 for p in parts)
    )


def decode_payload(payload: str) -> dict:
    payload = payload.strip()

    if payload.startswith(MATTER_PREFIX):
        return _decode_matter(payload)

    if _is_zwave_dsk(payload):
        return _decode_zwave(payload)

    digits_only = payload.replace("-", "").replace(" ", "")
    if digits_only.isdigit() and len(digits_only) == HOMEKIT_PATTERN_LEN:
        return _decode_homekit(payload)

    if digits_only.isdigit() and len(digits_only) in (11, 21):
        return {"protocol": "Matter", "pairing_code": payload, "raw": payload}

    return {"protocol": "Unknown", "raw": payload}
