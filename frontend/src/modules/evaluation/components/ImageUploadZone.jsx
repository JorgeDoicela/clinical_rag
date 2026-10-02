import React, { useRef, useState, useCallback } from "react";
import { X, FileImage, Activity, FlaskConical, Camera, Plus } from "lucide-react";

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
                <div className="absolute bottom-1 left-1">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>

                {/* Botón eliminar */}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    aria-label={`Eliminar ${file.name}`}
                    className="absolute top-1 right-1 w-5 h-5 bg-slate-900/70 hover:bg-rose-600 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Zona de Drop & Carga */}
      {canAddMore && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-[18px] p-4 text-center cursor-pointer transition-all duration-200
            ${dragging
              ? "border-[#0b57d0] bg-[#e8f0fe]/50 scale-[0.99]"
              : "border-slate-300 hover:border-[#0b57d0] bg-[#f8fafc] hover:bg-[#e8f0fe]/20"
            }
          `}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={handleInputChange}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center gap-1 text-xs text-[#444746] py-1">
            <span className="font-medium text-[#0b57d0]">Arrastra o selecciona estudios diagnósticos</span>
            <span className="text-[11px] text-[#747775]">ECG, Radiografía, Laboratorio o Fotos Clínicas</span>
          </div>
        </div>
      )}
    </div>
  );
}
