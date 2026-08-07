import React from 'react';
import { CheckCircle2, AlertTriangle, BookOpen, Award, RefreshCw } from 'lucide-react';

export default function FeedbackCard({ result, onReset }) {
  if (!result) return null;

  const { score, score_max = 10, aciertos = [], omisiones = [], cita_normativa, retroalimentacion_general } = result;

  const scorePercentage = Math.round((score / score_max) * 100);
  
  let scoreBadgeColor = 'bg-sky-100 text-sky-800 border-sky-200';
  if (scorePercentage < 60) {
    scoreBadgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
  } else if (scorePercentage < 80) {
    scoreBadgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
  } else {
    scoreBadgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header con Score */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-700 mb-1">
              <Award className="w-4 h-4 text-sky-600" />
              <span>Resultado de Evaluación Formativa RAG</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Retroalimentación Médica
            </h2>
          </div>

          <div className={`flex items-baseline gap-2 px-5 py-2.5 rounded-xl border ${scoreBadgeColor}`}>
            <span className="text-3xl font-extrabold">{score}</span>
            <span className="text-xs font-bold opacity-80">/ {score_max} pts</span>
          </div>
        </div>

        <p className="mt-4 text-slate-700 leading-relaxed text-xs sm:text-sm border-t border-slate-100 pt-4 font-normal">
          {retroalimentacion_general}
        </p>
      </div>

      {/* Aciertos u Omisiones en Grid 2 Columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Aciertos (Verde = Bien) */}
        <div className="bg-emerald-50/40 rounded-2xl p-6 border border-emerald-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <h3>Aciertos Clínicos ({aciertos.length})</h3>
          </div>
          {aciertos.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No se identificaron aciertos claros en la norma.</p>
          ) : (
            <ul className="space-y-2.5 text-xs text-emerald-950">
              {aciertos.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-emerald-200/80 shadow-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Omisiones (Ámbar = Atención / Mejorar) */}
        <div className="bg-amber-50/40 rounded-2xl p-6 border border-amber-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <h3>Omisiones / Aspectos a Mejorar ({omisiones.length})</h3>
          </div>
          {omisiones.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No se detectaron omisiones significativas.</p>
          ) : (
            <ul className="space-y-2.5 text-xs text-amber-950">
              {omisiones.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-amber-200/80 shadow-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Cita Normativa GPC (Azul / Índigo MSP) */}
      {cita_normativa && (
        <div className="bg-sky-50/30 rounded-2xl p-6 border border-sky-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-3">
            <BookOpen className="w-5 h-5 text-sky-600 shrink-0" />
            <h3>Cita Normativa Oficial (MSP Ecuador)</h3>
          </div>
          <div className="space-y-3 text-xs text-slate-700">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-sky-900 font-semibold bg-sky-100/60 p-2.5 rounded-xl border border-sky-200/60">
              <span><strong>Guía:</strong> {cita_normativa.guia}</span>
              <span>-</span>
              <span><strong>Sección:</strong> {cita_normativa.seccion}</span>
              {cita_normativa.pagina && (
                <>
                  <span>-</span>
                  <span><strong>Página:</strong> {cita_normativa.pagina}</span>
                </>
              )}
            </div>
            <blockquote className="p-4 rounded-xl bg-white border border-sky-200/80 text-sky-950 italic font-mono text-xs leading-relaxed shadow-xs">
              "{cita_normativa.texto_relevante}"
            </blockquote>
          </div>
        </div>
      )}

      {/* Acciones */}
      {onReset && (
        <div className="flex justify-end pt-2">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Intentar Nuevamente</span>
          </button>
        </div>
      )}
    </div>
  );
}
