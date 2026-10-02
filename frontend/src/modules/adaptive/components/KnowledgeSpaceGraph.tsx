import React, { useState, useEffect, ComponentType } from 'react';
import { X, Compass, CheckCircle2, Clock, Lock, ArrowDown } from 'lucide-react';
import { adaptiveApi } from '../api/adaptiveApi';
import type { KnowledgeStateResponse } from '../../../types';

export interface KnowledgeSpaceGraphProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NodeStatus {
  label: string;
  badgeClass: string;
  cardBorder: string;
  icon: ComponentType<{ className?: string }>;
  iconColor: string;
}

export default function KnowledgeSpaceGraph({ isOpen, onClose }: KnowledgeSpaceGraphProps) {
  const [data, setData] = useState<KnowledgeStateResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    async function loadGraph() {
      try {
        setLoading(true);
        const res = await adaptiveApi.getKnowledgeState();
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

  const getNodeStatus = (pVal: number): NodeStatus => {
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
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
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
          <div className="py-12 text-center text-slate-400 animate-pulse text-sm">
            Cargando topología del grafo y probabilidades BKT...
          </div>
        ) : (
          <div className="space-y-4">
            {nodes.map((node, idx) => {
              const pVal = knowledgeState[node.id] !== undefined ? knowledgeState[node.id] : 0.40;
              const status = getNodeStatus(pVal);
              const IconComponent = status.icon;

              return (
                <React.Fragment key={node.id}>
                  <div className={`p-4 md:p-5 rounded-[20px] border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${status.cardBorder}`}>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-slate-400">0{node.orden || idx + 1}.</span>
                        <h4 className="text-base font-bold text-slate-900 font-heading">
                          {node.nombre}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                        {node.descripcion}
                      </p>
                    </div>

                    <div className="flex items-center space-x-4 self-end md:self-center shrink-0">
                      <div className="text-right">
                        <span className="text-xs text-slate-500 font-medium block">Probabilidad P(L)</span>
                        <span className="text-lg font-mono font-bold text-slate-900">
                          {Math.round(pVal * 100)}%
                        </span>
                      </div>
                      <div className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${status.badgeClass}`}>
                        <IconComponent className="w-3.5 h-3.5" />
                        <span>{status.label}</span>
                      </div>
                    </div>
                  </div>

                  {idx < nodes.length - 1 && (
                    <div className="flex justify-center">
                      <ArrowDown className="w-4 h-4 text-slate-300" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
