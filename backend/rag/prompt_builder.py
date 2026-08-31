from typing import Dict, Any, List, Optional
from models.schemas import ClinicalCaseSchema

SYSTEM_INSTRUCTION = """Eres un evaluador médico y docente experto en razonamiento clínico para estudiantes de ciencias de la salud en Ecuador.
Tu tarea es evaluar la respuesta dada por un estudiante a un caso clínico simulado, comparándola ESTRICTAMENTE contra el fragmento oficial de la Guía de Práctica Clínica (GPC) del Ministerio de Salud Pública (MSP) del Ecuador que se te proporciona.

REGLAS DE EVALUACIÓN Y FORMATO:
1. Responde ÚNICAMENTE en formato JSON válido acorde al esquema indicado.
2. Evalúa de forma formativa, constructiva y con estricto rigor psicométrico y clínico.
3. Clasifica la respuesta con una nota ('score') entre 0.0 y 10.0 según la siguiente RÚBRICA ANCLADA EN EVIDENCIA:
   - [0.0 - 1.0 pts] DESCONOCIMIENTO / OMISIÓN TOTAL: Respuesta en blanco, evasiva, "no sé", irrelevante o ausencia total de razonamiento.
   - [1.1 - 4.0 pts] INSUFICIENTE / RIESGO IATROGÉNICO: Diagnóstico erróneo, indicación de fármacos/conductas contraindicadas según la GPC o razonamiento incoherente.
   - [4.1 - 6.5 pts] PARCIAL BÁSICO: Identifica el diagnóstico principal pero omite el esquema terapéutico normado, dosis o criterios de severidad del MSP.
   - [6.6 - 8.5 pts] COMPETENTE / BUENO: Diagnóstico y pilar terapéutico correctos, con omisiones menores en dosificación exacta, seguimiento o prevención.
   - [8.6 - 10.0 pts] EXCELENTE / ALINEADO A NORMATIVA: Razonamiento clínico integral, diagnóstico preciso, esquema terapéutico exacto según GPC, criterios de alarma y seguimiento completos.
4. Enumera los 'aciertos' (lo que el estudiante identificó bien acorde a la guía). Si la respuesta es "no sé" o en blanco, la lista de aciertos debe estar vacía [].
5. Enumera las 'omisiones' (elementos clave que la guía exige y el estudiante no mencionó).
6. Enumera las 'competencias_deficientes' como una lista de objetos: [{"eje": "<eje_clinico>", "descripcion": "<detalle>"}], donde 'eje' DEBE SER OBLIGATORIAMENTE uno de los 4 ejes clínicos: "diagnóstico", "tratamiento", "prevención" o "seguimiento". Si la respuesta es "no sé", en blanco o deficiente, desglosa obligatoriamente las brechas en los 4 ejes según la GPC.
7. Proporciona la 'cita_normativa' extrayendo la sección, página y el fragmento relevante literal que respalda la evaluación.
8. Escribe una 'retroalimentacion_general' sintética y constructiva (2-3 oraciones).
9. Basa la evaluación EXCLUSIVAMENTE en el fragmento de la guía proporcionado."""


def _build_multimodal_section(n_imagenes: int, mime_types: Optional[List[str]] = None) -> str:
    """
    Genera la sección enumerada de estudios diagnósticos para el prompt multimodal.
    Clasifica cada estudio por tipo según su MIME type.
    """
    MIME_TO_LABEL = {
        "image/jpeg": "Imagen Clínica",
        "image/jpg":  "Imagen Clínica",
        "image/png":  "Imagen Clínica",
        "image/webp": "Imagen Clínica",
        "application/pdf": "Documento Clínico (PDF)",
    }
    mimes = mime_types or []
    lineas = []
    for i in range(1, n_imagenes + 1):
        mime = mimes[i - 1] if i - 1 < len(mimes) else "image/jpeg"
        label = MIME_TO_LABEL.get(mime, "Estudio Diagnóstico")
        lineas.append(f"  [{i}] {label}")
    return "\n".join(lineas)


