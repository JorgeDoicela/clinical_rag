import sys
import os
from pathlib import Path
from typing import Optional
import pymupdf

sys.path.append(str(Path(__file__).resolve().parent.parent))
from config import GEMINI_API_KEY, GEMINI_MODEL

_GEMINI_CLIENT = None

def get_ocr_gemini_client():
    """Inicializa el cliente de Gemini API para OCR Multimodal."""
    global _GEMINI_CLIENT
    if _GEMINI_CLIENT is None and GEMINI_API_KEY:
        try:
            from google import genai
            _GEMINI_CLIENT = genai.Client(api_key=GEMINI_API_KEY)
        except Exception as e:
            print(f"[OCR] No se pudo inicializar Gemini Client para OCR: {e}", flush=True)
    return _GEMINI_CLIENT

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

    # Nivel 2: OCR Multimodal de Alta Precisión con Gemini Vision API
    client = get_ocr_gemini_client()
    if client:
        try:
            from google.genai import types
            prompt_ocr = (
                "Actúa como un transcriptor médico de precisión para Guías de Práctica Clínica (GPC) del MSP Ecuador.\n"
                "Transcribe todo el texto, tablas y algoritmos clínicos contenidos en esta imagen escaneada del documento oficial.\n"
                "- Preserva estrictamente nombres de medicamentos, dosis numéricas, unidades de medida y criterios de severidad.\n"
                "- Convierte tablas clínicas a formato Markdown limpio (| Columna 1 | Columna 2 |).\n"
                "- Si la imagen es una portada decorativa o página en blanco sin contenido médico, responde únicamente: 'PORTADA_SIN_TEXTO_CLINICO'."
            )

            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                    prompt_ocr
                ]
            )

            ocr_text = response.text.strip() if response and response.text else ""
            if "PORTADA_SIN_TEXTO_CLINICO" in ocr_text:
                return ""

            if len(ocr_text) > 40:
                print(f"  [OCR GEMINI VISION] Extraídos {len(ocr_text)} caracteres en pág. {page_number} de '{pdf_path.name}'", flush=True)
                return ocr_text

        except Exception as api_err:
            print(f"  [ADVERTENCIA OCR API] Falla en OCR multimodal pág. {page_number} de '{pdf_path.name}': {api_err}", flush=True)

    return ""
