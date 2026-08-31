import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchCases, API_URL, getAuthHeaders } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { 
  Stethoscope, 
  ArrowRight, 
  AlertCircle, 
  FileText, 
  TrendingUp, 
  Users, 
  Search, 
  Sparkles, 
  Activity, 
  HeartPulse, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  Plus, 
  Layers, 
  LayoutGrid, 
  List, 
  Award, 
  Shield, 
  Filter,
  RotateCw,
  Zap,
  CheckCircle,
  X
} from 'lucide-react';
import ReasoningTrends from '../components/ReasoningTrends';

const GPC_LABELS = {
  'dengue': { label: 'GPC Dengue (MSP 2023)', category: 'urgencias', time: '10-12 min', isUrgent: true },
  'preeclampsia': { label: 'GPC Trastornos Hipertensivos del Embarazo', category: 'ginecologia', time: '12-15 min', isUrgent: true },
  'diabetes_t2': { label: 'GPC Diabetes Mellitus Tipo 2', category: 'med_interna', time: '10-15 min', isUrgent: false },
  'hemorragia_posparto': { label: 'GPC Hemorragia Posparto (Código Rojo)', category: 'ginecologia', time: '15-18 min', isUrgent: true },
  'gp_tuberculosis-1': { label: 'GPC Tuberculosis Pulmonar', category: 'neumologia', time: '12-15 min', isUrgent: false },
  'gpc_vih_acuerdo_ministerial05-07-2019': { label: 'GPC Manejo Integral de VIH (MSP)', category: 'urgencias', time: '10-14 min', isUrgent: false },
  'gpc_hta192019': { label: 'GPC Hipertensión Arterial Primaria', category: 'med_interna', time: '10-12 min', isUrgent: false },
  'gpc-neumonia_adquirida_en_la_comunidad': { label: 'GPC Neumonía Adquirida en Comunidad', category: 'neumologia', time: '12-15 min', isUrgent: false },
  'guia_prevencion_diagnostico_tratamiento_enfermedad_renal_cronica_2018': { label: 'GPC Enfermedad Renal Crónica', category: 'nefrologia', time: '12-15 min', isUrgent: false },
  'gpc_ehirn2019': { label: 'GPC Encefalopatía Hipóxico-Isquémica (EHI-RN)', category: 'pediatria', time: '12-15 min', isUrgent: true },
  'neumonia': { label: 'GPC Neumonía Adquirida en Comunidad Pediátrica', category: 'pediatria', time: '10-14 min', isUrgent: true },
  'gpc-sepsis-neonatal': { label: 'GPC Sepsis Neonatal', category: 'pediatria', time: '12-15 min', isUrgent: true },
  'gpc_guia_aborto_espontaneo_incompleto_19_feb_2014': { label: 'GPC Manejo del Aborto Incompleto', category: 'ginecologia', time: '10-14 min', isUrgent: true },
};

const CATEGORIES = [
  { id: 'all', label: 'Todos los Casos' },
  { id: 'urgencias', label: 'Urgencias & Infectología' },
  { id: 'ginecologia', label: 'Gineco-Obstetricia' },
  { id: 'med_interna', label: 'Medicina Interna' },
  { id: 'neumologia', label: 'Neumología' },
  { id: 'pediatria', label: 'Pediatría & Neonatología' },
  { id: 'nefrologia', label: 'Nefrología' },
];

