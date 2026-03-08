"""
PDF label generation using ReportLab.
Single labels and 16-up A4 sheets.
"""
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas as rl_canvas
from .qr_service import generate_qr_png


LABEL_W = 48.5 * mm
LABEL_H = 25.4 * mm
COLS = 4
ROWS = 4
MARGIN_X = 8 * mm
MARGIN_Y = 13.5 * mm
GAP_X = 0
GAP_Y = 0


def _format_pairing_code(code: str) -> str:
    digits = code.replace('-', '').replace(' ', '')
    if len(digits) == 11:
        return f"{digits[:4]}-{digits[4:7]}-{digits[7:]}"
    return code


def _draw_label(c: rl_canvas.Canvas, x: float, y: float, device) -> None:
    qr_data = device.qr_code_data or device.pairing_code
    if qr_data:
        png = generate_qr_png(qr_data, box_size=4, border=1)
        qr_img = ImageReader(io.BytesIO(png))
        qr_size = LABEL_H - 4 * mm
        c.drawImage(qr_img, x + 1 * mm, y + 2 * mm, width=qr_size, height=qr_size)
        text_x = x + qr_size + 3 * mm
    else:
        text_x = x + 2 * mm

    max_w = int(x + LABEL_W - text_x) // 3  # rough char limit based on available width

    # Line 1 — device name
    c.setFont("Helvetica-Bold", 6)
    c.drawString(text_x, y + LABEL_H - 6.5 * mm, device.name[:20])

    # Line 2 — manufacturer · model
    mfr = device.manufacturer.name if device.manufacturer else None
    line2 = " · ".join(filter(None, [mfr, device.model]))
    if line2:
        c.setFont("Helvetica", 4.5)
        c.drawString(text_x, y + LABEL_H - 10 * mm, line2[:28])

    # Line 3 — room · device type
    room = device.room.name if device.room else None
    line3 = " · ".join(filter(None, [room, device.device_type]))
    if line3:
        c.setFont("Helvetica", 4.5)
        c.drawString(text_x, y + LABEL_H - 13.5 * mm, line3[:28])

    # Line 4 — pairing code
    if device.pairing_code:
        c.setFont("Courier", 5)
        c.drawString(text_x, y + LABEL_H - 17 * mm, _format_pairing_code(device.pairing_code))


def generate_single_label(device) -> bytes:
    buf = io.BytesIO()
    label_page = (LABEL_W + 10 * mm, LABEL_H + 10 * mm)
    c = rl_canvas.Canvas(buf, pagesize=label_page)
    _draw_label(c, 5 * mm, 5 * mm, device)
    c.save()
    return buf.getvalue()


def generate_label_sheet(devices: list) -> bytes:
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=A4)
    page_w, page_h = A4

    idx = 0
    while idx < len(devices):
        for row in range(ROWS):
            for col in range(COLS):
                if idx >= len(devices):
                    break
                x = MARGIN_X + col * (LABEL_W + GAP_X)
                y = page_h - MARGIN_Y - (row + 1) * LABEL_H - row * GAP_Y
                _draw_label(c, x, y, devices[idx])
                idx += 1
        if idx < len(devices):
            c.showPage()

    c.save()
    return buf.getvalue()
