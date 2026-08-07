import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCases } from '../api/client';
import { Stethoscope, ArrowRight, AlertCircle, FileText } from 'lucide-react';

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
    <div className="space-y-6">
      {/* Encabezado Principal Clínico Minimalista */}
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
          <Stethoscope className="w-4 h-4 text-sky-600" />
          <span>Evaluación del Razonamiento Clínico</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Casos Clínicos de Simulación
        </h1>
        <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
          Analiza el cuadro clínico del paciente y redacta tu razonamiento diagnóstico. El sistema comparará tu respuesta contra la norma oficial del Ministerio de Salud Pública del Ecuador (MSP).
        </p>
      </div>

      {/* Listado de Casos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">Casos Disponibles ({cases.length})</h2>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white rounded-2xl p-6 h-44 animate-pulse border border-slate-200 shadow-xs"></div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-rose-50 rounded-2xl p-4 border border-rose-200 text-rose-700 flex items-center gap-3 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <p className="font-medium">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cases.map(item => (
              <div
                key={item.id}
                onClick={() => navigate(`/case/${item.id}`)}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 cursor-pointer flex flex-col justify-between group transition-colors shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/60 text-slate-700 font-mono text-[10px] font-semibold uppercase tracking-wider">
                      GPC {item.guia_asociada}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 capitalize">
                      {item.nivel_esperado?.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                    {item.titulo}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {item.enunciado}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-900 group-hover:text-sky-600 transition-colors">
                  <span>Evaluar razonamiento</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
