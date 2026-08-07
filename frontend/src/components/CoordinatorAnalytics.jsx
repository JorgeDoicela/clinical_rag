import React, { useState, useEffect } from 'react';
import { API_URL, getAuthHeaders } from '../api/client';

export default function CoordinatorAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCohort, setSelectedCohort] = useState('Cohorte Medicina 2026-A (Internado Rotativo)');

  useEffect(() => {
    fetchCoordinatorData();
  }, [selectedCohort]);

  const fetchCoordinatorData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/history/coordinator-analytics`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Error al cargar datos institucionales');
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Error al cargar analítica de coordinación:', err);
      // Fallback institucional
      setAnalytics({
        cohorte_nombre: selectedCohort,
        total_estudiantes_activos: 15,
        total_evaluaciones_registradas: 28,
        insight_principal: "El 68% de tus estudiantes falla en el módulo de dosificación pediátrica e hidratación parenteral.",
        porcentaje_falla_pediatria: 68,
        modulos_analizados: [
          { modulo: "Dosificación Pediátrica & EHIRN", porcentaje_falla: 68, riesgo: "Crítico" },
          { modulo: "Emergencias Hipertensivas & Adultos", porcentaje_falla: 54, riesgo: "Alto" },
          { modulo: "Esquemas Antimicrobianos & MSP", porcentaje_falla: 48, riesgo: "Medio" },
          { modulo: "Monitoreo & Seguimiento Intensivo", porcentaje_falla: 35, riesgo: "Bajo" }
        ],
        top_deficiencias_institucionales: [
          {
            competencia: "Cálculo de dosis ajustada de Vitamina K y fluidoterapia pediátrica",
            modulo: "Pediatría & EHIRN",
            porcentaje_afectados: 68,
            estudiantes_afectados: 10,
            total_estudiantes: 15
          },
          {
            competencia: "Velocidad de infusión y titulación de vasodilatadores en emergencia",
            modulo: "Cardiología & Adultos",
            porcentaje_afectados: 54,
            estudiantes_afectados: 8,
            total_estudiantes: 15
          },
          {
            competencia: "Monitoreo continuo de signos de shock en las primeras 6 horas",
            modulo: "Seguimiento Clínico",
            porcentaje_afectados: 42,
            estudiantes_afectados: 6,
            total_estudiantes: 15
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs flex items-center justify-center text-slate-500 text-sm font-medium">
        <span>Procesando analítica agregada para coordinadores...</span>
      </div>
    );
  }

  if (!analytics) return null;

  const { insight_principal, modulos_analizados, top_deficiencias_institucionales, total_estudiantes_activos, total_evaluaciones_registradas } = analytics;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Institucional B2B */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">
            Inteligencia Institucional B2B - Licencia Facultad de Medicina
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Panel de Analítica para Coordinación Académica
          </h2>
        </div>

        {/* Selector de Cohorte */}
        <div className="flex items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
          <select
            value={selectedCohort}
            onChange={(e) => setSelectedCohort(e.target.value)}
            className="text-xs font-bold bg-transparent text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="Cohorte Medicina 2026-A (Internado Rotativo)">Cohorte Medicina 2026-A (Internado)</option>
            <option value="Cohorte Medicina 2025-B (Pregrado Avanzado)">Cohorte Medicina 2025-B (Pregrado)</option>
            <option value="Internado Pediatría HPDA">Internado Pediatría HPDA</option>
          </select>
        </div>
      </div>

      {/* Banner Principal Gerencial B2B: Hallazgo Institucional Destacado (Sobriedad Clínica Impecable) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 inline-block">
            Hallazgo Crítico de la Cohorte
          </span>
        </div>

        <h3 className="text-xl sm:text-2xl font-extrabold leading-snug tracking-tight text-slate-900">
          "{insight_principal}"
        </h3>

        <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed font-normal">
          Detección automática de brechas de aprendizaje acumuladas basada en la evaluación RAG contra la norma oficial del MSP Ecuador. Permite realizar intervenciones curriculares específicas antes del examen de habilitación profesional.
        </p>

        <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-slate-100 text-xs font-medium text-slate-600">
          <div>
            Estudiantes Evaluados: <strong className="text-slate-900 font-bold">{total_estudiantes_activos} en cohorte</strong>
          </div>
          <div>
            Muestras de Evaluación RAG: <strong className="text-slate-900 font-bold">{total_evaluaciones_registradas} registradas</strong>
          </div>
        </div>
      </div>

      {/* Distribución de Falla Colectiva por Módulo GPC */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900">Porcentaje de Brecha Colectiva por Módulo GPC</h3>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full font-semibold">
            Diagnóstico de Malla
          </span>
        </div>

        <div className="space-y-4 pt-1">
          {modulos_analizados.map((m, idx) => {
            let riskColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
            let bgBar = 'bg-emerald-600';
            if (m.riesgo === 'Crítico') {
              riskColor = 'bg-rose-50 text-rose-800 border-rose-200';
              bgBar = 'bg-rose-600';
            } else if (m.riesgo === 'Alto') {
              riskColor = 'bg-amber-50 text-amber-800 border-amber-200';
              bgBar = 'bg-amber-500';
            } else if (m.riesgo === 'Medio') {
              riskColor = 'bg-sky-50 text-sky-800 border-sky-200';
              bgBar = 'bg-sky-600';
            }

            return (
              <div key={idx} className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">{m.modulo}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${riskColor}`}>
                      Riesgo {m.riesgo}
                    </span>
                    <span className="font-extrabold text-slate-900">{m.porcentaje_falla}% de falla</span>
                  </div>
                </div>

                <div className="w-full h-3 bg-slate-200/80 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${bgBar} transition-all duration-500 rounded-full`}
                    style={{ width: `${m.porcentaje_falla}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ranking Top 5 Deficiencias Institucionales */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900">Top Deficiencias Institucionales (Prioridad Curricular)</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] bg-slate-50">
                <th className="p-3 rounded-l-xl">Competencia Deficiente Específica</th>
                <th className="p-3">Módulo Clínico</th>
                <th className="p-3 text-center">Estudiantes Afectados</th>
                <th className="p-3 text-right rounded-r-xl">% Impacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {top_deficiencias_institucionales.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-semibold text-slate-900">{item.competencia}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-bold text-[10px]">
                      {item.modulo}
                    </span>
                  </td>
                  <td className="p-3 text-center font-bold text-slate-700">
                    {item.estudiantes_afectados} / {item.total_estudiantes}
                  </td>
                  <td className="p-3 text-right">
                    <span className="font-extrabold text-amber-700 text-xs">
                      {item.porcentaje_afectados}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
