import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Radio,
  Volume2,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import {
  AteneoWebRtcClient,
  WebRtcConnectionState,
  VoicePeer
} from '../../../core/realtime/webrtcClient';

export interface VoiceRoomBarProps {
  roomCode: string;
  userId: string;
  userName: string;
  isDocente?: boolean;
  className?: string;
}

/**
 * VoiceRoomBar — Barra de Control de Audio y Debriefing Sincrónico WebRTC
 * Proporciona tele-simulación médica con baja latencia (< 150 ms), cancelación
 * de eco acústico (AEC), indicador dinámico de volumen (VU meter) y gestión de micrófono.
 * Estricto cumplimiento del sistema de diseño Ateneo+ (cero emojis).
 */
export const VoiceRoomBar: React.FC<VoiceRoomBarProps> = ({
  roomCode,
  userId,
  userName,
  isDocente = false,
  className = ''
}) => {
  const rtcClientRef = useRef<AteneoWebRtcClient | null>(null);

  const [connectionState, setConnectionState] = useState<WebRtcConnectionState>('IDLE');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [peers, setPeers] = useState<Map<string, VoicePeer>>(new Map());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inicializar o limpiar el cliente WebRTC al desmontar
  useEffect(() => {
    return () => {
      if (rtcClientRef.current) {
        rtcClientRef.current.disconnect();
        rtcClientRef.current = null;
      }
    };
  }, []);

  // Conectar a la sesión de voz
  const handleConnect = useCallback(async () => {
    setErrorMessage(null);

    const client = new AteneoWebRtcClient({
      roomCode,
      userId,
      userName,
      onConnectionStateChange: (state) => {
        setConnectionState(state);
      },
      onAudioLevelChange: (level, speaking) => {
        setAudioLevel(level);
        setIsSpeaking(speaking);
      },
      onPeerUpdated: (peer) => {
        setPeers(prev => {
          const updated = new Map(prev);
          updated.set(peer.userId, peer);
          return updated;
        });
      },
      onError: (err) => {
        setErrorMessage(err.message || 'Error al conectar el canal de audio.');
      }
    });

    rtcClientRef.current = client;
    const stream = await client.startAudio();
    if (stream) {
      setIsMuted(false);
    }
  }, [roomCode, userId, userName]);

  // Desconectar sesión de voz
  const handleDisconnect = useCallback(() => {
    if (rtcClientRef.current) {
      rtcClientRef.current.disconnect();
      rtcClientRef.current = null;
    }
    setConnectionState('IDLE');
    setAudioLevel(0);
    setIsSpeaking(false);
    setPeers(new Map());
  }, []);

  // Conmutar micrófono
  const handleToggleMute = useCallback(() => {
    if (!rtcClientRef.current) return;
    const muted = rtcClientRef.current.toggleMute();
    setIsMuted(muted);
    if (muted) {
      setAudioLevel(0);
      setIsSpeaking(false);
    }
  }, []);

  const isConnected = connectionState === 'CONNECTED';
  const isConnecting = connectionState === 'CONNECTING';

  return (
    <div
      className={`bg-white rounded-[24px] p-4 shadow-xs border border-slate-200/80 transition-all ${className}`}
      data-testid="voice-room-bar"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* 1. Indicador de Estado y Canal de Audio */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${isConnected ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#1f1f1f] font-heading">
                  Canal de Audio Clínico WebRTC
                </span>
                {isDocente && (
                  <span className="text-[10px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                    Docente Moderador
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#747775] flex items-center gap-2">
                <span>
                  {isConnected
                    ? isMuted
                      ? 'Micrófono silenciado'
                      : isSpeaking
                      ? 'Transmitiendo voz...'
                      : `Conectado · ${peers.size > 0 ? `${peers.size} colega(s)` : 'Esperando habla'}`
                    : isConnecting
                    ? 'Estableciendo enlace de baja latencia...'
                    : 'Audio desconectado'}
                </span>
                {isConnected && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    AEC & Opus 48kHz
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. VU Meter Dinámico (Indicador de Nivel de Voz) */}
        {isConnected && (
          <div className="flex items-center gap-2 bg-[#f0f4f9] px-3 py-1.5 rounded-full" data-testid="vu-meter">
            <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'text-[#0b57d0]' : 'text-slate-400'}`} />
            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden flex items-center">
              <div
                className={`h-full transition-all duration-75 rounded-full ${
                  isSpeaking ? 'bg-gradient-to-r from-cyan-500 to-blue-600' : 'bg-slate-300'
                }`}
                style={{ width: `${isMuted ? 0 : audioLevel}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-500 w-8 text-right">
              {isMuted ? 'MUTE' : `${audioLevel}%`}
            </span>
          </div>
        )}

        {/* 3. Botones de Control de Conexión y Micrófono */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              {/* Botón Silenciar / Desilenciar */}
              <button
                type="button"
                onClick={handleToggleMute}
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isMuted
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                }`}
                title={isMuted ? 'Activar Micrófono' : 'Silenciar Micrófono'}
                aria-label={isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isMuted ? 'Silenciado' : 'Micrófono Activo'}</span>
              </button>

              {/* Botón Salir de la Llamada */}
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#f0f4f9] hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Desconectar Audio"
                aria-label="Desconectar audio"
              >
                <PhoneOff className="w-3.5 h-3.5 text-rose-600" />
                <span>Desconectar</span>
              </button>
            </>
          ) : (
            /* Botón Unirse a la Sesión de Voz */
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
              className="py-1.5 px-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 text-white rounded-full text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              aria-label="Conectar canal de voz"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>{isConnecting ? 'Conectando...' : 'Unirse al Debriefing de Voz'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Mensaje de Alerta en caso de error de permisos */}
      {errorMessage && (
        <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-[12px] flex items-center gap-2 text-[11px] text-rose-700">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default VoiceRoomBar;
