# Ateneo: Arquitectura RAG y Metodología de Fine-Tuning para Investigación Clínica

## 1. Resumen Ejecutivo

Este documento especifica la arquitectura técnica, la pipeline de ingesta vectorial y la metodología de Fine-Tuning implementadas en el proyecto **Ateneo**. El sistema está diseñado para la evaluación formativa del razonamiento clínico de estudiantes de salud en Ecuador, contrastando sus decisiones diagnósticas y terapéuticas contra las Guías de Práctica Clínica (GPC) oficiales del Ministerio de Salud Pública (MSP).

Para garantizar la rigurosidad científica, la reproducibilidad y la escalabilidad del sistema, se ha seleccionado y configurado un modelo de embeddings de última generación (`BAAI/bge-m3`) especializado en la recuperación de información multilingüe de gran longitud.

---

## 2. Arquitectura del Sistema RAG

El flujo de información sigue una arquitectura de Recuperación Aumentada por Generación (RAG) en dos etapas principales:

```
[ GPCs en PDF (MSP) ]
         │
         ▼
[ Ingesta y Segmentación ] ──► [ Embeddings BAAI/bge-m3 ] ──► [ ChromaDB Vector Store ]
                                                                       │
                                                                       ▼
[ Respuesta del Estudiante ] ──► [ Búsqueda Semántica ] ───────────────┘
                                       │
                                       ▼
                       [ Evidencia Normativa MSP ]
                                       │
                                       ▼
                     [ Evaluador LLM (Gemini / Local) ]
                                       │
                                       ▼
                        [ JSON Estructurado Final ]
```

---

## 3. Especificaciones del Modelo de Recuperación (Retriever)

### Modelo Seleccionado: `BAAI/bge-m3`

* **Parámetros:** ~560 millones.
* **Ventana de Contexto:** 8,192 tokens (comparado con 384 tokens en modelos convencionales).
* **Métrica de Distancia Vectorial:** Cosine Distance.
* **Justificación de Selección:**
  1. **Procesamiento de Documentos Extensos:** Permite representar tablas de dosificación, criterios diagnósticos complejos y algoritmos completos sin truncamiento.
  2. **Escalabilidad Empresarial:** Preparado para la incorporación masiva de nuevos documentos y guías clínicas sin pérdida de precisión semántica.
  3. **Rendimiento en Español Técnico:** Proporciona representaciones densas optimizadas para terminología médica en idioma español.

---

## 4. Pipeline de Ingesta y Base de Datos Vectorial

### Documentos Incorporados (MSP Ecuador)

1. `GP_Tuberculosis-1.pdf`: Prevención, diagnóstico y tratamiento de Tuberculosis.
2. `gpc_VIH_acuerdo_ministerial05-07-2019.pdf`: Atención integral a personas con VIH.
3. `gpc_ehirn2019.pdf`: Enfermedad Hemorrágica del Recién Nacido.
4. `gpc_hta192019.pdf`: Hipertensión Arterial Primaria.
5. `guia_prevencion_diagnostico_tratamiento_enfermedad_renal_cronica_2018.pdf`: Enfermedad Renal Crónica.

### Métricas de Ingesta

* **Volumen Total:** 5 Guías de Práctica Clínica (>500 páginas procesadas).
* **Total de Chunks Indexados:** 557 fragmentos normativos.
* **Metadatos Preservados:** `guia_fuente`, `pagina`, `seccion`.

---

## 5. Metodología de Fine-Tuning para la Publicación Científica

Para elevar el impacto del artículo científico, se aplica un ajuste fino (*Fine-Tuning*) supervisado al modelo recuperador pequeño (`BAAI/bge-m3`), incrementando la precisión de búsqueda (Hit@1, MRR) sobre lenguaje clínico ecuatoriano.

### 5.1 Estructura del Dataset de Entrenamiento

El script `backend/ingestion/create_ft_dataset.py` genera un conjunto de tripletas de entrenamiento en formato JSON:

* **Query ($q$):** Caso clínico o consulta planteada por el estudiante.
* **Pasaje Positivo ($p^+$):** Fragmento normativo exacto de la GPC correspondiente.
* **Pasaje Negativo ($p^-$):** Fragmento de una norma o sección clínica no relacionada.

### 5.2 Función de Pérdida y Entrenamiento

Se utiliza la función de pérdida *Multiple Negatives Ranking Loss (MNRL)*:

$$\mathcal{L} = -\log \frac{e^{\text{sim}(q, p^+)/\tau}}{\sum_{j} e^{\text{sim}(q, p_j)/\tau}}$$

El entrenamiento se ejecuta utilizando la librería `sentence-transformers` durante 3 a 5 épocas, ajustando la matriz de pesos del modelo denso.

### 5.3 Cuantización e Inferencia Local

Una vez ajustado el modelo, se aplica cuantización dinámica a enteros de 8 bits (INT8):
* **Reducción de Memoria:** De ~2.2 GB a ~550 MB.
* **Aceleración de Latencia:** Reducción del tiempo de respuesta en búsquedas vectoriales a < 40 ms por consulta.

---

## 6. Configuración de Archivos del Proyecto

* **Configuración Global:** [backend/config.py](file:///home/jorge/Proyectos/clinical_rag/backend/config.py)
* **Motor de Búsqueda:** [backend/rag/retriever.py](file:///home/jorge/Proyectos/clinical_rag/backend/rag/retriever.py)
* **Script de Ingesta:** [backend/ingestion/run_ingestion.py](file:///home/jorge/Proyectos/clinical_rag/backend/ingestion/run_ingestion.py)
* **Generación de Dataset FT:** [backend/ingestion/create_ft_dataset.py](file:///home/jorge/Proyectos/clinical_rag/backend/ingestion/create_ft_dataset.py)
* **Suite de Métricas:** [backend/tests/run_metrics.py](file:///home/jorge/Proyectos/clinical_rag/backend/tests/run_metrics.py)
