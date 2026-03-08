"""
PDF label generation using ReportLab.
Supports multiple Avery A4 label templates.
"""
import io
from dataclasses import dataclass
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas as rl_canvas
from .qr_service import generate_qr_png
from .matter_parser import pairing_code_to_qr_payload


@dataclass
class LabelTemplate:
    name: str
    label_w: float   # mm
    label_h: float   # mm
    cols: int
    rows: int
    margin_left: float   # mm
    margin_top: float    # mm
    gap_x: float = 0.0  # mm between columns
    gap_y: float = 0.0  # mm between rows

    @property
    def labels_per_sheet(self) -> int:
        return self.cols * self.rows


TEMPLATES: dict[str, LabelTemplate] = {
    'custom': LabelTemplate(
        name='Custom (48.5 × 25.4 mm · 16/sheet)',
        label_w=48.5, label_h=25.4, cols=4, rows=4,
        margin_left=8.0, margin_top=13.5,
    ),
    'L7160': LabelTemplate(
        name='Avery L7160 (63.5 × 38.1 mm · 21/sheet)',
        label_w=63.5, label_h=38.1, cols=3, rows=7,
        margin_left=7.25, margin_top=15.15, gap_x=2.5,
    ),
    'L7161': LabelTemplate(
        name='Avery L7161 (63.5 × 46.6 mm · 18/sheet)',
        label_w=63.5, label_h=46.6, cols=3, rows=6,
        margin_left=7.21, margin_top=8.70, gap_x=2.54,
    ),
    'L7163': LabelTemplate(
        name='Avery L7163 (99.1 × 38.1 mm · 14/sheet)',
        label_w=99.1, label_h=38.1, cols=2, rows=7,
        margin_left=4.65, margin_top=15.15, gap_x=2.5,
    ),
    'L7164': LabelTemplate(
        name='Avery L7164 (63.5 × 72.0 mm · 12/sheet)',
        label_w=63.5, label_h=72.0, cols=3, rows=4,
        margin_left=7.25, margin_top=4.5, gap_x=2.5,
    ),
    'L4732': LabelTemplate(
        name='Avery L4732 (35.6 × 16.9 mm · 80/sheet)',
        label_w=35.6, label_h=16.9, cols=5, rows=16,
        margin_left=11.0, margin_top=13.0, gap_x=2.5,
    ),
}

DEFAULT_TEMPLATE = 'custom'


def _format_pairing_code(code: str) -> str:
    digits = code.replace('-', '').replace(' ', '')
    if len(digits) == 11:
        return f"{digits[:4]}-{digits[4:7]}-{digits[7:]}"
    return code


def _draw_label(c: rl_canvas.Canvas, x: float, y: float, device, tpl: LabelTemplate) -> None:
    lw = tpl.label_w * mm
    lh = tpl.label_h * mm

    qr_data = device.qr_code_data or (
        pairing_code_to_qr_payload(device.pairing_code) if device.pairing_code else None
    )

    # QR code — capped at 48% of label width so text area always has space
    qr_size = min(lh - 4 * mm, lw * 0.48)
    if qr_data and qr_size >= 8 * mm:
        box_px = max(2, int(qr_size / mm / 1.5))
        png = generate_qr_png(qr_data, box_size=box_px, border=1)
        qr_img = ImageReader(io.BytesIO(png))
        c.drawImage(qr_img, x + 1 * mm, y + 2 * mm, width=qr_size, height=qr_size)
        text_x = x + qr_size + 2.5 * mm
    else:
        qr_size = 0
        text_x = x + 2 * mm

    # Adaptive font sizes and line spacing based on label height
    if lh >= 50 * mm:
        name_pt, detail_pt, code_pt, gap = 8, 6, 6, 4.5 * mm
    elif lh >= 35 * mm:
        name_pt, detail_pt, code_pt, gap = 7, 5, 5.5, 3.8 * mm
    elif lh >= 20 * mm:
        name_pt, detail_pt, code_pt, gap = 6, 4.5, 5, 3.3 * mm
    else:
        name_pt, detail_pt, code_pt, gap = 5, 4, 4, 2.8 * mm

    # Available text width
    max_chars = max(10, int((lw - qr_size - 4 * mm) / (name_pt * 0.45)))

    y_top = y + lh - gap

    # Line 1 — name
    c.setFont("Helvetica-Bold", name_pt)
    c.drawString(text_x, y_top, device.name[:max_chars])

    lines_remaining = max(0, int((lh - gap) / gap) - 1)

    line = 1
    # Line 2 — manufacturer · model
    mfr = device.manufacturer.name if device.manufacturer else None
    detail = " · ".join(filter(None, [mfr, device.model]))
    if detail and line <= lines_remaining:
        c.setFont("Helvetica", detail_pt)
        c.drawString(text_x, y_top - line * gap, detail[:max_chars + 6])
        line += 1

    # Line 3 — room · device type
    room = device.room.name if device.room else None
    location = " · ".join(filter(None, [room, device.device_type]))
    if location and line <= lines_remaining:
        c.setFont("Helvetica", detail_pt)
        c.drawString(text_x, y_top - line * gap, location[:max_chars + 6])
        line += 1

    # Line 4 — pairing code
    if device.pairing_code and line <= lines_remaining:
        c.setFont("Courier", code_pt)
        c.drawString(text_x, y_top - line * gap, _format_pairing_code(device.pairing_code))


def generate_single_label(device, template_key: str = DEFAULT_TEMPLATE) -> bytes:
    tpl = TEMPLATES.get(template_key, TEMPLATES[DEFAULT_TEMPLATE])
    buf = io.BytesIO()
    page = ((tpl.label_w + 10) * mm, (tpl.label_h + 10) * mm)
    c = rl_canvas.Canvas(buf, pagesize=page)
    _draw_label(c, 5 * mm, 5 * mm, device, tpl)
    c.save()
    return buf.getvalue()


def generate_label_sheet(devices: list, template_key: str = DEFAULT_TEMPLATE) -> bytes:
    tpl = TEMPLATES.get(template_key, TEMPLATES[DEFAULT_TEMPLATE])
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=A4)
    _, page_h = A4

    lw = tpl.label_w * mm
    lh = tpl.label_h * mm
    ml = tpl.margin_left * mm
    mt = tpl.margin_top * mm
    gx = tpl.gap_x * mm
    gy = tpl.gap_y * mm

    idx = 0
    while idx < len(devices):
        for row in range(tpl.rows):
            for col in range(tpl.cols):
                if idx >= len(devices):
                    break
                x = ml + col * (lw + gx)
                y = page_h - mt - (row + 1) * lh - row * gy
                _draw_label(c, x, y, devices[idx], tpl)
                idx += 1
        if idx < len(devices):
            c.showPage()

    c.save()
    return buf.getvalue()
