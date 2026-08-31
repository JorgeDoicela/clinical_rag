# Protocolo Experimental: Estudio Piloto de Ganancia de Aprendizaje Clínico (Learning Gain)

Este documento detalla el diseño metodológico, psicométrico y bioético del estudio piloto cuasiexperimental de **Ganancia de Aprendizaje** (*Learning Gain*) implementado para validar el impacto educativo de **Ateneo+** en estudiantes de internado rotativo de medicina en Ecuador.

---

## 1. Justificación y Pregunta de Investigación

### Pregunta de Investigación:
> ¿En qué medida el entrenamiento interactivo en Ateneo+ (RAG Híbrido anclado a GPCs del MSP + Motor de Currículo Adaptativo KST/BKT) produce una ganancia normalizada de razonamiento clínico significativamente superior ($p < 0.05$) frente a la línea base diagnóstica en médicos internos de pregrado?

### Hipótesis Experimental:
* **Hipótesis Nula ($H_0$):** No existe diferencia estadísticamente significativa en el puntaje de razonamiento clínico normativo antes y después de la intervención con Ateneo+ ($\mu_{\text{post}} - \mu_{\text{pre}} = 0$).
* **Hipótesis Alternativa ($H_1$):** El uso adaptativo de Ateneo+ incrementa significativamente el rendimiento clínico ($\mu_{\text{post}} > \mu_{\text{pre}}$) con una Ganancia Normalizada de Hake clasificada como Alta ($g \ge 0.70$).

---

## 2. Diseño del Estudio y Población Muestral

| Parámetro Metodológico | Especificación Formal |
| :--- | :--- |
| **Diseño** | Cuasiexperimental pre-post intervención con grupo único intrasujeto. |
| **Población Objetivo** | Estudiantes de 6to año / Internado Rotativo de Medicina (rotaciones de Pediatría, Gineco-Obstetricia, Medicina Interna y Emergencias). |
| **Tamaño de Muestra ($N$)** | $N = 25$ médicos internos de pregrado en facultades de medicina del Ecuador. |
| **Duración de la Intervención** | 2 semanas de práctica autónoma adaptativa (meta: 12 a 18 casos clínicos resueltos por estudiante). |
| **Casos Pre-Test** | 5 casos clínicos diagnósticos y terapéuticos no resueltos previamente ([../backend/data/pilot_study/pre_test_casos.json](../backend/data/pilot_study/pre_test_casos.json)). |
| **Casos Post-Test** | 5 casos clínicos isomórficos de idéntico nivel de complejidad nosológica ([../backend/data/pilot_study/post_test_casos.json](../backend/data/pilot_study/post_test_casos.json)). |

---

## 3. Modelo Psicométrico de Ganancia de Aprendizaje (Hake Learning Gain)

Para aislar el efecto de techo (*ceiling effect*) y permitir comparabilidad independiente del puntaje inicial de los estudiantes, se utiliza la **Ganancia Normalizada de Hake** ($g$, Hake, 1998):

$$g = \frac{\text{Score}_{\text{Post}} - \text{Score}_{\text{Pre}}}{\text{Score}_{\text{Máximo}} - \text{Score}_{\text{Pre}}} = \frac{\text{Score}_{\text{Post}} - \text{Score}_{\text{Pre}}}{10.0 - \text{Score}_{\text{Pre}}}$$

### Categorización Estándar de la Ganancia ($g$):
* **$g \ge 0.70$:** Ganancia Alta (*High Learning Gain*).
* **$0.30 \le g < 0.70$:** Ganancia Media (*Medium Learning Gain*).
* **$g < 0.30$:** Ganancia Baja (*Low Learning Gain*).

---

## 4. Análisis Estadístico Inferencial

1. **Prueba de Normalidad:** Shapiro-Wilk sobre las diferencias pareadas ($\Delta = \text{Post} - \text{Pre}$).
2. **Prueba de Hipótesis Principal:**
   * $t$-test pareado de Student para muestras relacionadas si $\Delta$ es normal ($t = \frac{\bar{D}}{SE_{\bar{D}}}$).
   * Wilcoxon Signed-Rank Test como contraste no paramétrico robusto.
3. **Tamaño del Efecto (*Effect Size*):** $d$ de Cohen para mediciones repetidas:
   $$d = \frac{\bar{X}_{\text{Post}} - \bar{X}_{\text{Pre}}}{SD_{\text{agrupada}}}$$
4. **Nivel de Significancia:** $\alpha = 0.05$ (dos colas).

---

## 5. Consideraciones Bioéticas y Consentimiento Informado

* **Anonimización Estricta:** Todos los registros de la plataforma se identifican mediante identificadores alfanuméricos enmascarados (`INT_001` a `INT_025`), disociando nombres reales y correos institucionales.
* **Carácter Formativo:** Las evaluaciones en el simulador no condicionan las calificaciones curriculares formales de las rotaciones hospitalarias.
* **Adherencia a Normativa Bioética:** Protocolo estructurado de acuerdo con la Declaración de Helsinki para investigación educativa médica y requisitos de comités de bioética universitarios (CEISH).

---

## 6. Pipeline MLOps de Reproducibilidad y Generación de Tablas LaTeX

El procesamiento automatizado de los datos experimentales se ejecuta mediante:

```bash
# Ejecución del analizador inferencial y generación de Tabla IV LaTeX:
docker compose exec backend python tests/pilot_study_analyzer.py
```

* **Dataset de Entrada:** `backend/data/pilot_study/resultados_pilot.csv`
* **Artefacto de Publicación:** `docs/tabla_pilot_study_paper.tex`
