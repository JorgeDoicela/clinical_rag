import { useState, useRef, useCallback, useEffect } from "react";

/**
 * useVoiceRecognition — Hook profesional de reconocimiento de voz
 *
 * Estrategia: sesiones cortas encadenadas (continuous=false + auto-restart).
 * En lugar de usar continuous=true (que causa duplicaciones en Android/Brave
 * porque el motor re-emite toda la lista acumulada en cada evento), este hook
 * simula grabación continua reiniciando automáticamente cada sesión tras el
 * primer resultado final. Es la misma técnica que usan Google Docs y Otter.ai.
 *
 * @param {Object} options
 * @param {string} options.lang - Idioma BCP-47 (default: "es-EC")
 * @returns {{ isRecording, interimText, startRecording, stopRecording, error, isSupported }}
 */
export function useVoiceRecognition({ lang = "es-EC" } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState(null);

  // Referencia para saber si el usuario quiere seguir grabando
  const activeRef = useRef(false);
  const recognitionRef = useRef(null);
  const onFinalRef = useRef(null); // callback(text: string) → fragmento final nuevo
  const timeoutRef = useRef(null);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  /**
   * Crea y arranca una sesión de reconocimiento de voz.
   * Al terminar, si activeRef sigue en true, se reinicia automáticamente.
   */
  const startSession = useCallback(() => {
    if (!isSupported || !activeRef.current) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;     // ← Clave: sesión corta, sin lista acumulada
    recognition.interimResults = true;  // Resultados parciales en tiempo real
    recognition.maxAlternatives = 1;
    recognition.lang = lang;

    recognition.onstart = () => {
      setIsRecording(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      // Con continuous=false el resultado siempre es fresco, sin historia acumulada
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

    recognition.onerror = (event) => {
      if (event.error === "no-speech") {
        // Silencio prolongado → reiniciar sesión si sigue activo
        if (activeRef.current) startSession();
        return;
      }
      if (event.error === "aborted") return; // Parada manual normal

      const errorMessages = {
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
      // Si el usuario sigue activo, encadenar la siguiente sesión inmediatamente
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
      // Si ya había una instancia corriendo, ignorar
    }
  }, [isSupported, lang]);

  const startRecording = useCallback((onFinalCallback) => {
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
  }, [isSupported, startSession]);

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

  // Limpieza al desmontar
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
