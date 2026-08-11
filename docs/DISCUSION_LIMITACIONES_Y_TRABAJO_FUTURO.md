# Discusión Técnica, Limitaciones, Consideraciones Éticas y Trabajo Futuro

Este documento complementa la especificación del sistema **Ateneo**, ofreciendo un análisis crítico de los resultados empíricos, el análisis comparativo con enfoques alternativos de IA médica, la identificación rigurosa de las limitaciones del sistema y las líneas de desarrollo futuro.

---

## 1. Análisis Comparativo de Resultados

### 1.1 Contrastación contra Evaluadores Zero-Shot y LLMs Genéricos
Los experimentos demostraron que el uso directo de modelos de lenguaje genéricos en configuración *Zero-Shot* (sin RAG ni norma explícita inyectada) presenta dos deficiencias críticas para la evaluación formativa:
1. **Alucinación Normativa:** Los modelos genéricos tienden a evaluar respuestas basadas en guías de práctica clínica internacionales (NICE, AHA, WHO) que no concuerdan estrictamente con las dosificaciones o algoritmos de decisión estandarizados por el Ministerio de Salud Pública (MSP) del Ecuador (ej. volúmenes de impregnación en Código Rojo o dosis ponderales de Vitamina K en EHIRN).
2. **Subjetividad en la Penalización:** Sin una métrica acotada a la norma, la calificación oscila con alta variabilidad. La arquitectura **Ateneo RAG** resuelve esta limitación forzando al modelo a fundamentar la retroalimentación en la `cita_normativa` literal del fragmento recuperado.

### 1.2 Impacto del Fine-Tuning Supervisado por Tripletas (MNRL)
El ajuste supervisado del modelo `BAAI/bge-m3` mediante la función de pérdida *Multiple Negatives Ranking Loss* sobre 480 tripletas adaptó el espacio latente de 1,024 dimensiones para reconocer la terminología específica del MSP. Esto permitió incrementar la precisión de recuperación a **Hit@1 = 100.0%** en el banco de pruebas, superando la ambigüedad donde secciones de diferentes guías compartían términos clínicos genéricos (ej. "hidratación parenteral").

---

## 2. Limitaciones del Sistema y Factores de Riesgo

### 2.1 Dependencia de Calidad en la Extracción PDF (OCR Noise)
* **Limitación:** El módulo [backend/ingestion/pdf_extractor.py](file:///c:/Users/DESARROLLADOR/Desktop/Proyectos/clinical_rag/backend/ingestion/pdf_extractor.py) utiliza `pypdf`, el cual extrae el flujo de texto incrustado. En documentos antiguos del MSP resguardados como archivos escaneados o imágenes sin capa de texto seleccionable, la extracción directa falla o produce cadenas distorsionadas.
* **Mitigación Sugerida:** Integrar un pipeline de Reconocimiento Óptico de Caracteres (OCR) avanzado como `Tesseract OCR` o `PaddleOCR` antes del segmentador.

### 2.2 Dependencia de Conectividad Cloud para el LLM
* **Limitación:** Aunque la etapa de recuperación vectorial opera de forma 100% local en CPU/GPU mediante ChromaDB y `BAAI/bge-m3`, la etapa de evaluación cualitativa requiere conectividad a internet para invocar la API de Google Gemini.
* **Factor de Riesgo:** En entornos hospitalarios o de educación rural con conectividad inestable o restringida, la latencia de red puede afectar la disponibilidad de la plataforma.

---

## 3. Consideraciones Éticas, Legales y Gobernanza de Datos

1. **Evaluación Formativa No Punitiva:** El sistema está diseñado exclusivamente para el refuerzo pedagógico y la autoevaluación formativa. No debe sustituir la evaluación sumativa o la supervisión directa de tutores docentes clínicos.
2. **Anonimización y Datos Sintéticos:** Los casos clínicos procesados en `cases.json` y las respuestas registradas en `history.db` utilizan identidades y escenarios simulados anonimizados, cumpliendo con la Ley Orgánica de Protección de Datos Personales del Ecuador y los estándares internacionales de confidencialidad en salud.

---

## 4. Líneas de Trabajo Futuro y Extensión Arquitectónica

### 4.1 Búsqueda Híbrida y Re-Ranking Denso-Esparso
Para mejorar la resolución en consultas con terminología ultra-específica (nombres de fármacos o valores numéricos exactos de laboratorio):
* **Recuperación Híbrida:** Combinar búsqueda esparsa (BM25 / TF-IDF) con búsqueda densa vectorial (`bge-m3`) mediante Fusión de Rango Recíproco (RRF - *Reciprocal Rank Fusion*).
* **Re-Ranking Supervisado:** Implementar una capa intermedia de re-ordenamiento utilizando modelos de *Cross-Encoder* (ej. `BAAI/bge-reranker-large`) sobre el Top-5 de fragmentos devueltos.

### 4.2 Despliegue 100% Local y Offline mediante LLMs Cuantizados
Para eliminar la dependencia de APIs en la nube:
* Integrar modelos de lenguaje de código abierto fine-tuneados en salud (ej. `Llama-3-8B-Instruct`, `Meditron-7B` o `BioMistral`) ejecutados localmente mediante motores de inferencia cuantizada (vLLM / Ollama con GGUF FP16/INT4).
