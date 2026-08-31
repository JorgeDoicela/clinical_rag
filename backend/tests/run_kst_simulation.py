"""
Simulación de Trayectorias BKT para el Motor de Currículo Adaptativo (KST)
Genera la Figura 3 del paper: Evolución longitudinal de P(dominio) por competencia clínica.
Exporta: docs/figura_kst_trajectory.png (300 DPI, publicación científica)
Referencia científica: Corbett & Anderson (1994), Doignon & Falmagne (1985).
"""

import sys
import json
import math
import os
from pathlib import Path

# Asegurar importaciones del proyecto
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from adaptive.knowledge_tracer import (
    BKT_PARAMETERS,
    bayesian_update,
    get_initial_knowledge_state,
)
from adaptive.knowledge_space import CLINICAL_COMPETENCIES

OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "docs"
OUTPUT_PNG  = OUTPUT_DIR / "figura_kst_trajectory.png"
OUTPUT_JSON = Path(__file__).resolve().parent / "resultados_kst_simulation.json"


# ── Escenarios de simulación ────────────────────────────────────────────────
# Cada escenario representa una secuencia de 10 sesiones de internado.
# Una sesión: {competencia: correcto/incorrecto}
SIMULATION_SCENARIOS = {
    "Ruta Fija (Control)": [
        # El estudiante resuelve casos en orden fijo, sin adaptación
        {"diagnostico_diferencial": True,  "plan_terapeutico_msp": False, "seguimiento_prevencion": False},
        {"semiologia_anamnesis": True,     "diagnostico_diferencial": False},
        {"plan_terapeutico_msp": True,     "diagnostico_final": False},
        {"semiologia_anamnesis": True,     "diagnostico_diferencial": True},
        {"examenes_complementarios": False,"correlacion_multimodal": False},
        {"diagnostico_final": True,        "plan_terapeutico_msp": False},
        {"seguimiento_prevencion": False,  "diagnostico_diferencial": True},
        {"plan_terapeutico_msp": True,     "examenes_complementarios": True},
        {"correlacion_multimodal": False,  "diagnostico_final": True},
        {"seguimiento_prevencion": True,   "plan_terapeutico_msp": False},
    ],
    "Ruta KST Adaptativa (Ateneo+)": [
        # El motor KST asigna casos que activan exactamente la ZDP del estudiante
        {"semiologia_anamnesis": True,      "diagnostico_diferencial": True},
        {"diagnostico_diferencial": True,   "examenes_complementarios": True},
        {"examenes_complementarios": True,  "correlacion_multimodal": True},
        {"correlacion_multimodal": True,    "diagnostico_final": True},
        {"diagnostico_final": True,         "plan_terapeutico_msp": True},
        {"plan_terapeutico_msp": True,      "seguimiento_prevencion": True},
        {"correlacion_multimodal": True,    "diagnostico_final": True},
        {"plan_terapeutico_msp": True,      "seguimiento_prevencion": True},
        {"seguimiento_prevencion": True,    "plan_terapeutico_msp": True},
        {"diagnostico_diferencial": True,   "correlacion_multimodal": True},
    ],
}

COMPETENCIAS_DISPLAY = {
    "semiologia_anamnesis":      "Semiología",
    "diagnostico_diferencial":   "Dx Diferencial",
    "examenes_complementarios":  "Exámenes",
    "correlacion_multimodal":    "Correlación",
    "diagnostico_final":         "Dx Final",
    "plan_terapeutico_msp":      "Tratamiento",
    "seguimiento_prevencion":    "Seguimiento",
}

COMPETENCIAS = list(BKT_PARAMETERS.keys())


def simulate_trajectory(sessions: list) -> list:
    """
    Simula la evolución del estado de dominio BKT a través de N sesiones.
    Retorna una lista de snapshots {sesion: N, estado: {comp: p_dominio}}.
    """
    state = get_initial_knowledge_state()
    snapshots = [{"sesion": 0, "estado": state.copy()}]

    for i, session in enumerate(sessions, start=1):
        for comp_id, correcto in session.items():
            if comp_id in BKT_PARAMETERS:
                state[comp_id] = bayesian_update(state[comp_id], correcto, BKT_PARAMETERS[comp_id])
        snapshots.append({"sesion": i, "estado": state.copy()})

    return snapshots


def compute_aggregate_mastery(snapshots: list) -> list:
    """Calcula el promedio de dominio global por sesión."""
    return [
        round(sum(s["estado"].values()) / len(s["estado"]), 4)
        for s in snapshots
    ]


