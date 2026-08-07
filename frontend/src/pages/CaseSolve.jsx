import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCaseById, evaluateResponse } from '../api/client';
import { ArrowLeft, Send, Loader2, BookOpen, AlertCircle, FileImage, Maximize2 } from 'lucide-react';
import FeedbackCard from '../components/FeedbackCard';
import ImageUploadZone from '../components/ImageUploadZone';
import EvaluationGameLoader from '../components/EvaluationGameLoader';

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
      {evaluating && (
        <EvaluationGameLoader
          guiaCodigo={caso?.guia_asociada}
          hasImage={!!(imagen || caso?.imagen_url)}
        />
      )}

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
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono font-semibold uppercase tracking-wider border border-slate-200/60">
              GPC {caso.guia_asociada} (MSP Ecuador)
            </span>
            <h1 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900 mt-2">
              {caso.titulo}
            </h1>
          </div>
        </div>

        <div className="space-y-4 text-slate-700 leading-relaxed text-sm sm:text-base bg-slate-50 p-5 rounded-xl border border-slate-200">
          <p>{caso.enunciado}</p>

          {caso.imagen_url && (
            <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileImage className="w-4 h-4 text-sky-600" />
                  <span>Informe / Imagen Médica Adjunta</span>
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  Soporte Multimodal
                </span>
              </div>
              <div className="relative group rounded-xl overflow-hidden border border-slate-300 bg-white shadow-xs max-w-xl mx-auto">
                <img
                  src={`http://localhost:8000${caso.imagen_url}`}
                  alt="Imagen Médica del Caso Clínico"
                  className="w-full h-auto object-contain max-h-96 rounded-xl hover:scale-[1.01] transition-transform duration-200"
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1.5 py-1">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-sky-600" />
            <span>Instrucción / Pregunta Médica</span>
          </h3>
          <p className="text-sm sm:text-base font-semibold text-slate-900">
            {caso.pregunta}
          </p>
        </div>
      </div>

      {/* Formulario de Respuesta o Vista de Resultado */}
      {!resultado ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
              Tu Razonamiento Diagnóstico y Terapéutico
            </label>
            <textarea
              rows={6}
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              placeholder="Detalla tu diagnóstico de presunción, criterios de severidad y el tratamiento inmediato a seguir..."
              disabled={evaluating}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 rounded-xl p-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 resize-y transition-all disabled:opacity-50"
            />
          </div>

          <ImageUploadZone
            imagen={imagen}
            onImageChange={setImagen}
            disabled={evaluating}
          />

          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={evaluating || !respuesta.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-xs sm:text-sm transition-colors shadow-xs"
            >
              {evaluating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
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
        <FeedbackCard
          result={resultado}
          studentAnswer={respuesta}
          studentImage={imagen}
          onReset={() => setResultado(null)}
        />
      )}
    </div>
  );
}
