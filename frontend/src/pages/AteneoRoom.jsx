import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL, getAuthHeaders } from '../api/client';
import { 
  Users, 
  Play, 
  MessageSquare, 
  CheckCircle2, 
  Award, 
  Clock, 
  ArrowLeft, 
  Send, 
  ShieldCheck, 
  User, 
  BookOpen, 
  AlertTriangle,
  Loader2,
  Sparkles
} from 'lucide-react';
import FeedbackCard from '../components/FeedbackCard';

export default function AteneoRoom() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentUser = user || {
    id: 'usr_alumno_001',
    email: 'alumno@ateneo.edu.ec',
    nombre: 'Estudiante María José Silva',
    rol: 'alumno'
  };

  const isDocente = currentUser.rol === 'docente' || currentUser.rol === 'administrador';

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedEval, setSubmittedEval] = useState(null);

  useEffect(() => {
    fetchRoomState();
    const interval = setInterval(fetchRoomState, 3000);
    return () => clearInterval(interval);
  }, [roomCode]);

  const fetchRoomState = async () => {
    try {
      const res = await fetch(`${API_URL}/api/ateneo/room/${roomCode}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        throw new Error('La sala no existe o ha finalizado.');
      }
      const data = await res.json();
      setRoom(data);
      setLoading(false);

      // Si el estudiante ya respondió anteriormente, cargar su respuesta
      const myEmail = (currentUser?.email || '').toLowerCase();
      const myParticipantData = data.participantes ? data.participantes[myEmail] : null;
      if (myParticipantData && myParticipantData.respondido) {
        setSubmittedEval(myParticipantData.resultado_evaluacion);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (nuevoEstado) => {
    try {
      const formData = new FormData();
      formData.append('nuevo_estado', nuevoEstado);
      formData.append('docente_id', currentUser.id);

      const res = await fetch(`${API_URL}/api/ateneo/room/${roomCode}/status`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });
      if (res.ok) {
        fetchRoomState();
      }
    } catch (err) {
      console.error('Error al actualizar fase de la sala:', err);
    }
  };

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!studentAnswer.trim()) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('user_email', currentUser.email);
      formData.append('respuesta_estudiante', studentAnswer);

      const res = await fetch(`${API_URL}/api/ateneo/room/${roomCode}/submit`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });
      if (!res.ok) throw new Error('Error al enviar respuesta');
      const data = await res.json();
      setSubmittedEval(data.evaluacion);
      fetchRoomState();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-[28px] p-12 shadow-xs border-0 flex flex-col items-center justify-center space-y-3 text-[#444746] text-sm">
        <Users className="w-8 h-8 animate-pulse text-[#0b57d0]" />
        <p>Conectando a la Sala de Ateneo <strong className="text-[#1f1f1f]">{roomCode}</strong>...</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="bg-white rounded-[28px] p-8 shadow-xs border-0 text-center space-y-4 max-w-lg mx-auto">
        <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="text-base font-medium text-[#1f1f1f]">Error de Conexión a la Sala</h3>
        <p className="text-xs text-[#444746]">{error || 'La sala especificada no fue encontrada.'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white rounded-full text-xs font-medium cursor-pointer"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  const participantesList = Object.values(room.participantes || {});
  const respondidosCount = participantesList.filter(p => p.respondido).length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Barra Superior de Navegación & Código de Sala */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-full text-[#444746] hover:text-[#1f1f1f] hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium bg-sky-50 text-[#0b57d0] px-2.5 py-0.5 rounded-full">
                Sala {room.room_code}
              </span>
              <span className="text-xs text-[#747775]">
                Moderador: <strong className="text-[#1f1f1f]">{room.docente_nombre}</strong>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-normal text-[#1f1f1f] font-heading mt-1">
              Ateneo Clínico: {room.case_title}
            </h1>
          </div>
        </div>

        {/* Indicador de Estado & Participantes */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#1f1f1f] bg-white px-3 py-1.5 rounded-full shadow-xs">
            <Users className="w-4 h-4 text-[#0b57d0]" />
            <span>{participantesList.length} conectados</span>
          </div>

          <span className={`text-xs font-medium px-3.5 py-1.5 rounded-full capitalize ${
            room.estado === 'espera' ? 'bg-amber-50 text-amber-800' :
            room.estado === 'resolucion' ? 'bg-sky-50 text-[#0b57d0]' :
            room.estado === 'discusion' ? 'bg-purple-50 text-purple-800' :
            'bg-emerald-50 text-emerald-800'
          }`}>
            Fase: {room.estado}
          </span>
        </div>
      </div>

      {/* FASE 1: ESPERA EN SALA */}
      {room.estado === 'espera' && (
        <div className="bg-white rounded-[28px] p-8 sm:p-12 shadow-xs border-0 space-y-8 text-center max-w-3xl mx-auto">
          <div className="max-w-md mx-auto space-y-2">
            <Clock className="w-8 h-8 text-[#0b57d0] animate-pulse mx-auto" />
            <h2 className="text-xl font-normal text-[#1f1f1f] font-heading">Esperando Inicio de la Sesión</h2>
            <p className="text-xs text-[#444746] leading-relaxed">
              Los participantes se están conectando. El docente moderador iniciará la fase de razonamiento individual en breve.
            </p>
          </div>

          {/* Lista de Estudiantes Conectados */}
          <div className="border-0 rounded-[20px] p-5 bg-[#f0f4f9] text-left space-y-3">
            <span className="text-xs font-medium text-[#1f1f1f] block">
              Estudiantes en Sala ({participantesList.length}):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {participantesList.map((p, i) => (
                <div key={i} className="flex items-center gap-2 bg-white p-3 rounded-full text-xs font-medium text-[#1f1f1f] shadow-xs">
                  <div className="w-6 h-6 rounded-full bg-sky-100 text-[#0b57d0] flex items-center justify-center text-[10px]">
                    {p.nombre ? p.nombre.charAt(0) : 'E'}
                  </div>
                  <span className="truncate">{p.nombre}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Controles de Moderación para el Docente */}
          {isDocente && (
            <div className="pt-2">
              <button
                onClick={() => handleUpdateStatus('resolucion')}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:via-blue-700 hover:to-indigo-700 text-white text-xs font-medium shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Iniciar Razonamiento Clínico Simultáneo</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* FASE 2: RAZONAMIENTO INDIVIDUAL SINCRÓNICO (Split Screen) */}
      {room.estado === 'resolucion' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Columna Izquierda (6 cols): Enunciado del Caso */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-medium text-[#0b57d0] bg-sky-50 px-3 py-1 rounded-full">
                  GPC {room.guia_asociada} (MSP)
                </span>
                <span className="text-xs text-[#747775]">
                  Respuestas: <strong className="text-[#1f1f1f]">{respondidosCount} / {participantesList.length}</strong>
                </span>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl font-normal text-[#1f1f1f] font-heading">{room.case_title}</h2>
                <div className="bg-[#f0f4f9] p-5 rounded-[20px] text-sm text-[#1f1f1f] leading-relaxed whitespace-pre-wrap">
                  {room.case_enunciado}
                </div>
              </div>

              <div className="bg-sky-50 p-4 rounded-[16px] border border-sky-100 space-y-1">
                <span className="text-xs font-medium text-[#0b57d0] block">Pregunta de Evaluación:</span>
                <p className="text-sm font-medium text-[#1f1f1f]">{room.case_pregunta}</p>
              </div>
            </div>
          </div>

          {/* Columna Derecha (6 cols): Formulario o Confirmación de Respuesta */}
          <div className="lg:col-span-6 space-y-6">
            {submittedEval ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 rounded-[20px] p-4 text-emerald-800 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Tu razonamiento ha sido registrado. Espera a que el docente abra la discusión grupal.</span>
                </div>
                <FeedbackCard result={submittedEval} />
              </div>
            ) : (
              <form onSubmit={handleSubmitAnswer} className="bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-[#1f1f1f]">Tu Razonamiento Clínico Individual</h3>
                  <textarea
                    rows={8}
                    value={studentAnswer}
                    onChange={(e) => setStudentAnswer(e.target.value)}
                    placeholder="Redacta tu sospecha diagnóstica, justificación según síntomas y plan de tratamiento..."
                    className="w-full bg-[#f0f4f9] hover:bg-white focus:bg-white border border-[#747775] hover:border-[#1f1f1f] focus:border-[#0b57d0] focus:ring-1 focus:ring-[#0b57d0] rounded-[16px] p-4 text-sm text-[#1f1f1f] placeholder:text-[#747775] focus:outline-none transition-all resize-y"
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="py-3 px-8 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:via-blue-700 hover:to-indigo-700 text-white rounded-full text-xs font-medium transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Evaluando...</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span>Enviar Respuesta a la Sala</span>
                        <Send className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Control Docente para pasar a la Fase de Discusión */}
            {isDocente && (
              <div className="pt-2">
                <button
                  onClick={() => handleUpdateStatus('discusion')}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium shadow-md shadow-purple-500/20 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Abrir Discusión Grupal & Revelar Resultados</span>
                </button>
              </div>
            )}
          </div>

        </div>
      )}

      {/* FASE 3: DISCUSIÓN & COMPARACIÓN GRUPAL (ATENEO DE SALA) */}
      {(room.estado === 'discusion' || room.estado === 'finalizado') && (
        <div className="space-y-8">
          
          {/* Header de la Fase de Discusión */}
          <div className="bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-purple-700 mb-1">
                <MessageSquare className="w-4 h-4" />
                <span>Sesión de Discusión Clínica en Vivo</span>
              </div>
              <h2 className="text-2xl font-normal text-[#1f1f1f] font-heading">
                Comparativa de Razonamientos Clínicos
              </h2>
              <p className="text-xs text-[#444746] mt-0.5">
                Contrasta las respuestas de la cohorte frente a la Guía de Práctica Clínica oficial del MSP.
              </p>
            </div>

            {isDocente && room.estado !== 'finalizado' && (
              <button
                onClick={() => handleUpdateStatus('finalizado')}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white text-xs font-medium shadow-md shadow-blue-500/20 hover:opacity-90 cursor-pointer"
              >
                Concluir Ateneo de Sala
              </button>
            )}
          </div>

          {/* Cuadro de Mando de Consenso Grupal */}
          {room.analitica_consenso && (
            <div className="bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 font-medium text-[#1f1f1f] text-base font-heading">
                  <Award className="w-5 h-5 text-purple-600" />
                  <span>Consenso y Desempeño Colectivo de la Sala</span>
                </div>
                <span className="text-xs font-medium text-purple-800 bg-purple-50 px-3 py-1 rounded-full">
                  {room.analitica_consenso.nivel_consenso}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#f0f4f9] p-5 rounded-[20px]">
                  <span className="text-xs text-[#747775] block">Promedio de la Sala</span>
                  <span className="text-3xl font-normal text-[#1f1f1f] mt-1 block font-heading">
                    {room.analitica_consenso.promedio_sala} / 10 pts
                  </span>
                </div>
                <div className="bg-[#f0f4f9] p-5 rounded-[20px]">
                  <span className="text-xs text-[#747775] block">Participantes Entregados</span>
                  <span className="text-3xl font-normal text-[#1f1f1f] mt-1 block font-heading">
                    {room.analitica_consenso.total_respondidos} de {room.analitica_consenso.total_conectados}
                  </span>
                </div>
                <div className="bg-[#f0f4f9] p-5 rounded-[20px]">
                  <span className="text-xs text-[#747775] block">Modo de Sesión</span>
                  <span className="text-base font-medium text-purple-900 mt-2 block">
                    Ateneo Sincrónico RAG
                  </span>
                </div>
              </div>

              {/* Brechas Masivas Compartidas */}
              {room.analitica_consenso.top_brechas_sala && room.analitica_consenso.top_brechas_sala.length > 0 && (
                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <span className="text-xs font-medium text-[#1f1f1f] block">
                    Principales Omisiones Colectivas en la Sala:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {room.analitica_consenso.top_brechas_sala.map((b, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-purple-50/50 p-3 rounded-[16px] text-xs text-purple-950 font-medium">
                        <span className="truncate pr-2">{b.brecha}</span>
                        <span className="text-[10px] font-medium bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full shrink-0">
                          {b.porcentaje}% ({b.estudiantes_afectados})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Matriz Comparativa de Participantes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {participantesList.map((p, idx) => (
              <div key={idx} className="bg-white rounded-[28px] p-6 shadow-xs border-0 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-sky-100 text-[#0b57d0] flex items-center justify-center text-xs font-medium">
                      {p.nombre ? p.nombre.charAt(0) : 'E'}
                    </div>
                    <span className="font-medium text-sm text-[#1f1f1f]">{p.nombre}</span>
                  </div>
                  {p.resultado_evaluacion ? (
                    <span className="text-xs font-medium px-3 py-1 bg-sky-50 text-[#0b57d0] rounded-full">
                      {p.resultado_evaluacion.score} / {p.resultado_evaluacion.score_max || 10} pts
                    </span>
                  ) : (
                    <span className="text-xs text-[#747775] italic">No envió respuesta</span>
                  )}
                </div>

                {p.respuesta ? (
                  <div className="space-y-4">
                    <div className="bg-[#f0f4f9] p-4 rounded-[16px] text-xs text-[#1f1f1f] leading-relaxed">
                      {p.respuesta}
                    </div>
                    {p.resultado_evaluacion && (
                      <FeedbackCard result={p.resultado_evaluacion} />
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[#747775] italic py-4 text-center">Sin participación registrada.</p>
                )}
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
}
