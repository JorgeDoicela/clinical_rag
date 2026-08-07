import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCases } from '../api/client';
import { Stethoscope, ArrowRight, AlertCircle, FileText, CheckCircle } from 'lucide-react';

export default function CaseList() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCases()
      .then(data => {
        setCases(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Banner Encabezado Clínico Minimalista */}
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold">
            <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
            <span>Evaluación del Razonamiento Clínico</span>
          </div>
          <h1 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">
            Casos Clínicos de Simulación
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Analiza el cuadro clínico del paciente y redacta tu razonamiento diagnóstico y esquema terapéutico. El sistema comparará tu respuesta contra la norma oficial del Ministerio de Salud Pública del Ecuador (MSP).
          </p>
        </div>
      </div>

      {/* Listado de Casos */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-display font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-600" />
            <span>Casos Disponibles ({cases.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white rounded-2xl p-6 h-44 animate-pulse border border-slate-200"></div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-rose-50 rounded-2xl p-6 border border-rose-200 text-rose-700 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 shrink-0 text-rose-600" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cases.map(item => (
              <div
                key={item.id}
                onClick={() => navigate(`/case/${item.id}`)}
                className="clinical-card clinical-card-hover rounded-2xl p-6 cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-mono text-xs font-semibold uppercase tracking-wider">
                      GPC {item.guia_asociada}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 capitalize bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      {item.nivel_esperado?.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="text-base font-display font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                    {item.titulo}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {item.enunciado}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-sky-600 group-hover:translate-x-1 transition-transform">
                  <span>Evaluar razonamiento</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
