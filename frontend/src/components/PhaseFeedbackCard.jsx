import React from "react";
import { CheckCircle2, AlertTriangle, BookOpen, ArrowRight, Sparkles, Trophy } from "lucide-react";

/**
 * PhaseFeedbackCard — Retroalimentación Formativa Inmediata por Fase
 * Ateneo+ Design System: Limpio, sin cajas sintéticas decorativas, acorde a la GPC.
 *
 * Props:
 *   phaseResult: PhaseEvaluationResult
 *   currentPhase: number (1, 2 o 3)
 *   onProceedNextPhase: () => void
 *   isLastPhase?: boolean
 */
export default function PhaseFeedbackCard({
  phaseResult,
  currentPhase = 1,
  onProceedNextPhase,
  isLastPhase = false
}) {
  if (!phaseResult) return null;

  const {
    score_fase = 8.0,
    aciertos = [],
    omisiones = [],
    cita_normativa,
    retroalimentacion_fase,
    datos_fase_siguiente
  } = phaseResult;

  const scorePercentage = Math.round(score_fase * 10);
  const isApproved = score_fase >= 6.0;

  return (
    <div className="bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 space-y-6 animate-fadeIn">
      {/* Cabecera del Hito */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0b57d0]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dictamen Formativo — Fase {currentPhase}</span>
          </div>
          <h3 className="text-xl font-normal text-[#1f1f1f] font-heading">
            {isApproved ? "Hito Clínico Aprobado" : "Oportunidades de Mejora Detectadas"}
          </h3>
        </div>

        {/* Badge de Puntaje de la Fase */}
        <div className="text-right">
          <span className={`text-2xl font-bold ${isApproved ? "text-emerald-600" : "text-amber-600"}`}>
            {score_fase.toFixed(1)}
          </span>
          <span className="text-xs text-[#747775]"> / 10</span>
          <p className="text-[10px] text-[#747775]">{scorePercentage}% de concordancia</p>
        </div>
      </div>

      {/* Retroalimentación General */}
      {retroalimentacion_fase && (
        <div className="p-4 rounded-[18px] bg-[#f0f4f9] text-sm text-[#1f1f1f] leading-relaxed">
          {retroalimentacion_fase}
        </div>
      )}

      {/* Desglose de Aciertos y Omisiones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Aciertos */}
        <div className="p-4 rounded-[18px] bg-emerald-50/70 border border-emerald-200/80 space-y-2">
          <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Aciertos en esta Fase ({aciertos.length})
          </span>
          {aciertos.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-emerald-950 leading-snug">
              {aciertos.map((a, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-emerald-700 italic">No se identificaron aciertos normativos clave.</p>
          )}
        </div>

        {/* Omisiones */}
        <div className="p-4 rounded-[18px] bg-amber-50/70 border border-amber-200/80 space-y-2">
          <span className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Omisiones a Mejorar ({omisiones.length})
          </span>
          {omisiones.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-amber-950 leading-snug">
              {omisiones.map((o, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-amber-700 italic">Sin omisiones significativas.</p>
          )}
        </div>
      </div>

      {/* Cita Normativa MSP */}
      {cita_normativa && (
        <div className="p-4 rounded-[18px] bg-sky-50/70 border border-sky-200/80 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-[#0b57d0]">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{cita_normativa.guia || "GPC MSP Ecuador"}</span>
            </span>
            {cita_normativa.pagina && (
              <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded-full text-slate-700 border border-sky-100">
                Pág. {cita_normativa.pagina}
              </span>
            )}
          </div>
          <p className="text-xs text-[#1f1f1f] italic leading-relaxed">
            &ldquo;{cita_normativa.texto_relevante}&rdquo;
          </p>
        </div>
      )}

      {/* Datos Desbloqueados para la Siguiente Fase */}
      {datos_fase_siguiente && (
        <div className="p-4 rounded-[18px] bg-gradient-to-r from-cyan-50 to-blue-50 border border-blue-200/80 space-y-1.5">
          <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-blue-700" />
            Desbloqueado para la Fase {currentPhase + 1}: {datos_fase_siguiente.titulo}
          </span>
          <p className="text-xs text-blue-950 leading-relaxed">
            {datos_fase_siguiente.datos_revelados || datos_fase_siguiente.descripcion}
          </p>
        </div>
      )}

      {/* Botón CTA para Avanzar */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={onProceedNextPhase}
          className="w-full sm:w-auto py-3 px-8 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:via-blue-700 hover:to-indigo-700 text-white font-medium text-sm rounded-full transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
        >
          <span>
            {isLastPhase
              ? "Ver Dictamen y Analítica Global de Simulación"
              : `Continuar a Fase ${currentPhase + 1}`}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
