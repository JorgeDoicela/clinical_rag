# Discusión Técnica, Limitaciones, Consideraciones Éticas y Trabajo Futuro

Este documento complementa la especificación del sistema **Ateneo**, ofreciendo un análisis crítico de los resultados empíricos, el análisis comparativo con enfoques alternativos de IA médica, la identificación rigurosa de las limitaciones del sistema y las líneas de desarrollo futuro.

---

## 1. Análisis Comparativo de Resultados

### 1.1 Contrastación contra Evaluadores Zero-Shot y LLMs Genéricos
Los experimentos demostraron que el uso directo de modelos de lenguaje genéricos en configuración *Zero-Shot* (sin RAG ni norma explícita inyectada) presenta dos deficiencias críticas para la educación médica:
1. **Alucinación Normativa:** Los modelos genéricos tienden a evaluar respuestas basadas en guías de práctica clínica internacionales (NICE, AHA, WHO) que difieren de las dosificaciones, flujogramas o esquemas de decisión estandarizados por el Ministerio de Salud Pública (MSP) del Ecuador (ej. volúmenes de impregnación en Código Rojo Obstétrico o dosis ponderales de Vitamina K en EHIRN).
2. **Subjetividad en la Penalización:** Sin una métrica acotada a la norma, la calificación oscila con alta variabilidad. La arquitectura **Ateneo RAG** resuelve esta limitación forzando al modelo a fundamentar la retroalimentación en la `cita_normativa` literal del fragmento recuperado.

### 1.2 Impacto de la Búsqueda Híbrida RRF y Fine-Tuning Supervisado (MNRL)
La integración de **Búsqueda Densa (BGE-M3 Fine-Tuned)** con **Búsqueda Dispersa (BM25Okapi)** mediante **Reciprocal Rank Fusion ($k=60$)** permitió alcanzar un rendimiento óptimo (**Hit@1 = 100.0%**, **MRR@5 = 1.0000**, **NDCG@5 = 1.0000**):
* La rama densa resuelve la intención semántica y variaciones sintácticas del estudiante.
* La rama dispersa BM25 garantiza la exactitud léxica de fármacos, dosis numéricas (*"500 mg"*, *"1 g IV"*) y acrónimos clínicos (*"CURB-65"*, *"HELLP"*).

---

## 2. Mitigación de Limitaciones de Ingesta Mediante OCR Defensivo

* **Desafío Histórico:** En documentos antiguos del MSP (2013-2015) resguardados como escaneos sin capa de texto seleccionable, la extracción directa con bibliotecas estándar de PDF fallaba.
* **Solución Implementada ([../backend/ingestion/ocr_service.py](../backend/ingestion/ocr_service.py)):** Se implementó un pipeline de **OCR Defensivo Multinivel** que detecta páginas con baja densidad de texto (< 50 caracteres) pero con imágenes incrustadas, renderizándolas a 180 DPI en memoria y transcribiendo su contenido clínico mediante OCR local y visión multimodal de alta precisión (Gemini Vision API), preservando tablas y algoritmos diagnósticos.

---

## 3. Consideraciones Éticas, Legales y Gobernanza de Datos

1. **Evaluación Formativa No Punitiva:** El sistema está concebido como una herramienta de apoyo pedagógico para el autoaprendizaje y la retroalimentación formativa en internado rotativo y pregrado de medicina, sin sustituir el criterio final del docente tutor.
2. **Anonimización y Datos Sintéticos:** Los casos clínicos procesados y las respuestas en `history.db` utilizan identidades y escenarios simulados anonimizados, cumpliendo estrictamente con la Ley Orgánica de Protección de Datos Personales del Ecuador y las normas de bioética en salud.
3. **Auditoría e Integridad Académica:** Cada informe emitido incluye un código criptográfico **SHA-256 (`ATENEO-MSP-XXXXXXXX`)** verificable para prevenir adulteraciones en portafolios académicos.

