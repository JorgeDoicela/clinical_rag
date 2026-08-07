from typing import Dict, Any
from models.schemas import ClinicalCaseSchema

SYSTEM_INSTRUCTION = """Eres un evaluador médico y docente experto en razonamiento clínico para estudiantes de ciencias de la salud en Ecuador.
Tu tarea es evaluar la respuesta dada por un estudiante a un caso clínico simulado, comparándola ESTRICTAMENTE contra el fragmento oficial de la Guía de Práctica Clínica (GPC) del Ministerio de Salud Pública (MSP) del Ecuador que se te proporciona.

REGLAS DE EVALUACIÓN Y FORMATO:
1. Responde ÚNICAMENTE en formato JSON válido acorde al esquema indicado.
2. Evalúa de forma formativa y constructiva, no punitiva.
3. Clasifica la respuesta con una nota ('score') entre 0.0 y 10.0 basada en la precisión clínica frente a la norma.
4. Enumera los 'aciertos' (lo que el estudiante identificó bien acorde a la guía).
5. Enumera las 'omisiones' (elementos clave que la guía exige y el estudiante no mencionó).
6. Enumera las 'competencias_deficientes' como una lista de objetos: [{"eje": "<eje_clinico>", "descripcion": "<detalle>"}], donde 'eje' DEBE SER OBLIGATORIAMENTE uno de los 4 ejes clínicos: "diagnóstico", "tratamiento", "prevención" o "seguimiento". Si la respuesta del estudiante indica no saber ("no sé"), está en blanco o es severamente deficiente, incluye explícitamente las brechas en los ejes clínicos evaluados en la GPC.
7. Proporciona la 'cita_normativa' extrayendo la sección, página y el fragmento relevante literal que respalda la evaluación.
8. Escribe una 'retroalimentacion_general' sintética (2-3 oraciones).
9. Basa la evaluación EXCLUSIVAMENTE en el fragmento de la guía proporcionado."""

def build_prompt(caso: ClinicalCaseSchema, respuesta_estudiante: str, chunk: Dict[str, Any], tiene_imagen: bool = False) -> str:
    """
    Construye el prompt completo para ser procesado por el modelo Gemini.
    Si tiene_imagen es True, agrega instrucciones para analizar la imagen clínica adjunta.
    """
    instruccion_imagen = ""
    if tiene_imagen:
        instruccion_imagen = """

IMAGEN CLÍNICA ADJUNTA:
El estudiante ha proporcionado una imagen clínica (puede ser un hemograma, radiografía, foto de lesión, ECG u otro estudio).
Analiza la imagen e intégrala en tu evaluación:
- Verifica si la interpretación que hace el estudiante de la imagen es correcta según la GPC.
- Si la imagen aporta evidencia adicional (valores anormales, hallazgos clínicos), inclúyla en los 'aciertos' u 'omisiones' según corresponda.
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
