import React from 'react';
import { CheckCircle2, AlertTriangle, BookOpen, Award, RefreshCw } from 'lucide-react';

export default function FeedbackCard({ result, onReset }) {
  if (!result) return null;

  const { score, score_max = 10, aciertos = [], omisiones = [], cita_normativa, retroalimentacion_general } = result;

  const scorePercentage = Math.round((score / score_max) * 100);
  
  let scoreBadgeColor = 'bg-sky-50 text-sky-700 border-sky-200';
  if (scorePercentage < 60) {
    scoreBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (scorePercentage < 80) {
    scoreBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header con Score */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-700 mb-1">
              <Award className="w-4 h-4 text-sky-600" />
              <span>Resultado de Evaluación Formativa RAG</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900">
              Retroalimentación Médica
            </h2>
          </div>

          <div className={`flex items-baseline gap-2 px-5 py-3 rounded-xl border ${scoreBadgeColor}`}>
            <span className="text-3xl font-display font-extrabold">{score}</span>
            <span className="text-sm font-semibold opacity-80">/ {score_max} pts</span>
          </div>
        </div>

        <p className="mt-4 text-slate-700 leading-relaxed text-sm sm:text-base border-t border-slate-100 pt-4">
          {retroalimentacion_general}
        </p>
      </div>

      {/* Aciertos u Omisiones en Grid 2 Columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Aciertos */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 border-l-4 border-l-emerald-600 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-700 font-display font-bold text-base mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3>Aciertos Clínicos ({aciertos.length})</h3>
          </div>
          {aciertos.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No se identificaron aciertos claros en la norma.</p>
          ) : (
            <ul className="space-y-2.5 text-sm text-slate-700">
              {aciertos.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 text-slate-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 shrink-0"></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Omisiones */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 border-l-4 border-l-amber-500 shadow-sm">
          <div className="flex items-center gap-2 text-amber-800 font-display font-bold text-base mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3>Omisiones / Aspectos a Mejorar ({omisiones.length})</h3>
          </div>
          {omisiones.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No se detectaron omisiones significativas.</p>
          ) : (
            <ul className="space-y-2.5 text-sm text-slate-700">
              {omisiones.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 bg-amber-50/50 p-3 rounded-lg border border-amber-100 text-slate-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-2 shrink-0"></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Cita Normativa MSP */}
      {cita_normativa && (
        <div className="bg-white rounded-2xl p-6 border border-sky-200 shadow-sm">
          <div className="flex items-center gap-2 text-sky-800 font-display font-bold text-base mb-3">
            <BookOpen className="w-5 h-5 text-sky-600" />
            <h3>Cita Normativa Oficial (MSP Ecuador)</h3>
          </div>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-sky-700 font-semibold bg-sky-50 p-2.5 rounded-lg border border-sky-100">
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
            <blockquote className="p-4 rounded-xl bg-slate-50 border-l-4 border-sky-600 text-slate-800 italic font-mono text-xs sm:text-sm leading-relaxed">
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
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-all shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Intentar Nuevamente</span>
          </button>
        </div>
      )}
    </div>
  );
}
