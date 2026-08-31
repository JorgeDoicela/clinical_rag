import io
import os
import datetime
import hashlib
from typing import Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image, KeepTogether
)
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
    Genera un dictamen formativo clínico en formato PDF institucional de alta fidelidad
    acorde al Sistema de Diseño Ateneo+ (Google Material 3 / Clinical Design System).
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=32,
        bottomMargin=32
    )

    styles = getSampleStyleSheet()

    # Tokens de Color Ateneo+
    NAVY_DARK = colors.HexColor("#0f172a")       # Texto principal / slate-900
    TEXT_MUTED = colors.HexColor("#475569")      # Texto secundario / slate-600
    BRAND_CYAN = colors.HexColor("#06b6d4")      # Cyan clínico
    BRAND_BLUE = colors.HexColor("#2563eb")      # Azul Royal
    BRAND_INDIGO = colors.HexColor("#4f46e5")    # Indigo IA
    
    BG_CANVAS = colors.HexColor("#f0f4f9")       # Gris-azulado frío Material 3
    BG_WHITE = colors.HexColor("#ffffff")
    
    EMERALD_BG = colors.HexColor("#ecfdf5")
    EMERALD_BORDER = colors.HexColor("#6ee7b7")
    EMERALD_TEXT = colors.HexColor("#047857")
    
    AMBER_BG = colors.HexColor("#fffbeb")
    AMBER_BORDER = colors.HexColor("#fcd34d")
    AMBER_TEXT = colors.HexColor("#b45309")
    
    ROSE_BG = colors.HexColor("#fef2f2")
    ROSE_BORDER = colors.HexColor("#fca5a5")
    ROSE_TEXT = colors.HexColor("#b91c1c")
    
    BLUE_BG = colors.HexColor("#eff6ff")
    BLUE_BORDER = colors.HexColor("#93c5fd")
    BLUE_TEXT = colors.HexColor("#1d4ed8")

    # Estilos Tipográficos Material 3
    brand_style = ParagraphStyle(
        'BrandText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=18,
        textColor=NAVY_DARK
    )

    brand_sub = ParagraphStyle(
        'BrandSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=BRAND_BLUE,
        textTransform='uppercase'
    )

    doc_title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica',
        fontSize=16,
        leading=20,
        textColor=NAVY_DARK,
        spaceAfter=2
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=NAVY_DARK,
        spaceBefore=6,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=NAVY_DARK
    )

    body_muted = ParagraphStyle(
        'BodyMuted',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=TEXT_MUTED
    )

    quote_style = ParagraphStyle(
        'QuoteStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=12,
        textColor=colors.HexColor("#1e293b")
    )

    bullet_good = ParagraphStyle(
        'BulletGood',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=EMERALD_TEXT
    )

    bullet_bad = ParagraphStyle(
        'BulletBad',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=AMBER_TEXT
    )

    elements = []

    # 1. Cabecera con Logotipo Oficial e Identidad de Marca Ateneo+
    logo_path = os.path.join(os.path.dirname(__file__), "..", "cases_data", "images", "ateneo.png")
    now_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")

    header_left = []
    if os.path.exists(logo_path):
        header_left.append(Image(logo_path, width=28, height=28))
    
    brand_block = [
        Paragraph("<b>ATENEO</b><font color='#2563eb'><b>+</b></font>", brand_style),
        Paragraph("SIMULADOR CLÍNICO MULTIMODAL & RAG FORMATIVO • MSP ECUADOR", brand_sub)
    ]

    header_right = [
        Paragraph("<font color='#2563eb'><b>DICTAMEN FORMATIVO OFICIAL</b></font>", ParagraphStyle('RHead', parent=body_style, alignment=2, fontName='Helvetica-Bold', fontSize=8.5, textColor=BRAND_BLUE)),
        Paragraph(f"Emisión: {now_str}", ParagraphStyle('RDate', parent=body_muted, alignment=2, fontSize=7.5))
    ]

    header_table_data = [
        [
            Table([[header_left[0] if header_left else "", brand_block]], colWidths=[34, 300] if header_left else [0, 334]),
            header_right
        ]
    ]

    header_table = Table(header_table_data, colWidths=[370, 170])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 6))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=BRAND_BLUE, spaceBefore=2, spaceAfter=8))

    # 2. Tarjeta de Metadatos del Caso y del Estudiante
    meta_content = [
        [
            Paragraph(f"<b>Estudiante:</b> {student_name}", body_style),
            Paragraph(f"<b>Caso Clínico:</b> {case_title}", body_style)
        ],
        [
            Paragraph(f"<b>ID de Evaluación:</b> <font face='Courier'>{case_id}</font>", body_muted),
            Paragraph(f"<b>Norma Evaluada:</b> {guia_asociada}", body_muted)
        ]
    ]
    meta_table = Table(meta_content, colWidths=[265, 265])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_CANVAS),
        ('ROUNDEDCORNERS', [8, 8, 8, 8]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 8))

    # 3. Puntuación Global y Nivel de Dominio Clínico (Estilo Material 3 Banner)
    score = eval_result.get("score", 0.0)
    score_max = eval_result.get("score_max", 10.0)
    pct = round((score / score_max) * 100) if score_max > 0 else 0

    if pct >= 80:
        badge_bg, badge_border, badge_text = EMERALD_BG, EMERALD_BORDER, EMERALD_TEXT
        nivel_label = "Dominio Consolidado (Excelente)"
    elif pct >= 60:
        badge_bg, badge_border, badge_text = AMBER_BG, AMBER_BORDER, AMBER_TEXT
        nivel_label = "Competencia Formativa (Aceptable)"
    else:
        badge_bg, badge_border, badge_text = ROSE_BG, ROSE_BORDER, ROSE_TEXT
        nivel_label = "Brecha Formativa Crítica (Requiere Refuerzo)"

    score_card_data = [
        [
            Paragraph(f"<font color='{badge_text.hexval()}'><b>Puntuación Obtenida: {score:.1f} / {score_max:.1f} pts ({pct}%)</b></font><br/><font color='{NAVY_DARK.hexval()}'><b>Estado de Juicio Clínico:</b> {nivel_label}</font>", body_style),
            Paragraph(f"<font color='{badge_text.hexval()}'><b>{pct}%</b></font>", ParagraphStyle('ScoreBig', parent=styles['Normal'], alignment=2, fontName='Helvetica-Bold', fontSize=18, leading=20))
        ]
    ]
    score_table = Table(score_card_data, colWidths=[440, 90])
    score_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), badge_bg),
        ('BOX', (0, 0), (-1, -1), 1, badge_border),
        ('ROUNDEDCORNERS', [8, 8, 8, 8]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    elements.append(score_table)
    elements.append(Spacer(1, 8))

    # 4. Dictamen Formativo del Evaluador RAG
    retro = eval_result.get("retroalimentacion_general", "Evaluación clínica completada con éxito.")
    elements.append(Paragraph("<b>Juicio y Retroalimentación Clínica Principal</b>", section_heading))
    
    retro_table = Table([[Paragraph(retro, body_style)]], colWidths=[540])
    retro_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_CANVAS),
        ('ROUNDEDCORNERS', [8, 8, 8, 8]),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(retro_table)
    elements.append(Spacer(1, 8))

    # 5. Grid de Aciertos y Omisiones (2 Columnas Planas)
    aciertos = eval_result.get("aciertos", [])
    omisiones = eval_result.get("omisiones", [])

    aciertos_items = [Paragraph(f"• {a}", bullet_good) for a in aciertos] if aciertos else [Paragraph("Sin aciertos demostrados según la norma.", ParagraphStyle('It1', parent=bullet_good, fontName='Helvetica-Oblique'))]
    omisiones_items = [Paragraph(f"• {o}", bullet_bad) for o in omisiones] if omisiones else [Paragraph("Sin omisiones clínicas críticas detectadas.", ParagraphStyle('It2', parent=bullet_bad, fontName='Helvetica-Oblique'))]

    feedback_grid_data = [
        [
            Paragraph("<b>Aciertos Clínicos Demostrados</b>", ParagraphStyle('HGood', parent=body_style, fontName='Helvetica-Bold', textColor=EMERALD_TEXT)),
            Paragraph("<b>Omisiones / Puntos a Reforzar</b>", ParagraphStyle('HBad', parent=body_style, fontName='Helvetica-Bold', textColor=AMBER_TEXT))
        ],
        [
            aciertos_items,
            omisiones_items
        ]
    ]

    grid_table = Table(feedback_grid_data, colWidths=[265, 265])
    grid_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), EMERALD_BG),
        ('BACKGROUND', (1, 0), (1, -1), AMBER_BG),
        ('BOX', (0, 0), (0, -1), 1, EMERALD_BORDER),
        ('BOX', (1, 0), (1, -1), 1, AMBER_BORDER),
        ('ROUNDEDCORNERS', [8, 8, 8, 8]),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(grid_table)
    elements.append(Spacer(1, 8))

    # 6. Fundamentación Normativa Oficial (GPC MSP Ecuador)
    cita = eval_result.get("cita_normativa", {})
    if cita and cita.get("texto_relevante"):
        elements.append(Paragraph("<b>Cita y Fundamentación Normativa (MSP Ecuador)</b>", section_heading))
        cita_content = [
            Paragraph(f"<b>Guía:</b> {cita.get('guia', guia_asociada)} | <b>Sección:</b> {cita.get('seccion', 'General')} | <b>Página Oficial:</b> {cita.get('pagina', 1)}", ParagraphStyle('CHead', parent=body_style, fontName='Helvetica-Bold', textColor=BRAND_BLUE)),
            Spacer(1, 3),
            Paragraph(f'"{cita.get("texto_relevante", "")}"', quote_style)
        ]
        cita_table = Table([[cita_content]], colWidths=[540])
        cita_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), BLUE_BG),
            ('BOX', (0, 0), (-1, -1), 1, BLUE_BORDER),
            ('ROUNDEDCORNERS', [8, 8, 8, 8]),
            ('TOPPADDING', (0, 0), (-1, -1), 7),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(cita_table)
        elements.append(Spacer(1, 8))

    # 7. Hash Criptográfico de Integridad Académica (Footer)
    verif_payload = f"{student_name}_{case_id}_{score}_{now_str}"
    integrity_hash = hashlib.sha256(verif_payload.encode('utf-8')).hexdigest()[:16].upper()

    elements.append(Spacer(1, 4))
    footer_text = f"Código de Verificación Académica: <b>ATENEO-MSP-{integrity_hash}</b> • Motor RAG Híbrido (Dense BGE-M3 + BM25 + Gemini)"
    elements.append(Paragraph(footer_text, ParagraphStyle('FooterText', parent=styles['Normal'], fontName='Helvetica', fontSize=7, leading=9, textColor=TEXT_MUTED, alignment=1)))

    doc.build(elements)
    buffer.seek(0)
    return buffer
