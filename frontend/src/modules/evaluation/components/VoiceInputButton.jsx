import React, { useRef } from "react";
import { Mic, MicOff, Square, Loader2 } from "lucide-react";
import { useVoiceRecognition } from "../hooks/useVoiceRecognition";

export default function VoiceInputButton({
  value = "",
  onChange,
  disabled = false,
  lang = "es-EC",
}) {
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

    baseTextRef.current = (value || "").trim();

    startRecording((fragment) => {
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
              <Mic className="w-3.5 h-3.5 text-[#0b57d0]" />
              <span>Dictar razonamiento</span>
            </>
          )}
        </button>

        {isRecording && (
          <span className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            Escuchando...
          </span>
        )}
      </div>

      {interimText && (
        <div className="text-[11px] text-[#444746] italic bg-[#e8f0fe]/60 border border-blue-200 px-3 py-1 rounded-full animate-fadeIn max-w-xs truncate">
          &ldquo;{interimText}&rdquo;
        </div>
      )}

      {error && (
        <span className="text-[11px] text-amber-700">{error}</span>
      )}
    </div>
  );
}
