import { useEffect, useCallback, FormEvent, useRef } from 'react';
import { useAteneoRoomStore, type ExtendedAteneoRoom } from '../../../core/stores/useAteneoRoomStore';
import { ateneoSocketClient } from '../../../core/realtime/socketClient';
import type { User } from '../../../types';

export type { RoomParticipantDetail, ExtendedAteneoRoom, ConnectionStatus } from '../../../core/stores/useAteneoRoomStore';

/**
 * useAteneoRoom — Hook de orquestación reactiva para Salas de Ateneo+ con WebSockets y fallback resiliente.
 * Sustituye el sondeo constante por eventos en tiempo real con latidos de presencia y consenso grupal instantáneo.
 */
export function useAteneoRoom(roomCode: string, currentUser: User | null) {
  const room = useAteneoRoomStore((state) => state.room);
  const loading = useAteneoRoomStore((state) => state.loading);
  const error = useAteneoRoomStore((state) => state.error);
  const studentAnswer = useAteneoRoomStore((state) => state.studentAnswer);
  const submitting = useAteneoRoomStore((state) => state.submitting);
  const submittedEval = useAteneoRoomStore((state) => state.submittedEval);
  const connectionStatus = useAteneoRoomStore((state) => state.connectionStatus);
  const connectedCount = useAteneoRoomStore((state) => state.connectedCount);

  const setStudentAnswer = useAteneoRoomStore((state) => state.setStudentAnswer);
  const fetchRoomState = useAteneoRoomStore((state) => state.fetchRoomState);
  const setRoom = useAteneoRoomStore((state) => state.setRoom);
  const setConnectionStatus = useAteneoRoomStore((state) => state.setConnectionStatus);
  const setConnectedCount = useAteneoRoomStore((state) => state.setConnectedCount);
  const updateStatusInStore = useAteneoRoomStore((state) => state.updateRoomStatus);
  const submitInStore = useAteneoRoomStore((state) => state.submitAnswer);
  const resetRoom = useAteneoRoomStore((state) => state.resetRoom);

  const userEmail = currentUser?.email;
  const userId = currentUser?.id || 'usr_docente_001';
  const fallbackPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    // 1. Carga inicial inmediata de estado vía REST
    fetchRoomState(roomCode, userEmail);

    // 2. Conectar cliente WebSocket bidireccional
    ateneoSocketClient.connect(roomCode, {
      user_id: currentUser?.id,
      nombre: currentUser?.nombre,
      email: currentUser?.email,
      rol: currentUser?.rol,
    });

    // 3. Suscripción al estado de la conexión
    const unsubStatus = ateneoSocketClient.onStatusChange((status) => {
      setConnectionStatus(status);
      if (status === 'CONNECTED' && fallbackPollRef.current) {
        clearInterval(fallbackPollRef.current);
        fallbackPollRef.current = null;
      }
    });

    const unsubReconnectFailed = ateneoSocketClient.on('RECONNECT_FAILED', () => {
      if (!fallbackPollRef.current) {
        fallbackPollRef.current = setInterval(() => {
          fetchRoomState(roomCode, userEmail);
        }, 10000);
        if (typeof (fallbackPollRef.current as any)?.unref === 'function') {
          (fallbackPollRef.current as any).unref();
        }
      }
    });

    // 4. Suscripción a eventos en tiempo real
    const unsubRoomUpdate = ateneoSocketClient.on<ExtendedAteneoRoom>('ROOM_STATE_UPDATED', (payload) => {
      if (payload) {
        setRoom(payload, userEmail);
      }
    });

    const unsubPhaseTransition = ateneoSocketClient.on<{ room: ExtendedAteneoRoom }>('PHASE_TRANSITION', (payload) => {
      if (payload?.room) {
        setRoom(payload.room, userEmail);
      }
    });

    const unsubAnswerSubmitted = ateneoSocketClient.on<{ room: ExtendedAteneoRoom }>('ANSWER_SUBMITTED', (payload) => {
      if (payload?.room) {
        setRoom(payload.room, userEmail);
      }
    });

    const unsubParticipantJoined = ateneoSocketClient.on<{ total_conectados: number }>('PARTICIPANT_JOINED', (payload) => {
      if (payload?.total_conectados !== undefined) {
        setConnectedCount(payload.total_conectados);
      }
    });

    const unsubParticipantLeft = ateneoSocketClient.on<{ total_conectados: number }>('PARTICIPANT_LEFT', (payload) => {
      if (payload?.total_conectados !== undefined) {
        setConnectedCount(payload.total_conectados);
      }
    });

    return () => {
      if (fallbackPollRef.current) {
        clearInterval(fallbackPollRef.current);
        fallbackPollRef.current = null;
      }
      unsubStatus();
      unsubReconnectFailed();
      unsubRoomUpdate();
      unsubPhaseTransition();
      unsubAnswerSubmitted();
      unsubParticipantJoined();
      unsubParticipantLeft();
      ateneoSocketClient.disconnect();
      resetRoom();
    };
  }, [roomCode, userEmail, userId, currentUser?.nombre, currentUser?.rol, fetchRoomState, setRoom, setConnectionStatus, setConnectedCount, resetRoom]);

  const updateRoomStatus = useCallback(
    async (nuevoEstado: string) => {
      // Intento por WebSocket primero para latencia sub-100ms
      ateneoSocketClient.send('PHASE_TRANSITION_REQUEST', { nuevo_estado: nuevoEstado, user_id: userId });
      // Ejecución segura persistente por REST
      await updateStatusInStore(roomCode, nuevoEstado, userId);
    },
    [roomCode, userId, updateStatusInStore]
  );

  const submitAnswer = useCallback(
    async (e?: FormEvent) => {
      if (e) e.preventDefault();
      await submitInStore(roomCode, userEmail || 'alumno@ateneo.edu.ec');
    },
    [roomCode, userEmail, submitInStore]
  );

  const castVote = useCallback(
    (opcionId: string) => {
      ateneoSocketClient.send('VOTE_CAST', {
        user_id: userId,
        user_nombre: currentUser?.nombre,
        opcion: opcionId,
      });
    },
    [userId, currentUser]
  );

  return {
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
    castVote,
    reloadRoom: () => fetchRoomState(roomCode, userEmail),
  };
}

export default useAteneoRoom;
