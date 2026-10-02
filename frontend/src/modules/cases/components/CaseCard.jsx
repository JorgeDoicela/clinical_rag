import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Layers, Stethoscope } from 'lucide-react';
import ClinicalBadge from '../../../core/ui/ClinicalBadge';

/**
 * CaseCard — Tarjeta de caso clínico individual
 */
export default function CaseCard({ caso, gpcMeta, viewMode = 'grid' }) {
  const isUrgent = gpcMeta?.isUrgent || false;
  const timeEst = gpcMeta?.time || '10-15 min';
  const labelGpc = gpcMeta?.label || caso.guia_asociada;

  if (viewMode === 'list') {
    return (
      <Link
        to={`/cases/${caso.id}`}
        className="block bg-white rounded-[20px] p-5 shadow-xs border border-transparent hover:border-blue-200 transition-all duration-200 group"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <ClinicalBadge variant={isUrgent ? 'danger' : 'primary'} size="sm">
                {labelGpc}
              </ClinicalBadge>
              {caso.fases && (
                <span className="text-[11px] font-medium text-[#0b57d0] bg-blue-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  3 Fases
                </span>
              )}
            </div>
            <h3 className="text-base font-normal text-[#1f1f1f] group-hover:text-[#0b57d0] transition-colors truncate font-heading">
              {caso.titulo}
            </h3>
            <p className="text-xs text-[#747775] line-clamp-1 leading-relaxed">
              {caso.enunciado}
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <span className="text-xs text-[#747775] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {timeEst}
            </span>
            <div className="w-8 h-8 rounded-full bg-[#f0f4f9] group-hover:bg-[#0b57d0] group-hover:text-white flex items-center justify-center transition-colors">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/cases/${caso.id}`}
      className="flex flex-col bg-white rounded-[28px] p-6 shadow-xs border border-transparent hover:border-blue-200 transition-all duration-200 group justify-between"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <ClinicalBadge variant={isUrgent ? 'danger' : 'primary'} size="sm">
            {labelGpc}
          </ClinicalBadge>
          <span className="text-xs text-[#747775] flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {timeEst}
          </span>
        </div>

        <h3 className="text-lg font-normal text-[#1f1f1f] group-hover:text-[#0b57d0] transition-colors line-clamp-2 font-heading leading-snug">
          {caso.titulo}
        </h3>

        <p className="text-xs text-[#444746] line-clamp-3 leading-relaxed">
          {caso.enunciado}
        </p>
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
        {caso.fases ? (
          <span className="text-xs font-medium text-[#0b57d0] bg-blue-50 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Simulación 3 Fases
          </span>
        ) : (
          <span className="text-xs text-[#747775] flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5 text-[#0b57d0]" />
            Caso Clínico Estándar
          </span>
        )}

        <div className="w-8 h-8 rounded-full bg-[#f0f4f9] group-hover:bg-[#0b57d0] group-hover:text-white flex items-center justify-center transition-colors">
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}
