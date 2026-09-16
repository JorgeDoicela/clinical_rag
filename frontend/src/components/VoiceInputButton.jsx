import React, { useRef } from "react";
import { Mic, MicOff, Square, Loader2 } from "lucide-react";
import { useVoiceRecognition } from "../hooks/useVoiceRecognition";

/**
 * VoiceInputButton — Dictado Clínico por Voz
 * Ateneo+ Design System: Clínico Minimalista, Precisión Diagnóstica & IA de Vanguardia
 *
 * Usa el hook useVoiceRecognition que implementa sesiones cortas encadenadas
 * (continuous=false + auto-restart) para eliminar duplicaciones en Android/Brave.
 *
 * Props:
 *   value: string           — texto actual del textarea (componente controlado)
 *   onChange: (s) => void   — setter del textarea
 *   disabled?: boolean
 *   lang?: string           — idioma BCP-47 (default: "es-EC")
 */
export default function VoiceInputButton({
  value = "",
  onChange,
  disabled = false,
  lang = "es-EC",
}) {
  // Snapshot del texto existente al iniciar la grabación.
  // Permite que cada sesión concatene solo lo nuevo al final del texto previo.
  const baseTextRef = useRef("");

  const {
    isRecording,
    interimText,
    startRecording,
    stopRecording,
    error,
    isSupported,
  } = useVoiceRecognition({ lang });

  const handleToggle = () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    // Fijar el snapshot de lo que ya estaba escrito
    baseTextRef.current = (value || "").trim();

    startRecording((fragment) => {
      // Cada fragmento final es texto nuevo (nunca acumulado).
      // Se appenda directamente al snapshot base.
      onChange((prev) => {
        const clean = (prev || "").trim();
        return clean ? `${clean} ${fragment}` : fragment;
      });
    });
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
        {/* Botón principal */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          aria-label={
            isRecording ? "Detener dictado por voz" : "Iniciar dictado por voz"
          }
          className={`
            relative flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-medium
            transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50
            ${
              isRecording
                ? "bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100 shadow-sm shadow-rose-200/60"
                : error
                ? "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
                : "bg-[#f0f4f9] border-slate-200 text-[#444746] hover:bg-white hover:border-slate-300 hover:shadow-sm"
            }
          `}
        >
          {/* Onda pulsante de grabación activa */}
          {isRecording && (
            <span className="absolute inset-0 rounded-full animate-ping bg-rose-400/20 pointer-events-none" />
          )}

          {isRecording ? (
            <>
              <Square className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
              <span>Detener</span>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5" />
              <span>Dictar razonamiento</span>
            </>
          )}
        </button>

        {/* Texto provisional en tiempo real */}
        {isRecording && interimText && (
          <span className="text-xs text-[#747775] italic max-w-[200px] truncate">
            &ldquo;{interimText}&rdquo;
          </span>
        )}
      </div>

      {/* Mensaje de error */}
      {error && (
        <p className="text-xs text-amber-700 flex items-center gap-1">
          <MicOff className="w-3 h-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