def build_prompt(
    caso: ClinicalCaseSchema,
    respuesta_estudiante: str,
    chunk: Dict[str, Any],
    tiene_imagen: bool = False,
    n_imagenes: int = 0,
    mime_types: Optional[List[str]] = None,
) -> str:
    """
    Construye el prompt completo para ser procesado por el modelo Gemini.
    Soporta análisis multimodal para múltiples estudios adjuntos.
    """
    n = n_imagenes if n_imagenes > 0 else (1 if tiene_imagen else 0)
    instruccion_imagen = ""

    if n > 1:
        estudios_str = _build_multimodal_section(n, mime_types)
        instruccion_imagen = f"""

ESTUDIOS DIAGNÓSTICOS DISPONIBLES ({n} estudios adjuntos en este caso):
{estudios_str}

INSTRUCCIÓN DE CORRELACIÓN MULTIMODAL (Obligatoria):
Evalúa si el estudiante realizó una correlación diagnóstica coherente entre los hallazgos de los {n} estudios adjuntos y los criterios de la GPC del MSP Ecuador.
- Verifica que el estudiante integró los hallazgos de TODOS los estudios de forma conjunta, no de forma aislada.
- Si el estudiante omitió correlacionar algún estudio con el cuadro clínico, inclúyelo en 'omisiones' y en 'competencias_deficientes' bajo el eje "diagnóstico".
- Menciona explícitamente los estudios adjuntos y su relevancia en la 'retroalimentacion_general'."""

    elif n == 1:
        instruccion_imagen = """

IMAGEN CLÍNICA ADJUNTA:
El estudiante ha proporcionado una imagen clínica (puede ser un hemograma, radiografía, fotografía de lesión, ECG u otro estudio).
Analiza la imagen e intégrala en tu evaluación:
- Verifica si la interpretación que hace el estudiante de la imagen es correcta según la GPC.
- Si la imagen aporta evidencia adicional (valores anormales, hallazgos clínicos), inclúyela en los 'aciertos' u 'omisiones' según corresponda.
- Menciona la imagen explícitamente en la 'retroalimentacion_general'."""

    return f"""CASO CLÍNICO:
Título: {caso.titulo}
Enunciado: {caso.enunciado}

PREGUNTA FORMULADA AL ESTUDIANTE:
{caso.pregunta}

RESPUESTA DEL ESTUDIANTE:
{respuesta_estudiante}

FRAGMENTO RECUPERADO DE LA GUÍA DE PRÁCTICA CLÍNICA (MSP ECUADOR):
Guía: GPC {chunk.get('guia_fuente', '').upper()} MSP Ecuador
Sección: {chunk.get('seccion', 'General')}
Página: {chunk.get('pagina', 'N/A')}
Texto Normativo Oficial:
"{chunk.get('texto', '')}"
{instruccion_imagen}
Evalúa el razonamiento clínico del estudiante comparándolo directamente contra la norma oficial del MSP proporcionada.
"""


def build_phase_prompt(
    caso: ClinicalCaseSchema,
    fase_numero: int,
    respuesta_estudiante: str,
    chunk: Dict[str, Any],
    historial_previo: str = "",
    tiene_imagen: bool = False,
    n_imagenes: int = 0,
    mime_types: Optional[List[str]] = None,
) -> str:
    """
    Construye un prompt enfocado específicamente en el hito clínico de la fase actual,
    con soporte para múltiples estudios diagnósticos.
    """
    fase_enfoque = {
        1: "FASE 1: ANAMNESIS Y SOSPECHA DIAGNÓSTICA PRELIMINAR. Evalúa si el estudiante identificó correctamente los signos de alarma, factores de riesgo y la hipótesis diagnóstica inicial. No penalices por no dar esquemas terapéuticos aún.",
        2: "FASE 2: SOLICITUD E INTERPRETACIÓN DE ESTUDIOS PARACLÍNICOS. Evalúa la precisión al interpretar los hallazgos en estudios de imagen (Rx), trazados (ECG) o valores paraclínicos/laboratorio.",
        3: "FASE 3: PRESCRIPCIÓN TERAPÉUTICA Y PLAN DE SEGUIMIENTO. Evalúa la exactitud de los fármacos normados, dosificación, vías de administración, criterios de hospitalización/alta y monitoreo."
    }.get(fase_numero, f"FASE {fase_numero}: EVALUACIÓN CLÍNICA SECUENCIAL.")

    contexto_historial = f"\nHISTORIAL DE FASES PREVIAS DEL ESTUDIANTE:\n{historial_previo}\n" if historial_previo else ""
    
    n = n_imagenes if n_imagenes > 0 else (1 if tiene_imagen else 0)
    instruccion_imagen = ""
    if n > 1:
        estudios_str = _build_multimodal_section(n, mime_types)
        instruccion_imagen = (
            f"\nESTUDIOS DIAGNÓSTICOS EN ESTA FASE ({n} estudios adjuntos):\n"
            + estudios_str
            + "\nEvalúa la interpretación INTEGRADA de TODOS los estudios frente a los hallazgos normados en la GPC. "
              "Penaliza la falta de correlación multimodal como brecha en el eje 'diagnóstico'."
        )
    elif n == 1:
        instruccion_imagen = "\nESTUDIO DIAGNÓSTICO ADJUNTO EN ESTA FASE: Evalúa la interpretación del estudio frente a los hallazgos patológicos normados en la GPC."

    return f"""SIMULACIÓN CLÍNICA POR FASES SECUENCIALES:
Caso Clínico: {caso.titulo}
Enunciado Global: {caso.enunciado}

HITO CLÍNICO ACTUAL:
{fase_enfoque}
{contexto_historial}
RESPUESTA DEL ESTUDIANTE EN ESTA FASE:
{respuesta_estudiante}

NORMATIVA OFICIAL DE RESPALDO (MSP ECUADOR):
Guía: GPC {chunk.get('guia_fuente', '').upper()} MSP Ecuador
Sección: {chunk.get('seccion', 'General')} (pág. {chunk.get('pagina', 'N/A')})
Texto Oficial: "{chunk.get('texto', '')}"
{instruccion_imagen}
Evalúa el desempeño específico en esta fase ({fase_enfoque}) y retorna la retroalimentación formativa en formato JSON estricto.
"""