---

## 4. Líneas de Trabajo Futuro y Extensión Científica

### 4.1 Re-Ranking con Cross-Encoders Biomédicos
* **Capa de Re-ordenamiento:** Evaluar modelos de *Cross-Encoder* especializados (ej. `BAAI/bge-reranker-large` o `BioLinkBERT`) sobre el Top-10 devuelto por la Fusión RRF para refinar la ponderación en casos clínicos con múltiples comorbilidades concurrentes.

### 4.2 Despliegue 100% Offline mediante LLMs Cuantizados (Edge Computing)
* Para centros de salud rurales de Primer Nivel sin conectividad a internet:
  * Integrar LLMs clínicos de código abierto cuantizados (ej. `Llama-3-8B-Instruct`, `Meditron-7B` o `BioMistral`) ejecutados localmente mediante Ollama / vLLM (GGUF Q4_K_M).

### 4.3 Validación Clínica Multicéntrica
* Diseñar un estudio experimental aleatorizado controlado con cohortes de estudiantes de medicina en múltiples facultades de ciencias de la salud del Ecuador para medir la ganancia de aprendizaje (*Learning Gain*) pre y post uso de la plataforma Ateneo.

---

## 5. Generalizabilidad, Transferibilidad y Escalabilidad a Otras Áreas Médicas

El sistema **Ateneo** fue concebido bajo una arquitectura completamente **modular y agnóstica al dominio clínico**, lo que garantiza su reproducción y extensión a cualquier rama de las ciencias de la salud:

### 5.1 Desacoplamiento del Corpus Documental
* **Independencia del Formato:** El pipeline de parseo matricial (`pdf_advanced_parser.py`) y segmentación contextual (`chunker.py`) procesa cualquier cuerpo de literatura biomédica sin modificaciones en el código fuente.
* **Aplicabilidad Inmediata:**
  * **Especialidades Quirúrgicas y Urgencias:** Protocolos ATLS (*Advanced Trauma Life Support*), ACLS (*Advanced Cardiovascular Life Support*) y manuales de técnica quirúrgica.
  * **Medicina Crítica y Cuidados Intensivos (UCI):** Guías de sepsis (*Surviving Sepsis Campaign*), ventilación mecánica y monitoreo hemodinámico invasivo.
  * **Farmacología Clínica y Terapéutica:** Vademécums oficiales, tablas de farmacocinética, ajustes de dosis por aclaramiento renal y matrices de interacciones medicamentosas.
  * **Normativas Internacionales:** Adaptación a estándares de la Organización Mundial de la Salud (OMS), guías *NICE* (Reino Unido) o consensos *AHA/ACC* (Estados Unidos).

### 5.2 Universalidad de la Taxonomía en Cuatro Ejes Clínicos
La estructura de evaluación formalizada en Pydantic (`EvaluationResult`) y el constructor de directivas (`prompt_builder.py`) evalúan de manera estándar los **cuatro pilares transversales de la práctica médica**:
$$\text{Evaluación del Razonamiento} = \text{Diagnóstico} + \text{Tratamiento} + \text{Prevención} + \text{Seguimiento}$$
Esta ontología es universalmente transferible desde la atención primaria hasta subespecialidades de alta complejidad.

### 5.3 Extensibilidad de la Fusión Multimodal Simultánea
El motor multimodal de visión y lenguaje admite la integración directa de diversas modalidades diagnósticas complementarias:
* **Trazados Electrofisiológicos:** Electrocardiogramas (ECG de 12 derivaciones) y electroencefalogramas (EEG).
* **Diagnóstico por Imagen:** Tomografías Computarizadas (TAC), Resonancias Magnéticas (RMN), Radiografías digitales (Rx) y Ecografías obstétricas / FAST.
* **Laboratorio y Paraclínicos:** Gasometrías arteriales, citometría hemática, perfiles hepáticos/renales y paneles microbiológicos con antibiogramas.

