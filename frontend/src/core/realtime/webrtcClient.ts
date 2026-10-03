import { ateneoSocketClient } from './socketClient';

export type WebRtcConnectionState = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'FAILED';

export interface WebRtcSignalingMessage {
  targetUserId?: string;
  sourceUserId: string;
  type: 'offer' | 'answer' | 'candidate' | 'mute_state';
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  isMuted?: boolean;
}

export interface VoicePeer {
  userId: string;
  userName: string;
  isMuted: boolean;
  isSpeaking: boolean;
  audioLevel: number;
}

export interface WebRtcClientConfig {
  roomCode: string;
  userId: string;
  userName: string;
  iceServers?: RTCIceServer[];
  onConnectionStateChange?: (state: WebRtcConnectionState) => void;
  onAudioLevelChange?: (level: number, isSpeaking: boolean) => void;
  onPeerUpdated?: (peer: VoicePeer) => void;
  onError?: (error: Error) => void;
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

/**
 * Cliente WebRTC de Audio Bidireccional de Grado Clínico
 * Diseñado para rondas médicas sincronizadas, tele-debriefing y pases de visita clínica.
 * Proporciona cancelación de eco (AEC), supresión de ruido, VU meter y señalización vía WebSocket.
 */
export class AteneoWebRtcClient {
  private config: WebRtcClientConfig;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private vuAnimationId: number | null = null;

  private connectionState: WebRtcConnectionState = 'IDLE';
  private isMuted: boolean = false;
  private unsubSignalHandler: (() => void) | null = null;

  constructor(config: WebRtcClientConfig) {
    this.config = {
      iceServers: DEFAULT_ICE_SERVERS,
      ...config
    };
  }

  public getConnectionState(): WebRtcConnectionState {
    return this.connectionState;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  private setConnectionState(newState: WebRtcConnectionState) {
    this.connectionState = newState;
    if (this.config.onConnectionStateChange) {
      this.config.onConnectionStateChange(newState);
    }
  }

  /**
   * Inicializa la captura de micrófono de alta fidelidad médica
   * Aplica cancelación de eco acústico (AEC), supresión de ruido y control de ganancia.
   */
  public async startAudio(): Promise<MediaStream | null> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const err = new Error('WebRTC MediaDevices API no disponible en este entorno.');
      if (this.config.onError) this.config.onError(err);
      return null;
    }

