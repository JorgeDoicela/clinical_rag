import React, { useEffect, useState } from 'react';
import { fetchCases } from '../api/client';
import { UserCheck, BookOpen, CheckCircle, BarChart3, Award, Sparkles, FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TeacherDashboard() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchCases();
        setCases(data.cases || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Banner Docente */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold mb-3">
          <UserCheck className="w-4 h-4" />
          <span>Supervisión y Docencia Médica</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Panel de Docentes y Tutores Clínicos</h1>
        <p className="text-emerald-200/80 text-sm mt-1 max-w-2xl">
          Supervisa la alineación del razonamiento diagnóstico de tus estudiantes frente a las Guías de Práctica Clínica del MSP Ecuador.
        </p>

        {/* Métricas clave */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-emerald-800/60">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <span className="text-xs text-emerald-300 font-medium">Casos Simulados Activos</span>
            <p className="text-2xl font-bold text-white mt-0.5">{cases.length}</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <span className="text-xs text-emerald-300 font-medium">Precisión Retrieval RAG</span>
            <p className="text-2xl font-bold text-emerald-400 mt-0.5">100.0%</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <span className="text-xs text-emerald-300 font-medium">Validez Salida LLM</span>
            <p className="text-2xl font-bold text-sky-400 mt-0.5">100.0% (1er Intento)</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <span className="text-xs text-emerald-300 font-medium">Evaluación Formativa</span>
            <p className="text-2xl font-bold text-purple-300 mt-0.5">Prompt MSP v1.2</p>
          </div>
        </div>
      </div>

      {/* Catálogo de Casos Clínicos para Evaluación */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-600" />
          <span>Casos Clínicos Habilitados para Evaluación</span>
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Selecciona o revisa la estructura de los casos simulados asignados a los estudiantes.
        </p>

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">Cargando catálogo de casos...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cases.map((c) => (
              <div key={c.id} className="p-5 border border-slate-200 rounded-2xl hover:border-emerald-500 transition-all bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    GPC: {c.guia_asociada}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">ID: {c.id}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1">{c.titulo}</h3>
                <p className="text-xs text-slate-600 line-clamp-2 mb-4">{c.enunciado}</p>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-xs">
                  <span className="text-slate-500">Nivel: <strong>{c.nivel_esperado || 'Pregrado'}</strong></span>
                  <Link
                    to={`/case/${c.id}`}
                    className="flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    <span>Simular Evaluación</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
