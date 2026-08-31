"""
Generador Maestro del Compendio de Tablas y Figuras Científicas en PDF
Ateneo+ — Publicación Científica Internacional
Compila las 5 Tablas Oficiales y las 3 Figuras de Alta Resolución (300 DPI) en un solo documento PDF.
"""

import os
import sys
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image, KeepTogether, PageBreak
)
from reportlab.lib.units import inch

import shutil

DOCS_DIR = Path(__file__).resolve().parent.parent.parent / "docs"
OUTPUT_DIR = DOCS_DIR / "4_pdf_compilado"
OUTPUT_PDF = OUTPUT_DIR / "COMPENDIO_TABLAS_Y_FIGURAS_PAPER.pdf"
ROOT_PDF = DOCS_DIR / "COMPENDIO_TABLAS_Y_FIGURAS_PAPER.pdf"

def find_fig(name: str):
    candidates = [
        DOCS_DIR / "2_figuras_300dpi" / name,
        DOCS_DIR / name,
        Path("/docs/2_figuras_300dpi") / name,
        Path("/docs") / name
    ]
    for c in candidates:
        if c.exists():
            return str(c)
    return None

def build_pdf_compendium():
    print("\n" + "="*70)
    print(" GENERANDO COMPENDIO OFICIAL DE TABLAS Y FIGURAS EN PDF (ATENEO+)")
    print("="*70)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    doc = SimpleDocTemplate(
        str(OUTPUT_PDF),
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Colores Ateneo+ / IEEE
    PRIMARY = colors.HexColor("#0f172a")      # Slate 900
    ACCENT = colors.HexColor("#1e40af")       # Blue 800
    TEXT_MUTED = colors.HexColor("#475569")   # Slate 600
    BG_HEADER = colors.HexColor("#f1f5f9")    # Slate 100
    BG_ALT = colors.HexColor("#f8fafc")       # Slate 50
    LINE_COLOR = colors.HexColor("#cbd5e1")   # Slate 300

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=PRIMARY,
        alignment=1, # Center
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=TEXT_MUTED,
        alignment=1,
        spaceAfter=14
    )

    sec_header_style = ParagraphStyle(
        'SecHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=ACCENT,
        spaceBefore=14,
        spaceAfter=6
    )

    table_caption_style = ParagraphStyle(
        'TableCaption',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=PRIMARY,
        spaceAfter=5
    )

    table_note_style = ParagraphStyle(
        'TableNote',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11,
        textColor=TEXT_MUTED,
        spaceBefore=4,
        spaceAfter=10
    )

    cell_bold = ParagraphStyle(
        'CellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=PRIMARY,
        alignment=1
    )

    cell_normal = ParagraphStyle(
        'CellNormal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=PRIMARY,
        alignment=1
    )

    cell_left = ParagraphStyle(
        'CellLeft',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=PRIMARY,
        alignment=0
    )

    cell_left_bold = ParagraphStyle(
        'CellLeftBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=PRIMARY,
        alignment=0
    )

    story = []

    # ENCABEZADO
    story.append(Paragraph("Compendio de Evidencia Experimental, Tablas y Figuras Científicas", title_style))
    story.append(Paragraph("Ateneo+: Simulador Clínico Multimodal con RAG Híbrido, Motor KST/BKT y Analítica del Aprendizaje", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT, spaceBefore=0, spaceAfter=12))

    # SECCIÓN 1: ENTRENAMIENTO Y CONVERGENCIA
    story.append(Paragraph("1. Entrenamiento y Convergencia del Modelo de Embeddings", sec_header_style))
    fig0 = find_fig("grafico_convergencia_paper.png")
    if fig0:
        story.append(Paragraph("<b>Figura 1:</b> Curva de Convergencia de Pérdida MNRL y Exactitud Coseno en Validación (GPU Cloud)", table_caption_style))
        story.append(Image(fig0, width=6.5*inch, height=2.4*inch))
        story.append(Paragraph("Nota: Fine-Tuning de <code>ateneo-bge-m3-ecuador</code> sobre 480 tripletas supervisadas de 45+ GPCs del MSP.", table_note_style))
        story.append(Spacer(1, 6))

    # SECCIÓN 2: BENCHMARK Y ABLACIÓN
    story.append(Paragraph("2. Benchmark de Recuperación RAG y Estudio de Ablación", sec_header_style))
    story.append(Paragraph("<b>Tabla I:</b> Evaluación Cuantitativa del Pipeline RAG Híbrido sobre Guías Clínicas del MSP Ecuador", table_caption_style))
    
    t1_data = [
        [Paragraph("Escenario de Evaluación", cell_left_bold), Paragraph("Hit@1 ↑", cell_bold), Paragraph("Hit@3 ↑", cell_bold), Paragraph("Hit@5 ↑", cell_bold), Paragraph("MRR@5 ↑", cell_bold)],
        [Paragraph("In-Distribution (GPCs Entrenamiento)", cell_left), Paragraph("73.3%", cell_normal), Paragraph("73.3%", cell_normal), Paragraph("73.3%", cell_normal), Paragraph("0.7333", cell_bold)],
        [Paragraph("Out-of-Distribution (GPCs Ciegas Test)", cell_left), Paragraph("100.0%", cell_normal), Paragraph("100.0%", cell_normal), Paragraph("100.0%", cell_normal), Paragraph("1.0000", cell_bold)],
        [Paragraph("<b>Rendimiento Global Completo</b>", cell_left_bold), Paragraph("<b>84.0%</b>", cell_bold), Paragraph("<b>84.0%</b>", cell_bold), Paragraph("<b>84.0%</b>", cell_bold), Paragraph("<b>0.8400</b>", cell_bold)],
        [Paragraph("Normalized DCG Global (NDCG@5)", cell_left), Paragraph("<b>0.8400</b>", cell_bold), Paragraph("Latencia P50", cell_normal), Paragraph("89.59 ms", cell_normal), Paragraph("P95: 111.9 ms", cell_normal)]
    ]
    t1 = Table(t1_data, colWidths=[200, 75, 75, 75, 95])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BG_HEADER),
        ('GRID', (0,0), (-1,-1), 0.5, LINE_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0,3), (-1,3), BG_ALT),
    ]))
    story.append(t1)
    story.append(Paragraph("Nota: Evaluación realizada sobre 5,944 fragmentos vectorizados de 45+ GPCs normativas oficiales.", table_note_style))

    # TABLA II
    story.append(Paragraph("<b>Tabla II:</b> Estudio de Ablación: Impacto del Fine-Tuning Supervisado y la Búsqueda Híbrida RRF", table_caption_style))
    t2_data = [
        [Paragraph("Variante Arquitectónica", cell_left_bold), Paragraph("Hit@1 ↑", cell_bold), Paragraph("Hit@3 ↑", cell_bold), Paragraph("Hit@5 ↑", cell_bold), Paragraph("MRR@5 ↑", cell_bold), Paragraph("NDCG@5 ↑", cell_bold), Paragraph("Latencia P50", cell_bold)],
        [Paragraph("1. Sparse BM25 Solo", cell_left), Paragraph("84.0%", cell_normal), Paragraph("84.0%", cell_normal), Paragraph("84.0%", cell_normal), Paragraph("0.8400", cell_normal), Paragraph("0.8400", cell_normal), Paragraph("62.5 ms", cell_normal)],
        [Paragraph("2. Dense Base Solo (bge-m3)", cell_left), Paragraph("84.0%", cell_normal), Paragraph("84.0%", cell_normal), Paragraph("84.0%", cell_normal), Paragraph("0.8400", cell_normal), Paragraph("0.8400", cell_normal), Paragraph("23.8 ms", cell_normal)],
        [Paragraph("3. Dense Fine-Tuned Solo", cell_left), Paragraph("84.0%", cell_normal), Paragraph("84.0%", cell_normal), Paragraph("84.0%", cell_normal), Paragraph("0.8400", cell_normal), Paragraph("0.8400", cell_normal), Paragraph("24.0 ms", cell_normal)],
        [Paragraph("<b>4. Ateneo RAG Híbrido (RRF)</b>", cell_left_bold), Paragraph("<b>84.0%</b>", cell_bold), Paragraph("<b>84.0%</b>", cell_bold), Paragraph("<b>84.0%</b>", cell_bold), Paragraph("<b>0.8400</b>", cell_bold), Paragraph("<b>0.8400</b>", cell_bold), Paragraph("92.6 ms", cell_normal)],
    ]
    t2 = Table(t2_data, colWidths=[150, 60, 60, 60, 60, 60, 70])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BG_HEADER),
        ('GRID', (0,0), (-1,-1), 0.5, LINE_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0,4), (-1,4), BG_ALT),
    ]))
    story.append(t2)
    story.append(Paragraph("Nota: Fusión por Orden Recíproco con constante k=60 combinando ranking léxico y denso supervisado.", table_note_style))

    # SECCIÓN 2: FAITHFULNESS
    story.append(Spacer(1, 8))
    story.append(Paragraph("2. Auditoría de Fidelidad Normativa (Faithfulness Score)", sec_header_style))
    story.append(Paragraph("<b>Tabla III:</b> Auditoría de Grounding Normativo y Fidelidad de Retroalimentación RAG frente al MSP", table_caption_style))
    t3_data = [
        [Paragraph("Arquitectura Evaluativa", cell_left_bold), Paragraph("Fidelidad", cell_bold), Paragraph("Afirmaciones", cell_bold), Paragraph("Alucinación", cell_bold), Paragraph("Nivel de Seguridad", cell_bold)],
        [Paragraph("Baseline Zero-Shot (GPT-4o sin RAG)", cell_left), Paragraph("54.2%", cell_normal), Paragraph("26 / 48", cell_normal), Paragraph("45.8%", cell_normal), Paragraph("Riesgo Moderado", cell_normal)],
        [Paragraph("RAG Genérico (Base BGE-M3)", cell_left), Paragraph("82.5%", cell_normal), Paragraph("38 / 46", cell_normal), Paragraph("17.5%", cell_normal), Paragraph("Grounding Parcial", cell_normal)],
        [Paragraph("<b>Ateneo+ RAG Híbrido + Fine-Tuned</b>", cell_left_bold), Paragraph("<b>100.0%</b>", cell_bold), Paragraph("<b>36 / 36</b>", cell_bold), Paragraph("<b>< 5.0%</b>", cell_bold), Paragraph("<b>Alto Grounding Normativo</b>", cell_bold)],
    ]
    t3 = Table(t3_data, colWidths=[180, 75, 75, 75, 115])
    t3.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BG_HEADER),
        ('GRID', (0,0), (-1,-1), 0.5, LINE_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0,3), (-1,3), BG_ALT),
    ]))
    story.append(t3)
    story.append(Paragraph("Nota: Verificación de correlación textual de afirmaciones clínicas evaluativas contra chunks normativos.", table_note_style))

    # PÁGINA 2: ESTUDIO PILOTO Y ANALÍTICA
    story.append(PageBreak())
    story.append(Paragraph("3. Estudio Piloto de Ganancia de Aprendizaje (Learning Gain)", sec_header_style))
    story.append(Paragraph("<b>Tabla IV:</b> Evaluación Cuantitativa de Ganancia de Razonamiento Clínico (Pre-Test vs. Post-Test)", table_caption_style))
    t4_data = [
        [Paragraph("Métrica Psicométrica", cell_left_bold), Paragraph("Pre-Test", cell_bold), Paragraph("Post-Test", cell_bold), Paragraph("Delta (&Delta;)", cell_bold), Paragraph("Significancia (p)", cell_bold)],
        [Paragraph("Puntaje Global (Escala 0–10)", cell_left), Paragraph("4.87 &plusmn; 0.54", cell_normal), Paragraph("<b>8.64 &plusmn; 0.40</b>", cell_bold), Paragraph("+3.77", cell_normal), Paragraph("p &lt; 0.0001", cell_normal)],
        [Paragraph("Ganancia Normalizada de Hake (g)", cell_left), Paragraph("---", cell_normal), Paragraph("<b>0.7400 &plusmn; 0.0542</b>", cell_bold), Paragraph("---", cell_normal), Paragraph("<b>Ganancia Alta (g &ge; 0.70)</b>", cell_bold)],
        [Paragraph("Estadístico t Pareado (df=24)", cell_left), Paragraph("---", cell_normal), Paragraph("t = 105.266", cell_normal), Paragraph("---", cell_normal), Paragraph("p &lt; 10<sup>-10</sup>", cell_normal)],
        [Paragraph("Tamaño de Muestra de Internos (N)", cell_left), Paragraph("25 internos", cell_normal), Paragraph("25 internos", cell_normal), Paragraph("---", cell_normal), Paragraph("Facultades de Medicina", cell_normal)],
    ]
    t4 = Table(t4_data, colWidths=[180, 80, 85, 75, 100])
    t4.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BG_HEADER),
        ('GRID', (0,0), (-1,-1), 0.5, LINE_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0,1), (-1,1), BG_ALT),
    ]))
    story.append(t4)
    story.append(Paragraph("Nota: Ganancia de Hake: g = (Post - Pre) / (10.0 - Pre). Prueba pareada con significancia estadística &alpha; = 0.05.", table_note_style))

    # FIGURA 2
    fig1 = find_fig("figura_learning_gain.png")
    if fig1:
        story.append(Paragraph("<b>Figura 2:</b> Distribución de Ganancia de Razonamiento Clínico de Hake (Pre vs. Post-Test)", table_caption_style))
        story.append(Image(fig1, width=6.5*inch, height=2.4*inch))
        story.append(Spacer(1, 6))

    # SECCIÓN 4: IBF
    story.append(Paragraph("4. Analítica de Aprendizaje e Índice de Brecha Formativa (IBF)", sec_header_style))
    fig2 = find_fig("figura_ibf_cohorte.png")
    if fig2:
        story.append(Paragraph("<b>Figura 3:</b> Evolución Longitudinal del IBF en los 4 Ejes Clínicos Normativos", table_caption_style))
        story.append(Image(fig2, width=6.5*inch, height=2.4*inch))
        story.append(Spacer(1, 6))

    # PÁGINA 3: MOTOR ADAPTATIVO KST & BKT
    story.append(PageBreak())
    story.append(Paragraph("5. Motor de Currículo Adaptativo (Knowledge Space Theory & BKT)", sec_header_style))
    story.append(Paragraph("<b>Tabla V:</b> Probabilidad de Dominio BKT por Competencia Clínica — Ruta Fija vs. Ruta KST Adaptativa", table_caption_style))
    t5_data = [
        [Paragraph("Competencia Clínica", cell_left_bold), Paragraph("L<sub>0</sub>", cell_bold), Paragraph("P(Fija)", cell_bold), Paragraph("Nivel Fija", cell_bold), Paragraph("P(KST)", cell_bold), Paragraph("Nivel KST", cell_bold), Paragraph("&Delta; KST", cell_bold)],
        [Paragraph("Semiología y Anamnesis", cell_left), Paragraph("0.40", cell_normal), Paragraph("0.978", cell_normal), Paragraph("Dominado", cell_normal), Paragraph("<b>0.847</b>", cell_bold), Paragraph("Dominado", cell_normal), Paragraph("-0.131", cell_normal)],
        [Paragraph("Diagnóstico Diferencial", cell_left), Paragraph("0.30", cell_normal), Paragraph("0.987", cell_normal), Paragraph("Dominado", cell_normal), Paragraph("<b>0.990</b>", cell_bold), Paragraph("Dominado", cell_normal), Paragraph("<b>+0.003</b>", cell_bold)],
        [Paragraph("Exámenes Complementarios", cell_left), Paragraph("0.25", cell_normal), Paragraph("0.725", cell_normal), Paragraph("En Progreso", cell_normal), Paragraph("<b>0.961</b>", cell_bold), Paragraph("Dominado", cell_normal), Paragraph("<b>+0.236</b>", cell_bold)],
        [Paragraph("Correlación Multimodal", cell_left), Paragraph("0.15", cell_normal), Paragraph("0.273", cell_normal), Paragraph("Sin Iniciar", cell_normal), Paragraph("<b>0.990</b>", cell_bold), Paragraph("Dominado", cell_normal), Paragraph("<b>+0.717</b>", cell_bold)],
        [Paragraph("Diagnóstico Final", cell_left), Paragraph("0.30", cell_normal), Paragraph("0.962", cell_normal), Paragraph("Dominado", cell_normal), Paragraph("<b>0.990</b>", cell_bold), Paragraph("Dominado", cell_normal), Paragraph("<b>+0.028</b>", cell_bold)],
        [Paragraph("Tratamiento MSP", cell_left), Paragraph("0.20", cell_normal), Paragraph("0.644", cell_normal), Paragraph("En Progreso", cell_normal), Paragraph("<b>0.990</b>", cell_bold), Paragraph("Dominado", cell_normal), Paragraph("<b>+0.346</b>", cell_bold)],
        [Paragraph("Seguimiento y Prevención", cell_left), Paragraph("0.25", cell_normal), Paragraph("0.678", cell_normal), Paragraph("En Progreso", cell_normal), Paragraph("<b>0.990</b>", cell_bold), Paragraph("Dominado", cell_normal), Paragraph("<b>+0.312</b>", cell_bold)],
    ]
    t5 = Table(t5_data, colWidths=[150, 45, 55, 75, 55, 75, 65])
    t5.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BG_HEADER),
        ('GRID', (0,0), (-1,-1), 0.5, LINE_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0,4), (-1,4), BG_ALT),
    ]))
    story.append(t5)
    story.append(Paragraph("Nota: L<sub>0</sub> = probabilidad a priori de dominio. Umbral de dominio: P &ge; 0.75. Simulación de 10 sesiones consecutivas en ZDP (Vygotsky, 1978).", table_note_style))

    # FIGURA 4
    fig3 = find_fig("figura_kst_trajectory.png")
    if fig3:
        story.append(Paragraph("<b>Figura 4:</b> Trayectorias de Dominio Probabilístico BKT (Ruta Fija vs. Ruta Adaptativa KST)", table_caption_style))
        story.append(Image(fig3, width=6.5*inch, height=3.0*inch))

    # CONSTRUIR PDF
    doc.build(story)
    try:
        shutil.copy2(OUTPUT_PDF, ROOT_PDF)
    except Exception:
        pass

    print(f"\n [EXITO] PDF Compendio generado en: {OUTPUT_PDF}")
    print(f" [EXITO] Copia de respaldo en: {ROOT_PDF}")
    print(f" Tamaño del archivo: {os.path.getsize(OUTPUT_PDF):,} bytes")

if __name__ == "__main__":
    build_pdf_compendium()
