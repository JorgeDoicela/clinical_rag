import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL, getAuthHeaders } from '../api/client';
import { Users, Play, MessageSquare, CheckCircle2, Award, Clock, ArrowLeft, Send, ShieldCheck, User, BookOpen, AlertTriangle } from 'lucide-react';
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
      const myParticipantData = data.participantes[currentUser.email.toLowerCase()];
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
      <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-xs flex flex-col items-center justify-center space-y-3 text-slate-500 text-sm">
        <Users className="w-8 h-8 animate-pulse text-sky-600" />
        <p>Conectando a la Sala de Ateneo <strong className="text-slate-900">{roomCode}</strong>...</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="bg-rose-50 rounded-2xl p-8 border border-rose-200 text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="text-base font-bold text-rose-950">Error de Conexión a la Sala</h3>
        <p className="text-xs text-rose-800">{error || 'La sala especificada no fue encontrada.'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  const participantesList = Object.values(room.participantes || {});
  const respondidosCount = participantesList.filter(p => p.respondido).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Bar Superior de Navegación & Código de Sala */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-sky-100 text-sky-800 border border-sky-200 px-2 py-0.5 rounded-md">
                {room.room_code}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Moderado por: <strong>{room.docente_nombre}</strong>
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              Ateneo de Sala: {room.case_title}
            </h1>
          </div>
        </div>

        {/* Indicador de Estado & Participantes */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/80">
            <Users className="w-4 h-4 text-sky-600" />
            <span>{participantesList.length} conectados</span>
          </div>

          <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl border ${
            room.estado === 'espera' ? 'bg-amber-50 text-amber-800 border-amber-200' :
            room.estado === 'resolucion' ? 'bg-sky-50 text-sky-800 border-sky-200' :
            room.estado === 'discusion' ? 'bg-purple-50 text-purple-800 border-purple-200' :
            'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            Fase: {room.estado}
          </span>
        </div>
      </div>

      {/* FASE 1: ESPERA EN SALA */}
      {room.estado === 'espera' && (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs space-y-6 text-center">
          <div className="max-w-md mx-auto space-y-2">
            <Clock className="w-8 h-8 text-sky-600 animate-pulse mx-auto" />
            <h2 className="text-lg font-bold text-slate-900">Esperando Inicio de la Sesión</h2>
            <p className="text-xs text-slate-500">
              Los participantes se están conectando. El docente moderador iniciará la fase de razonamiento individual en breve.
            </p>
          </div>

          {/* Lista de Estudiantes Conectados */}
          <div className="max-w-xl mx-auto border border-slate-200/80 rounded-xl p-4 bg-slate-50 text-left space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Estudiantes en Sala ({participantesList.length}):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {participantesList.map((p, i) => (
                <div key={i} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800">
                  <User className="w-4 h-4 text-sky-600" />
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
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Play className="w-4 h-4 text-emerald-400" />
                <span>Iniciar Razonamiento Clínico Simultáneo</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* FASE 2: RAZONAMIENTO INDIVIDUAL SINCRÓNICO */}
      {room.estado === 'resolucion' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Columna Izquierda: Enunciado del Caso */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200">
                GPC {room.guia_asociada}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Respuestas enviadas: <strong>{respondidosCount} / {participantesList.length}</strong>
              </span>
            </div>

            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900">{room.case_title}</h2>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-normal">
                {room.case_enunciado}
              </div>
            </div>

            <div className="bg-sky-50/60 p-4 rounded-xl border border-sky-200/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800 block">Pregunta de Evaluación:</span>
              <p className="text-xs font-semibold text-sky-950">{room.case_pregunta}</p>
            </div>
          </div>

          {/* Columna Derecha: Formulario o Confirmación de Respuesta */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            {submittedEval ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Tu razonamiento ha sido registrado. Espera a que el docente abra la discusión grupal.</span>
                </div>
                <FeedbackCard result={submittedEval} />
              </div>
            ) : (
              <form onSubmit={handleSubmitAnswer} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Tu Razonamiento Clínico</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Redacción Individual</span>
                </div>

                <textarea
                  rows={8}
                  value={studentAnswer}
                  onChange={(e) => setStudentAnswer(e.target.value)}
                  placeholder="Redacta tu sospecha diagnóstica, justificación según síntomas y plan de tratamiento..."
                  className="w-full p-4 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-sky-500 leading-relaxed font-sans"
                  required
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shadow-xs"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? 'Evaluando...' : 'Enviar Respuesta a la Sala'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Control Docente para pasar a la Fase de Discusión */}
            {isDocente && (
              <div className="border-t border-slate-200 pt-4 mt-6">
                <button
                  onClick={() => handleUpdateStatus('discusion')}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors"
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
        <div className="space-y-6">
          {/* Header de la Fase de Discusión */}
          <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-purple-800 uppercase tracking-wider mb-1">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                <span>Sesión de Discusión Clínica en Vivo</span>
              </div>
              <h2 className="text-xl font-extrabold text-purple-950 tracking-tight">
                Comparativa de Razonamientos Clínicos
              </h2>
              <p className="text-xs text-purple-900/80 mt-0.5">
                Revisa y contrasta las respuestas de tus pares frente a la Guía de Práctica Clínica oficial del MSP.
              </p>
            </div>

            {isDocente && room.estado !== 'finalizado' && (
              <button
                onClick={() => handleUpdateStatus('finalizado')}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xs hover:bg-slate-800"
              >
                Concluir Ateneo de Sala
              </button>
            )}
          </div>

          {/* Cuadro de Mando de Consenso Grupal (Analítica en Vivo para Moderador y Estudiantes) */}
          {room.analitica_consenso && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm sm:text-base">
                  <Award className="w-5 h-5 text-purple-600" />
                  <span>Consenso y Desempeño Colectivo de la Sala</span>
                </div>
                <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full border border-purple-200">
                  {room.analitica_consenso.nivel_consenso}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Promedio de la Sala</span>
                  <span className="text-2xl font-extrabold text-slate-900">{room.analitica_consenso.promedio_sala} / 10 pts</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Participantes Entregados</span>
                  <span className="text-2xl font-extrabold text-slate-900">{room.analitica_consenso.total_respondidos} de {room.analitica_consenso.total_conectados}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Modo de Sesión</span>
                  <span className="text-sm font-extrabold text-purple-900">Ateneo Sincrónico RAG</span>
                </div>
              </div>

              {/* Brechas Masivas Compartidas */}
              {room.analitica_consenso.top_brechas_sala && room.analitica_consenso.top_brechas_sala.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                    Principales Omisiones y Brechas Colectivas en la Sala:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {room.analitica_consenso.top_brechas_sala.map((b, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-purple-50/50 p-2.5 rounded-xl border border-purple-200/60 text-xs font-medium text-purple-950">
                        <span className="truncate pr-2">{b.brecha}</span>
                        <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md shrink-0">
                          {b.porcentaje}% de la sala ({b.estudiantes_afectados})
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
              <div key={idx} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-sky-600" />
                    <span className="font-bold text-sm text-slate-900">{p.nombre}</span>
                  </div>
                  {p.resultado_evaluacion ? (
                    <span className="text-xs font-extrabold px-3 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded-xl">
                      {p.resultado_evaluacion.score} / {p.resultado_evaluacion.score_max || 10} pts
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No envió respuesta</span>
                  )}
                </div>

                {p.respuesta ? (
                  <div className="space-y-3">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-800 font-normal leading-relaxed">
                      {p.respuesta}
                    </div>
                    {p.resultado_evaluacion && (
                      <FeedbackCard result={p.resultado_evaluacion} />
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-4 text-center">Sin participación registrada en esta sesión.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
