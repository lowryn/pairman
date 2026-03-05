"""
Matter QR code parser.
Matter QR payloads begin with 'MT:' and are Base38-encoded.
Encoding is chunked: 5 Base38 chars → 3 bytes, 4 chars → 2 bytes.
Full spec: github.com/project-chip/connectedhomeip — src/setup_payload
"""

MATTER_PREFIX = "MT:"
HOMEKIT_PATTERN_LEN = 8   # digits only, formatted XXX-XX-XXX
ZWAVE_DSK_GROUPS = 8      # 8 groups of 5 digits, e.g. 12345-12345-...

BASE38_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-."

# Verhoeff check digit tables (used by Matter Manual Pairing Code)
_VERHOEFF_D = [
    [0,1,2,3,4,5,6,7,8,9],
    [1,2,3,4,0,6,7,8,9,5],
    [2,3,4,0,1,7,8,9,5,6],
    [3,4,0,1,2,8,9,5,6,7],
    [4,0,1,2,3,9,5,6,7,8],
    [5,9,8,7,6,0,4,3,2,1],
    [6,5,9,8,7,1,0,4,3,2],
    [7,6,5,9,8,2,1,0,4,3],
    [8,7,6,5,9,3,2,1,0,4],
    [9,8,7,6,5,4,3,2,1,0],
]
_VERHOEFF_P = [
    [0,1,2,3,4,5,6,7,8,9],
    [1,5,7,6,2,8,3,0,9,4],
    [5,8,0,3,7,9,6,1,4,2],
    [8,9,1,6,0,4,3,5,2,7],
    [9,4,5,3,1,2,6,8,7,0],
    [4,2,8,6,5,7,3,9,0,1],
    [2,7,9,3,8,0,6,4,1,5],
    [7,0,4,6,9,1,3,2,5,8],
]
_VERHOEFF_INV = [0,4,3,2,1,5,6,7,8,9]


def _verhoeff_check(digits: str) -> int:
    check = 0
    for i, ch in enumerate(reversed(digits), start=1):
        check = _VERHOEFF_D[check][_VERHOEFF_P[i % 8][int(ch)]]
    return _VERHOEFF_INV[check]


def _manual_pairing_code(passcode: int, discriminator: int, custom_flow: int) -> str:
    """Compute the 11-digit Matter Manual Pairing Code (matches physical label)."""
    short_disc = discriminator >> 8          # upper 4 bits of 12-bit discriminator
    disc_msb2 = short_disc >> 2
    disc_lsb2 = short_disc & 0x3
    vid_pid = 1 if custom_flow == 2 else 0
    chunk1 = disc_msb2 | (vid_pid << 2)
    chunk2 = (passcode & 0x3FFF) | (disc_lsb2 << 14)
    chunk3 = passcode >> 14
    digits = f"{chunk1}{chunk2:05d}{chunk3:04d}"
    check = _verhoeff_check(digits)
    return digits + str(check)


def _base38_decode_chunk(s: str) -> int:
    """Decode a single Base38 chunk (LSB-first within the chunk)."""
    val = 0
    base = 1
    for ch in s:
        if ch not in BASE38_CHARS:
            raise ValueError(f"Invalid Base38 character: {ch}")
        val += BASE38_CHARS.index(ch) * base
        base *= 38
    return val


def _base38_decode_bytes(encoded: str) -> bytes:
    """Decode Base38-encoded Matter QR payload to raw bytes.

    Per the Matter spec, encoding is chunked:
      - 5 Base38 chars encode 3 bytes (24 bits)
      - 4 Base38 chars encode 2 bytes (16 bits) for the final group
    Bytes within each chunk are little-endian.
    """
    out = bytearray()
    i = 0
    while i + 5 <= len(encoded):
        v = _base38_decode_chunk(encoded[i:i + 5])
        out += bytes([v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF])
        i += 5
    if i + 4 == len(encoded):
        v = _base38_decode_chunk(encoded[i:i + 4])
        out += bytes([v & 0xFF, (v >> 8) & 0xFF])
    elif i != len(encoded):
        raise ValueError(f"Unexpected encoded length: {len(encoded)}")
    return bytes(out)


def _get_bits(data: bytes, start: int, length: int) -> int:
    """Extract `length` bits starting at bit `start` from a little-endian byte array."""
    result = 0
    for i in range(length):
        bp = start + i
        result |= ((data[bp // 8] >> (bp % 8)) & 1) << i
    return result


def _decode_matter(payload: str) -> dict:
    encoded = payload[len(MATTER_PREFIX):]
    try:
        data = _base38_decode_bytes(encoded)
    except (ValueError, IndexError) as e:
        return {"protocol": "Matter", "raw": payload, "error": str(e)}

    # Bit layout per Matter spec (connectedhomeip SetupPayload.h):
    # bits 0-2:   version (3 bits)
    # bits 3-18:  vendor_id (16 bits)
    # bits 19-34: product_id (16 bits)
    # bits 35-36: custom flow (2 bits)
    # bits 37-44: discovery capabilities (8 bits)
    # bits 45-56: discriminator (12 bits)
    # bits 57-83: passcode (27 bits)
    # bits 84-87: padding (4 bits)
    version       = _get_bits(data, 0, 3)
    vendor_id     = _get_bits(data, 3, 16)
    product_id    = _get_bits(data, 19, 16)
    custom_flow   = _get_bits(data, 35, 2)
    discovery     = _get_bits(data, 37, 8)
    discriminator = _get_bits(data, 45, 12)
    passcode      = _get_bits(data, 57, 27)

    return {
        "protocol": "Matter",
        "version": version,
        "vendor_id": f"0x{vendor_id:04X}",
        "product_id": f"0x{product_id:04X}",
        "custom_flow": custom_flow,
        "discovery_capabilities": discovery,
        "discriminator": discriminator,
        "passcode": str(passcode).zfill(8),
        "pairing_code": _manual_pairing_code(passcode, discriminator, custom_flow),
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
