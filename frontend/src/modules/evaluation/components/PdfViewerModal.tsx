import { useState, useEffect } from 'react';
import { X, ExternalLink, FileText, Maximize2, Minimize2, AlertCircle, Loader2 } from 'lucide-react';
import httpClient from '../../../core/http/httpClient';

export interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  guiaId?: string;
  pagina?: number;
  seccion?: string;
}

interface PdfLocationResponse {
  pdf_url: string;
  filename: string;
}

export default function PdfViewerModal({
  isOpen,
  onClose,
  guiaId,
  pagina = 1,
  seccion = ""
}: PdfViewerModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !guiaId) return;

    setLoading(true);
    setError(null);

    const base = httpClient.getBaseUrl();
    httpClient.get<PdfLocationResponse>(`/cases/pdf-location/${encodeURIComponent(guiaId)}`)
      .then(res => {
        const fullUrl = `${base}${res.data.pdf_url}#page=${pagina}`;
        setPdfUrl(fullUrl);
        setFilename(res.data.filename);
        setLoading(false);
      })
      .catch((err: unknown) => {
        console.error("Error resolviendo PDF:", err);
        setError("No se pudo localizar el archivo PDF oficial en el repositorio.");
        setLoading(false);
      });
  }, [isOpen, guiaId, pagina]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div 
        className={`bg-white rounded-[28px] shadow-2xl border-0 flex flex-col overflow-hidden transition-all duration-300 ${
          isMaximized ? 'w-full h-full max-w-none rounded-none' : 'w-full max-w-5xl h-[85vh]'
        }`}
      >
        {/* Barra Superior del Visor */}
        <div className="px-6 py-4 bg-white text-[#1f1f1f] flex items-center justify-between border-b border-slate-200/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-sky-50 text-[#0b57d0] rounded-full shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-sm font-medium truncate text-[#1f1f1f] font-heading">
                {filename || `GPC Oficial: ${guiaId}`}
              </h3>
              <p className="text-xs text-[#747775] truncate">
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
                className="p-2 text-[#444746] hover:text-[#1f1f1f] hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Restaurar" : "Maximizar"}
              className="p-2 text-[#444746] hover:text-[#1f1f1f] hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              title="Cerrar"
              className="p-2 text-[#444746] hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cuerpo del Visor PDF */}
        <div className="flex-1 bg-[#f0f4f9] relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90">
              <Loader2 className="w-8 h-8 text-[#0b57d0] animate-spin mb-3" />
              <p className="text-xs font-medium text-[#444746]">Cargando documento normativo oficial...</p>
            </div>
          )}

          {error && (
            <div className="p-8 text-center flex flex-col items-center justify-center h-full">
              <AlertCircle className="w-10 h-10 text-amber-500 mb-3" />
              <h4 className="font-medium text-[#1f1f1f] text-sm mb-1">Documento No Disponible</h4>
              <p className="text-xs text-[#747775] max-w-md mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-5 py-2 bg-[#f0f4f9] hover:bg-slate-200 text-[#1f1f1f] rounded-full text-xs font-medium cursor-pointer"
              >
                Cerrar Visor
              </button>
            </div>
          )}

          {pdfUrl && !loading && (
            <iframe
              src={pdfUrl}
              title="Visor GPC Oficial MSP"
              className="w-full h-full border-0"
            />
          )}
        </div>
      </div>
    </div>
  );
}