    try {
      this.setConnectionState('CONNECTING');

      // 1. Adquisición del stream de audio médico optimizado
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        },
        video: false
      });

      this.localStream = stream;

      // 2. Configurar Analizador de Nivel de Voz (VU Meter)
      this.setupVuMeter(stream);

      // 3. Configurar RTCPeerConnection y agregar pistas de audio
      this.setupPeerConnection();

      // 4. Suscripción a canal de señalización WebSocket
      this.setupSignaling();

      this.setConnectionState('CONNECTED');
      return stream;
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      this.setConnectionState('FAILED');
      if (this.config.onError) this.config.onError(errorObj);
      return null;
    }
  }

  /**
   * Conmuta el estado de silenciamiento del micrófono local
   */
  public toggleMute(): boolean {
    if (!this.localStream) return this.isMuted;

    const audioTracks = this.localStream.getAudioTracks();
    const newMutedState = !this.isMuted;
    
    audioTracks.forEach(track => {
      track.enabled = !newMutedState;
    });

    this.isMuted = newMutedState;

    // Notificar a los pares en la sala a través del canal de sockets
    this.sendSignalingMessage({
      sourceUserId: this.config.userId,
      type: 'mute_state',
      isMuted: newMutedState
    });

    return this.isMuted;
  }

  /**
   * Configura el analizador Web Audio API para medir el nivel de voz en tiempo real
   */
  private setupVuMeter(stream: MediaStream) {
    if (typeof window === 'undefined') return;

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.audioContext = new AudioCtxClass();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.5;
      source.connect(this.analyserNode);

      const bufferLength = this.analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkAudioLevel = () => {
        if (!this.analyserNode || this.isMuted) {
          if (this.config.onAudioLevelChange) {
            this.config.onAudioLevelChange(0, false);
          }
          this.vuAnimationId = requestAnimationFrame(checkAudioLevel);
          return;
        }

        this.analyserNode.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }

        const average = sum / bufferLength;
        const normalizedLevel = Math.min(100, Math.round((average / 128) * 100));
        const isSpeaking = normalizedLevel > 12;

        if (this.config.onAudioLevelChange) {
          this.config.onAudioLevelChange(normalizedLevel, isSpeaking);
        }

        this.vuAnimationId = requestAnimationFrame(checkAudioLevel);
      };

      this.vuAnimationId = requestAnimationFrame(checkAudioLevel);
    } catch {
      // Degradación silenciosa en entornos sin soporte de AudioContext
    }
  }

  /**
   * Inicializa la instancia RTCPeerConnection y asigna handlers de candidatos ICE
   */
  private setupPeerConnection() {
    if (typeof RTCPeerConnection === 'undefined') return;

    this.peerConnection = new RTCPeerConnection({
      iceServers: this.config.iceServers
    });

    // Agregar pistas locales a la conexión
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });
    }

    // Manejador de candidatos ICE descubiertos
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          sourceUserId: this.config.userId,
          type: 'candidate',
          candidate: event.candidate.toJSON()
        });
      }
    };

    // Manejador de estado de conexión
    this.peerConnection.onconnectionstatechange = () => {
      if (!this.peerConnection) return;
      const state = this.peerConnection.connectionState;
      if (state === 'connected') {
        this.setConnectionState('CONNECTED');
      } else if (state === 'disconnected') {
        this.setConnectionState('DISCONNECTED');
      } else if (state === 'failed') {
        this.setConnectionState('FAILED');
      }
    };
  }

  /**
   * Suscribe a los mensajes de señalización provenientes del WebSocket
   */
  private setupSignaling() {
    this.unsubSignalHandler = ateneoSocketClient.on<WebRtcSignalingMessage>(
      'WEBRTC_SIGNAL',
      async (message) => {
        if (!message || message.sourceUserId === this.config.userId) {
          return;
        }
        await this.handleSignalingMessage(message);
      }
    );
  }

  /**
   * Procesa un mensaje de señalización entrante (offer, answer, candidate, mute)
   */
  public async handleSignalingMessage(message: WebRtcSignalingMessage): Promise<void> {
    if (!this.peerConnection) return;

    try {
      if (message.type === 'offer' && message.sdp) {
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription({ type: 'offer', sdp: message.sdp })
        );
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        this.sendSignalingMessage({
          targetUserId: message.sourceUserId,
          sourceUserId: this.config.userId,
          type: 'answer',
          sdp: answer.sdp
        });
      } else if (message.type === 'answer' && message.sdp) {
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription({ type: 'answer', sdp: message.sdp })
        );
      } else if (message.type === 'candidate' && message.candidate) {
        await this.peerConnection.addIceCandidate(
          new RTCIceCandidate(message.candidate)
        );
      } else if (message.type === 'mute_state' && this.config.onPeerUpdated) {
        this.config.onPeerUpdated({
          userId: message.sourceUserId,
          userName: 'Colega en Sala',
          isMuted: !!message.isMuted,
          isSpeaking: false,
          audioLevel: 0
        });
      }
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      if (this.config.onError) this.config.onError(errorObj);
    }
  }

  /**
   * Despacha un mensaje de señalización a través del canal de sockets de Ateneo
   */
  private sendSignalingMessage(signalData: WebRtcSignalingMessage) {
    ateneoSocketClient.send('WEBRTC_SIGNAL', signalData);
  }

  /**
   * Cierra completamente la conexión, libera transceptores, pistas de micrófono y AudioContext
   */
  public disconnect() {
    if (this.vuAnimationId) {
      cancelAnimationFrame(this.vuAnimationId);
      this.vuAnimationId = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        // Ignorar fallo de cierre
      }
      this.audioContext = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.unsubSignalHandler) {
      this.unsubSignalHandler();
      this.unsubSignalHandler = null;
    }

    this.setConnectionState('DISCONNECTED');
  }
}

export default AteneoWebRtcClient;
