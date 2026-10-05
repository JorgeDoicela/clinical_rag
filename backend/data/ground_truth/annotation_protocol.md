# Protocolo de Anotación y Validación Clínica del Ground Truth (Fase 5)

## 1. Alcance y Marco Metodológico

Este protocolo formaliza las directrices de revisión médica independiente para la construcción del conjunto de prueba ciego (*Ground Truth*) de la plataforma **Ateneo+**. El objetivo es establecer un estándar de referencia (*Gold Standard*) curado por profesionales de la salud para evaluar cuantitativamente la precisión de recuperación del modelo de lenguaje en el benchmark científico (Fase 8).

La tarea del evaluador médico consiste en juzgar el grado de relevancia y pertinencia normativa de un **fragmento documental extraído de las Guías de Práctica Clínica (GPC) oficiales del Ministerio de Salud Pública (MSP) del Ecuador**, en relación con una **consulta diagnóstica o terapéutica estandarizada**.

---

## 2. Escala Ordinal de Relevancia Clínica y Normativa

Cada par `(consulta_clinica, fragmento_candidato)` debe ser calificado con una puntuación entera mutuamente excluyente en la escala ordinal $\{0, 1, 2\}$:

| Puntuación | Clasificación | Definición Operativa |
| :---: | :--- | :--- |
| **0** | **Irrelevante o Contradictorio** | El fragmento no responde a la consulta formulada, aborda un cuadro patológico o grupo etario distinto (ej. manejo pediátrico ante una consulta obstétrica), o contradice expresamente las normas clínicas vigentes del MSP. |
| **1** | **Parcialmente Relevante / Contextual** | El fragmento trata sobre la misma entidad patológica, factores de riesgo o fisiopatología, pero carece de la instrucción normativa concreta (ej. omite la dosis farmacológica específica, el intervalo de administración, la vía o el criterio exacto de derivación hospitalaria). |
| **2** | **Gold Standard / Criterio Normativo Directo** | El fragmento contiene la respuesta clínica vinculante completa requerida por la normativa ministerial: esquema posológico de primera línea, algoritmo de triaje/reanimación, criterio diagnóstico estricto o directriz de referencia obligatoria. |

---

## 3. Criterios de Calibración por Ejes Normativos del MSP

### 3.1 Eje 01: Urgencias Obstétricas
* **Consulta Típica:** *"¿Cuál es la dosis de impregnación y de mantenimiento con sulfato de magnesio recomendada por el MSP en preeclampsia con signos de gravedad?"*
  * **Score 0:** Fragmento sobre fisiopatología de la placenta previa o tratamiento antihipertensivo oral en consulta externa.
  * **Score 1:** Fragmento que indica *"administrar sulfato de magnesio para prevenir convulsiones en preeclampsia severa"*, pero no detalla los gramos ni la dilución en solución salina.
  * **Score 2:** Fragmento con la directriz ministerial exacta: *"Impregnación: 4 g IV en 20 minutos (diluidos en 100 ml de solución salina al 0.9%). Mantenimiento: 1 g/hora en infusión continua IV"*.

### 3.2 Eje 02: Respiratorio Pediátrico
* **Consulta Típica:** *"¿Cuál es el antibiótico de primera elección y su posología recomendada en neumonía adquirida en la comunidad (NAC) no grave en lactantes mayores de 3 meses según el MSP?"*
  * **Score 0:** Fragmento sobre aspiración de cuerpo extraño o esquema de vacunación pentavalente.
  * **Score 1:** Fragmento que menciona *"el tratamiento empírico de elección es la amoxicilina oral por 5 a 7 días"* sin especificar la dosis en mg/kg/día ni la frecuencia.
  * **Score 2:** Fragmento con posología completa: *"Amoxicilina oral a 80-90 mg/kg/día dividida en 3 dosis cada 8 horas por 5 días"*, incluyendo advertencias de seguimiento.

### 3.3 Eje 03: Cardiovascular y Metabólico
* **Consulta Típica:** *"En un paciente con Hipertensión Arterial Grado 2 y riesgo cardiovascular alto según el MSP, ¿cuál es la estrategia inicial de tratamiento farmacológico?"*
  * **Score 0:** Manejo dietético del síndrome metabólico o tablas de estadificación de dislipidemia sin metas de presión arterial.
  * **Score 1:** Fragmento que recomienda *"iniciar con monoterapia o cambio en el estilo de vida"* sin abordar la combinación dual fija mandatada para riesgo alto.
  * **Score 2:** Fragmento que especifica: *"Iniciar terapia combinada en un solo comprimido (IECA o ARA-II + Antagonista de calcio o Diurético tiazídico) con reevaluación a las 4 semanas"*.

### 3.4 Eje 04: Soporte, Crónicos y Salud Mental
* **Consulta Típica:** *"¿Cuál es la titulación inicial de morfina por vía oral recomendada en dolor oncológico severo no controlado en adultos?"*
  * **Score 0:** Escala de tamizaje de depresión en atención primaria.
  * **Score 1:** Fragmento del tercer peldaño de la escalera analgésica de la OMS que señala *"usar opioides mayores"* sin tabla de titulación.
  * **Score 2:** Fragmento con la directriz técnica: *"Iniciar con morfina de liberación rápida 5-10 mg VO cada 4 horas con dosis de rescate equivalente al 10-15% de la dosis diaria total"*.

---

## 4. Procedimiento de Anotación y Doble Ciego

1. **Entorno de Trabajo:** Cada médico evaluador recibe el archivo `pairs_raw.csv` anonimizado, donde el orden de los pares ha sido aleatorizado sin indicar si el fragmento proviene de un positivo original o de un hard negative minado.
2. **Evaluación Individual:** El evaluador completa exclusivamente su columna asignada (`relevance_rater_1` o `relevance_rater_2`) con los enteros `0`, `1` o `2`.
3. **Observaciones:** En caso de detectar discrepancias de paginación o texto trunco, consignar una breve nota técnica en la columna `notes`.

---

## 5. Métrica de Acuerdo y Resolución de Conflictos

1. **Métrica Estadística:** La concordancia inter-anotador se mide mediante el coeficiente **Kappa ponderado cuadrático de Cohen ($\kappa_w$)**, el cual penaliza con rigor cuadrático las divergencias extremas:
   $$\kappa_w = 1 - \frac{\sum w_{ij} O_{ij}}{\sum w_{ij} E_{ij}}, \quad w_{ij} = \frac{(i - j)^2}{(3 - 1)^2}$$
2. **Umbral de Calidad Científica:** Se exige un valor $\kappa_w \ge 0.80$ (*Acuerdo casi perfecto*, estándar Landis & Koch).
3. **Arbitraje Clínico:**
   * **Divergencia menor ($|Score_1 - Score_2| = 1$):** Se adopta la calificación consensuada o la ponderación conservadora mínima.
   * **Divergencia mayor ($|Score_1 - Score_2| = 2$, es decir, 0 vs 2):** Requiere obligatoriamente la intervención de un tercer especialista (*relevance_arbitrator*) para dictaminar la calificación final definitiva.

---

## 6. Integridad Criptográfica del Dataset Consolidado

Una vez superado el umbral $\kappa_w \ge 0.80$ y resueltas las discrepancias, el dataset resultante `pairs_validated.csv` queda inmutablemente protegido registrando su firma SHA-256 en `backend/data/datasets/checksums.sha256`.
