import React from "react";
import { CheckCircle2, Circle, Lock, Stethoscope, Activity, Pill } from "lucide-react";

/**
 * SimulationStepper — Indicador de Progreso por Fases Clínicas Secuenciales
 * Ateneo+ Design System: Clínico Minimalista, Precisión Diagnóstica & Google Material 3
 *
 * Props:
 *   currentPhase: number (1, 2 o 3)
 *   totalPhases: number (default 3)
 *   phaseScores: { [phaseNumber: number]: number } — Puntajes obtenidos por fase
 *   completedPhases: number[] — Lista de fases completadas
 *   onSelectPhase?: (phaseNum: number) => void — Permitir volver a revisar fases anteriores
 */
const PHASE_ICONS = {
  1: Stethoscope,
  2: Activity,
  3: Pill,
};

const PHASE_LABELS = {
  1: "1. Anamnesis & Sospecha",
  2: "2. Exámenes & Paraclínicos",
  3: "3. Tratamiento & Control",
};

export default function SimulationStepper({
  currentPhase = 1,
  totalPhases = 3,
  phaseScores = {},
  completedPhases = [],
  onSelectPhase
}) {
  return (
    <div className="bg-white rounded-[24px] p-4 sm:p-5 shadow-xs border-0 w-full space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#1f1f1f] flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-[#0b57d0]" />
          Simulador Dinámico por Fases Clínicas
        </span>
        <span className="text-[11px] font-medium text-[#0b57d0] bg-[#eaf1fb] px-2.5 py-0.5 rounded-full">
          Fase {currentPhase} de {totalPhases}
        </span>
      </div>

      {/* Barra de progreso de pasos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {[1, 2, 3].map((faseNum) => {
          const isCompleted = completedPhases.includes(faseNum);
          const isActive = currentPhase === faseNum;
          const isLocked = !isCompleted && !isActive;
          const IconComp = PHASE_ICONS[faseNum] || Activity;
          const score = phaseScores[faseNum];

          return (
            <button
              key={faseNum}
              type="button"
              disabled={isLocked}
              onClick={() => isCompleted && onSelectPhase && onSelectPhase(faseNum)}
              className={`
                relative flex items-center justify-between p-3 rounded-[16px] text-left transition-all
                ${isActive
                  ? "bg-[#e8f0fe] border-2 border-[#0b57d0] text-[#001d35] shadow-xs"
                  : isCompleted
                  ? "bg-emerald-50/60 border border-emerald-200 text-emerald-900 hover:bg-emerald-50 cursor-pointer"
                  : "bg-[#f8fafc] border border-slate-200/60 text-[#747775] opacity-60 cursor-not-allowed"
                }
              `}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`
                    w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold
                    ${isActive
                      ? "bg-[#0b57d0] text-white"
                      : isCompleted
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-[#747775]"
                    }
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isLocked ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : (
                    <IconComp className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate leading-tight">
                    {PHASE_LABELS[faseNum]}
                  </p>
                  <p className="text-[10px] text-[#747775] truncate mt-0.5">
                    {isCompleted
                      ? `Calificación: ${score !== undefined ? score.toFixed(1) : "10"}/10`
                      : isActive
                      ? "En curso..."
                      : "Bloqueado"}
                  </p>
                </div>
              </div>

              {isCompleted && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-full shrink-0">
                  {score !== undefined ? `${Math.round(score * 10)}%` : "OK"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
