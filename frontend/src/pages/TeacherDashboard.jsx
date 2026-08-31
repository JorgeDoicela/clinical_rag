import React, { useEffect, useState } from 'react';
import { fetchCases, API_URL, getAuthHeaders } from '../api/client';
import { 
  UserCheck, 
  BookOpen, 
  ArrowRight, 
  Users, 
  ShieldCheck, 
  Activity, 
  Sparkles,
  BarChart3,
  FileText,
  Loader2,
  Plus
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import CoordinatorAnalytics from '../components/CoordinatorAnalytics';

export default function TeacherDashboard() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingRoomId, setCreatingRoomId] = useState(null);
  const [activeTab, setActiveTab] = useState('cases'); // 'cases' | 'analytics'
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchCases();
        setCases(data.cases || data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCreateAteneoRoom = async (caseId) => {
    setCreatingRoomId(caseId);
    try {
      const formData = new FormData();
      formData.append('case_id', caseId);
      formData.append('docente_id', 'usr_docente_001');
      formData.append('docente_nombre', 'Dr. Carlos Andrade (Docente)');

      const res = await fetch(`${API_URL}/api/ateneo/create`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });

      if (!res.ok) throw new Error('Error al crear sala de Ateneo');
      const room = await res.json();
      navigate(`/ateneo/${room.room_code}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setCreatingRoomId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      
      {/* Header Docente & Pestañas Planas */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#0b57d0] mb-2">
            <UserCheck className="w-4 h-4" />
            <span>Supervisión y Docencia Médica • MSP Ecuador</span>
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-normal tracking-tight text-[#1f1f1f] font-heading">
            Panel de Docentes y Tutores Clínicos
          </h1>
          <p className="text-sm font-normal text-[#444746] mt-1 max-w-2xl leading-relaxed">
            Supervisa la alineación del razonamiento diagnóstico de los estudiantes y modera sesiones clínicas en vivo.
          </p>
        </div>

        {/* Pestañas Planas con Underline */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('cases')}
            className={`pb-2 text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'cases'
                ? 'border-b-2 border-[#0b57d0] text-[#0b57d0] font-semibold -mb-[1px]'
                : 'text-[#444746] hover:text-[#1f1f1f]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Casos & Salas Clínicas</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-2 text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'analytics'
                ? 'border-b-2 border-[#0b57d0] text-[#0b57d0] font-semibold -mb-[1px]'
                : 'text-[#444746] hover:text-[#1f1f1f]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analítica Institucional (IBF)</span>
          </button>
        </div>
      </div>

      {activeTab === 'analytics' ? (
        <CoordinatorAnalytics />
      ) : (
        <div className="space-y-8">
          
          {/* Métricas Clave de Supervisión */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-[24px] p-6 shadow-xs border-0">
              <span className="text-xs text-[#747775] font-medium block">Casos Simulados Activos</span>
              <p className="text-3xl font-normal text-[#1f1f1f] mt-2 font-heading">{cases.length}</p>
            </div>

            <div className="bg-white rounded-[24px] p-6 shadow-xs border-0">
              <span className="text-xs text-[#747775] font-medium block">Precisión Retrieval RAG</span>
              <p className="text-3xl font-normal text-emerald-600 mt-2 font-heading">100.0%</p>
            </div>

            <div className="bg-white rounded-[24px] p-6 shadow-xs border-0">
              <span className="text-xs text-[#747775] font-medium block">Concordancia Médica MSP</span>
              <p className="text-3xl font-normal text-[#0b57d0] mt-2 font-heading">100.0%</p>
            </div>

            <div className="bg-white rounded-[24px] p-6 shadow-xs border-0">
              <span className="text-xs text-[#747775] font-medium block">Modelo Evaluador</span>
              <p className="text-base font-medium text-[#1f1f1f] mt-3 font-mono">Prompt MSP v2.0</p>
            </div>
          </div>

          {/* Catálogo de Casos para Docencia */}
          <div className="bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-normal text-[#1f1f1f] font-heading">
                  Casos Clínicos Habilitados para Simulación y Salas de Ateneo
                </h2>
                <p className="text-xs text-[#444746] mt-0.5">
                  Crea una sala colaborativa en tiempo real para evaluar el razonamiento colectivo de tu cohorte.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-[#747775]">
                <Loader2 className="w-6 h-6 animate-spin text-[#0b57d0] mx-auto mb-2" />
                <span>Cargando catálogo docente...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {cases.map((c) => (
                  <div
                    key={c.id}
                    className="bg-[#f0f4f9] rounded-[24px] p-6 flex flex-col justify-between hover:bg-[#e8f0fe] transition-colors group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-md bg-white text-[#1f1f1f] text-xs font-medium">
                          GPC: {c.guia_asociada}
                        </span>
                        <span className="text-xs text-[#747775] font-mono">ID: {c.id}</span>
                      </div>

                      <h3 className="text-base font-medium text-[#1f1f1f] font-heading group-hover:text-[#0b57d0] transition-colors leading-snug">
                        {c.titulo}
                      </h3>

                      <p className="text-xs text-[#444746] line-clamp-3 leading-relaxed">
                        {c.enunciado}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                      <button
                        onClick={() => handleCreateAteneoRoom(c.id)}
                        disabled={creatingRoomId === c.id}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:via-blue-700 hover:to-indigo-700 text-white font-medium text-xs rounded-full transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{creatingRoomId === c.id ? 'Iniciando...' : 'Crear Sala en Vivo'}</span>
                      </button>

                      <Link
                        to={`/case/${c.id}`}
                        className="inline-flex items-center gap-1 font-medium text-[#0b57d0] hover:text-[#0842a0] transition-colors"
                      >
                        <span>Ver Simulación</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
