import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AteneoSocketClient, ateneoSocketClient } from '../core/realtime/socketClient';
import { useAteneoRoomStore } from '../core/stores/useAteneoRoomStore';
import AteneoRoom from '../modules/collaboration/pages/AteneoRoom';

// Mock de AuthContext con referencia de usuario estable
const mockUser = {
  id: 'usr_docente_001',
  email: 'docente@ateneo.edu.ec',
  nombre: 'Dr. Carlos Andrade (Docente)',
  rol: 'docente'
};

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser
  })
}));

// Mock de collaborationApi
vi.mock('../modules/collaboration/api/collaborationApi', () => ({
  default: {
    getRoom: vi.fn().mockResolvedValue({
      room_code: 'ATENEO-WS01',
      codigo: 'ATENEO-WS01',
      case_id: 'case_preeclampsia_01',
      case_title: 'Gestante con Trastorno Hipertensivo y Signos de Severidad',
      case_enunciado: 'Gestante de 32 semanas acude a urgencias por cefalea holocraneana y cifras tensionales elevadas...',
      docente_id: 'usr_docente_001',
      docente_nombre: 'Dr. Carlos Andrade (Docente)',
      estado: 'resolviendo',
      participantes: {
        'alumno1@ateneo.edu.ec': {
          nombre: 'Estudiante 1',
          rol: 'alumno',
          respondido: true,
          resultado_evaluacion: { score: 9.0, aciertos: ['Dengue identificado'], omisiones: [] }
        },
        'alumno2@ateneo.edu.ec': {
          nombre: 'Estudiante 2',
          rol: 'alumno',
          respondido: false
        }
      },
      analitica_consenso: {
        porcentaje_participacion: 50,
        score_promedio: 9.0,
        diagnostico_mayoritario: 'Dengue con Signos de Alarma'
      }
    }),
    updateRoomStatus: vi.fn().mockResolvedValue({ status: 'ok' }),
    submitRoomAnswer: vi.fn().mockResolvedValue({ status: 'ok' })
  }
}));

describe('Suite de Pruebas: Salas Colaborativas en Tiempo Real (WebSockets - Ateneo+)', () => {
  let client;

  beforeEach(() => {
    client = new AteneoSocketClient();
    useAteneoRoomStore.getState().resetRoom();
  });

  afterEach(() => {
    cleanup();
    client.destroy();
    ateneoSocketClient.destroy();
    useAteneoRoomStore.getState().resetRoom();
  });

  describe('Cliente WebSocket Resiliente (AteneoSocketClient)', () => {
    it('inicia en estado DISCONNECTED', () => {
      expect(client.getStatus()).toBe('DISCONNECTED');
    });

    it('transiciona a CONNECTING / CONNECTED al llamar a connect', async () => {
      client.connect('ATENEO-1234', { user_id: 'usr_01', nombre: 'Test' });
      expect(['CONNECTING', 'CONNECTED']).toContain(client.getStatus());

      await waitFor(() => {
        expect(client.getStatus()).toBe('CONNECTED');
      });
    });

    it('permite suscribirse a eventos y despachar mensajes entrantes', async () => {
      const handler = vi.fn();
      const unsub = client.on('TEST_EVENT', handler);

      // Simular mensaje recibido
      client['dispatch']('TEST_EVENT', { sample: 'data' });
      expect(handler).toHaveBeenCalledWith({ sample: 'data' });

      unsub();
      client['dispatch']('TEST_EVENT', { sample: 'data_2' });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('desconecta limpiamente y actualiza el estado a DISCONNECTED', async () => {
      client.connect('ATENEO-1234');
      await waitFor(() => expect(client.getStatus()).toBe('CONNECTED'));

      client.disconnect();
      expect(client.getStatus()).toBe('DISCONNECTED');
    });
  });

  describe('Store de Salas useAteneoRoomStore con Estado de Red', () => {
    it('almacena el estado de conexión y conteo de participantes en vivo', () => {
      const store = useAteneoRoomStore.getState();
      expect(store.connectionStatus).toBe('DISCONNECTED');
      expect(store.connectedCount).toBe(0);

      store.setConnectionStatus('CONNECTED');
      store.setConnectedCount(5);

      expect(useAteneoRoomStore.getState().connectionStatus).toBe('CONNECTED');
      expect(useAteneoRoomStore.getState().connectedCount).toBe(5);
    });

    it('setRoom actualiza los datos de la sala atómicamente', () => {
      const mockRoom = {
        room_code: 'TEST-01',
        case_id: 'case_01',
        case_title: 'Caso Clínico Test',
        docente_id: 'd1',
        docente_nombre: 'Docente Test',
        estado: 'espera',
        participantes: {}
      };

      useAteneoRoomStore.getState().setRoom(mockRoom);
      const state = useAteneoRoomStore.getState();

      expect(state.room?.room_code).toBe('TEST-01');
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Página de Sala AteneoRoom con Indicadores de Presencia', () => {
    it('renderiza la sala y el indicador de conexión en tiempo real', async () => {
      render(
        <MemoryRouter initialEntries={['/ateneo/ATENEO-WS01']}>
          <Routes>
            <Route path="/ateneo/:roomCode" element={<AteneoRoom />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Gestante con Trastorno Hipertensivo/i).length).toBeGreaterThan(0);
      });

      const statusPill = screen.getByTestId('connection-status-pill');
      expect(statusPill).toBeInTheDocument();
      expect(screen.getByText(/Participantes/i)).toBeInTheDocument();
    });
  });
});
