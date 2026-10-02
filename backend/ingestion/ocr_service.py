import sys
import os
from pathlib import Path
from typing import Optional
import pymupdf

sys.path.append(str(Path(__file__).resolve().parent.parent))
from config import GEMINI_API_KEY, GEMINI_MODEL
from services.llm_gateway import llm_gateway, LLMException

def render_pdf_page_to_png(pdf_path: Path, page_number: int, dpi: int = 180) -> Optional[bytes]:
    """
    Renderiza una página específica del PDF como imagen PNG en memoria (alta resolución a 180 DPI).
    """
    try:
        doc = pymupdf.open(pdf_path)
        if page_number < 1 or page_number > len(doc):
            return None
        page = doc[page_number - 1]
        pix = page.get_pixmap(dpi=dpi)
        image_bytes = pix.tobytes(output="png")
        doc.close()
        return image_bytes
    except Exception as e:
        print(f"  [OCR ERROR RENDER] Error renderizando pág. {page_number} de '{pdf_path.name}': {e}", flush=True)
        return None

def perform_defensive_ocr_on_page(pdf_path: Path, page_number: int) -> str:
    """
    Ejecuta OCR defensivo multinivel en páginas escaneadas:
    1. Intenta OCR local rápido si pytesseract está disponible.
    2. Si no, utiliza Gemini Vision Multimodal para transcripción de alta fidelidad clínica.
    """
    image_bytes = render_pdf_page_to_png(pdf_path, page_number)
    if not image_bytes:
        return ""

    # Nivel 1: Intento con pytesseract local (si el usuario tiene instalado Tesseract OCR)
    try:
        import pytesseract
        from PIL import Image
        import io
        img = Image.open(io.BytesIO(image_bytes))
        local_text = pytesseract.image_to_string(img, lang="spa")
        if local_text and len(local_text.strip()) > 60:
            print(f"  [OCR LOCAL PYTESSERACT] Extraídos {len(local_text)} chars en pág. {page_number}", flush=True)
            return local_text.strip()
    except Exception:
        pass

    # Nivel 2: OCR Multimodal de Alta Precisión con Gemini Vision API (vía Resilient Gateway)
    if GEMINI_API_KEY:
        try:
            prompt_ocr = (
                "Actúa como un transcriptor médico de precisión para Guías de Práctica Clínica (GPC) del MSP Ecuador.\n"
                "Transcribe todo el texto, tablas y algoritmos clínicos contenidos en esta imagen escaneada del documento oficial.\n"
                "- Preserva estrictamente nombres de medicamentos, dosis numéricas, unidades de medida y criterios de severidad.\n"
                "- Convierte tablas clínicas a formato Markdown limpio (| Columna 1 | Columna 2 |).\n"
                "- Si la imagen es una portada decorativa o página en blanco sin contenido médico, responde únicamente: 'PORTADA_SIN_TEXTO_CLINICO'."
            )

            result = llm_gateway.generate(
                prompt=prompt_ocr,
                imagenes_list=[(image_bytes, "image/png")],
                temperature=0.0
            )

            ocr_text = result.text.strip() if result and result.text else ""
            if "PORTADA_SIN_TEXTO_CLINICO" in ocr_text:
                return ""

            if len(ocr_text) > 40:
                print(f"  [OCR GEMINI VISION - {result.model_used}] Extraídos {len(ocr_text)} caracteres en pág. {page_number} de '{pdf_path.name}'", flush=True)
                return ocr_text

        except Exception as api_err:
            print(f"  [ADVERTENCIA OCR API] Falla en OCR multimodal pág. {page_number} de '{pdf_path.name}': {api_err}", flush=True)

    return ""
