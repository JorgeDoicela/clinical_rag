import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Square, Loader2 } from "lucide-react";

/**
 * VoiceInputButton — Dictado Clínico por Voz (Web Speech API)
 * Ateneo+ Design System: Clínico Minimalista, Precisión Diagnóstica & IA de Vanguardia
 *
 * Props:
 *   onTranscript(text: string) — callback con el texto transcrito (acumulado parcial o final)
 *   disabled?: boolean
 */
export default function VoiceInputButton({ onTranscript, disabled = false }) {
  const [status, setStatus] = useState("idle"); // "idle" | "recording" | "processing" | "error"
  const [errorMsg, setErrorMsg] = useState("");
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);
  const statusRef = useRef("idle");

  // Mantener statusRef sincronizado para acceso en closures
  useEffect(() => { statusRef.current = status; }, [status]);

  // Verificar soporte del navegador
  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus("idle");
    setInterimText("");
  }, []);

  const startRecognition = useCallback(() => {
    if (!isSupported) {
      setStatus("error");
      setErrorMsg("Tu navegador no soporta dictado por voz. Usa Chrome o Edge.");
      return;
    }

    setErrorMsg("");
    setInterimText("");

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;      // Continúa grabando sin pausas
    recognition.interimResults = true;  // Resultados parciales en tiempo real
    recognition.maxAlternatives = 1;
    recognition.lang = "es-EC";         // Español ecuatoriano primero

    recognition.onstart = () => {
      setStatus("recording");
      // Timeout de seguridad: 90 segundos máx de grabación continua
      timeoutRef.current = setTimeout(() => stopRecognition(), 90000);
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      setInterimText(interimTranscript);

      // Enviar texto final confirmado al padre para acumularlo en el textarea
      if (finalTranscript.trim()) {
        onTranscript(finalTranscript.trim());
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        // Silencio prolongado o parada manual: limpiar sin error visual
        stopRecognition();
        return;
      }
      const errorMessages = {
        "not-allowed": "Permiso de micrófono denegado. Actívalo en la configuración del navegador.",
        "network": "Sin conexión a internet para el reconocimiento de voz.",
        "audio-capture": "No se detectó micrófono. Verifica que esté conectado.",
        "service-not-allowed": "El servicio de voz no está disponible en este contexto.",
      };
      setErrorMsg(errorMessages[event.error] || `Error de reconocimiento: ${event.error}`);
      setStatus("error");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    recognition.onend = () => {
      // Chrome corta automáticamente tras silencio: resetear estado si aún "recording"
      if (statusRef.current === "recording") {
        setStatus("idle");
        setInterimText("");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, onTranscript, stopRecognition]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleToggle = () => {
    if (status === "recording") {
      stopRecognition();
    } else {
      startRecognition();
    }
  };

  if (!isSupported) {
    return (
      <div className="flex items-center gap-1.5 text-[#747775] text-xs">
        <MicOff className="w-3.5 h-3.5" />
        <span>Dictado no disponible (usa Chrome/Edge)</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex items-center gap-2">
        {/* Botón principal de micrófono */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          aria-label={status === "recording" ? "Detener dictado por voz" : "Iniciar dictado por voz"}
          className={`
            relative flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-medium
            transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50
            ${status === "recording"
              ? "bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100 shadow-sm shadow-rose-200/60"
              : status === "error"
              ? "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
              : "bg-[#f0f4f9] border-slate-200 text-[#444746] hover:bg-white hover:border-slate-300 hover:shadow-sm"
            }
          `}
        >
          {/* Onda pulsante de grabación activa */}
          {status === "recording" && (
            <span className="absolute inset-0 rounded-full animate-ping bg-rose-400/20 pointer-events-none" />
          )}

          {status === "recording" ? (
            <>
              <Square className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
              <span>Detener</span>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            </>
          ) : status === "processing" ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0b57d0]" />
              <span>Procesando...</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5" />
              <span>Dictar razonamiento</span>
            </>
          )}
        </button>

        {/* Texto provisional (interim) en tiempo real */}
        {status === "recording" && interimText && (
          <span className="text-xs text-[#747775] italic max-w-[200px] truncate">
            &ldquo;{interimText}&rdquo;
          </span>
        )}
      </div>

      {/* Mensaje de error descriptivo */}
      {status === "error" && errorMsg && (
        <p className="text-xs text-amber-700 flex items-center gap-1">
          <MicOff className="w-3 h-3 shrink-0" />
          {errorMsg}
        </p>
      )}
    </div>
  );
}
