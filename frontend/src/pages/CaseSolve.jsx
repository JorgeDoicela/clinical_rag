import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCaseById, evaluateResponse } from '../api/client';
import { ArrowLeft, Send, Loader2, BookOpen, AlertCircle } from 'lucide-react';
import FeedbackCard from '../components/FeedbackCard';
import ImageUploadZone from '../components/ImageUploadZone';

export default function CaseSolve() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [caso, setCaso] = useState(null);
  const [respuesta, setRespuesta] = useState('');
  const [imagen, setImagen] = useState(null);
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
      const res = await evaluateResponse(id, respuesta, imagen);
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
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Cargando datos del caso clínico...</p>
      </div>
    );
  }

  if (error && !caso) {
    return (
      <div className="bg-rose-50 rounded-2xl p-6 border border-rose-200 text-rose-700 space-y-4">
        <p className="text-sm font-medium">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
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
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a la lista de casos</span>
      </button>

      {/* Enunciado del Caso */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="px-3 py-1 rounded-md bg-sky-50 text-sky-700 text-xs font-mono font-semibold uppercase tracking-wider border border-sky-200">
              GPC {caso.guia_asociada} (MSP Ecuador)
            </span>
            <h1 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900 mt-2">
              {caso.titulo}
            </h1>
          </div>
        </div>

        <div className="space-y-4 text-slate-700 leading-relaxed text-sm sm:text-base bg-slate-50 p-5 rounded-xl border border-slate-200">
          <p>{caso.enunciado}</p>
        </div>

        <div className="space-y-2 border-l-4 border-l-sky-600 pl-4 py-1">
          <h3 className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" />
            <span>Instrucción / Pregunta Médica</span>
          </h3>
          <p className="text-sm sm:text-base font-semibold text-slate-900">
            {caso.pregunta}
          </p>
        </div>
      </div>

      {/* Formulario de Respuesta o Vista de Resultado */}
      {!resultado ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-900">
              Tu Razonamiento Diagnóstico y Terapéutico
            </label>
            <textarea
              rows={7}
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              placeholder="Detalla tu diagnóstico de presunción, criterios de severidad y el tratamiento inmediato a seguir..."
              disabled={evaluating}
              className="w-full bg-slate-50 border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl p-4 text-sm text-slate-900 placeholder-slate-400 resize-y transition-all disabled:opacity-50"
            />
          </div>

          <ImageUploadZone
            imagen={imagen}
            onImageChange={setImagen}
            disabled={evaluating}
          />

          {error && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={evaluating || !respuesta.trim()}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-display font-semibold text-sm transition-all shadow-md shadow-sky-600/10"
            >
              {evaluating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{imagen ? 'Evaluando con RAG + Imagen...' : 'Evaluando con RAG (MSP)...'}</span>
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
