import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import VoiceRoomBar from '../modules/collaboration/components/VoiceRoomBar';
import { ateneoSocketClient } from '../core/realtime/socketClient';

describe('Suite de Pruebas: Tele-Simulación y Audio Streaming WebRTC (Ateneo+)', () => {
  let mockAudioTrack: { enabled: boolean; stop: ReturnType<typeof vi.fn> };
  let mockMediaStream: {
    getTracks: () => typeof mockAudioTrack[];
    getAudioTracks: () => typeof mockAudioTrack[];
  };

  beforeEach(() => {
    mockAudioTrack = {
      enabled: true,
      stop: vi.fn()
    };

    mockMediaStream = {
      getTracks: () => [mockAudioTrack],
      getAudioTracks: () => [mockAudioTrack]
    };

    // Mock de navigator.mediaDevices.getUserMedia
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream)
      }
    });

    // Mock de RTCPeerConnection
    class MockRTCPeerConnection {
      connectionState = 'connected';
      addTrack = vi.fn();
      close = vi.fn();
      setRemoteDescription = vi.fn().mockResolvedValue(undefined);
      createAnswer = vi.fn().mockResolvedValue({ sdp: 'mock-answer-sdp' });
      setLocalDescription = vi.fn().mockResolvedValue(undefined);
      addIceCandidate = vi.fn().mockResolvedValue(undefined);
      onicecandidate: ((ev: unknown) => void) | null = null;
      onconnectionstatechange: (() => void) | null = null;
    }

    (globalThis as unknown as { RTCPeerConnection: typeof MockRTCPeerConnection }).RTCPeerConnection = MockRTCPeerConnection;

    // Mock de AudioContext
    class MockAudioContext {
      createMediaStreamSource = vi.fn().mockReturnValue({
        connect: vi.fn()
      });
      createAnalyser = vi.fn().mockReturnValue({
        fftSize: 256,
        smoothingTimeConstant: 0.5,
        frequencyBinCount: 128,
        getByteFrequencyData: vi.fn((array: Uint8Array) => {
          array.fill(40); // Simular volumen promedio
        })
      });
      close = vi.fn().mockResolvedValue(undefined);
    }

    (globalThis as unknown as { AudioContext: typeof MockAudioContext }).AudioContext = MockAudioContext;

    // Espiar despacho de señalización en socketClient
    vi.spyOn(ateneoSocketClient, 'send').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza la barra en reposo con el botón para unirse al debriefing de voz', () => {
    render(
      <VoiceRoomBar
        roomCode="SALA-CARDIO-101"
        userId="usr_alumno_001"
        userName="Dra. María Silva"
      />
    );

    expect(screen.getByTestId('voice-room-bar')).toBeInTheDocument();
    expect(screen.getByText('Canal de Audio Clínico WebRTC')).toBeInTheDocument();
    expect(screen.getByText(/Audio desconectado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /conectar canal de voz/i })).toBeInTheDocument();
  });

  it('inicia la captura de audio con cancelación de eco (AEC) y cambia a estado conectado', async () => {
    render(
      <VoiceRoomBar
        roomCode="SALA-CARDIO-101"
        userId="usr_docente_001"
        userName="Dr. Carlos Mendoza"
        isDocente={true}
      />
    );

    const connectBtn = screen.getByRole('button', { name: /conectar canal de voz/i });
    await act(async () => {
      fireEvent.click(connectBtn);
    });

    // Verificación de parámetros médicos en getUserMedia (AEC y 48kHz)
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000
      },
      video: false
    });

    // Debe mostrar controles activos y badge de moderador
    expect(screen.getByText('Docente Moderador')).toBeInTheDocument();
    expect(screen.getByText(/AEC & Opus 48kHz/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /silenciar micrófono/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /desconectar audio/i })).toBeInTheDocument();
    expect(screen.getByTestId('vu-meter')).toBeInTheDocument();
  });

  it('permite silenciar y reactivar el micrófono notificando a la sala por WebSocket', async () => {
    render(
      <VoiceRoomBar
        roomCode="SALA-CARDIO-101"
        userId="usr_alumno_001"
        userName="Dra. María Silva"
      />
    );

    // Conectar audio
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /conectar canal de voz/i }));
    });

    const muteBtn = screen.getByRole('button', { name: /silenciar micrófono/i });

    // Silenciar
    await act(async () => {
      fireEvent.click(muteBtn);
    });

    expect(mockAudioTrack.enabled).toBe(false);
    expect(screen.getByText('Silenciado')).toBeInTheDocument();
    expect(ateneoSocketClient.send).toHaveBeenCalledWith('WEBRTC_SIGNAL', expect.objectContaining({
      sourceUserId: 'usr_alumno_001',
      type: 'mute_state',
      isMuted: true
    }));

    // Reactivar micrófono
    const unmuteBtn = screen.getByRole('button', { name: /activar micrófono/i });
    await act(async () => {
      fireEvent.click(unmuteBtn);
    });

    expect(mockAudioTrack.enabled).toBe(true);
    expect(screen.getByText('Micrófono Activo')).toBeInTheDocument();
    expect(ateneoSocketClient.send).toHaveBeenCalledWith('WEBRTC_SIGNAL', expect.objectContaining({
      isMuted: false
    }));
  });

  it('desconecta el audio y libera todas las pistas del micrófono al pulsar Desconectar', async () => {
    render(
      <VoiceRoomBar
        roomCode="SALA-CARDIO-101"
        userId="usr_alumno_001"
        userName="Dra. María Silva"
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /conectar canal de voz/i }));
    });

    const disconnectBtn = screen.getByRole('button', { name: /desconectar audio/i });
    await act(async () => {
      fireEvent.click(disconnectBtn);
    });

    // Pista de audio debe haberse detenido para liberar hardware
    expect(mockAudioTrack.stop).toHaveBeenCalled();
    expect(screen.getByText(/Audio desconectado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /conectar canal de voz/i })).toBeInTheDocument();
  });

  it('libera automáticamente los recursos al desmontar el componente', async () => {
    const { unmount } = render(
      <VoiceRoomBar
        roomCode="SALA-CARDIO-101"
        userId="usr_alumno_001"
        userName="Dra. María Silva"
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /conectar canal de voz/i }));
    });

    unmount();

    expect(mockAudioTrack.stop).toHaveBeenCalled();
  });
});
