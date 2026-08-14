import io
import datetime
import hashlib
from typing import Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
from reportlab.lib.units import inch

def generate_clinical_feedback_pdf(
    student_name: str,
    case_title: str,
    case_id: str,
    guia_asociada: str,
    eval_result: Dict[str, Any],
    student_answer: str = ""
) -> io.BytesIO:
    """
    Genera un informe formativo clínico en formato PDF institucional de alta precisión
    con desglose por los 4 ejes clínicos, citas normativas y hash de verificación.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Colores Institucionales Ateneo
    NAVY = colors.HexColor("#0f172a")
    SKY = colors.HexColor("#0284c7")
    EMERALD = colors.HexColor("#059669")
    AMBER = colors.HexColor("#d97706")
    SLATE = colors.HexColor("#475569")
    LIGHT_BG = colors.HexColor("#f8fafc")
    BORDER_COLOR = colors.HexColor("#cbd5e1")

    # Estilos Tipográficos
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=NAVY,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=SKY,
        textTransform='uppercase',
        spaceAfter=12
    )

    section_header_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=NAVY,
        spaceBefore=8,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1e293b")
    )

    italic_style = ParagraphStyle(
        'ItalicText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#334155")
    )

    bullet_good_style = ParagraphStyle(
        'BulletGood',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#065f46")
    )

    bullet_bad_style = ParagraphStyle(
        'BulletBad',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#9a3412")
    )

    elements = []

    # 1. Encabezado Institucional
    elements.append(Paragraph("ATENEO • PLATAFORMA DE EVALUACIÓN CLÍNICA", subtitle_style))
    elements.append(Paragraph("Informe Formativo de Razonamiento Clínico", title_style))
    elements.append(HRFlowable(width="100%", thickness=2, color=SKY, spaceBefore=4, spaceAfter=10))

    # 2. Metadatos de la Evaluación
    now_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    meta_data = [
        [
            Paragraph(f"<b>Estudiante:</b> {student_name}", body_style),
            Paragraph(f"<b>Fecha de Emisión:</b> {now_str}", body_style)
        ],
        [
            Paragraph(f"<b>Caso Clínico:</b> {case_title} ({case_id})", body_style),
            Paragraph(f"<b>Guía MSP Evaluada:</b> {guia_asociada}", body_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[270, 270])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 10))

    # 3. Dictamen Cuantitativo Global
    score = eval_result.get("score", 0.0)
    score_max = eval_result.get("score_max", 10.0)
    pct = round((score / score_max) * 100) if score_max > 0 else 0
    nivel_cualitativo = "Consolidado (Excelente)" if pct >= 80 else ("Competente (Aceptable)" if pct >= 60 else "Brecha Crítica (Requiere Refuerzo)")

    score_color = EMERALD if pct >= 80 else (AMBER if pct >= 60 else colors.HexColor("#dc2626"))

    score_banner_data = [
        [
            Paragraph(f"<font color='{score_color.hexval()}'><b>PUNTAJE OBTENIDO: {score:.1f} / {score_max:.1f} ({pct}%)</b></font><br/><b>Nivel de Dominio Clínico:</b> {nivel_cualitativo}", body_style)
        ]
    ]
    score_table = Table(score_banner_data, colWidths=[540])
    score_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
        ('BOX', (0, 0), (-1, -1), 1.5, score_color),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    elements.append(score_table)
    elements.append(Spacer(1, 10))

    # 4. Retroalimentación General del Evaluador RAG
    retro = eval_result.get("retroalimentacion_general", "Evaluación clínica completada con éxito.")
    elements.append(Paragraph("Dictamen Formativo General", section_header_style))
    elements.append(Paragraph(retro, body_style))
    elements.append(Spacer(1, 10))

    # 5. Aciertos Clínicos y Omisiones (2 Columnas)
    aciertos = eval_result.get("aciertos", [])
    omisiones = eval_result.get("omisiones", [])

    aciertos_paras = [Paragraph(f"✓ {a}", bullet_good_style) for a in aciertos] if aciertos else [Paragraph("Sin aciertos destacados registrados.", italic_style)]
    omisiones_paras = [Paragraph(f"✗ {o}", bullet_bad_style) for o in omisiones] if omisiones else [Paragraph("Sin omisiones clínicas críticas.", italic_style)]

    feedback_grid = [
        [
            Paragraph("<b>Aciertos Clínicos Demostrados</b>", ParagraphStyle('HGood', parent=body_style, fontName='Helvetica-Bold', textColor=EMERALD)),
            Paragraph("<b>Omisiones y Puntos a Reforzar</b>", ParagraphStyle('HBad', parent=body_style, fontName='Helvetica-Bold', textColor=colors.HexColor("#c2410c")))
        ],
        [
            aciertos_paras,
            omisiones_paras
        ]
    ]
    grid_table = Table(feedback_grid, colWidths=[265, 265])
    grid_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#ecfdf5")),
        ('BACKGROUND', (1, 0), (1, -1), colors.HexColor("#fff7ed")),
        ('BOX', (0, 0), (0, -1), 1, colors.HexColor("#a7f3d0")),
        ('BOX', (1, 0), (1, -1), 1, colors.HexColor("#fed7aa")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(grid_table)
    elements.append(Spacer(1, 10))

    # 6. Cita Normativa Oficial MSP Comprobable
    cita = eval_result.get("cita_normativa", {})
    if cita:
        elements.append(Paragraph("Fundamentación Normativa (Guía de Práctica Clínica MSP)", section_header_style))
        cita_content = [
            Paragraph(f"<b>Guía:</b> {cita.get('guia', guia_asociada)} | <b>Sección:</b> {cita.get('seccion', 'General')} | <b>Página:</b> {cita.get('pagina', 1)}", ParagraphStyle('CitaHead', parent=body_style, fontName='Helvetica-Bold', textColor=NAVY)),
            Spacer(1, 4),
            Paragraph(f'"{cita.get("texto_relevante", "")}"', italic_style)
        ]
        cita_table = Table([[cita_content]], colWidths=[540])
        cita_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f0f9ff")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#bae6fd")),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(cita_table)
        elements.append(Spacer(1, 10))

    # 7. Hash de Verificación e Integridad Académica
    verif_payload = f"{student_name}_{case_id}_{score}_{now_str}"
    integrity_hash = hashlib.sha256(verif_payload.encode('utf-8')).hexdigest()[:16].upper()

    elements.append(Spacer(1, 10))
    footer_text = f"Código de Integridad Académica: <b>ATENEO-MSP-{integrity_hash}</b> • Generado con Motor RAG Híbrido (BGE-M3 + BM25 + Gemini API)"
    elements.append(Paragraph(footer_text, ParagraphStyle('FooterText', parent=styles['Normal'], fontName='Helvetica', fontSize=7.5, leading=10, textColor=SLATE, alignment=1)))

    doc.build(elements)
    buffer.seek(0)
    return buffer
