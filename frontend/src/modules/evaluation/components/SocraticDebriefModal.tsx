import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { useSocraticDebriefStore } from '../store/useSocraticDebriefStore';
import { StreamingMarkdownViewer } from './StreamingMarkdownViewer';

export const SocraticDebriefModal: React.FC = () => {
  const {
    isOpen,
    caseTitle,
    omisionActiva,
    historial,
    currentStreamText,
    isStreaming,
    error,
    closeDebrief,
    sendReplica,
    resetDialog,
  } = useSocraticDebriefStore();

  const [inputReplica, setInputReplica] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [historial, currentStreamText]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputReplica.trim() || isStreaming) return;
    const textToSend = inputReplica;
    setInputReplica('');
    await sendReplica(textToSend);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="socratic-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div className="bg-white w-full max-w-2xl rounded-[28px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Cabecera Institucional */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-6 h-6 text-cyan-600 shrink-0" />
            <div>
              <h2 id="socratic-title" className="text-lg font-semibold text-slate-900 tracking-tight">
                Debriefing Socrático Guiado
              </h2>
              <p className="text-xs text-slate-500 font-medium truncate max-w-md">
                {caseTitle || 'Simulación Clínica Formativa'}
              </p>
            </div>
          </div>
          <button
            onClick={closeDebrief}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full transition-colors"
            aria-label="Cerrar debriefing socrático"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner de Omisión Clínica a Tratar */}
        <div className="px-6 py-3 bg-amber-50/70 border-b border-amber-100 flex items-start space-x-3">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-semibold text-amber-950">Omisión o aspecto normativo en discusión:</span>{' '}
            {omisionActiva}
          </div>
        </div>

        {/* Área de Conversación Multiturno */}
        <div
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50"
        >
          {historial.length === 0 && !isStreaming && (
            <div className="text-center py-8 text-slate-500 text-sm">
              <p className="font-medium text-slate-700">Inicia el debate socrático con el tutor IA.</p>
              <p className="text-xs mt-1 text-slate-500 max-w-md mx-auto">
                Explica tu razonamiento fisiopatológico o por qué omitiste este punto según la Guía de Práctica Clínica del MSP.
              </p>
            </div>
          )}

          {historial.map((turn, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                turn.role === 'estudiante' ? 'items-end' : 'items-start'
              }`}
            >
              <div className="text-[11px] font-medium text-slate-600 mb-1 px-1">
                {turn.role === 'estudiante' ? 'Tu Razonamiento' : 'Tutor Clínico Ateneo+'}
              </div>
              <div
                className={`max-w-[88%] rounded-2xl p-4 text-sm leading-relaxed ${
                  turn.role === 'estudiante'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-sm shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                }`}
              >
                {turn.role === 'estudiante' ? (
                  <p>{turn.text}</p>
                ) : (
                  <StreamingMarkdownViewer content={turn.text} isStreaming={false} />
                )}

                {turn.cita_normativa && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center space-x-1.5 text-xs text-cyan-700">
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      GPC MSP Ecuador ({turn.cita_normativa.guia}, Pág. {turn.cita_normativa.pagina})
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Turno en Streaming Activo */}
          {isStreaming && (
            <div className="flex flex-col items-start">
              <div className="text-[11px] font-medium text-slate-600 mb-1 px-1">
                Tutor Clínico Ateneo+ (Respondiendo en tiempo real...)
              </div>
              <div className="max-w-[88%] rounded-2xl p-4 text-sm leading-relaxed bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm">
                <StreamingMarkdownViewer content={currentStreamText} isStreaming={true} />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={resetDialog}
                className="text-rose-700 font-medium hover:underline flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reiniciar</span>
              </button>
            </div>
          )}
        </div>

        {/* Formulario de Entrada */}
        <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-slate-100 flex items-center space-x-3">
          <input
            type="text"
            value={inputReplica}
            onChange={(e) => setInputReplica(e.target.value)}
            disabled={isStreaming}
            placeholder="Escribe tu justificación clínica o responde a la pregunta socrática..."
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!inputReplica.trim() || isStreaming}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            aria-label="Enviar respuesta socrática"
          >
            <span>Responder</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default SocraticDebriefModal;