export default function CaseList() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joinError, setJoinError] = useState(null);
  const [joining, setJoining] = useState(false);
  const [searchParams] = useSearchParams();
  
  // Navegación Workspace
  const [navSection, setNavSection] = useState('cases'); // 'cases' | 'trends'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [classificationTab, setClassificationTab] = useState('all'); // 'all' | 'urgent' | 'completed'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [roomInput, setRoomInput] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const navigate = useNavigate();

  const globalSearchQuery = searchParams.get('q') || '';

  const loadCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCases();
      setCases(data.cases || data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    const cleanCode = roomInput.trim().toUpperCase();
    if (!cleanCode) return;

    setJoining(true);
    setJoinError(null);

    try {
      const formData = new FormData();
      formData.append('room_code', cleanCode);
      formData.append('user_id', user?.id || 'usr_alumno_001');
      formData.append('user_email', user?.email || 'alumno@ateneo.edu.ec');
      formData.append('user_nombre', user?.nombre || 'Estudiante');
      formData.append('user_rol', user?.rol || 'alumno');

      const res = await fetch(`${API_URL}/api/ateneo/join`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'La sala especificada no existe o ha finalizado.');
      }

      setShowJoinModal(false);
      navigate(`/ateneo/${cleanCode}`);
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const filteredCases = useMemo(() => {
    return cases.filter(item => {
      const meta = GPC_LABELS[item.guia_asociada] || { label: item.guia_asociada, category: 'med_interna', isUrgent: false };
      
      // Filtro de Categoría Lateral
      const matchesCategory = selectedCategory === 'all' || meta.category === selectedCategory;
      
      // Filtro de Pestaña Superior
      let matchesTab = true;
      if (classificationTab === 'urgent') {
        matchesTab = meta.isUrgent === true;
      } else if (classificationTab === 'completed') {
        matchesTab = false; // Sin casos completados de momento en estado inicial
      }

      // Filtro de Búsqueda Global
      const query = globalSearchQuery.toLowerCase().trim();
      const matchesQuery = !query || 
        item.titulo.toLowerCase().includes(query) || 
        item.enunciado.toLowerCase().includes(query) ||
        meta.label.toLowerCase().includes(query);

      return matchesCategory && matchesTab && matchesQuery;
    });
  }, [cases, selectedCategory, classificationTab, globalSearchQuery]);

  const urgentCount = useMemo(() => {
    return cases.filter(c => GPC_LABELS[c.guia_asociada]?.isUrgent).length;
  }, [cases]);

  const recommendedCase = cases.length > 0 ? cases[0] : null;
  const recommendedMeta = recommendedCase ? (GPC_LABELS[recommendedCase.guia_asociada] || { label: recommendedCase.guia_asociada }) : null;

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* =======================================================================
          COLUMNA IZQUIERDA: SIDEBAR DE NAVEGACIÓN (Estilo Google Workspace / Gmail)
          ======================================================================= */}
      <aside className="lg:col-span-3 space-y-6">
        
        {/* Botón Principal CTA: + Iniciar Simulación (Estilo Botón Redactar) */}
        <button
          onClick={() => {
            if (recommendedCase) {
              navigate(`/case/${recommendedCase.id}`);
            }
          }}
          className="w-full py-4 px-6 bg-white hover:bg-slate-50 text-[#1f1f1f] rounded-[20px] shadow-sm hover:shadow transition-all flex items-center gap-3.5 border-0 font-medium text-sm cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-[15px] font-medium">Nueva Simulación</span>
        </button>

        {/* Menú de Navegación Principal con Árbol Jerárquico */}
        <div className="space-y-1">
          
          {/* Item Padre: Casos Clínicos */}
          <div>
            <button
              onClick={() => {
                setNavSection('cases');
                setSelectedCategory('all');
              }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                navSection === 'cases' && selectedCategory === 'all'
                  ? 'bg-[#c2e7ff] text-[#001d35] font-semibold'
                  : 'text-[#444746] hover:bg-[#eaebef] hover:text-[#1f1f1f]'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4" />
                <span>Casos Clínicos</span>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/60 text-[#001d35]">
                {cases.length}
              </span>
            </button>

            {/* Subcategorías Anidadas por Especialidad */}
            <div className="ml-4 pl-3.5 border-l border-slate-200/80 space-y-0.5 mt-1 py-1">
              {CATEGORIES.filter(cat => cat.id !== 'all').map(cat => {
                const count = cases.filter(c => (GPC_LABELS[c.guia_asociada]?.category === cat.id)).length;
                const isSelected = selectedCategory === cat.id && navSection === 'cases';
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setNavSection('cases');
                      setSelectedCategory(cat.id);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#c2e7ff] text-[#001d35] font-semibold'
                        : 'text-[#444746] hover:bg-[#eaebef] hover:text-[#1f1f1f]'
                    }`}
                  >
                    <span className="truncate">{cat.label}</span>
                    <span className="text-[11px] opacity-75 shrink-0 ml-2 font-mono">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Item 2: Mi Rendimiento */}
          <button
            onClick={() => setNavSection('trends')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              navSection === 'trends'
                ? 'bg-[#c2e7ff] text-[#001d35] font-semibold'
                : 'text-[#444746] hover:bg-[#eaebef] hover:text-[#1f1f1f]'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Mi Rendimiento</span>
          </button>

          {/* Item 3: Unirse a Sala en Vivo */}
          <button
            onClick={() => setShowJoinModal(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium text-[#444746] hover:bg-[#eaebef] hover:text-[#1f1f1f] transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Unirse a Sala en Vivo</span>
          </button>

        </div>

      </aside>

      {/* =======================================================================
          COLUMNA DERECHA: SUPERFICIE BLANCA PRINCIPAL (Floating Canvas Material 3)
          ======================================================================= */}
      <main className="lg:col-span-9 bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 min-h-[700px] flex flex-col justify-between">
        
        {navSection === 'trends' ? (
          <div>
            <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
              <div>
                <h2 className="text-2xl font-normal text-[#1f1f1f] font-heading">
                  Mi Rendimiento y Analítica Formativa
                </h2>
                <p className="text-sm font-normal text-[#444746] mt-1">
                  Evolución longitudinal de competencias diagnósticas contrastadas con el MSP.
                </p>
              </div>
              <button
                onClick={() => setNavSection('cases')}
                className="text-xs font-medium text-[#0b57d0] hover:underline cursor-pointer"
              >
                ← Volver a Casos
              </button>
            </div>
            <ReasoningTrends />
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* BARRA SUPERIOR UNIFICADA DE HERRAMIENTAS Y PESTAÑAS (1 Sola Fila Estándar Google Workspace) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-0">
              
              {/* Lado Izquierdo: Botón Recargar + Pestañas de Clasificación */}
              <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto">
                <button
                  onClick={loadCases}
                  title="Actualizar casos"
                  className="p-2 mb-2 text-[#444746] hover:text-[#1f1f1f] hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0"
                >
                  <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0b57d0]' : ''}`} />
                </button>

                <div className="flex items-center gap-6 sm:gap-8">
                  <button
                    onClick={() => setClassificationTab('all')}
                    className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                      classificationTab === 'all'
                        ? 'border-b-2 border-[#0b57d0] text-[#0b57d0] font-semibold -mb-[1px]'
                        : 'text-[#444746] hover:text-[#1f1f1f]'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Todos los Casos</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-[#444746] font-normal">
                      {cases.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setClassificationTab('urgent')}
                    className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                      classificationTab === 'urgent'
                        ? 'border-b-2 border-rose-600 text-rose-600 font-semibold -mb-[1px]'
                        : 'text-[#444746] hover:text-[#1f1f1f]'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-rose-600" />
                    <span>Signos de Alarma / Código Rojo</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-normal">
                      {urgentCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setClassificationTab('completed')}
                    className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                      classificationTab === 'completed'
                        ? 'border-b-2 border-emerald-600 text-emerald-600 font-semibold -mb-[1px]'
                        : 'text-[#444746] hover:text-[#1f1f1f]'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Casos Concluidos</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-[#444746] font-normal">
                      0
                    </span>
                  </button>
                </div>
              </div>

              {/* Lado Derecho: Contador y Toggle de Vista */}
              <div className="flex items-center gap-4 text-xs text-[#747775] mb-2 self-end md:self-auto shrink-0">
                {globalSearchQuery && (
                  <span className="font-medium text-[#0b57d0] bg-sky-50 px-2.5 py-0.5 rounded-full">
                    Filtro: "{globalSearchQuery}"
                  </span>
                )}
                <span>
                  Mostrando {filteredCases.length} de {cases.length} casos
                </span>

                <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('grid')}
                    title="Vista Cuadrícula"
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      viewMode === 'grid' ? 'bg-slate-100 text-[#1f1f1f]' : 'text-[#747775] hover:text-[#1f1f1f]'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    title="Vista Lista Compacta"
                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                      viewMode === 'list' ? 'bg-slate-100 text-[#1f1f1f]' : 'text-[#747775] hover:text-[#1f1f1f]'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>

            {/* CASO RECOMENDADO (Banner Destacado) */}
            {recommendedCase && selectedCategory === 'all' && classificationTab === 'all' && !globalSearchQuery && !loading && (
              <div className="bg-[#f0f4f9] rounded-[20px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-0">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white text-[#0b57d0] text-xs font-semibold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Recomendado para ti</span>
                    </span>
                    <span className="text-xs text-[#444746]">{recommendedMeta?.label}</span>
                  </div>

                  <h3 className="text-lg font-medium text-[#1f1f1f] font-heading">
                    {recommendedCase.titulo}
                  </h3>

                  <p className="text-xs text-[#444746] line-clamp-2 leading-relaxed">
                    {recommendedCase.enunciado}
                  </p>
                </div>

                <button
                  onClick={() => navigate(`/case/${recommendedCase.id}`)}
                  className="py-2.5 px-6 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:via-blue-700 hover:to-indigo-700 text-white font-medium text-xs rounded-full transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <span>Iniciar Simulación</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* LISTADO / CUADRÍCULA DE CASOS */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="bg-[#f0f4f9] rounded-[20px] p-6 h-44 animate-pulse"></div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-rose-50 rounded-[20px] p-5 border border-rose-200 text-rose-700 flex items-center gap-3 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                <p className="font-normal">{error}</p>
              </div>
            ) : filteredCases.length === 0 ? (
              <div className="py-16 text-center">
                <BookOpen className="w-8 h-8 text-[#747775] mx-auto mb-3" />
                <h4 className="text-base font-medium text-[#1f1f1f]">No se encontraron casos clínicos</h4>
                <p className="text-xs text-[#444746] mt-1">Prueba con otra especialidad o término de búsqueda.</p>
              </div>
            ) : viewMode === 'grid' ? (
              /* VISTA CUADRÍCULA */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCases.map(item => {
                  const meta = GPC_LABELS[item.guia_asociada] || { label: `GPC ${item.guia_asociada}`, time: '10-15 min' };
                  return (
                    <div
                      key={item.id}
                      onClick={() => navigate(`/case/${item.id}`)}
                      className="bg-[#f0f4f9] hover:bg-[#e8f0fe] rounded-[20px] p-5 cursor-pointer flex flex-col justify-between group transition-all"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-white text-[#1f1f1f] text-[11px] font-medium">
                            {meta.label}
                          </span>
                          <span className="text-[11px] text-[#747775]">
                            {meta.time}
                          </span>
                        </div>

                        <h4 className="text-[15px] font-medium text-[#1f1f1f] group-hover:text-[#0b57d0] transition-colors leading-snug font-heading">
                          {item.titulo}
                        </h4>

                        <p className="text-xs text-[#444746] line-clamp-3 leading-relaxed">
                          {item.enunciado}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-medium text-[#0b57d0]">
                        <span>Comenzar evaluación</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* VISTA LISTA COMPACTA (Estilo Gmail / Workspace) */
              <div className="divide-y divide-slate-100">
                {filteredCases.map(item => {
                  const meta = GPC_LABELS[item.guia_asociada] || { label: `GPC ${item.guia_asociada}`, time: '10-15 min' };
                  return (
                    <div
                      key={item.id}
                      onClick={() => navigate(`/case/${item.id}`)}
                      className="py-3.5 px-3 hover:bg-[#f0f4f9] rounded-xl cursor-pointer flex items-center justify-between gap-4 transition-colors group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-2 h-2 rounded-full bg-cyan-600 shrink-0"></div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#1f1f1f] group-hover:text-[#0b57d0] truncate font-heading">
                              {item.titulo}
                            </span>
                            <span className="text-[11px] text-[#747775] shrink-0">
                              • {meta.label}
                            </span>
                          </div>
                          <p className="text-xs text-[#444746] truncate">
                            {item.enunciado}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-[#747775]">{meta.time}</span>
                        <ArrowRight className="w-4 h-4 text-[#0b57d0] group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </main>

      {/* Modal Dialog Unirse a Sala en Vivo (Google Material 3) */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-[28px] shadow-2xl border-0 w-full max-w-md p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-50 text-[#0b57d0] flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-normal text-[#1f1f1f] font-heading">
                    Unirse a Sala en Vivo
                  </h3>
                  <p className="text-xs text-[#747775] mt-0.5">
                    Ingresa el código proporcionado por tu docente o tutor
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinError(null);
                }}
                className="p-1.5 text-[#747775] hover:text-[#1f1f1f] hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-[#1f1f1f] mb-1.5">
                  Código de Sala de Ateneo
                </label>
                <input
                  type="text"
                  placeholder="EJ: ATENEO-8492"
                  value={roomInput}
                  onChange={(e) => {
                    setRoomInput(e.target.value);
                    setJoinError(null);
                  }}
                  autoFocus
                  required
                  className="w-full uppercase font-mono text-center tracking-widest text-lg font-bold px-4 py-3.5 bg-[#f0f4f9] border border-transparent focus:border-[#0b57d0] focus:bg-white rounded-[16px] text-[#0b57d0] focus:outline-none transition-all placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-xs placeholder:text-[#747775]"
                />
              </div>

              {joinError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-[16px] text-rose-700 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{joinError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinError(null);
                  }}
                  className="px-5 py-2.5 rounded-full text-xs font-medium text-[#444746] hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={joining || !roomInput.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:via-blue-700 hover:to-indigo-700 text-white rounded-full text-xs font-medium transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {joining ? 'Conectando...' : 'Entrar a la Sala'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
