import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCaseById, evaluateResponse } from '../api/client';
import { ArrowLeft, Send, Loader2, BookOpen, AlertCircle } from 'lucide-react';
import FeedbackCard from '../components/FeedbackCard';

export default function CaseSolve() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [caso, setCaso] = useState(null);
  const [respuesta, setRespuesta] = useState('');
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    fetchCaseById(id)
      .then(data => {
        setCaso(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!respuesta.trim()) return;

    setEvaluating(true);
    setError(null);

    try {
      const res = await evaluateResponse(id, respuesta);
      setResultado(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
        <p className="text-sm text-slate-400">Cargando caso clínico...</p>
      </div>
    );
  }

  if (error && !caso) {
    return (
      <div className="glass-card rounded-2xl p-6 border-rose-500/30 text-rose-400 space-y-4">
        <p>{error}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold"
        >
          Volver a la lista
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Botón de regreso */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al listado de casos</span>
      </button>

      {/* Enunciado del Caso */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <span className="px-3 py-1 rounded-lg bg-teal-500/10 text-teal-300 text-xs font-mono font-medium uppercase tracking-wider">
              GPC {caso.guia_asociada} (MSP Ecuador)
            </span>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white mt-2">
              {caso.titulo}
            </h1>
          </div>
        </div>

        <div className="space-y-4 text-slate-200 leading-relaxed text-sm sm:text-base bg-slate-900/60 p-5 rounded-2xl border border-slate-800/60">
          <p>{caso.enunciado}</p>
        </div>

        <div className="space-y-2 border-l-4 border-l-teal-500 pl-4 py-1">
          <h3 className="text-xs font-semibold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" />
            <span>Instrucción / Pregunta</span>
          </h3>
          <p className="text-sm sm:text-base font-medium text-white">
            {caso.pregunta}
          </p>
        </div>
      </div>

      {/* Formulario de Respuesta o Vista de Resultado */}
      {!resultado ? (
        <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-200">
              Tu Razonamiento Diagnóstico y Terapéutico
            </label>
            <textarea
              rows={7}
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              placeholder="Escribe en detalle tu impresión diagnóstica, severidad del cuadro y la conducta terapéutica inmediata que aplicarías según la GPC..."
              disabled={evaluating}
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-2xl p-4 text-sm text-slate-100 placeholder-slate-500 resize-y transition-all disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={evaluating || !respuesta.trim()}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-display font-semibold text-sm transition-all shadow-lg shadow-teal-950/50"
            >
              {evaluating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Evaluando con RAG (MSP)...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar para Evaluación</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <FeedbackCard result={resultado} onReset={() => setResultado(null)} />
      )}
    </div>
  );
}
