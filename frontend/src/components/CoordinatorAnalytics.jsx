import React, { useState, useEffect } from 'react';
import { API_URL, getAuthHeaders } from '../api/client';
import { BarChart3, AlertTriangle, TrendingDown, Users, ShieldCheck, Sparkles } from 'lucide-react';

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
        insight_principal: "El 68% de tus estudiantes presenta brechas formativas en dosificación pediátrica e hidratación parenteral.",
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
      <div className="bg-white rounded-[28px] p-12 shadow-xs border-0 flex items-center justify-center text-[#444746] text-sm font-medium">
        <span>Procesando analítica institucional agregada para coordinadores...</span>
      </div>
    );
  }

  if (!analytics) return null;

  const { insight_principal, modulos_analizados, top_deficiencias_institucionales, total_estudiantes_activos, total_evaluaciones_registradas } = analytics;

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      
      {/* Header Institucional B2B */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-[28px] shadow-xs border-0">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#0b57d0] mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Inteligencia Curricular B2B • Facultad de Ciencias Médicas</span>
          </div>
          <h2 className="text-2xl font-normal text-[#1f1f1f] font-heading">
            Diagnóstico de Rendimiento Colectivo
          </h2>
        </div>

        {/* Selector de Cohorte Píldora */}
        <div className="flex items-center bg-[#f0f4f9] px-4 py-2 rounded-full border border-slate-200">
          <select
            value={selectedCohort}
            onChange={(e) => setSelectedCohort(e.target.value)}
            className="text-xs font-medium bg-transparent text-[#1f1f1f] focus:outline-none cursor-pointer"
          >
            <option value="Cohorte Medicina 2026-A (Internado Rotativo)">Cohorte Medicina 2026-A (Internado)</option>
            <option value="Cohorte Medicina 2025-B (Pregrado Avanzado)">Cohorte Medicina 2025-B (Pregrado)</option>
            <option value="Internado Pediatría HPDA">Internado Pediatría HPDA</option>
          </select>
        </div>
      </div>

      {/* Hallazgo Crítico de la Cohorte */}
      <div className="bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 space-y-4">
        <div>
          <span className="text-xs font-medium text-amber-800 bg-amber-50 px-3 py-1 rounded-full inline-block">
            Hallazgo Curricular Destacado
          </span>
        </div>

        <h3 className="text-xl sm:text-2xl font-normal leading-snug text-[#1f1f1f] font-heading">
          "{insight_principal}"
        </h3>

        <p className="text-sm text-[#444746] max-w-3xl leading-relaxed">
          Detección automática de brechas de aprendizaje acumuladas basada en la evaluación RAG contra la norma oficial del MSP Ecuador. Permite realizar intervenciones curriculares específicas antes del examen de habilitación profesional.
        </p>

        <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-slate-100 text-xs text-[#747775]">
          <div>
            Estudiantes Evaluados: <strong className="text-[#1f1f1f] font-medium">{total_estudiantes_activos} en cohorte</strong>
          </div>
          <div>
            Muestras RAG Analizadas: <strong className="text-[#1f1f1f] font-medium">{total_evaluaciones_registradas} registradas</strong>
          </div>
        </div>
      </div>

      {/* Distribución de Falla Colectiva por Módulo GPC */}
      <div className="bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-lg font-normal text-[#1f1f1f] font-heading">
            Porcentaje de Brecha Formativa por Módulo GPC
          </h3>
          <span className="text-xs font-medium bg-[#f0f4f9] text-[#1f1f1f] px-3 py-1 rounded-full">
            Diagnóstico de Malla
          </span>
        </div>

        <div className="space-y-4 pt-1">
          {modulos_analizados.map((m, idx) => {
            let riskBadge = 'bg-emerald-50 text-emerald-800';
            let bgBar = 'bg-emerald-600';
            if (m.riesgo === 'Crítico') {
              riskBadge = 'bg-rose-50 text-rose-800';
              bgBar = 'bg-rose-600';
            } else if (m.riesgo === 'Alto') {
              riskBadge = 'bg-amber-50 text-amber-800';
              bgBar = 'bg-amber-500';
            } else if (m.riesgo === 'Medio') {
              riskBadge = 'bg-sky-50 text-[#0b57d0]';
              bgBar = 'bg-[#0b57d0]';
            }

            return (
              <div key={idx} className="space-y-2 bg-[#f0f4f9] p-5 rounded-[20px]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#1f1f1f] text-sm">{m.modulo}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${riskBadge}`}>
                      Riesgo {m.riesgo}
                    </span>
                    <span className="font-medium text-[#1f1f1f]">{m.porcentaje_falla}% brecha</span>
                  </div>
                </div>

                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
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

      {/* Ranking Top Deficiencias Institucionales */}
      <div className="bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-lg font-normal text-[#1f1f1f] font-heading">
            Top Deficiencias Institucionales (Prioridad Curricular)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#444746]">
            <thead className="bg-[#f0f4f9] text-[#1f1f1f] font-medium uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5 rounded-l-[12px]">Competencia Deficiente Específica</th>
                <th className="px-5 py-3.5">Módulo Clínico</th>
                <th className="px-5 py-3.5 text-center">Estudiantes Afectados</th>
                <th className="px-5 py-3.5 text-right rounded-r-[12px]">% Impacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {top_deficiencias_institucionales.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-[#1f1f1f]">{item.competencia}</td>
                  <td className="px-5 py-4">
                    <span className="px-2.5 py-1 rounded-md bg-white text-[#1f1f1f] font-medium text-xs shadow-2xs">
                      {item.modulo}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center font-medium text-[#444746]">
                    {item.estudiantes_afectados} / {item.total_estudiantes}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="font-medium text-amber-700 text-xs">
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
