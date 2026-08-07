import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCases, API_URL, getAuthHeaders } from '../api/client';
import { Stethoscope, ArrowRight, AlertCircle, FileText, TrendingUp, Users } from 'lucide-react';
import ReasoningTrends from '../components/ReasoningTrends';

export default function CaseList() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('cases'); // 'cases' | 'trends'
  const [roomInput, setRoomInput] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadCases() {
      try {
        const data = await fetchCases();
        setCases(data.cases || data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadCases();
  }, []);

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    const cleanCode = roomInput.trim().toUpperCase();
    if (!cleanCode) return;

    try {
      const formData = new FormData();
      formData.append('room_code', cleanCode);
      formData.append('user_id', 'usr_alumno_001');
      formData.append('user_email', 'alumno@ateneo.edu.ec');
      formData.append('user_nombre', 'Estudiante María José Silva');
      formData.append('user_rol', 'alumno');

      const res = await fetch(`${API_URL}/api/ateneo/join`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'La sala especificada no existe.');
      }

      navigate(`/ateneo/${cleanCode}`);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal Clínico Minimalista */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Stethoscope className="w-4 h-4 text-sky-600" />
            <span>Evaluación del Razonamiento Clínico</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Ateneo RAG Clínico
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Simulación diagnóstica y evaluación longitudinal comparada contra las Guías de Práctica Clínica oficiales del MSP Ecuador.
          </p>
        </div>

        {/* Pestañas de Selección de Vista & Unirse a Sala */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowJoinModal(!showJoinModal)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold transition-colors"
          >
            <Users className="w-4 h-4 text-sky-600" />
            <span>Unirse a Ateneo de Sala</span>
          </button>

          <div className="flex items-center bg-slate-200/60 p-1 rounded-xl shrink-0 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setActiveTab('cases')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'cases' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-sky-600" />
              <span>Casos</span>
            </button>
            <button
              onClick={() => setActiveTab('trends')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'trends' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
              <span>Mi Progreso</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal/Input Desplegable para Unirse a Sala */}
      {showJoinModal && (
        <form onSubmit={handleJoinRoom} className="bg-sky-50/70 border border-sky-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3 animate-fade-in">
          <div className="flex items-center gap-2 text-sky-900 font-bold text-xs shrink-0">
            <Users className="w-4 h-4 text-sky-600" />
            <span>Código de Sala (Ateneo):</span>
          </div>
          <input
            type="text"
            placeholder="Ej: ATENEO-8492"
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            className="flex-1 uppercase font-mono text-xs font-bold px-3 py-2 bg-white border border-sky-300 rounded-xl focus:outline-none focus:border-sky-600"
            required
          />
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            Ingresar a la Sesión
          </button>
        </form>
      )}

      {/* Contenido según Pestaña */}
      {activeTab === 'trends' ? (
        <ReasoningTrends />
      ) : (
        /* Listado de Casos */
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
      )}
    </div>
  );
}
