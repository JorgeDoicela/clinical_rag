import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  Award, 
  RefreshCw, 
  User, 
  Target, 
  Stethoscope, 
  Pill, 
  ShieldAlert, 
  Activity, 
  FileText, 
  Download, 
  Loader2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import SkillRadarChart from './SkillRadarChart';
import PdfViewerModal from './PdfViewerModal';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

const EJES_CONFIG = [
  { key: 'diagnóstico', label: 'Diagnóstico', icon: Stethoscope, badge: 'bg-sky-50 text-sky-800 border-sky-200' },
  { key: 'tratamiento', label: 'Tratamiento', icon: Pill, badge: 'bg-rose-50 text-rose-800 border-rose-200' },
  { key: 'prevención', label: 'Prevención', icon: ShieldAlert, badge: 'bg-purple-50 text-purple-800 border-purple-200' },
  { key: 'seguimiento', label: 'Seguimiento', icon: Activity, badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
];

export default function FeedbackCard({ result, studentAnswer, onReset }) {
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const { user } = useAuth();

  if (!result) return null;

  const {
    score,
    score_max = 10,
    aciertos = [],
    omisiones = [],
    competencias_deficientes = [],
    cita_normativa,
    retroalimentacion_general
  } = result;

  const scorePercentage = Math.round((score / score_max) * 100);
  
  let scoreBadgeColor = 'bg-sky-50 text-[#0b57d0] border border-sky-200';
  if (scorePercentage < 60) {
    scoreBadgeColor = 'bg-rose-50 text-rose-700 border border-rose-200';
  } else if (scorePercentage < 80) {
    scoreBadgeColor = 'bg-amber-50 text-amber-700 border border-amber-200';
  } else {
    scoreBadgeColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  }

  // Agrupar competencias deficientes y calcular puntaje/estado por eje clínico
  const competenciasPorEje = EJES_CONFIG.map(ejeConfig => {
    const items = competencias_deficientes.filter(item => {
      if (!item || !item.eje) return false;
      const ejeNormalizado = item.eje.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const keyNormalizada = ejeConfig.key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return ejeNormalizado.includes(keyNormalizada);
    });

    const tieneDeficiencias = items.length > 0;
    let axisScore = 0;
    let estadoLabel = '';
    let estadoBadgeClass = '';

    if (scorePercentage === 0) {
      axisScore = 0;
      if (tieneDeficiencias) {
        estadoLabel = `${items.length} brecha(s)`;
        estadoBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
      } else {
        estadoLabel = 'No Demostrado';
        estadoBadgeClass = 'bg-slate-100 text-[#444746] border-slate-200';
      }
    } else {
      if (tieneDeficiencias) {
        axisScore = Math.max(15, Math.min(scorePercentage, 100 - items.length * 25));
        estadoLabel = `${items.length} brecha(s)`;
        estadoBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
      } else {
        if (scorePercentage >= 80) {
          axisScore = Math.min(100, Math.max(scorePercentage, 92));
          estadoLabel = 'Consolidado';
          estadoBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        } else if (scorePercentage >= 50) {
          axisScore = Math.min(85, Math.max(scorePercentage, 70));
          estadoLabel = 'Competente';
          estadoBadgeClass = 'bg-sky-50 text-[#0b57d0] border-sky-200';
        } else {
          axisScore = scorePercentage;
          estadoLabel = 'No Abordado';
          estadoBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
        }
      }
    }

    return {
      ...ejeConfig,
      items,
      score: axisScore,
      estadoLabel,
      estadoBadgeClass,
      tieneDeficiencias
    };
  });

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const response = await client.post('/evaluate/export-pdf', {
        case_id: result.case_id || 'case_dengue_01',
        case_title: result.case_title || 'Caso Clínico Formativo MSP',
        student_name: user?.nombre || 'Estudiante de Medicina',
        guia_asociada: result.cita_normativa?.guia || 'Norma Oficial MSP Ecuador',
        student_answer: studentAnswer || '',
        eval_result: result
      }, {
        responseType: 'blob'
      });

      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Informe_Clinico_Ateneo_${result.case_id || 'evaluacion'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      alert('Hubo un problema al generar el PDF del informe clínico.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      
      {/* 1. Header de Evaluación con Puntaje y Descarga */}
      <div className="bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#0b57d0] mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Dictamen Formativo Contrastado con MSP</span>
            </div>
            <h2 className="text-2xl font-normal text-[#1f1f1f] font-heading">
              Evaluación Diagnóstica
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-[#1f1f1f] transition-colors cursor-pointer shadow-xs"
            >
              {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0b57d0]" /> : <Download className="w-3.5 h-3.5 text-[#0b57d0]" />}
              <span>{downloadingPdf ? "Generando..." : "Descargar Dictamen"}</span>
            </button>

            <div className={`flex items-baseline gap-1.5 px-4 py-2 rounded-full font-heading font-medium ${scoreBadgeColor}`}>
              <span className="text-2xl font-semibold">{score}</span>
              <span className="text-xs opacity-75">/ {score_max} pts</span>
            </div>
          </div>
        </div>

        <div className="bg-[#f0f4f9] p-5 rounded-[20px] text-sm text-[#1f1f1f] leading-relaxed">
          <p>{retroalimentacion_general}</p>
        </div>
      </div>

      {/* 2. Razonamiento Registrado del Estudiante */}
      {studentAnswer && (
        <div className="bg-white rounded-[28px] p-6 shadow-xs border-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-[#444746]">
              <User className="w-4 h-4 text-[#0b57d0]" />
              <span>Tu Razonamiento Clínico Registrado</span>
            </div>
          </div>
          <div className="bg-[#f0f4f9] p-4 rounded-[16px] text-xs sm:text-sm text-[#1f1f1f] leading-relaxed whitespace-pre-wrap">
            {studentAnswer}
          </div>
        </div>
      )}

      {/* 3. Gráfico Interactivo de Radar de Habilidades (4 Ejes) */}
      <div className="bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0">
        <SkillRadarChart competenciasPorEje={competenciasPorEje} />
      </div>

      {/* 4. Aciertos y Omisiones en Grid de 2 Columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Aciertos Clínicos */}
        <div className="bg-white rounded-[28px] p-6 shadow-xs border-0 space-y-4">
          <div className="flex items-center gap-2 text-emerald-800 font-medium text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <h3 className="font-heading">Aciertos Clínicos ({aciertos.length})</h3>
          </div>
          {aciertos.length === 0 ? (
            <p className="text-xs text-[#747775] italic">No se identificaron aciertos claros según la norma.</p>
          ) : (
            <ul className="space-y-2 text-xs text-[#1f1f1f]">
              {aciertos.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 bg-emerald-50/60 p-3 rounded-[16px] border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0"></span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Omisiones / Brechas Formativas */}
        <div className="bg-white rounded-[28px] p-6 shadow-xs border-0 space-y-4">
          <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <h3 className="font-heading">Omisiones / Aspectos a Mejorar ({omisiones.length})</h3>
          </div>
          {omisiones.length === 0 ? (
            <p className="text-xs text-[#747775] italic">No se detectaron omisiones significativas.</p>
          ) : (
            <ul className="space-y-2 text-xs text-[#1f1f1f]">
              {omisiones.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 bg-amber-50/60 p-3 rounded-[16px] border border-amber-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0"></span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>

      {/* 5. Cita Normativa Oficial MSP */}
      {cita_normativa && (
        <div className="bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-[#1f1f1f] font-medium text-sm font-heading">
              <BookOpen className="w-4 h-4 text-[#0b57d0]" />
              <span>Cita Normativa Oficial (MSP Ecuador)</span>
            </div>

            <button
              onClick={() => setPdfModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-[#0b57d0] rounded-full font-medium text-xs transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ver en Guía Oficial (Pág. {cita_normativa.pagina || 1})</span>
            </button>
          </div>

          <div className="space-y-3 text-xs text-[#444746]">
            <div className="flex flex-wrap gap-2 text-xs text-[#0b57d0] font-mono">
              <span className="bg-sky-50 px-2.5 py-1 rounded-md">Guía: {cita_normativa.guia}</span>
              <span className="bg-sky-50 px-2.5 py-1 rounded-md">Sección: {cita_normativa.seccion}</span>
              {cita_normativa.pagina && (
                <span className="bg-sky-50 px-2.5 py-1 rounded-md">Página: {cita_normativa.pagina}</span>
              )}
            </div>
            <blockquote className="p-4 rounded-[16px] bg-[#f0f4f9] text-[#1f1f1f] font-mono text-xs leading-relaxed">
              "{cita_normativa.texto_relevante}"
            </blockquote>
          </div>
        </div>
      )}

      {/* Modal Visor Interactivo de la Guía Oficial */}
      {cita_normativa && (
        <PdfViewerModal
          isOpen={pdfModalOpen}
          onClose={() => setPdfModalOpen(false)}
          guiaId={cita_normativa.guia}
          pagina={cita_normativa.pagina || 1}
          seccion={cita_normativa.seccion}
        />
      )}

      {/* 6. Acciones Finales */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-[#1f1f1f] text-xs font-medium transition-colors shadow-xs cursor-pointer"
        >
          {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0b57d0]" /> : <Download className="w-3.5 h-3.5 text-[#0b57d0]" />}
          <span>Descargar Dictamen Formativo</span>
        </button>

        {onReset && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:via-blue-700 hover:to-indigo-700 text-white font-medium text-xs rounded-full shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Resolver Otro Caso</span>
          </button>
        )}
      </div>

    </div>
  );
}
