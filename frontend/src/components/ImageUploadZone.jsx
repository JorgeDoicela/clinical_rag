import React, { useRef, useState, useCallback } from "react";
import { Upload, X, FileImage, Activity, FlaskConical, Camera, Plus } from "lucide-react";

/**
 * ImageUploadZone — Zona de Carga Multi-Archivo para Estudios Diagnósticos
 * Ateneo+ Design System: Drag & Drop, galería de miniaturas con badges de tipo.
 *
 * Props:
 *   files: File[]            — Lista actual de archivos
 *   onChange(files: File[])  — Callback cuando cambia la lista
 *   disabled?: boolean
 *   maxFiles?: number        — Máximo de estudios permitidos (default: 5)
 */
const STUDY_TYPE_CONFIG = {
  ecg: { label: "ECG", icon: Activity, color: "bg-rose-50 text-rose-700 border-rose-200" },
  rx: { label: "Rx", icon: FileImage, color: "bg-sky-50 text-sky-700 border-sky-200" },
  lab: { label: "Lab", icon: FlaskConical, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  foto: { label: "Foto", icon: Camera, color: "bg-amber-50 text-amber-700 border-amber-200" },
};

function detectStudyType(file) {
  const name = file.name.toLowerCase();
  if (name.includes("ecg") || name.includes("ekg") || name.includes("electrocard")) return "ecg";
  if (name.includes("rx") || name.includes("radio") || name.includes("tora") || name.includes("chest") || name.includes("xray")) return "rx";
  if (name.includes("lab") || name.includes("hemo") || name.includes("gaso") || name.includes("examen")) return "lab";
  return "foto";
}

export default function ImageUploadZone({ files = [], onChange, disabled = false, maxFiles = 5 }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback((newFiles) => {
    const validFiles = Array.from(newFiles).filter(
      (f) => f.type.startsWith("image/") || f.type === "application/pdf"
    );
    const combined = [...files, ...validFiles].slice(0, maxFiles);
    onChange(combined);
  }, [files, maxFiles, onChange]);

  const removeFile = useCallback((index) => {
    const updated = files.filter((_, i) => i !== index);
    onChange(updated);
  }, [files, onChange]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    addFiles(e.dataTransfer.files);
  }, [addFiles, disabled]);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const handleInputChange = (e) => {
    addFiles(e.target.files);
    // Reset input para permitir volver a seleccionar el mismo archivo
    e.target.value = "";
  };

  const canAddMore = files.length < maxFiles && !disabled;

  return (
    <div className="space-y-3">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#1f1f1f] flex items-center gap-1.5">
          <FileImage className="w-3.5 h-3.5 text-[#0b57d0]" />
          Estudios Diagnósticos Adjuntos
        </span>
        <span className="text-[11px] text-[#747775]">
          {files.length === 0 ? "Opcional" : `${files.length}/${maxFiles} estudio${files.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Galería de archivos adjuntos */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {files.map((file, idx) => {
            const type = detectStudyType(file);
            const cfg = STUDY_TYPE_CONFIG[type];
            const IconComp = cfg.icon;
            const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;

            return (
              <div
                key={`${file.name}-${idx}`}
                className="relative group rounded-[14px] overflow-hidden border border-slate-200/80 bg-[#f0f4f9] aspect-square"
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-2">
                    <IconComp className="w-6 h-6 text-[#0b57d0]" />
                    <span className="text-[10px] text-[#444746] text-center truncate w-full px-1">{file.name}</span>
                  </div>
                )}

                {/* Badge de tipo de estudio */}
                <span className={`absolute top-1.5 left-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${cfg.color}`}>
                  {cfg.label}
                </span>

                {/* Botón de eliminar */}
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  disabled={disabled}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50 hover:border-rose-300 cursor-pointer"
                  aria-label={`Eliminar ${file.name}`}
                >
                  <X className="w-2.5 h-2.5 text-[#444746] hover:text-rose-600" />
                </button>
              </div>
            );
          })}

          {/* Celda de añadir más */}
          {canAddMore && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-[14px] border-2 border-dashed border-slate-200 hover:border-[#0b57d0] hover:bg-[#e8f0fe] transition-colors flex flex-col items-center justify-center gap-1.5 text-[#747775] hover:text-[#0b57d0] cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span className="text-[10px] font-medium">Añadir</span>
            </button>
          )}
        </div>
      )}

      {/* Zona de drop (visible cuando no hay archivos o hay espacio) */}
      {files.length === 0 && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => canAddMore && inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-[16px] p-5 text-center transition-all cursor-pointer
            ${dragging
              ? "border-[#0b57d0] bg-[#e8f0fe]"
              : disabled
              ? "border-slate-200 bg-[#f0f4f9] cursor-not-allowed opacity-50"
              : "border-slate-200 hover:border-[#0b57d0] hover:bg-[#eef3fc] bg-[#f8fafc]"
            }
          `}
        >
          <Upload className={`w-5 h-5 mx-auto mb-2 ${dragging ? "text-[#0b57d0]" : "text-[#747775]"}`} />
          <p className="text-xs text-[#444746]">
            Arrastra o selecciona estudios
          </p>
          <p className="text-[11px] text-[#747775] mt-1">
            ECG, Radiografía, Laboratorio, Foto clínica
          </p>
        </div>
      )}

      {/* Input oculto */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf"
        onChange={handleInputChange}
        disabled={disabled}
        className="hidden"
        aria-label="Seleccionar estudios diagnósticos"
      />
    </div>
  );
}
