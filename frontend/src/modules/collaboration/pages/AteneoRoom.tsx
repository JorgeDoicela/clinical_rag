import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { 
  Users, 
  Play, 
  CheckCircle2, 
  ArrowLeft, 
  Send, 
  BookOpen, 
  AlertTriangle,
  Sparkles,
  Activity,
  Award
} from 'lucide-react';
import useAteneoRoom, { RoomParticipantDetail } from '../hooks/useAteneoRoom';
import ClinicalButton from '../../../core/ui/ClinicalButton';
import ClinicalBadge from '../../../core/ui/ClinicalBadge';
import type { User, UserRole } from '../../../types';

export default function AteneoRoom() {
  const { roomCode = '' } = useParams<{ roomCode: string }>();
  const { user } = useAuth();

  const currentUser = useMemo<User>(() => user || {
    id: 'usr_alumno_001',
    email: 'alumno@ateneo.edu.ec',
    nombre: 'Estudiante María José Silva',
    rol: 'alumno' as UserRole
  }, [user]);

  const isDocente = currentUser.rol === 'docente' || currentUser.rol === 'administrador';

  const {
    room,
    loading,
    error,
    studentAnswer,
    setStudentAnswer,
    submitting,
    submittedEval,
    connectionStatus,
    connectedCount,
    updateRoomStatus,
    submitAnswer,
  } = useAteneoRoom(roomCode, currentUser);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Activity className="w-10 h-10 text-[#0b57d0] animate-spin" />
        <p className="text-sm font-medium text-[#444746]">
          Sincronizando estado de la Sala de Ateneo...
        </p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="bg-white rounded-[28px] p-8 max-w-lg mx-auto text-center space-y-4 shadow-xs mt-12">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-xl font-normal text-[#1f1f1f] font-heading">
          Sala no disponible
        </h2>
        <p className="text-xs text-[#747775]">{error || 'La sala de Ateneo ha finalizado o no existe.'}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#f0f4f9] hover:bg-slate-200 text-[#1f1f1f] rounded-full text-xs font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Catálogo
        </Link>
      </div>
    );
  }

  const roomDetails = room;
  const participantesRaw = roomDetails?.participantes || {};
  const participantesList: RoomParticipantDetail[] = Object.values(participantesRaw);
  const totalParticipantes = participantesList.length;
  const respondieronCount = participantesList.filter(p => p.respondido).length;
  const consenso = roomDetails?.analitica_consenso;

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      
      {/* 1. Header de la Sala Colaborativa */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-full hover:bg-slate-100 text-[#444746] transition-colors"
            title="Salir de la sala"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#0b57d0]">
              <Users className="w-3.5 h-3.5" />
              <span>Sala Colaborativa de Ateneo Sincrónico</span>
              <span className="font-mono bg-sky-50 text-[#0b57d0] px-2 py-0.5 rounded-full border border-sky-200">
                {roomDetails.room_code || room.codigo}
              </span>
              {/* Badge de Presencia y Conexión en Tiempo Real */}
              <span
                data-testid="connection-status-pill"
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                  connectionStatus === 'CONNECTED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : connectionStatus === 'RECONNECTING' || connectionStatus === 'CONNECTING'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    connectionStatus === 'CONNECTED'
                      ? 'bg-emerald-500 animate-pulse'
                      : connectionStatus === 'RECONNECTING' || connectionStatus === 'CONNECTING'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-slate-400'
                  }`}
                />
                <span>
                  {connectionStatus === 'CONNECTED'
                    ? `En vivo (${connectedCount || totalParticipantes})`
                    : connectionStatus === 'RECONNECTING'
                    ? 'Reconectando...'
                    : 'Modo Seguro (Sondeo)'}
                </span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-normal text-[#1f1f1f] font-heading tracking-tight">
              {roomDetails.case_title || 'Caso de Ateneo'}
            </h1>
          </div>
        </div>

        {/* Controles del Docente */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          {isDocente ? (
            <div className="flex items-center gap-2">
              {roomDetails.estado === 'espera' && (
                <ClinicalButton
                  variant="primary"
                  size="sm"
                  onClick={() => updateRoomStatus('resolviendo')}
                  icon={Play}
                >
                  Iniciar Fase de Resolución
                </ClinicalButton>
              )}
              {roomDetails.estado === 'resolviendo' && (
                <ClinicalButton
                  variant="primary"
                  size="sm"
                  onClick={() => updateRoomStatus('consenso')}
                  icon={Award}
                >
                  Abrir Consenso Grupal
                </ClinicalButton>
              )}
              {roomDetails.estado === 'consenso' && (
                <ClinicalButton
                  variant="danger"
                  size="sm"
                  onClick={() => updateRoomStatus('cerrada')}
                >
                  Finalizar Sesión
                </ClinicalButton>
              )}
            </div>
          ) : (
            <ClinicalBadge
              variant={
                roomDetails.estado === 'resolviendo'
                  ? 'primary'
                  : roomDetails.estado === 'consenso'
                  ? 'success'
                  : 'default'
              }
            >
              Fase: {(roomDetails.estado || 'espera').toUpperCase()}
            </ClinicalBadge>
          )}
        </div>
      </div>

      {/* 2. Banner de Consenso (si está activo) */}
      {consenso && (
        <div className="bg-white rounded-[28px] p-6 shadow-xs border-0 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0b57d0]">
              <Sparkles className="w-4 h-4" />
              <span>Consenso Diagnóstico de Sala ({consenso.porcentaje_participacion}% de quorum)</span>
            </div>
            <span className="text-xs text-[#747775]">
              {respondieronCount} de {totalParticipantes} estudiantes
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-4 bg-[#f0f4f9] rounded-[20px]">
              <span className="text-xs text-[#747775] block">Puntaje Promedio de Sala</span>
              <p className="text-2xl font-normal text-[#1f1f1f] font-heading mt-1">
                {consenso.score_promedio} / 10
              </p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-[20px] sm:col-span-2">
              <span className="text-xs text-emerald-800 font-medium block">Diagnóstico Mayoritario</span>
              <p className="text-sm font-medium text-emerald-950 mt-1">
                {consenso.diagnostico_mayoritario}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Área de Discusión / Caso y Respuesta */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Panel Izquierdo: Cuadro Clínico de la Sala */}
        <div className="lg:col-span-7 bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-medium text-[#0b57d0] flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Caso Moderado por {roomDetails.docente_nombre || 'Docente Tutor'}
            </span>
            <h2 className="text-lg font-normal text-[#1f1f1f] font-heading">
              {roomDetails.case_title || 'Caso Clínico'}
            </h2>
          </div>

          <div className="p-4 bg-[#f0f4f9] rounded-[20px] text-xs sm:text-sm text-[#1f1f1f] leading-relaxed whitespace-pre-wrap">
            {roomDetails.case_enunciado}
          </div>

          {/* Formulario de Respuesta si es Alumno */}
          {!isDocente && roomDetails.estado === 'resolviendo' && !submittedEval && (
            <form onSubmit={submitAnswer} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#1f1f1f]">
                  Tu Aporte Diagnóstico Individual
                </label>
                <textarea
                  rows={5}
                  value={studentAnswer}
                  onChange={(e) => setStudentAnswer(e.target.value)}
                  placeholder="Escribe tu hipótesis nosológica, esquemas farmacológicos e intervenciones prioritarias..."
                  required
                  className="w-full p-4 bg-[#f0f4f9] rounded-[20px] text-sm text-[#1f1f1f] border border-slate-200/80 focus:outline-none focus:border-[#0b57d0] focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="flex justify-end">
                <ClinicalButton
                  type="submit"
                  variant="primary"
                  loading={submitting}
                  icon={Send}
                >
                  Enviar Dictamen a la Sala
                </ClinicalButton>
              </div>
            </form>
          )}

          {submittedEval && (
            <div className="p-4 bg-emerald-50 rounded-[20px] border border-emerald-200/80 space-y-2">
              <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Respuesta Registrada en la Sala
              </span>
              <p className="text-xs text-emerald-950 leading-relaxed">
                Puntaje formativo obtenido: <strong>{submittedEval.score} / 10</strong>. Tu dictamen se ha sumado al consenso colectivo del ateneo.
              </p>
            </div>
          )}
        </div>

        {/* Panel Derecho: Participantes en Tiempo Real */}
        <div className="lg:col-span-5 bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-normal text-[#1f1f1f] font-heading flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0b57d0]" />
              Participantes ({totalParticipantes})
            </h3>
            <span className="text-xs text-[#747775]">
              {respondieronCount} con voto emitido
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {participantesList.map((p, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-[16px] bg-[#f0f4f9] text-xs"
              >
                <div className="truncate pr-2">
                  <span className="font-medium text-[#1f1f1f] block truncate">
                    {p.nombre}
                  </span>
                  <span className="text-[10px] text-[#747775]">{p.rol}</span>
                </div>

                <ClinicalBadge
                  variant={p.respondido ? 'success' : 'default'}
                  size="sm"
                >
                  {p.respondido ? 'Voto Registrado' : 'Pensando...'}
                </ClinicalBadge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
