# Motor de Currículo Adaptativo (KST + BKT), Índice de Brecha Formativa y Learning Analytics

Este documento formaliza la arquitectura del **Intelligent Tutoring System (ITS)** integrado en **Ateneo+**, detallando los modelos psicométricos de modelado del estudiante, la selección proactiva de casos clínicos en la Zona de Desarrollo Próximo y la analítica institucional del aprendizaje.

---

## 1. Marco Teórico y Modelado del Espacio de Conocimiento (KST)

Para transformar el simulador clínico de una plataforma reactiva (donde el usuario escoge casos al azar) a un sistema tutor inteligente proactivo, se implementa la **Teoría de Espacios de Conocimiento** (*Knowledge Space Theory - KST*, Doignon & Falmagne, 1985).

### 1.1 Grafo Dirigido de Competencias Clínicas (DAG)
El dominio del razonamiento médico según la normativa del MSP Ecuador se estructura en un grafo acíclico dirigido $G = (V, E)$ compuesto por 7 competencias clínicas esenciales:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ [1. Semiología y Anamnesis Estructurada]                                   │
│                     │                                                       │
│                     ▼                                                       │
│ [2. Diagnóstico Diferencial] ────► [3. Selección de Paraclínicos]           │
│         │                                        │                          │
│         │                                        ▼                          │
│         │                           [4. Correlación Multimodal]             │
│         │                                        │ (ECG, Rx, Labs)          │
│         ▼                                        ▼                          │
│ └────────────────────────► [5. Diagnóstico Definitivo y Severidad]          │
│                                                  │                          │
│                                                  ▼                          │
│                            [6. Terapéutica Farmacológica MSP]               │
│                                                  │                          │
│                                                  ▼                          │
│                            [7. Seguimiento y Prevención Comunitaria]        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Relaciones de Prerrequisito Clínico
Sea $u, v \in V$, la arista dirigida $(u, v) \in E$ denota que el dominio de la competencia $u$ constituye un prerrequisito formativo indispensable para abordar eficazmente la competencia $v$:
* $(\text{Semiología}, \text{Diagnóstico Diferencial})$
* $(\text{Diagnóstico Diferencial}, \text{Exámenes Complementarios})$
* $(\text{Exámenes Complementarios}, \text{Correlación Multimodal})$
* $(\text{Correlación Multimodal}, \text{Diagnóstico Definitivo})$
* $(\text{Diagnóstico Diferencial}, \text{Diagnóstico Definitivo})$
* $(\text{Diagnóstico Definitivo}, \text{Terapéutica MSP})$
* $(\text{Terapéutica MSP}, \text{Seguimiento y Prevención})$

---

## 2. Bayesian Knowledge Tracing (BKT) Continuo

Para estimar en tiempo real la probabilidad de que un estudiante domine una competencia clínica $c \in V$ ($P(L_t^{(c)})$), se implementa el modelo de **Bayesian Knowledge Tracing** (Corbett & Anderson, 1994).

### 2.1 Parámetros Psicométricos Calibrados
Cada competencia clínica $c$ posee cuatro parámetros calibrados:
* $L_0^{(c)}$: Probabilidad a priori de dominio inicial al ingresar a la plataforma.
* $T^{(c)}$: Probabilidad de transición de aprendizaje tras completar una sesión formativa.
* $G^{(c)}$: Probabilidad de acierto fortuito o adivinación (*Guess*).
* $S^{(c)}$: Probabilidad de desliz o error involuntario teniendo dominio (*Slip*).

| Competencia Clínica | $L_0$ | $T$ | $G$ | $S$ |
| :--- | :---: | :---: | :---: | :---: |
| Anamnesis y Semiología | 0.40 | 0.22 | 0.15 | 0.08 |
| Diagnóstico Diferencial | 0.30 | 0.20 | 0.12 | 0.10 |
| Exámenes Complementarios | 0.25 | 0.20 | 0.14 | 0.09 |
| Correlación Multimodal (ECG/Rx/Labs) | 0.15 | 0.25 | 0.10 | 0.08 |
| Diagnóstico Definitivo | 0.30 | 0.18 | 0.12 | 0.10 |
| Terapéutica Farmacológica MSP | 0.20 | 0.20 | 0.10 | 0.12 |
| Seguimiento y Prevención | 0.25 | 0.18 | 0.15 | 0.10 |

