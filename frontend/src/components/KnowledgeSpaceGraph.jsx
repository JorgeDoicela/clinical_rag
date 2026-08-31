import React, { useState, useEffect } from 'react';
import { X, Compass, CheckCircle2, Clock, Lock, ArrowDown, HelpCircle, Activity } from 'lucide-react';
import { fetchKnowledgeState } from '../api/client';

export default function KnowledgeSpaceGraph({ isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    async function loadGraph() {
      try {
        setLoading(true);
        const res = await fetchKnowledgeState();
        if (isMounted) setData(res);
      } catch (err) {
        console.error('Error cargando estado KST:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadGraph();
    return () => { isMounted = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  const knowledgeState = data?.knowledge_state || {};
  const nodes = data?.topology?.nodes || [];

  const getNodeStatus = (pVal) => {
    if (pVal >= 0.75) {
      return {
        label: 'Dominado',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        cardBorder: 'border-emerald-200/80 bg-emerald-50/20',
        icon: CheckCircle2,
        iconColor: 'text-emerald-600'
      };
    } else if (pVal >= 0.40) {
      return {
        label: 'Zona ZDP (En Progreso)',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        cardBorder: 'border-blue-200/80 bg-blue-50/20',
        icon: Clock,
        iconColor: 'text-blue-600'
      };
    } else {
      return {
        label: 'Sin Iniciar / Prerrequisito',
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
        cardBorder: 'border-slate-200/80 bg-slate-50/30',
        icon: Lock,
        iconColor: 'text-slate-400'
      };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[28px] shadow-xl border border-slate-100 p-6 md:p-8 space-y-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <Compass className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold font-heading text-slate-900 tracking-tight">
                Espacio de Conocimiento Clínico (KST & BKT)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Grafo de dependencias de prerrequisitos y probabilidad continua de dominio por competencia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-50 p-3 rounded-[16px] border border-slate-100">
          <span className="font-semibold text-slate-700 mr-2">Leyenda de Estados:</span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Dominado (&gt; 75%)
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
            <Clock className="w-3.5 h-3.5 mr-1" /> Zona de Desarrollo Próximo ZDP (40% - 75%)
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
            <Lock className="w-3.5 h-3.5 mr-1" /> Inicial / Bloqueado (&lt; 40%)
          </span>
        </div>

        {/* Content / Graph Nodes */}
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">
            Cargando topología y estado psicométrico...
          </div>
        ) : (
          <div className="space-y-4">
            {nodes.map((node, index) => {
              const pVal = knowledgeState[node.id] || 0.3;
              const pct = Math.round(pVal * 100);
              const status = getNodeStatus(pVal);
              const IconComp = status.icon;

              return (
                <React.Fragment key={node.id}>
                  <div className={`p-4 md:p-5 rounded-[20px] border ${status.cardBorder} transition-all`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-400">#{node.orden}</span>
                          <h4 className="text-base font-bold text-slate-900">{node.nombre}</h4>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${status.badgeClass}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 max-w-2xl">{node.descripcion}</p>
                      </div>

                      {/* Score / Mastery Gauge */}
                      <div className="flex items-center space-x-3 text-right">
                        <div className="space-y-1">
                          <div className="text-sm font-bold text-slate-900">{pct}%</div>
                          <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                pct >= 75 ? 'bg-emerald-500' : pct >= 40 ? 'bg-blue-600' : 'bg-slate-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>
                        <IconComp className={`w-5 h-5 ${status.iconColor}`} />
                      </div>
                    </div>
                  </div>

                  {/* Flow Arrow */}
                  {index < nodes.length - 1 && (
                    <div className="flex justify-center my-1">
                      <ArrowDown className="w-4 h-4 text-slate-300" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Actualización en tiempo real mediante Bayesian Knowledge Tracing (BKT)</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
