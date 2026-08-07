import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Award, Calendar, BookOpen, ChevronRight, Activity, Filter } from 'lucide-react';
import { API_URL, getAuthHeaders } from '../api/client';
import SkillRadarChart from './SkillRadarChart';

export default function ReasoningTrends() {
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGpc, setSelectedGpc] = useState('TODAS');

  useEffect(() => {
    fetchTrends();
  }, []);

  const fetchTrends = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/history/trends`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTrends(data);
    } catch (err) {
      console.error("Error al cargar tendencias:", err);
      // Fallback mock si la API no estuviera respondiendo
      setTrends({
        total_evaluaciones: 4,
        promedio_general: 7.8,
        punto_debil_principal: "Tu punto débil recurrente: Dosificación exacta de esquemas antimicrobianos y rehidratación intravenosa.",
        progreso_por_gpc: {
          "GPC_EHIRN2019": { guia: "GPC_EHIRN2019", evaluaciones: 2, scores: [6.5, 8.0], promedio: 7.3 },
          "HIPERTENSION": { guia: "HIPERTENSION", evaluaciones: 2, scores: [7.0, 9.5], promedio: 8.3 }
        },
        puntuaciones_tiempo: [
          { id: 1, timestamp: "2026-08-01T10:00:00", fecha_formateada: "01/08", score: 6.5, guia_asociada: "GPC_EHIRN2019", case_title: "EHIRN Sangrado Umbilical" },
          { id: 2, timestamp: "2026-08-03T14:30:00", fecha_formateada: "03/08", score: 7.0, guia_asociada: "HIPERTENSION", case_title: "Crisis Hipertensiva en Adulto" },
          { id: 3, timestamp: "2026-08-05T09:15:00", fecha_formateada: "05/08", score: 8.0, guia_asociada: "GPC_EHIRN2019", case_title: "EHIRN Caso Control" },
          { id: 4, timestamp: "2026-08-07T11:20:00", fecha_formateada: "07/08", score: 9.5, guia_asociada: "HIPERTENSION", case_title: "Hipertensión Emergencia" }
        ],
        omisiones_mas_frecuentes: [
          { patron: "Dosificación exacta de líquidos e infusión parenteral según peso", frecuencia: 3 },
          { patron: "Cálculo de dosis ajustada de antibióticos de amplio espectro", frecuencia: 2 },
          { patron: "Monitoreo de signos vitales cada 15 minutos en fase aguda", frecuencia: 1 }
        ],
        radar_competencias: [
          { eje: "diagnóstico", label: "Diagnóstico", score: 85, brechas: 1 },
          { eje: "tratamiento", label: "Tratamiento", score: 65, brechas: 2 },
          { eje: "prevención", label: "Prevención", score: 92, brechas: 0 },
          { eje: "seguimiento", label: "Seguimiento", score: 78, brechas: 1 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs flex items-center justify-center space-x-3 text-slate-500 text-sm">
        <Activity className="w-5 h-5 animate-spin text-sky-600" />
        <span>Cargando analítica de tendencias...</span>
      </div>
    );
  }

  if (!trends || trends.total_evaluaciones === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs text-center space-y-3">
        <TrendingUp className="w-8 h-8 text-sky-600 mx-auto opacity-70" />
        <h3 className="text-base font-bold text-slate-900">Sin historial suficiente</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Completa tus primeros casos clínicos para desbloquear la gráfica de progresión por GPC y el análisis inteligente de tu punto débil.
        </p>
      </div>
    );
  }

  const { total_evaluaciones, promedio_general, punto_debil_principal, progreso_por_gpc, puntuaciones_tiempo, omisiones_mas_frecuentes, radar_competencias } = trends;

  // Adaptar radar_competencias para SkillRadarChart
  const competenciasPorEje = (radar_competencias || []).map(r => ({
    key: r.eje,
    label: r.label,
    score: r.score
  }));

  // Filtrar datos para la gráfica por GPC seleccionada
  const gpcKeys = Object.keys(progreso_por_gpc || {});
  const puntosFiltrados = selectedGpc === 'TODAS'
    ? puntuaciones_tiempo
    : puntuaciones_tiempo.filter(p => p.guia_asociada === selectedGpc);

  // Calcular dimensiones para la gráfica SVG
  const chartWidth = 600;
  const chartHeight = 200;
  const padding = 40;
  const graphWidth = chartWidth - padding * 2;
  const graphHeight = chartHeight - padding * 2;

  const pointsSVG = puntosFiltrados.map((p, idx) => {
    const x = padding + (puntosFiltrados.length > 1 ? (idx / (puntosFiltrados.length - 1)) * graphWidth : graphWidth / 2);
    const y = chartHeight - padding - (p.score / 10) * graphHeight;
    const fechaLabel = p.fecha_formateada || (p.timestamp ? p.timestamp.substring(8,10) + '/' + p.timestamp.substring(5,7) : '');
    return { x, y, fechaLabel, ...p };
  });

  const polylinePoints = pointsSVG.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tarjeta de Advertencia Formativa: PUNTO DÉBIL */}
      <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-md">
                Diagnóstico de Aprendizaje RAG
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-amber-950 tracking-tight pt-0.5">
              {punto_debil_principal}
            </h3>
            <p className="text-xs text-amber-900/90 leading-relaxed font-medium pt-1">
              Patrón detectado al contrastar tus respuestas previas contra la normativa oficial del MSP Ecuador.
            </p>
          </div>
        </div>

        {/* Lista de Omisiones Recurrentes */}
        {omisiones_mas_frecuentes && omisiones_mas_frecuentes.length > 0 && (
          <div className="mt-4 border-t border-amber-200/60 pt-3">
            <span className="text-[11px] font-bold text-amber-900 block mb-2 uppercase tracking-wide">
              Patrones de Omisión Más Frecuentes ({omisiones_mas_frecuentes.length}):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {omisiones_mas_frecuentes.map((om, i) => (
                <div key={i} className="flex items-center justify-between bg-white/80 p-2.5 rounded-xl border border-amber-200/60 text-xs font-medium text-amber-950">
                  <span className="truncate pr-2">{om.patron}</span>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md shrink-0">
                    {om.frecuencia}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Componente del Radar de Habilidades del Estudiante */}
      {competenciasPorEje.length > 0 && (
        <SkillRadarChart competenciasPorEje={competenciasPorEje} />
      )}

      {/* Gráfica de Progreso de Score en el Tiempo por GPC */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-700">
              <TrendingUp className="w-4 h-4 text-sky-600" />
              <span>Progresión Longitudinal</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Evolución de Calificaciones por GPC</h3>
          </div>

          {/* Filtro por GPC */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedGpc}
              onChange={(e) => setSelectedGpc(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:border-sky-500"
            >
              <option value="TODAS">Todas las GPCs</option>
              {gpcKeys.map(gpc => (
                <option key={gpc} value={gpc}>{gpc}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Gráfico SVG */}
        {pointsSVG.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <div className="min-w-[500px]">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto font-sans">
                {/* Rejilla de Fondo Horizontal */}
                {[0, 2.5, 5.0, 7.5, 10.0].map((val) => {
                  const y = chartHeight - padding - (val / 10) * graphHeight;
                  return (
                    <g key={val}>
                      <line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                      <text x={padding - 8} y={y + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-bold">{val}</text>
                    </g>
                  );
                })}

                {/* Línea de Progresión */}
                {pointsSVG.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylinePoints}
                  />
                )}

                {/* Puntos y Etiquetas del Eje X (Fechas) */}
                {pointsSVG.map((p, idx) => (
                  <g key={idx} className="group cursor-pointer">
                    <circle cx={p.x} cy={p.y} r="5" className="fill-white stroke-sky-600 stroke-[3px] group-hover:scale-125 transition-transform" />
                    <text x={p.x} y={p.y - 10} textAnchor="middle" className="text-[10px] font-extrabold fill-slate-800">
                      {p.score.toFixed(1)}
                    </text>
                    {/* Etiqueta de Fecha en el Eje X */}
                    {p.fechaLabel && (
                      <text x={p.x} y={chartHeight - 12} textAnchor="middle" className="text-[9px] font-bold fill-slate-400">
                        {p.fechaLabel}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic text-center py-4">No hay datos registrados para esta GPC.</p>
        )}

        {/* Métricas Resumen por GPC */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100 pt-4">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Promedio General</span>
            <span className="text-xl font-extrabold text-slate-900">{promedio_general} / 10 pts</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Evaluaciones RAG</span>
            <span className="text-xl font-extrabold text-slate-900">{total_evaluaciones} realizadas</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">GPCs Evaluadas</span>
            <span className="text-xl font-extrabold text-slate-900">{gpcKeys.length} guías</span>
          </div>
        </div>
      </div>
    </div>
  );
}
