import React from 'react';
import { CheckCircle2, AlertTriangle, BookOpen, Award, ArrowLeft, RefreshCw } from 'lucide-react';

export default function FeedbackCard({ result, onReset }) {
  if (!result) return null;

  const { score, score_max = 10, aciertos = [], omisiones = [], cita_normativa, retroalimentacion_general } = result;

  const scorePercentage = Math.round((score / score_max) * 100);
  
  let scoreBadgeColor = 'bg-teal-500/10 text-teal-400 border-teal-500/30';
  if (scorePercentage < 60) {
    scoreBadgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  } else if (scorePercentage < 80) {
    scoreBadgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header con Score */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-400 mb-1">
              <Award className="w-4 h-4" />
              <span>Evaluación Formativa RAG</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
              Retroalimentación del Razonamiento
            </h2>
          </div>

          <div className={`flex items-baseline gap-2 px-5 py-3 rounded-2xl border ${scoreBadgeColor}`}>
            <span className="text-3xl font-display font-extrabold">{score}</span>
            <span className="text-sm font-medium opacity-70">/ {score_max} pts</span>
          </div>
        </div>

        <p className="mt-4 text-slate-300 leading-relaxed text-sm sm:text-base border-t border-slate-800/80 pt-4">
          {retroalimentacion_general}
        </p>
      </div>

      {/* Aciertos u Omisiones en Grid 2 Columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Aciertos */}
        <div className="glass-card rounded-2xl p-6 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-2 text-emerald-400 font-display font-semibold text-lg mb-4">
            <CheckCircle2 className="w-5 h-5" />
            <h3>Aciertos Clínicos ({aciertos.length})</h3>
          </div>
          {aciertos.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No se identificaron aciertos claros en la norma.</p>
          ) : (
            <ul className="space-y-3 text-sm text-slate-300">
              {aciertos.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 bg-slate-900/40 p-3 rounded-xl border border-slate-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0"></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Omisiones */}
        <div className="glass-card rounded-2xl p-6 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-2 text-amber-400 font-display font-semibold text-lg mb-4">
            <AlertTriangle className="w-5 h-5" />
            <h3>Omisiones / Aspectos a Mejorar ({omisiones.length})</h3>
          </div>
          {omisiones.length === 0 ? (
            <p className="text-sm text-slate-400 italic">¡Excelente! No se detectaron omisiones significativas.</p>
          ) : (
            <ul className="space-y-3 text-sm text-slate-300">
              {omisiones.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 bg-slate-900/40 p-3 rounded-xl border border-slate-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0"></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Cita Normativa MSP */}
      {cita_normativa && (
        <div className="glass-card rounded-2xl p-6 border border-teal-500/20 bg-slate-900/50">
          <div className="flex items-center gap-2 text-teal-400 font-display font-semibold text-lg mb-3">
            <BookOpen className="w-5 h-5" />
            <h3>Cita Normativa Oficial (MSP Ecuador)</h3>
          </div>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-teal-300 font-medium">
              <span><strong>Guía:</strong> {cita_normativa.guia}</span>
              <span>•</span>
              <span><strong>Sección:</strong> {cita_normativa.seccion}</span>
              {cita_normativa.pagina && (
                <>
                  <span>•</span>
                  <span><strong>Página:</strong> {cita_normativa.pagina}</span>
                </>
              )}
            </div>
            <blockquote className="mt-3 p-4 rounded-xl bg-slate-950/80 border-l-2 border-teal-500 text-slate-200 italic font-mono text-xs sm:text-sm leading-relaxed">
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
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Intentar Nuevamente</span>
          </button>
        </div>
      )}
    </div>
  );
}