### 2.2 Ecuaciones de Actualización Bayesiana
Tras observar el desempeño del estudiante en un hito clínico ($\text{obs} \in \{1, 0\}$):

1. **Actualización Posterior por Evidencia:**
   $$P(L_t | \text{obs}=1) = \frac{P(L_{t-1}) \cdot (1 - S)}{P(L_{t-1}) \cdot (1 - S) + (1 - P(L_{t-1})) \cdot G}$$
   $$P(L_t | \text{obs}=0) = \frac{P(L_{t-1}) \cdot S}{P(L_{t-1}) \cdot S + (1 - P(L_{t-1})) \cdot (1 - G)}$$

2. **Transición de Aprendizaje:**
   $$P(L_{t+1}) = P(L_t | \text{obs}) + (1 - P(L_t | \text{obs})) \cdot T$$

---

## 3. Motor de Recomendación en la Zona de Desarrollo Próximo (ZDP)

Inspirado en la teoría pedagógica de Vygotsky (1978), el motor curricular identifica las competencias que se encuentran en el umbral óptimo de asimilación:

$$\text{ZDP} = \left\{ c \in V \mid 0.30 \le P(L^{(c)}) \le 0.75 \land \forall p \in \text{Prereq}(c), P(L^{(p)}) \ge 0.50 \right\}$$

### 3.1 Algoritmo de Selección del Caso Óptimo
1. El motor extrae el vector de dominio actual del estudiante.
2. Identifica la competencia prioritaria $c^* \in \text{ZDP}$ (la de menor dominio dentro de la ZDP).
3. Puntúa los casos disponibles en el catálogo ponderando la activación de $c^*$ y la presencia de modalidades diagnósticas que refuerzan el aprendizaje.
4. Genera una justificación pedagógica en lenguaje natural (ej. *"Ateneo+ seleccionó este caso porque dominas Anamnesis (85%) y tu siguiente hito de aprendizaje óptimo es Correlación Multimodal (dominio: 45%)."*).

---

## 4. Índice de Brecha Formativa (IBF) por Cohorte

El **Índice de Brecha Formativa (IBF)** cuantifica la distancia entre el desempeño promedio de una cohorte de estudiantes y el estándar normativo de suficiencia clínica establecido por el Ministerio de Salud Pública (umbral normativo: 8.0/10 puntos).

### 4.1 Formulación Matemática
Para cada eje clínico $e \in \{\text{Diagnóstico}, \text{Tratamiento}, \text{Prevención}, \text{Seguimiento}\}$:

$$\text{IBF}_e = \max\left(0, 1 - \frac{\overline{\text{Score}}_{\text{cohorte}, e}}{\text{Score Normativo Esperado (8.0)}}\right)$$

$$\text{IBF}_{\text{Global}} = \frac{1}{4} \sum_{e=1}^{4} \text{IBF}_e$$

### 4.2 Estratificación de Riesgo Curricular y Alertas Docentes
* **$\text{IBF} > 0.40$ (Brecha Crítica):** Dispara una alerta de intervención prioritaria al coordinador institucional recomendando talleres de simulación dirigidos.
* **$0.20 \le \text{IBF} \le 0.40$ (Brecha Moderada):** Alerta de refuerzo mediante lectura dirigida de las GPCs.
* **$\text{IBF} < 0.20$ (Brecha Leve / Control):** Desempeño alineado con el estándar ministerial.

---

## 5. Métrica de Fidelidad Normativa (Faithfulness Score / Anti-Alucinación)

Para garantizar la validez en publicaciones científicas y descartar alucinaciones del evaluador LLM:

$$\text{Faithfulness} = \frac{|\{ a \in \text{Afirmaciones} \mid \text{Sustento}(a, \text{Chunk}_{\text{GPC}}) = \text{Verdadero} \}|}{|\text{Afirmaciones Totales}|}$$

El evaluador extrae las afirmaciones clínicas contenidas en los aciertos y omisiones y verifica su anclaje léxico-semántico directo con el fragmento normativo recuperado de ChromaDB.
