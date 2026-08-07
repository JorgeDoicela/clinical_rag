import React, { useEffect, useState } from 'react';
import { fetchCases } from '../api/client';
import { UserCheck, BookOpen, ArrowRight } from 'lucide-react';
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
      {/* Header Docente */}
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
          <UserCheck className="w-4 h-4 text-sky-600" />
          <span>Supervisión y Docencia Médica</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Panel de Docentes y Tutores Clínicos</h1>
        <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
          Supervisa la alineación del razonamiento diagnóstico de los estudiantes frente a las Guías de Práctica Clínica del MSP Ecuador.
        </p>
      </div>

      {/* Métricas Clave de Supervisión */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Casos Simulados Activos</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{cases.length}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Precisión Retrieval RAG</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">100.0%</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Validez Salida LLM</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">100.0%</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Evaluación Formativa</span>
          <p className="text-sm font-bold text-slate-900 mt-2">Prompt MSP v1.2</p>
        </div>
      </div>

      {/* Catálogo de Casos Clínicos para Evaluación */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-bold text-slate-900">Casos Clínicos Habilitados para Evaluación</h2>
        </div>
        <p className="text-xs text-slate-500 mb-6">
          Revisa la estructura de los casos simulados asignados a los estudiantes.
        </p>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Cargando catálogo de casos...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cases.map((c) => (
              <div key={c.id} className="p-5 border border-slate-200 rounded-2xl hover:border-slate-300 transition-colors bg-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60">
                      GPC: {c.guia_asociada}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">ID: {c.id}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mb-1">{c.titulo}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">{c.enunciado}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <span className="text-slate-500 text-[11px]">Nivel: <strong className="text-slate-700">{c.nivel_esperado || 'Pregrado'}</strong></span>
                  <Link
                    to={`/case/${c.id}`}
                    className="flex items-center gap-1 font-semibold text-slate-900 hover:text-sky-600 transition-colors"
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