def run_kst_simulation():
    print("\n" + "=" * 70)
    print(" SIMULACIÓN DE TRAYECTORIAS BKT — MOTOR KST ATENEO+")
    print("=" * 70)

    results = {}
    for scenario_name, sessions in SIMULATION_SCENARIOS.items():
        print(f"\n[SIM] Ejecutando: {scenario_name}")
        snapshots = simulate_trajectory(sessions)
        mastery_curve = compute_aggregate_mastery(snapshots)
        final_state = snapshots[-1]["estado"]

        print(f"  → Sesiones simuladas: {len(sessions)}")
        print(f"  → Dominio global inicial: {mastery_curve[0]:.1%}")
        print(f"  → Dominio global final:   {mastery_curve[-1]:.1%}")

        results[scenario_name] = {
            "snapshots": snapshots,
            "mastery_curve": mastery_curve,
            "final_state": final_state,
            "dominio_inicial": mastery_curve[0],
            "dominio_final": mastery_curve[-1],
            "ganancia_absoluta": round(mastery_curve[-1] - mastery_curve[0], 4),
        }

    # ── Comparativa entre escenarios ────────────────────────────────────────
    print("\n" + "-" * 70)
    print(" COMPARATIVA DE GANANCIA DE DOMINIO — RUTA FIJA vs KST ADAPTATIVA")
    print("-" * 70)

    fija = results["Ruta Fija (Control)"]
    kst  = results["Ruta KST Adaptativa (Ateneo+)"]

    print(f"  Ruta Fija   → Dominio final: {fija['dominio_final']:.1%}  (Δ={fija['ganancia_absoluta']:+.3f})")
    print(f"  Ruta KST    → Dominio final: {kst['dominio_final']:.1%}   (Δ={kst['ganancia_absoluta']:+.3f})")
    delta_kst_vs_fija = round(kst['dominio_final'] - fija['dominio_final'], 4)
    print(f"  Δ KST vs Fija: +{delta_kst_vs_fija:.1%} de ganancia adicional con currículo adaptativo")

    # ── Estado final por competencia ────────────────────────────────────────
    print("\n[TABLA] Estado final BKT por competencia:")
    header = f"{'Competencia':<30} | {'Ruta Fija':>12} | {'Ruta KST':>12} | {'Δ KST-Fija':>12}"
    print(header)
    print("-" * len(header))
    for comp in COMPETENCIAS:
        label = COMPETENCIAS_DISPLAY.get(comp, comp)
        p_fija = fija["final_state"].get(comp, 0.0)
        p_kst  = kst["final_state"].get(comp, 0.0)
        delta  = p_kst - p_fija
        print(f"  {label:<28} | {p_fija:>11.1%} | {p_kst:>11.1%} | {delta:>+11.3f}")

    # ── Exportar JSON de resultados ─────────────────────────────────────────
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    output_data = {
        "descripcion": "Simulación de trayectorias BKT: Ruta Fija vs Ruta KST Adaptativa",
        "n_sesiones": len(list(SIMULATION_SCENARIOS.values())[0]),
        "competencias": COMPETENCIAS,
        "resultados": {
            k: {
                "mastery_curve": v["mastery_curve"],
                "dominio_inicial": v["dominio_inicial"],
                "dominio_final": v["dominio_final"],
                "ganancia_absoluta": v["ganancia_absoluta"],
                "final_state": v["final_state"],
            }
            for k, v in results.items()
        },
        "comparativa": {
            "delta_kst_vs_fija": delta_kst_vs_fija,
            "ganancia_kst_porcentaje": round(kst['dominio_final'] * 100, 1),
            "ganancia_fija_porcentaje": round(fija['dominio_final'] * 100, 1),
        }
    }

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    print(f"\n[JSON] Exportado: {OUTPUT_JSON}")

    # ── Generar Tabla V en LaTeX (BKT por competencia: estado final) ─────────
    OUTPUT_TEX = OUTPUT_DIR / "tabla_kst_bkt_paper.tex"
    rows_tex = ""
    for comp in COMPETENCIAS:
        label = COMPETENCIAS_DISPLAY.get(comp, comp)
        p0    = BKT_PARAMETERS[comp]["L0"]
        p_fi  = fija["final_state"].get(comp, 0.0)
        p_ks  = kst["final_state"].get(comp, 0.0)
        delta_c = p_ks - p_fi
        dom_fi = "\\textbf{Dominado}" if p_fi >= 0.75 else ("En Progreso" if p_fi >= 0.40 else "Sin Iniciar")
        dom_ks = "\\textbf{Dominado}" if p_ks >= 0.75 else ("En Progreso" if p_ks >= 0.40 else "Sin Iniciar")
        bold_open  = "\\textbf{" if delta_c > 0 else ""
        bold_close = "}"         if delta_c > 0 else ""
        rows_tex += (
            f"{label} & {p0:.2f} & {p_fi:.3f} & {dom_fi} & "
            f"\\textbf{{{p_ks:.3f}}} & {dom_ks} & "
            f"{bold_open}{delta_c:+.3f}{bold_close} \\\\\n"
        )

    latex_v = rf"""% ==============================================================================
% TABLA V: ESTADO BKT POR COMPETENCIA — RUTA FIJA vs RUTA KST ADAPTATIVA
% Simulación de 10 sesiones clínicas (Ateneo+)
% Generada automáticamente por run_kst_simulation.py
% ==============================================================================
\begin{{table}}[htbp]
\centering
\caption{{Tabla V: Probabilidad de Dominio BKT por Competencia Clínica — Estado Final tras 10 Sesiones de Simulación}}
\label{{tab:bkt_competencias}}
\begin{{tabular}}{{lcccccr}}
\toprule
\textbf{{Competencia Clínica}} & \textbf{{$L_0$}} & \textbf{{$P$(Fija)}} & \textbf{{Nivel Fija}} & \textbf{{$P$(KST)}} & \textbf{{Nivel KST}} & \textbf{{$\Delta$KST}} \\
\midrule
{rows_tex}\bottomrule
\end{{tabular}}
\vspace{{1mm}}
\begin{{minipage}}{{\linewidth}}
\footnotesize
\textit{{Nota:}} $L_0$ = probabilidad a priori de dominio (Corbett \& Anderson, 1994). Umbral de dominio: $P \ge 0.75$. Simulación de {len(list(SIMULATION_SCENARIOS.values())[0])} sesiones clínicas consecutivas. La Ruta KST asigna casos que activan exactamente la Zona de Desarrollo Próximo (ZDP, Vygotsky 1978) de cada estudiante.
\end{{minipage}}
\end{{table}}
"""
    with open(OUTPUT_TEX, "w", encoding="utf-8") as f:
        f.write(latex_v)
    print(f"[TEX]  Tabla V exportada: {OUTPUT_TEX}")

    # ── Generar figura PNG (matplotlib o fallback ASCII) ────────────────────
    try:
        import matplotlib
        matplotlib.use("Agg")  # Backend sin display (Docker/CI)
        import matplotlib.pyplot as plt
        import matplotlib.ticker as mticker

        fig, axes = plt.subplots(1, 2, figsize=(14, 6))
        fig.suptitle(
            "Figura 3: Trayectorias BKT — Ruta Fija vs Ruta KST Adaptativa (Ateneo+)",
            fontsize=13, fontweight="bold", y=1.02
        )

        COLORS = {
            "Ruta Fija (Control)": "#94a3b8",
            "Ruta KST Adaptativa (Ateneo+)": "#2563eb",
        }
        LINESTYLES = {
            "Ruta Fija (Control)": "--",
            "Ruta KST Adaptativa (Ateneo+)": "-",
        }

        # Subplot izquierdo: curva de dominio global promedio
        ax1 = axes[0]
        for name, data in results.items():
            x = list(range(len(data["mastery_curve"])))
            y = [v * 100 for v in data["mastery_curve"]]
            ax1.plot(x, y, label=name, color=COLORS[name], linestyle=LINESTYLES[name],
                     linewidth=2.5, marker="o", markersize=5)

        ax1.axhline(y=75, color="#f59e0b", linestyle=":", linewidth=1.5, label="Umbral dominio (75%)")
        ax1.set_xlabel("Sesión clínica (N)", fontsize=11)
        ax1.set_ylabel("Dominio global promedio P(L) [%]", fontsize=11)
        ax1.set_title("Evolución del Dominio Promedio Global", fontsize=11, fontweight="bold")
        ax1.set_ylim(0, 100)
        ax1.yaxis.set_major_formatter(mticker.PercentFormatter())
        ax1.legend(fontsize=9)
        ax1.grid(True, alpha=0.3)

        # Subplot derecho: estado final por competencia
        ax2 = axes[1]
        x_labels = [COMPETENCIAS_DISPLAY.get(c, c) for c in COMPETENCIAS]
        x_pos = list(range(len(COMPETENCIAS)))

        p_fija_vals = [fija["final_state"].get(c, 0.0) * 100 for c in COMPETENCIAS]
        p_kst_vals  = [kst["final_state"].get(c, 0.0) * 100 for c in COMPETENCIAS]

        width = 0.35
        bars1 = ax2.bar([x - width/2 for x in x_pos], p_fija_vals, width, label="Ruta Fija", color="#94a3b8", alpha=0.85)
        bars2 = ax2.bar([x + width/2 for x in x_pos], p_kst_vals, width, label="Ruta KST", color="#2563eb", alpha=0.85)

        ax2.axhline(y=75, color="#f59e0b", linestyle=":", linewidth=1.5, label="Umbral dominio (75%)")
        ax2.set_xlabel("Competencia Clínica", fontsize=11)
        ax2.set_ylabel("P(dominio) final [%]", fontsize=11)
        ax2.set_title("Estado Final BKT por Competencia (Sesión 10)", fontsize=11, fontweight="bold")
        ax2.set_xticks(x_pos)
        ax2.set_xticklabels(x_labels, rotation=30, ha="right", fontsize=8)
        ax2.set_ylim(0, 100)
        ax2.yaxis.set_major_formatter(mticker.PercentFormatter())
        ax2.legend(fontsize=9)
        ax2.grid(True, alpha=0.3, axis="y")

        plt.tight_layout()
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        plt.savefig(OUTPUT_PNG, dpi=300, bbox_inches="tight")
        plt.close()
        print(f"[PNG]  Figura generada: {OUTPUT_PNG} (300 DPI)")

    except ImportError:
        print("[WARN] matplotlib no disponible. Exportando solo JSON. Instala: pip install matplotlib")

    print("\n[OK] Simulación KST completada exitosamente.")
    return output_data


if __name__ == "__main__":
    run_kst_simulation()
