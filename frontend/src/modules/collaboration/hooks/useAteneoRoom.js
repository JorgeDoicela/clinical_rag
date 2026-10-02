import { useState, useEffect, useCallback, useRef } from 'react';
import collaborationApi from '../api/collaborationApi';

/**
 * useAteneoRoom — Hook controlador para sesiones colaborativas en tiempo real
 * Encapsula la sincronización periódica (polling actual o WebSockets futuro),
 * el cálculo de consenso y los envíos de votos/estados.
 */
export function useAteneoRoom(roomCode, currentUser) {
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedEval, setSubmittedEval] = useState(null);

  const isMountedRef = useRef(true);

  const fetchRoomState = useCallback(async () => {
    if (!roomCode) return;
    try {
      const data = await collaborationApi.getRoom(roomCode);
      if (isMountedRef.current) {
        setRoom(data);
        setLoading(false);

        // Si el estudiante ya respondió anteriormente, cargar su evaluación
        const myEmail = (currentUser?.email || '').toLowerCase();
        const myParticipantData = data.participantes ? data.participantes[myEmail] : null;
        if (myParticipantData && myParticipantData.respondido) {
          setSubmittedEval(myParticipantData.resultado_evaluacion);
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message || 'La sala no existe o ha finalizado');
        setLoading(false);
      }
    }
  }, [roomCode, currentUser]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchRoomState();

    // Sincronización continua cada 3 segundos
    const interval = setInterval(fetchRoomState, 3000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchRoomState]);

  // Actualizar estado/fase de la sala (docente)
  const updateRoomStatus = useCallback(
    async (nuevoEstado) => {
      try {
        await collaborationApi.updateRoomStatus(
          roomCode,
          nuevoEstado,
          currentUser?.id || 'usr_docente_001'
        );
        fetchRoomState();
      } catch (err) {
        console.error('Error al actualizar fase de la sala:', err);
      }
    },
    [roomCode, currentUser, fetchRoomState]
  );

  // Enviar respuesta diagnóstica individual
  const submitAnswer = useCallback(
    async (e) => {
      if (e) e.preventDefault();
      if (!studentAnswer.trim() || submitting) return;

      setSubmitting(true);
      try {
        const res = await collaborationApi.submitRoomAnswer(
          roomCode,
          currentUser?.email || 'alumno@ateneo.edu.ec',
          studentAnswer
        );
        if (res.resultado_evaluacion) {
          setSubmittedEval(res.resultado_evaluacion);
        }
        fetchRoomState();
      } catch (err) {
        alert(err.message || 'Error al enviar diagnóstico');
      } finally {
        setSubmitting(false);
      }
    },
    [roomCode, currentUser, studentAnswer, submitting, fetchRoomState]
  );

  return {
    room,
    loading,
    error,
    studentAnswer,
    setStudentAnswer,
    submitting,
    submittedEval,
    updateRoomStatus,
    submitAnswer,
    reloadRoom: fetchRoomState,
  };
}

export default useAteneoRoom;
