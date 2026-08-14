import React, { useState, useEffect } from 'react';
import { X, ExternalLink, FileText, Download, Maximize2, Minimize2, AlertCircle } from 'lucide-react';
import client from '../api/client';

export default function PdfViewerModal({ isOpen, onClose, guiaId, pagina = 1, seccion = "" }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isOpen || !guiaId) return;

    setLoading(true);
    setError(null);

    client.get(`/cases/pdf-location/${encodeURIComponent(guiaId)}`)
      .then(res => {
        const backendBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const fullUrl = `${backendBase}${res.data.pdf_url}#page=${pagina}`;
        setPdfUrl(fullUrl);
        setFilename(res.data.filename);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error resolviendo PDF:", err);
        setError("No se pudo localizar el archivo PDF oficial en el repositorio.");
        setLoading(false);
      });
  }, [isOpen, guiaId, pagina]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className={`bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ${
          isMaximized ? 'w-full h-full max-w-none rounded-none' : 'w-full max-w-5xl h-[85vh]'
        }`}
      >
        {/* Barra Superior del Visor */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-sm font-bold truncate text-slate-100">
                {filename || `GPC Oficial: ${guiaId}`}
              </h3>
              <p className="text-[11px] text-sky-300/80 truncate">
                {seccion ? `Sección: ${seccion} • ` : ''}Página {pagina} (Normativa MSP Ecuador)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                title="Abrir en pestaña nueva"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Restaurar" : "Maximizar"}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              title="Cerrar"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpo del Visor PDF */}
        <div className="flex-1 bg-slate-100 relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90">
              <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs font-semibold text-slate-600">Cargando documento normativo oficial...</p>
            </div>
          )}

          {error && (
            <div className="p-8 text-center flex flex-col items-center justify-center h-full">
              <AlertCircle className="w-10 h-10 text-amber-500 mb-3" />
              <h4 className="font-bold text-slate-900 text-sm mb-1">Documento No Disponible</h4>
              <p className="text-xs text-slate-500 max-w-md mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
              >
                Cerrar Visor
              </button>
            </div>
          )}

          {!loading && !error && pdfUrl && (
            <iframe
              src={pdfUrl}
              title="Visor PDF GPC MSP"
              className="w-full h-full border-0"
            />
          )}
        </div>
      </div>
    </div>
  );
}
