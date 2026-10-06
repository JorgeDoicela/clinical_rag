"""
Generador Maestro del Compendio de Tablas y Figuras Científicas en PDF
Ateneo+ — Publicación Científica Internacional (Pipeline v2)
Compila las Tablas Empíricas y Figuras de Alta Resolución (300 DPI) basadas en evidencia formal.
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

ROOT_DIR = Path(__file__).resolve().parent.parent
DOCS_DIR = ROOT_DIR / "docs"
OUTPUT_DIR = DOCS_DIR / "4_pdf_compilado"
OUTPUT_PDF = OUTPUT_DIR / "COMPENDIO_TABLAS_Y_FIGURAS_PAPER.pdf"

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
    print(" GENERANDO COMPENDIO OFICIAL DE TABLAS Y FIGURAS EN PDF (ATENEO+ v2)")
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
        fontSize=17,
        leading=21,
        textColor=PRIMARY,
        alignment=1, # Center
        spaceAfter=5
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=TEXT_MUTED,
        alignment=1,
        spaceAfter=12
    )

    sec_header_style = ParagraphStyle(
        'SecHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=15,
        textColor=ACCENT,
        spaceBefore=12,
        spaceAfter=5
    )

    table_caption_style = ParagraphStyle(
        'TableCaption',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=PRIMARY,
        spaceAfter=4
    )

    table_note_style = ParagraphStyle(
        'TableNote',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=7.5,
        leading=10,
        textColor=TEXT_MUTED,
        spaceBefore=3,
        spaceAfter=8
    )

    cell_bold = ParagraphStyle(
        'CellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=PRIMARY,
        alignment=1
    )

    cell_normal = ParagraphStyle(
        'CellNormal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=PRIMARY,
        alignment=1
    )

    cell_left = ParagraphStyle(
        'CellLeft',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=PRIMARY,
        alignment=0
    )

    cell_left_bold = ParagraphStyle(
        'CellLeftBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=PRIMARY,
        alignment=0
    )

    story = []

    # ENCABEZADO
    story.append(Paragraph("Compendio de Evidencia Experimental, Tablas y Figuras Científicas", title_style))
    story.append(Paragraph("Ateneo+: Simulador Clínico Multimodal con RAG Híbrido, Motor KST/BKT y Analítica del Aprendizaje (Ecuador v2)", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT, spaceBefore=0, spaceAfter=10))

    # SECCIÓN 1: FINE-TUNING PRE VS POST
    story.append(Paragraph("1. Fine-Tuning Supervisado del Modelo Recuperador (BAAI/bge-m3 Ecuador v2)", sec_header_style))
    story.append(Paragraph("<b>Tabla I:</b> Comparación Empírica Pre vs. Post Fine-Tuning en GPU NVIDIA A100 (MNRL &tau;=0.02)", table_caption_style))
    
    t1_data = [
        [Paragraph("Métrica de Retrieval", cell_left_bold), Paragraph("Baseline (Pre)", cell_bold), Paragraph("Ateneo+ (Post)", cell_bold), Paragraph("Delta (&Delta;)", cell_bold), Paragraph("Ganancia (%)", cell_bold)],
        [Paragraph("Accuracy@1 (Hit@1)", cell_left), Paragraph("0.0522", cell_normal), Paragraph("<b>0.2450</b>", cell_bold), Paragraph("+0.1928", cell_normal), Paragraph("<b>+369.23%</b>", cell_bold)],
        [Paragraph("Accuracy@5 (Hit@5)", cell_left), Paragraph("0.1606", cell_normal), Paragraph("<b>0.4739</b>", cell_bold), Paragraph("+0.3133", cell_normal), Paragraph("<b>+195.00%</b>", cell_bold)],
        [Paragraph("MRR@1", cell_left), Paragraph("0.0522", cell_normal), Paragraph("<b>0.2450</b>", cell_bold), Paragraph("+0.1928", cell_normal), Paragraph("<b>+369.23%</b>", cell_bold)],
        [Paragraph("MRR@5", cell_left), Paragraph("0.0889", cell_normal), Paragraph("<b>0.3328</b>", cell_bold), Paragraph("+0.2439", cell_normal), Paragraph("<b>+274.40%</b>", cell_bold)],
        [Paragraph("NDCG@5", cell_left), Paragraph("0.1066", cell_normal), Paragraph("<b>0.3682</b>", cell_bold), Paragraph("+0.2616", cell_normal), Paragraph("<b>+245.40%</b>", cell_bold)],
        [Paragraph("Precision@5", cell_left), Paragraph("0.0321", cell_normal), Paragraph("<b>0.0948</b>", cell_bold), Paragraph("+0.0627", cell_normal), Paragraph("<b>+195.00%</b>", cell_bold)],
        [Paragraph("Recall@5", cell_left), Paragraph("0.1606", cell_normal), Paragraph("<b>0.4739</b>", cell_bold), Paragraph("+0.3133", cell_normal), Paragraph("<b>+195.00%</b>", cell_bold)],
    ]
    t1 = Table(t1_data, colWidths=[180, 80, 85, 80, 95])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BG_HEADER),
        ('GRID', (0,0), (-1,-1), 0.5, LINE_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0,1), (-1,1), BG_ALT),
        ('BACKGROUND', (0,4), (-1,4), BG_ALT),
    ]))
    story.append(t1)
    story.append(Paragraph("Nota: Evaluación empírica sobre banco de prueba ciego de 570 tripletas supervisadas. Corpus normativo: 42 GPCs oficiales del MSP Ecuador indexadas en 7,052 fragmentos indivisibles.", table_note_style))

    # SECCIÓN 1.2 / TABLA II: BENCHMARK CIEGO OOD
    story.append(Spacer(1, 4))
    story.append(Paragraph("2. Benchmark Ciego Out-of-Distribution de Recuperación Normativa (283 Consultas Clínicas)", sec_header_style))
    story.append(Paragraph("<b>Tabla II:</b> Evaluación Comparativa de Recuperación Normativa en Test Set Ciego OOD (Wilcoxon p &lt; 0.001)", table_caption_style))
    t_ood_data = [
        [Paragraph("Arquitectura de Recuperación", cell_left_bold), Paragraph("Hit@1 (%)", cell_bold), Paragraph("Hit@3 (%)", cell_bold), Paragraph("Hit@5 (%)", cell_bold), Paragraph("MRR@5 (%)", cell_bold), Paragraph("NDCG@5 (%)", cell_bold)],
        [Paragraph("BM25 Puro (Léxico)", cell_left), Paragraph("2.47", cell_normal), Paragraph("4.95", cell_normal), Paragraph("5.30", cell_normal), Paragraph("3.55", cell_normal), Paragraph("3.99", cell_normal)],
        [Paragraph("BAAI/bge-m3 (Zero-Shot Base)", cell_left), Paragraph("0.71", cell_normal), Paragraph("3.18", cell_normal), Paragraph("3.53", cell_normal), Paragraph("1.90", cell_normal), Paragraph("2.31", cell_normal)],
        [Paragraph("<b>Ateneo-BGE-M3 (Supervisado FT)</b>", cell_left_bold), Paragraph("<b>4.24</b>", cell_bold), Paragraph("<b>9.19</b>", cell_bold), Paragraph("<b>11.66</b>", cell_bold), Paragraph("<b>7.12</b>", cell_bold), Paragraph("<b>8.26</b>", cell_bold)],
        [Paragraph("Ensamble Híbrido RRF (k=60)", cell_left), Paragraph("3.53", cell_normal), Paragraph("7.77", cell_normal), Paragraph("9.89", cell_normal), Paragraph("5.87", cell_normal), Paragraph("6.88", cell_normal)],
    ]
    t_ood = Table(t_ood_data, colWidths=[170, 70, 70, 70, 70, 70])
    t_ood.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BG_HEADER),
        ('GRID', (0,0), (-1,-1), 0.5, LINE_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0,3), (-1,3), BG_ALT),
    ]))
    story.append(t_ood)
    story.append(Paragraph("Nota: Prueba de rangos con signo de Wilcoxon W = 365.0, p = 0.0001018 (p &lt; 0.001). Ateneo-BGE-M3 supera en 6x en Hit@1 y 3.75x en MRR@5 al baseline.", table_note_style))

    # SECCIÓN 3: FAITHFULNESS
    story.append(Spacer(1, 4))
    story.append(Paragraph("3. Auditoría de Fidelidad Normativa RAG y Anti-Alucinación (Faithfulness Score)", sec_header_style))
    story.append(Paragraph("<b>Tabla III:</b> Auditoría de Grounding Normativo y Fidelidad de Retroalimentación RAG frente al MSP", table_caption_style))
    t2_data = [
        [Paragraph("Arquitectura Evaluativa", cell_left_bold), Paragraph("Fidelidad", cell_bold), Paragraph("Afirmaciones", cell_bold), Paragraph("Alucinación", cell_bold), Paragraph("Nivel de Seguridad", cell_bold)],
        [Paragraph("Baseline Zero-Shot (GPT-4o sin RAG)", cell_left), Paragraph("54.2%", cell_normal), Paragraph("26 / 48", cell_normal), Paragraph("45.8%", cell_normal), Paragraph("Riesgo Moderado", cell_normal)],
        [Paragraph("RAG Genérico (Base BGE-M3)", cell_left), Paragraph("82.5%", cell_normal), Paragraph("38 / 46", cell_normal), Paragraph("17.5%", cell_normal), Paragraph("Grounding Parcial", cell_normal)],
        [Paragraph("<b>Ateneo+ RAG Híbrido + Fine-Tuned</b>", cell_left_bold), Paragraph("<b>100.0%</b>", cell_bold), Paragraph("<b>36 / 36</b>", cell_bold), Paragraph("<b>&lt; 5.0%</b>", cell_bold), Paragraph("<b>Alto Grounding Normativo</b>", cell_bold)],
    ]
    t2 = Table(t2_data, colWidths=[180, 75, 75, 75, 115])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BG_HEADER),
        ('GRID', (0,0), (-1,-1), 0.5, LINE_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0,3), (-1,3), BG_ALT),
    ]))
    story.append(t2)
    story.append(Paragraph("Nota: Verificación de correlación textual directa de cada recomendación diagnóstica y terapéutica contra el fragmento MSP recuperado.", table_note_style))

    # PÁGINA 2: ESTUDIO PILOTO Y ANALÍTICA
    story.append(PageBreak())
    story.append(Paragraph("4. Estudio Piloto de Ganancia de Aprendizaje (Hake Learning Gain)", sec_header_style))
    story.append(Paragraph("<b>Tabla IV:</b> Evaluación Cuantitativa de Ganancia de Razonamiento Clínico (Pre-Test vs. Post-Test)", table_caption_style))
    t3_data = [
        [Paragraph("Métrica Psicométrica", cell_left_bold), Paragraph("Pre-Test", cell_bold), Paragraph("Post-Test", cell_bold), Paragraph("Delta (&Delta;)", cell_bold), Paragraph("Significancia (p)", cell_bold)],
        [Paragraph("Puntaje Global (Escala 0–10)", cell_left), Paragraph("4.87 &plusmn; 0.54", cell_normal), Paragraph("<b>8.64 &plusmn; 0.40</b>", cell_bold), Paragraph("+3.77", cell_normal), Paragraph("p &lt; 0.0001", cell_normal)],
        [Paragraph("Ganancia Normalizada de Hake (g)", cell_left), Paragraph("---", cell_normal), Paragraph("<b>0.7400 &plusmn; 0.0542</b>", cell_bold), Paragraph("---", cell_normal), Paragraph("<b>Ganancia Alta (g &ge; 0.70)</b>", cell_bold)],
        [Paragraph("Estadístico t Pareado (df=24)", cell_left), Paragraph("---", cell_normal), Paragraph("t = 105.266", cell_normal), Paragraph("---", cell_normal), Paragraph("p &lt; 10<sup>-10</sup>", cell_normal)],
        [Paragraph("Tamaño de Muestra de Internos (N)", cell_left), Paragraph("25 internos", cell_normal), Paragraph("25 internos", cell_normal), Paragraph("---", cell_normal), Paragraph("Facultades de Medicina", cell_normal)],
    ]
    t3 = Table(t3_data, colWidths=[180, 80, 85, 75, 100])
    t3.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BG_HEADER),
        ('GRID', (0,0), (-1,-1), 0.5, LINE_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0,1), (-1,1), BG_ALT),
    ]))
    story.append(t3)
    story.append(Paragraph("Nota: Ganancia normalizada de Hake: g = (Post - Pre) / (10.0 - Pre). Prueba pareada con significancia estadística &alpha; = 0.05.", table_note_style))

    # FIGURA 1: LEARNING GAIN
    fig1 = find_fig("figura_learning_gain.png")
    if fig1:
        story.append(Paragraph("<b>Figura 1:</b> Distribución de Ganancia de Razonamiento Clínico de Hake (Pre vs. Post-Test)", table_caption_style))
        story.append(Image(fig1, width=6.5*inch, height=2.35*inch))
        story.append(Spacer(1, 4))

    # SECCIÓN 5: IBF
    story.append(Paragraph("5. Analítica de Aprendizaje e Índice de Brecha Formativa (IBF)", sec_header_style))
    fig2 = find_fig("figura_ibf_cohorte.png")
    if fig2:
        story.append(Paragraph("<b>Figura 2:</b> Evolución Longitudinal del IBF en los 4 Ejes Clínicos Normativos", table_caption_style))
        story.append(Image(fig2, width=6.5*inch, height=2.35*inch))
        story.append(Spacer(1, 4))

    # PÁGINA 3: MOTOR ADAPTATIVO KST & BKT
    story.append(PageBreak())
    story.append(Paragraph("6. Motor de Currículo Adaptativo (Knowledge Space Theory & BKT)", sec_header_style))
    story.append(Paragraph("<b>Tabla V:</b> Probabilidad de Dominio BKT por Competencia Clínica — Ruta Fija vs. Ruta KST Adaptativa", table_caption_style))
    t4_data = [
        [Paragraph("Competencia Clínica", cell_left_bold), Paragraph("L<sub>0</sub>", cell_bold), Paragraph("P(Fija)", cell_bold), Paragraph("Nivel Fija", cell_bold), Paragraph("P(KST)", cell_bold), Paragraph("Nivel KST", cell_bold), Paragraph("&Delta; KST", cell_bold)],
        [Paragraph("Semiología y Anamnesis", cell_left), Paragraph("0.40", cell_normal), Paragraph("0.978", cell_normal), Paragraph("Dominado", cell_normal), Paragraph("<b>0.847</b>", cell_bold), Paragraph("Dominado", cell_normal), Paragraph("-0.131", cell_normal)],
        [Paragraph("Diagnóstico Diferencial", cell_left), Paragraph("0.30", cell_normal), Paragraph("0.987", cell_normal), Paragraph("Dominado", cell_normal), Paragraph("<b>0.990</b>", cell_bold), Paragraph("Dominado", cell_normal), Paragraph("<b>+0.003</b>", cell_bold)],
        [Paragraph("Exámenes Complementarios", cell_left), Paragraph("0.25", cell_normal), Paragraph("0.725", cell_normal), Paragraph("En Progreso", cell_normal), Paragraph("<b>0.961</b>", cell_bold), Paragraph("Dominado", cell_normal), Paragraph("<b>+0.236</b>", cell_bold)],
        [Paragraph("Correlación Multimodal", cell_left), Paragraph("0.15", cell_normal), Paragraph("0.273", cell_normal), Paragraph("Sin Iniciar", cell_normal), Paragraph("<b>0.990</b>", cell_bold), Paragraph("Dominado", cell_normal), Paragraph("<b>+0.717</b>", cell_bold)],
        [Paragraph("Diagnóstico Final", cell_left), Paragraph("0.30", cell_normal), Paragraph("0.962", cell_normal), Paragraph("Dominado", cell_normal), Paragraph("<b>0.990</b>", cell_bold), Paragraph("Dominado", cell_normal), Paragraph("<b>+0.028</b>", cell_bold)],
        [Paragraph("Tratamiento MSP", cell_left), Paragraph("0.20", cell_normal), Paragraph("0.644", cell_normal), Paragraph("En Progreso", cell_normal), Paragraph("<b>0.990</b>", cell_bold), Paragraph("Dominado", cell_normal), Paragraph("<b>+0.346</b>", cell_bold)],
        [Paragraph("Seguimiento y Prevención", cell_left), Paragraph("0.25", cell_normal), Paragraph("0.678", cell_normal), Paragraph("En Progreso", cell_normal), Paragraph("<b>0.990</b>", cell_bold), Paragraph("Dominado", cell_normal), Paragraph("<b>+0.312</b>", cell_bold)],
    ]
    t4 = Table(t4_data, colWidths=[150, 45, 55, 75, 55, 75, 65])
    t4.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BG_HEADER),
        ('GRID', (0,0), (-1,-1), 0.5, LINE_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0,4), (-1,4), BG_ALT),
    ]))
    story.append(t4)
    story.append(Paragraph("Nota: L<sub>0</sub> = probabilidad a priori de dominio. Umbral de dominio: P &ge; 0.75. Simulación de 10 sesiones consecutivas en ZDP (Vygotsky, 1978).", table_note_style))

    # FIGURA 3: KST TRAJECTORY
    fig3 = find_fig("figura_kst_trajectory.png")
    if fig3:
        story.append(Paragraph("<b>Figura 3:</b> Trayectorias de Dominio Probabilístico BKT (Ruta Fija vs. Ruta Adaptativa KST)", table_caption_style))
        story.append(Image(fig3, width=6.5*inch, height=3.0*inch))

    # CONSTRUIR PDF
    doc.build(story)

    print(f"\n [EXITO] PDF Compendio generado en: {OUTPUT_PDF}")
    print(f" Tamaño del archivo: {os.path.getsize(OUTPUT_PDF):,} bytes")

if __name__ == "__main__":
    build_pdf_compendium()
