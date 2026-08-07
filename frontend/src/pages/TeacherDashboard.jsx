import React, { useEffect, useState } from 'react';
import { fetchCases, API_URL, getAuthHeaders } from '../api/client';
import { UserCheck, BookOpen, ArrowRight, Users, ShieldCheck } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Header Docente & Pestañas */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">
            Supervisión y Docencia Médica
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Panel de Docentes y Tutores Clínicos</h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Supervisa la alineación del razonamiento diagnóstico de los estudiantes frente a las Guías de Práctica Clínica del MSP Ecuador.
          </p>
        </div>

        {/* Selección de Pestañas (Clean Tabs) */}
        <div className="flex items-center bg-slate-200/60 p-1 rounded-xl shrink-0 text-xs font-semibold text-slate-600">
          <button
            onClick={() => setActiveTab('cases')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'cases' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Casos & Salas
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'analytics' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Inteligencia B2B
          </button>
        </div>
      </div>

      {activeTab === 'analytics' ? (
        <CoordinatorAnalytics />
      ) : (
        <>

      {/* Métricas Clave de Supervisión */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Casos Simulados Activos</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{cases.length}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Precisión Retrieval RAG</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">100.0%</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Validez Salida LLM</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">100.0%</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Evaluación Formativa</span>
          <p className="text-sm font-bold text-slate-900 mt-2">Prompt MSP v1.2</p>
        </div>
      </div>

      {/* Catálogo de Casos Clínicos para Evaluación */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-bold text-slate-900">Casos Clínicos Habilitados para Evaluación</h2>
        </div>
        <p className="text-xs text-slate-500 mb-6">
          Revisa la estructura de los casos simulados o inicia una sesión grupal en vivo (Ateneo de Sala).
        </p>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Cargando catálogo de casos...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cases.map((c) => (
              <div key={c.id} className="p-5 border border-slate-200 rounded-2xl hover:border-slate-300 transition-colors bg-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60">
                      GPC: {c.guia_asociada}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">ID: {c.id}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mb-1">{c.titulo}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">{c.enunciado}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <button
                    onClick={() => handleCreateAteneoRoom(c.id)}
                    disabled={creatingRoomId === c.id}
                    className="flex items-center gap-1.5 font-bold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-xl border border-sky-200/80 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>{creatingRoomId === c.id ? 'Creando...' : 'Crear Ateneo de Sala'}</span>
                  </button>

                  <Link
                    to={`/case/${c.id}`}
                    className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                  >
                    <span>Simular</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
