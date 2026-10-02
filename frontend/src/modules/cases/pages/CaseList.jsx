import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { 
  Stethoscope, 
  Search, 
  Sparkles, 
  Users, 
  TrendingUp, 
  ArrowRight, 
  AlertCircle,
  X,
  Compass
} from 'lucide-react';
import useCases from '../hooks/useCases';
import CaseCard from '../components/CaseCard';
import CaseFilterTabs from '../components/CaseFilterTabs';
import AdaptiveNextCase from '../../adaptive/components/AdaptiveNextCase';
import KnowledgeSpaceGraph from '../../adaptive/components/KnowledgeSpaceGraph';
import ReasoningTrends from '../../analytics/components/ReasoningTrends';
import ClinicalButton from '../../../core/ui/ClinicalButton';

export default function CaseList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const globalSearchQuery = searchParams.get('q') || '';
  const {
    filteredCases,
    cases,
    loading,
    error,
    selectedCategory,
    setSelectedCategory,
    classificationTab,
    setClassificationTab,
    viewMode,
    setViewMode,
    categories,
    gpcLabels,
  } = useCases(globalSearchQuery);

  // Navegación de secciones del Workspace
  const [navSection, setNavSection] = useState('cases'); // 'cases' | 'trends'
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showKstGraph, setShowKstGraph] = useState(false);
  const [roomInput, setRoomInput] = useState('');
  const [joinError, setJoinError] = useState(null);

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!roomInput.trim()) return;
    const cleanCode = roomInput.trim().toUpperCase();
    navigate(`/ateneo/${cleanCode}`);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      
      {/* 1. Header Principal & Acceso a Sala Colaborativa */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#0b57d0] mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Simulador Clínico Avanzado • Normativa Oficial MSP Ecuador</span>
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-normal tracking-tight text-[#1f1f1f] font-heading">
            Casos de Simulación Clínica
          </h1>
          <p className="text-sm font-normal text-[#444746] mt-1 max-w-2xl leading-relaxed">
            Entrena tu juicio terapéutico, diagnóstico y de urgencia con casos basados en Guías de Práctica Clínica nacionales e inteligencia artificial de evaluación formativa.
          </p>
        </div>

        {/* Acciones de Sala & Tendencias */}
        <div className="flex items-center gap-3">
          <ClinicalButton
            variant={navSection === 'trends' ? 'primary' : 'secondary'}
            onClick={() => setNavSection(navSection === 'cases' ? 'trends' : 'cases')}
            icon={TrendingUp}
          >
            {navSection === 'cases' ? 'Mi Desempeño' : 'Ver Catálogo'}
          </ClinicalButton>

          <ClinicalButton
            variant="outline"
            onClick={() => setShowJoinModal(true)}
            icon={Users}
          >
            Unirse a Sala
          </ClinicalButton>
        </div>
      </div>

      {/* 2. Sección de Desempeño y Tendencias */}
      {navSection === 'trends' ? (
        <div className="space-y-6">
          <ReasoningTrends />
        </div>
      ) : (
        <>
          {/* 3. Motor Adaptativo ZDP (KST + BKT) */}
          <AdaptiveNextCase
            onSelectCase={(id) => navigate(`/cases/${id}`)}
            onToggleGraph={() => setShowKstGraph(true)}
          />

          {/* 4. Barra de Filtros, Categorías y Pestañas */}
          <CaseFilterTabs
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            classificationTab={classificationTab}
            onSelectClassificationTab={setClassificationTab}
            viewMode={viewMode}
            onChangeViewMode={setViewMode}
            totalCasesCount={cases.length}
            filteredCount={filteredCases.length}
          />

          {/* 5. Estado de Carga o Error */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-white rounded-[28px] p-6 shadow-xs border-0 animate-pulse space-y-4">
                  <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-6 bg-slate-200 rounded w-4/5"></div>
                  <div className="h-16 bg-slate-100 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 rounded-[24px] p-8 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
              <p className="text-sm font-medium text-rose-900">{error}</p>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="bg-white rounded-[28px] p-12 text-center shadow-xs border-0 space-y-3">
              <Stethoscope className="w-8 h-8 text-[#747775] mx-auto opacity-60" />
              <p className="text-base font-normal text-[#1f1f1f]">No se encontraron casos clínicos con ese criterio.</p>
              <p className="text-xs text-[#747775]">Prueba seleccionando otra especialidad o limpiando los términos de búsqueda.</p>
            </div>
          ) : (
            /* 6. Listado de Casos Clínicos (Grid o Lista) */
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2'
                  : 'space-y-4 pt-2'
              }
            >
              {filteredCases.map((caso) => (
                <CaseCard
                  key={caso.id}
                  caso={caso}
                  gpcMeta={gpcLabels[caso.guia_asociada]}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal: Unirse a Sala Colaborativa */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[28px] shadow-xl border-0 max-w-md w-full p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-[#0b57d0]" />
                <h3 className="text-lg font-normal text-[#1f1f1f] font-heading">
                  Unirse a Sala de Ateneo
                </h3>
              </div>
              <button
                onClick={() => { setShowJoinModal(false); setJoinError(null); }}
                className="p-1.5 rounded-full hover:bg-slate-100 text-[#747775] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#444746] mb-1.5">
                  Código de Sala (6 u 8 caracteres)
                </label>
                <input
                  type="text"
                  placeholder="ej. ATENEO-8Q8Y"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-[#f0f4f9] rounded-[16px] text-sm font-mono uppercase text-[#1f1f1f] border border-slate-200/80 focus:outline-none focus:border-[#0b57d0]"
                />
              </div>

              {joinError && (
                <p className="text-xs text-rose-600 font-medium">{joinError}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#444746] hover:text-[#1f1f1f] cursor-pointer"
                >
                  Cancelar
                </button>
                <ClinicalButton type="submit" variant="primary" size="md">
                  Ingresar a la Sala
                </ClinicalButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Grafo de Espacio de Conocimiento (KST) */}
      <KnowledgeSpaceGraph
        isOpen={showKstGraph}
        onClose={() => setShowKstGraph(false)}
      />
    </div>
  );
}
