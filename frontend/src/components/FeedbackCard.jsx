import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, BookOpen, Award, RefreshCw, User, FileImage, Target, Stethoscope, Pill, ShieldAlert, Activity, FileText, Download, Loader2 } from 'lucide-react';
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

export default function FeedbackCard({ result, studentAnswer, studentImage, onReset }) {
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
  
  let scoreBadgeColor = 'bg-sky-100 text-sky-800 border-sky-200';
  if (scorePercentage < 60) {
    scoreBadgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
  } else if (scorePercentage < 80) {
    scoreBadgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
  } else {
    scoreBadgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
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
        estadoBadgeClass = 'bg-rose-100 text-rose-800 border-rose-200';
      } else {
        estadoLabel = 'No Demostrado';
        estadoBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
      }
    } else {
      if (tieneDeficiencias) {
        axisScore = Math.max(15, Math.min(scorePercentage, 100 - items.length * 25));
        estadoLabel = `${items.length} brecha(s)`;
        estadoBadgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
      } else {
        if (scorePercentage >= 80) {
          axisScore = Math.min(100, Math.max(scorePercentage, 92));
          estadoLabel = 'Consolidado';
          estadoBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
        } else if (scorePercentage >= 50) {
          axisScore = Math.min(85, Math.max(scorePercentage, 70));
          estadoLabel = 'Competente';
          estadoBadgeClass = 'bg-sky-100 text-sky-800 border-sky-200';
        } else {
          axisScore = scorePercentage;
          estadoLabel = 'No Abordado';
          estadoBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
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
        case_id: result.case_id || 'caso_evaluacion',
        case_title: result.case_title || 'Evaluación de Razonamiento Clínico',
        student_name: user?.nombre || 'Estudiante de Ciencias de la Salud',
        guia_asociada: result.cita_normativa?.guia || 'Norma Oficial MSP',
        student_answer: studentAnswer || '',
        eval_result: result
      }, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Informe_Clinico_Ateneo_${result.case_id || 'evaluacion'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error al exportar PDF:", err);
      alert("Hubo un problema al generar el PDF del informe clínico.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Razonamiento Registrado del Estudiante */}
      {studentAnswer && (
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <User className="w-4 h-4 text-sky-600 shrink-0" />
              <span>Tu Razonamiento Clínico Registrado</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 font-semibold uppercase bg-slate-200/60 px-2 py-0.5 rounded-md">
              Respuesta del Alumno
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 text-xs sm:text-sm text-slate-800 leading-relaxed font-normal whitespace-pre-wrap">
            {studentAnswer}
          </div>
          {studentImage && (
            <div className="flex items-center gap-2 text-xs text-slate-600 pt-1 font-medium">
              <FileImage className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>Adjunto multimodal: {studentImage.name || 'Imagen cargada'}</span>
            </div>
          )}
        </div>
      )}

      {/* Header con Score y Botón de Descarga de PDF */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-700 mb-1">
              <Award className="w-4 h-4 text-sky-600" />
              <span>Resultado de Evaluación Formativa RAG</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Retroalimentación Médica
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors"
            >
              {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin text-sky-400" /> : <Download className="w-4 h-4 text-sky-400" />}
              <span>{downloadingPdf ? "Generando..." : "Descargar PDF"}</span>
            </button>

            <div className={`flex items-baseline gap-2 px-5 py-2.5 rounded-xl border ${scoreBadgeColor}`}>
              <span className="text-3xl font-extrabold">{score}</span>
              <span className="text-xs font-bold opacity-80">/ {score_max} pts</span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-slate-700 leading-relaxed text-xs sm:text-sm border-t border-slate-100 pt-4 font-normal">
          {retroalimentacion_general}
        </p>
      </div>

      {/* Gráfico Interactivo de Radar de Habilidades (4 Ejes) */}
      <SkillRadarChart competenciasPorEje={competenciasPorEje} />

      {/* Mapa de Competencias por GPC (Ejes Clínicos) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-sky-600 shrink-0" />
            <h3 className="text-base font-bold text-slate-900">Mapa de Competencias por GPC (Ejes Clínicos)</h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200">
            Analítica de Desempeño
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-1">
          {competenciasPorEje.map(eje => {
            const Icon = eje.icon;

            return (
              <div
                key={eje.key}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between min-w-0 overflow-hidden ${
                  eje.tieneDeficiencias
                    ? 'bg-slate-50/80 border-slate-200/90'
                    : scorePercentage < 50
                    ? 'bg-slate-50/50 border-slate-200/70'
                    : 'bg-emerald-50/30 border-emerald-200/60'
                }`}
              >
                <div className="space-y-3 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-200/50 pb-2 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 shrink">
                      <Icon className="w-4 h-4 text-slate-700 shrink-0" />
                      <span className="font-bold text-xs text-slate-900 truncate">{eje.label}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 whitespace-nowrap ${eje.estadoBadgeClass}`}>
                      {eje.estadoLabel}
                    </span>
                  </div>

                  {eje.tieneDeficiencias ? (
                    <ul className="space-y-2 text-[11px] text-slate-700 min-w-0">
                      {eje.items.map((item, idx) => (
                        <li key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200/70 shadow-2xs leading-snug font-medium flex items-start gap-1.5 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                          <span className="min-w-0 break-words">{item.descripcion}</span>
                        </li>
                      ))}
                    </ul>
                  ) : scorePercentage < 50 ? (
                    <p className="text-[11px] text-slate-600 font-medium bg-white/70 p-2.5 rounded-lg border border-slate-200/50 min-w-0 break-words">
                      No se aportó evidencia o razonamiento clínico suficiente en este eje para su evaluación.
                    </p>
                  ) : (
                    <p className="text-[11px] text-emerald-800 font-medium bg-white/70 p-2.5 rounded-lg border border-emerald-200/50 min-w-0 break-words">
                      Demuestra dominio alineado a la GPC oficial en este eje.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Aciertos u Omisiones en Grid 2 Columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Aciertos (Verde = Bien) */}
        <div className="bg-emerald-50/40 rounded-2xl p-6 border border-emerald-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <h3>Aciertos Clínicos ({aciertos.length})</h3>
          </div>
          {aciertos.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No se identificaron aciertos claros en la norma.</p>
          ) : (
            <ul className="space-y-2.5 text-xs text-emerald-950">
              {aciertos.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-emerald-200/80 shadow-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Omisiones (Ámbar = Atención / Mejorar) */}
        <div className="bg-amber-50/40 rounded-2xl p-6 border border-amber-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <h3>Omisiones / Aspectos a Mejorar ({omisiones.length})</h3>
          </div>
          {omisiones.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No se detectaron omisiones significativas.</p>
          ) : (
            <ul className="space-y-2.5 text-xs text-amber-950">
              {omisiones.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-amber-200/80 shadow-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Cita Normativa GPC con Botón para Abrir Visor Oficial */}
      {cita_normativa && (
        <div className="bg-sky-50/40 rounded-2xl p-6 border border-sky-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <BookOpen className="w-5 h-5 text-sky-600 shrink-0" />
              <h3>Cita Normativa Oficial (MSP Ecuador)</h3>
            </div>

            <button
              onClick={() => setPdfModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Ver en Guía Oficial (Pág. {cita_normativa.pagina || 1})</span>
            </button>
          </div>

          <div className="space-y-3 text-xs text-slate-700">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-sky-900 font-semibold bg-sky-100/60 p-2.5 rounded-xl border border-sky-200/60">
              <span><strong>Guía:</strong> {cita_normativa.guia}</span>
              <span>-</span>
              <span><strong>Sección:</strong> {cita_normativa.seccion}</span>
              {cita_normativa.pagina && (
                <>
                  <span>-</span>
                  <span><strong>Página:</strong> {cita_normativa.pagina}</span>
                </>
              )}
            </div>
            <blockquote className="p-4 rounded-xl bg-white border border-sky-200/80 text-sky-950 italic font-mono text-xs leading-relaxed shadow-xs">
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

      {/* Acciones Finales */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs transition-colors shadow-xs"
        >
          {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin text-sky-600" /> : <Download className="w-4 h-4 text-sky-600" />}
          <span>Descargar Dictamen en PDF Institucional</span>
        </button>

        {onReset && (
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Intentar Nuevamente</span>
          </button>
        )}
      </div>
    </div>
  );
}
