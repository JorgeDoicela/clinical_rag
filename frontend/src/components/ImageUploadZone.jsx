import React, { useRef, useState, useCallback } from 'react';
import { ImagePlus, X, FileImage, AlertTriangle } from 'lucide-react';

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Zona de carga de imagen clínica con drag & drop y preview.
 * Props:
 *   - imagen: File | null — imagen seleccionada actualmente
 *   - onImageChange: (file: File | null) => void — callback al seleccionar/limpiar
 *   - disabled: boolean — deshabilita la interacción durante evaluación
 */
export default function ImageUploadZone({ imagen, onImageChange, disabled = false }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);

  const validateAndSet = useCallback((file) => {
    setError(null);
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Formato no soportado. Usa JPG, PNG, WEBP o GIF.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError(`La imagen supera el límite de ${MAX_SIZE_MB} MB.`);
      return;
    }
    onImageChange(file);
  }, [onImageChange]);

  const handleFileInput = (e) => {
    validateAndSet(e.target.files?.[0] ?? null);
    // Reset para permitir re-seleccionar el mismo archivo
    e.target.value = '';
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    validateAndSet(e.dataTransfer.files?.[0] ?? null);
  }, [disabled, validateAndSet]);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleClear = (e) => {
    e.stopPropagation();
    setError(null);
    onImageChange(null);
  };

  const previewUrl = imagen ? URL.createObjectURL(imagen) : null;

  return (
    <div className="image-upload-wrapper">
      <label className="image-upload-label">
        <span className="block text-sm font-bold text-slate-900 mb-2">
          Imagen Clínica
          <span className="ml-2 text-xs font-normal text-slate-400 uppercase tracking-wide">Opcional</span>
        </span>
      </label>

      {!imagen ? (
        // — Zona de drop vacía —
        <div
          className={`image-drop-zone ${isDragging ? 'image-drop-zone--active' : ''} ${disabled ? 'image-drop-zone--disabled' : ''}`}
          onClick={() => !disabled && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
          aria-label="Zona de carga de imagen clínica"
        >
          <div className="image-drop-icon-wrap">
            <ImagePlus className="image-drop-icon" />
          </div>
          <p className="image-drop-title">
            {isDragging ? 'Suelta la imagen aquí' : 'Arrastra una imagen o haz clic para seleccionar'}
          </p>
          <p className="image-drop-subtitle">
            Hemograma · Radiografía · ECG · Foto de lesión · JPG, PNG, WEBP — máx {MAX_SIZE_MB} MB
          </p>
        </div>
      ) : (
        // — Preview de imagen seleccionada —
        <div className="image-preview-card">
          <img
            src={previewUrl}
            alt="Preview de imagen clínica"
            className="image-preview-thumb"
            onLoad={() => URL.revokeObjectURL(previewUrl)}
          />
          <div className="image-preview-info">
            <FileImage className="image-preview-icon" />
            <div className="image-preview-meta">
              <span className="image-preview-filename">{imagen.name}</span>
              <span className="image-preview-size">
                {(imagen.size / 1024).toFixed(0)} KB · {imagen.type.replace('image/', '').toUpperCase()}
              </span>
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="image-preview-clear"
              aria-label="Quitar imagen"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="image-preview-badge">
            <span>📎 Imagen adjunta — Gemini la analizará junto con tu respuesta</span>
          </div>
        </div>
      )}

      {error && (
        <div className="image-upload-error">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        className="sr-only"
        onChange={handleFileInput}
        disabled={disabled}
        aria-hidden="true"
      />
    </div>
  );
}
