import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react'
import { fetchCases } from '../api/client';
import { Stethoscope, FileText, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';

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
      {/* Hero Banner */}
      <div className="glass-card rounded-3xl p-8 sm:p-10 relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/50 to-teal-950/30">
        <div className="max-w-2xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sistema RAG Formatividades MSP Ecuador</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
            Plataforma Ateneo
          </h1>
          <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
            Selecciona un caso clínico simulado para redactar tu razonamiento diagnóstico y terapéutico. El sistema evaluará tus decisiones frente a las Guías de Práctica Clínica oficiales del MSP.
          </p>
        </div>
      </div>

      {/* Grid de Casos */}
      <div>
        <h2 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-teal-400" />
          <span>Casos Clínicos Simulados Disponibles</span>
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="glass-card rounded-2xl p-6 h-48 animate-pulse bg-slate-900/50"></div>
            ))}
          </div>
        ) : error ? (
          <div className="glass-card rounded-2xl p-6 border-rose-500/30 text-rose-400 flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cases.map(item => (
              <div
                key={item.id}
                onClick={() => navigate(`/case/${item.id}`)}
                className="glass-card glass-card-hover rounded-2xl p-6 cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-3 py-1 rounded-lg bg-slate-800 text-teal-300 font-mono text-xs font-medium uppercase tracking-wider">
                      {item.guia_asociada}
                    </span>
                    <span className="text-xs text-slate-400 capitalize">
                      {item.nivel_esperado?.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="text-lg font-display font-bold text-white group-hover:text-teal-300 transition-colors">
                    {item.titulo}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {item.enunciado}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold text-teal-400 group-hover:translate-x-1 transition-transform">
                  <span>Resolver caso</span>
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
