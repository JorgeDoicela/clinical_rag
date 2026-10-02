import React from 'react';

interface StreamingMarkdownViewerProps {
  content: string;
  isStreaming?: boolean;
}

/**
 * Visor declarativo de texto clínico y markdown fluido para respuestas en streaming.
 * Cumple la directriz innegociable de cero emojis y sobriedad institucional.
 */
export const StreamingMarkdownViewer: React.FC<StreamingMarkdownViewerProps> = ({
  content,
  isStreaming = false,
}) => {
  if (!content && !isStreaming) {
    return null;
  }

  // Segmentar el texto por párrafos simples para preservar estructura médica
  const paragraphs = content.split('\n\n').filter((p) => p.trim().length > 0);

  return (
    <div className="text-slate-800 text-sm leading-relaxed space-y-3 font-normal">
      {paragraphs.map((para, index) => {
        // Soporte para listas con viñetas normativas (-)
        if (para.startsWith('- ') || para.startsWith('* ')) {
          const listItems = para.split('\n').filter((item) => item.trim().length > 0);
          return (
            <ul key={index} className="list-disc pl-5 space-y-1 text-slate-700">
              {listItems.map((li, liIdx) => (
                <li key={liIdx}>
                  {li.replace(/^[-*]\s+/, '')}
                </li>
              ))}
            </ul>
          );
        }

        // Formato para preguntas socráticas destacadas (terminan en ?)
        const isQuestion = para.trim().endsWith('?');

        return (
          <p
            key={index}
            className={
              isQuestion
                ? 'p-3 bg-cyan-50/60 rounded-xl border-l-2 border-cyan-500 text-cyan-950 font-medium'
                : 'text-slate-800'
            }
          >
            {para}
          </p>
        );
      })}

      {isStreaming && (
        <span
          data-testid="streaming-cursor"
          className="inline-block w-2 h-4 ml-1 bg-cyan-600 animate-pulse align-middle"
          aria-label="Generando respuesta..."
        />
      )}
    </div>
  );
};

export default StreamingMarkdownViewer;
