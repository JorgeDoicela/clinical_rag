import React from 'react';
import { LayoutGrid, List, Zap, Layers } from 'lucide-react';

/**
 * CaseFilterTabs — Barra de pestañas y categorías de casos
 */
export default function CaseFilterTabs({
  categories,
  selectedCategory,
  onSelectCategory,
  classificationTab,
  onSelectClassificationTab,
  viewMode,
  onChangeViewMode,
  totalCasesCount,
  filteredCount,
}) {
  return (
    <div className="space-y-4">
      {/* Pestañas de Clasificación General */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-6">
          <button
            onClick={() => onSelectClassificationTab('all')}
            className={`pb-2 text-sm font-medium transition-colors cursor-pointer ${
              classificationTab === 'all'
                ? 'border-b-2 border-[#0b57d0] text-[#0b57d0] font-semibold -mb-[1px]'
                : 'text-[#444746] hover:text-[#1f1f1f]'
            }`}
          >
            Todos los Casos ({totalCasesCount})
          </button>

          <button
            onClick={() => onSelectClassificationTab('urgent')}
            className={`pb-2 text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              classificationTab === 'urgent'
                ? 'border-b-2 border-rose-600 text-rose-700 font-semibold -mb-[1px]'
                : 'text-[#444746] hover:text-[#1f1f1f]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-rose-600" />
            <span>Código Rojo / Urgencias</span>
          </button>
        </div>

        {/* Selector de Vista (Grid vs List) */}
        <div className="flex items-center gap-1 bg-[#f0f4f9] p-1 rounded-full border border-slate-200/80 self-end sm:self-auto">
          <button
            onClick={() => onChangeViewMode('grid')}
            title="Vista en Cuadrícula"
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white shadow-xs text-[#0b57d0]'
                : 'text-[#747775] hover:text-[#1f1f1f]'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => onChangeViewMode('list')}
            title="Vista en Lista"
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white shadow-xs text-[#0b57d0]'
                : 'text-[#747775] hover:text-[#1f1f1f]'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chips de Especialidades Médicas */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-[#0b57d0] text-white shadow-xs'
                : 'bg-white text-[#444746] border border-slate-200/80 hover:bg-slate-50 hover:text-[#1f1f1f]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
