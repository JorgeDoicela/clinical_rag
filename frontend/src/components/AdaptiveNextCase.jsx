import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Target, Compass, ChevronRight, Layers, Award } from 'lucide-react';
import { fetchAdaptiveNextCase } from '../api/client';

export default function AdaptiveNextCase({ onSelectCase, onToggleGraph }) {
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadRecommendation() {
      try {
        const data = await fetchAdaptiveNextCase();
        if (isMounted) {
          setRecommendation(data);
        }
      } catch (err) {
        console.error('Error cargando recomendación adaptativa:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadRecommendation();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="w-full bg-white rounded-[24px] border border-slate-200/80 p-6 animate-pulse mb-8 shadow-sm">
        <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
        <div className="h-6 bg-slate-200 rounded w-3/4 mb-3"></div>
        <div className="h-4 bg-slate-100 rounded w-1/2"></div>
      </div>
    );
  }

  if (!recommendation || !recommendation.case) {
    return null;
  }

  const { case: clinicalCase, competencia_objetivo, justificacion_pedagogica, nivel_dominio_general, promedio_dominio_global } = recommendation;
  const pPct = Math.round((competencia_objetivo?.p_dominio || 0.4) * 100);

  return (
    <div className="w-full bg-gradient-to-br from-white via-slate-50 to-blue-50/30 rounded-[24px] border border-blue-100/80 p-6 md:p-8 mb-8 shadow-sm transition-all duration-200">
      {/* Encabezado Superior */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/60">
            Currículo Adaptativo KST & BKT
          </span>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline-block">
            {nivel_dominio_general} ({Math.round(promedio_dominio_global * 100)}% de dominio)
          </span>
        </div>

        {onToggleGraph && (
          <button
            onClick={onToggleGraph}
            className="text-xs font-semibold text-slate-700 hover:text-blue-600 flex items-center space-x-1.5 transition-colors"
          >
            <Compass className="w-4 h-4 text-slate-500" />
            <span>Ver Mapa de Conocimiento KST</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Cuerpo Principal: Caso Recomendado y Rationale Pedagógico */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-5">
        {/* Columna Izquierda: Detalle del caso */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Target className="w-4 h-4 text-cyan-600" />
            <span>Competencia en Zona de Desarrollo Próximo (ZDP):</span>
            <span className="text-slate-900 font-bold capitalize bg-slate-100 px-2.5 py-0.5 rounded">
              {competencia_objetivo?.nombre} ({pPct}%)
            </span>
          </div>

          <h3 className="text-xl md:text-2xl font-bold font-heading text-slate-900 tracking-tight leading-snug">
            {clinicalCase.titulo}
          </h3>

          <p className="text-sm text-slate-600 leading-relaxed">
            {justificacion_pedagogica}
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
            <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-md font-medium text-slate-700">
              Especialidad: {clinicalCase.especialidad || 'Medicina General'}
            </span>
            <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-md font-medium text-slate-700">
              Dificultad: {clinicalCase.dificultad || 'Intermedia'}
            </span>
            {clinicalCase.fases && (
              <span className="bg-blue-50 border border-blue-200/60 px-2.5 py-1 rounded-md font-medium text-blue-700 flex items-center space-x-1">
                <Layers className="w-3.5 h-3.5" />
                <span>Simulación en 3 Fases Clínicas</span>
              </span>
            )}
          </div>
        </div>

        {/* Columna Derecha: CTA de Resolución */}
        <div className="lg:col-span-4 flex flex-col items-start lg:items-end justify-center">
          <button
            onClick={() => onSelectCase(clinicalCase)}
            className="w-full lg:w-auto inline-flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-[16px] bg-slate-900 hover:bg-blue-600 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
          >
            <span>Resolver Caso Recomendado</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <span className="text-[11px] text-slate-600 mt-2 font-medium">
            Selección optimizada para maximizar tu ganancia de aprendizaje
          </span>
        </div>
      </div>
    </div>
  );
}
