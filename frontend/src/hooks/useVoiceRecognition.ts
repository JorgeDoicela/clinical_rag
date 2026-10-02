import { useState, useRef, useCallback, useEffect } from "react";

export interface UseVoiceRecognitionOptions {
  lang?: string;
}

export interface UseVoiceRecognitionReturn {
  isRecording: boolean;
  interimText: string;
  startRecording: (onFinalCallback: (text: string) => void) => void;
  stopRecording: () => void;
  error: string | null;
  isSupported: boolean;
}

// Declaraciones de tipo para Web Speech API en navegadores
interface ISpeechRecognitionEvent extends Event {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface ISpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }
}

/**
 * useVoiceRecognition — Hook profesional de reconocimiento de voz
 *
 * Estrategia: sesiones cortas encadenadas (continuous=false + auto-restart).
 * En lugar de usar continuous=true (que causa duplicaciones en Android/Brave
 * porque el motor re-emite toda la lista acumulada en cada evento), este hook
 * simula grabación continua reiniciando automáticamente cada sesión tras el
 * primer resultado final. Es la misma técnica que usan Google Docs y Otter.ai.
 */
export function useVoiceRecognition({ lang = "es-EC" }: UseVoiceRecognitionOptions = {}): UseVoiceRecognitionReturn {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [interimText, setInterimText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Referencia para saber si el usuario quiere seguir grabando
  const activeRef = useRef<boolean>(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const onFinalRef = useRef<((text: string) => void) | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  /**
   * Crea y arranca una sesión de reconocimiento de voz.
   * Al terminar, si activeRef sigue en true, se reinicia automáticamente.
   */
  const startSession = useCallback(() => {
    if (!isSupported || !activeRef.current) return;

    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = lang;

    recognition.onstart = () => {
      setIsRecording(true);
      setError(null);
    };

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setInterimText(interimTranscript);

      if (finalTranscript.trim() && onFinalRef.current) {
        onFinalRef.current(finalTranscript.trim());
        setInterimText("");
      }
    };

    recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech") {
        if (activeRef.current) startSession();
        return;
      }
      if (event.error === "aborted") return;

      const errorMessages: Record<string, string> = {
        "not-allowed": "Permiso de micrófono denegado. Actívalo en la configuración del navegador.",
        "network": "Sin conexión a internet para el reconocimiento de voz.",
        "audio-capture": "No se detectó micrófono. Verifica que esté conectado.",
        "service-not-allowed": "El servicio de voz no está disponible en este contexto.",
      };
      setError(errorMessages[event.error] || `Error de reconocimiento: ${event.error}`);
      activeRef.current = false;
      setIsRecording(false);
      setInterimText("");
    };

    recognition.onend = () => {
      if (activeRef.current) {
        startSession();
      } else {
        setIsRecording(false);
        setInterimText("");
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      // Ignorar si ya estaba corriendo
    }
  }, [isSupported, lang]);

  const stopRecording = useCallback(() => {
    activeRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignorar si ya estaba detenido
      }
    }
    setIsRecording(false);
    setInterimText("");
  }, []);

  const startRecording = useCallback((onFinalCallback: (text: string) => void) => {
    if (!isSupported) {
      setError("Tu navegador no soporta dictado por voz. Usa Chrome o Edge.");
      return;
    }
    onFinalRef.current = onFinalCallback;
    activeRef.current = true;
    setError(null);
    setInterimText("");
    startSession();

    // Timeout de seguridad: 3 minutos máximo
    timeoutRef.current = setTimeout(() => stopRecording(), 180_000);
  }, [isSupported, startSession, stopRecording]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignorar */ }
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return {
    isRecording,
    interimText,
    startRecording,
    stopRecording,
    error,
    isSupported,
  };
}

export default useVoiceRecognition;
