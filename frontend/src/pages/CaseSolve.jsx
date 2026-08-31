import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchCaseById, evaluateResponse, evaluatePhase, API_URL } from '../api/client';
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  BookOpen, 
  AlertCircle, 
  FileImage, 
  Stethoscope, 
  Activity, 
  FileText,
  Clock,
  Sparkles,
  ChevronRight,
  HelpCircle,
  Pill,
  CheckCircle2
} from 'lucide-react';
import FeedbackCard from '../components/FeedbackCard';
import EvaluationGameLoader from '../components/EvaluationGameLoader';
import VoiceInputButton from '../components/VoiceInputButton';
import ImageUploadZone from '../components/ImageUploadZone';
import SimulationStepper from '../components/SimulationStepper';
import PhaseFeedbackCard from '../components/PhaseFeedbackCard';

export default function CaseSolve() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [caso, setCaso] = useState(null);
  const [respuesta, setRespuesta] = useState('');
  const [imagenes, setImagenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);

  // Estados exclusivos para el Modo de Simulación por Fases
  const [currentPhase, setCurrentPhase] = useState(1);
  const [phaseAnswers, setPhaseAnswers] = useState({});
  const [phaseResults, setPhaseResults] = useState({});
  const [phaseScores, setPhaseScores] = useState({});
  const [completedPhases, setCompletedPhases] = useState([]);
  const [currentPhaseResult, setCurrentPhaseResult] = useState(null);
  const [showingPhaseFeedback, setShowingPhaseFeedback] = useState(false);

  useEffect(() => {
    fetchCaseById(id)
      .then(data => {
        setCaso(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const isPhaseMode = !!(caso?.fases && caso.fases.length > 0);
  const activePhaseData = isPhaseMode
    ? caso.fases.find(f => f.fase_numero === currentPhase) || caso.fases[0]
    : null;

  // Envío en Modo Directo (Single-Turn)
  const handleSubmitSingleTurn = async (e) => {
    e.preventDefault();
    if (!respuesta.trim()) return;

    setEvaluating(true);
    setError(null);

    try {
      const res = await evaluateResponse(id, respuesta, imagenes.length > 0 ? imagenes : null);
      setResultado(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setEvaluating(false);
    }
  };

  // Envío en Modo Simulación por Fases (Multi-Phase)
  const handleSubmitPhase = async (e) => {
    e.preventDefault();
    if (!respuesta.trim()) return;

    setEvaluating(true);
    setError(null);

    // Preparar historial previo acumulado de respuestas
    const historialText = Object.entries(phaseAnswers)
      .map(([num, ans]) => `Fase ${num}: ${ans}`)
      .join('\n');

    try {
      const res = await evaluatePhase(
        id,
        currentPhase,
        respuesta,
        historialText,
        imagenes.length > 0 ? imagenes : null
      );

      // Guardar respuesta y resultado de esta fase
      setPhaseAnswers(prev => ({ ...prev, [currentPhase]: respuesta }));
      setPhaseResults(prev => ({ ...prev, [currentPhase]: res }));
      setPhaseScores(prev => ({ ...prev, [currentPhase]: res.score_fase }));
      if (!completedPhases.includes(currentPhase)) {
        setCompletedPhases(prev => [...prev, currentPhase]);
      }

      setCurrentPhaseResult(res);
      setShowingPhaseFeedback(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEvaluating(false);
    }
  };

  // Acción al presionar "Continuar a siguiente fase" o "Ver Dictamen Global"
  const handleProceedNextPhase = () => {
    if (!isPhaseMode) return;

    const totalPhases = caso.fases.length;
    if (currentPhase < totalPhases) {
      setCurrentPhase(prev => prev + 1);
      setRespuesta('');
      setImagenes([]);
      setCurrentPhaseResult(null);
      setShowingPhaseFeedback(false);
    } else {
      // Consolidar resultados de todas las 3 fases en un EvaluationResult maestro
      const allResults = Object.values(phaseResults);
      if (currentPhaseResult && !phaseResults[currentPhase]) {
        allResults.push(currentPhaseResult);
      }

      const avgScore = allResults.length > 0
        ? allResults.reduce((acc, r) => acc + (r.score_fase || 8.0), 0) / allResults.length
        : 8.5;

      const consolidatedAciertos = allResults.flatMap(r => r.aciertos || []);
      const consolidatedOmisiones = allResults.flatMap(r => r.omisiones || []);
      const consolidatedCompetencias = allResults.flatMap(r => r.competencias_deficientes || []);

      const lastCita = currentPhaseResult?.cita_normativa || allResults[0]?.cita_normativa || {
        guia: `GPC ${caso.guia_asociada.toUpperCase()} MSP Ecuador`,
        seccion: "Manejo Clínico Estandarizado",
        pagina: 1,
        texto_relevante: "Normativa oficial de atención clínica del Ministerio de Salud Pública."
      };

      const finalEvalResult = {
        score: parseFloat(avgScore.toFixed(1)),
        score_max: 10,
        aciertos: consolidatedAciertos.length > 0 ? consolidatedAciertos : ["Resolución secuencial completada"],
        omisiones: consolidatedOmisiones,
        competencias_deficientes: consolidatedCompetencias,
        cita_normativa: lastCita,
        retroalimentacion_general: `Simulación clínica en ${totalPhases} fases completada exitosamente. Promedio ponderado de desempeño: ${avgScore.toFixed(1)}/10 frente a la GPC del MSP.`
      };

      const allAnswersText = Object.entries(phaseAnswers)
        .map(([num, ans]) => `[Fase ${num}] ${ans}`)
        .join('\n\n');

      setResultado(finalEvalResult);
      setRespuesta(allAnswersText);
      setShowingPhaseFeedback(false);
    }
  };

  // Acumular texto dictado por voz al razonamiento existente
  const handleVoiceTranscript = (text) => {
    setRespuesta(prev => prev ? prev.trimEnd() + ' ' + text : text);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 text-[#0b57d0] animate-spin" />
        <p className="text-sm font-medium text-[#444746]">Cargando historia clínica y normativa MSP...</p>
      </div>
    );
  }

  if (error && !caso) {
    return (
      <div className="bg-white rounded-[28px] p-8 shadow-xs border-0 max-w-2xl mx-auto text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="text-lg font-medium text-[#1f1f1f]">No se pudo cargar el caso clínico</h3>
        <p className="text-sm text-[#444746]">{error}</p>
        <Link
          to="/"
          className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white rounded-full text-xs font-medium cursor-pointer inline-block"
        >
          Volver al Catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {evaluating && (
        <EvaluationGameLoader
          guiaCodigo={caso?.guia_asociada}
          hasImage={!!caso?.imagen_url || imagenes.length > 0}
        />
      )}

      {/* Barra Superior de Retorno y Metadatos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-[#444746] hover:text-[#1f1f1f] transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-[#0b57d0]" />
          <span>Volver al Catálogo de Casos</span>
        </Link>

        <div className="flex items-center gap-3">
          {isPhaseMode && (
            <span className="px-3 py-1 rounded-full bg-[#c2e7ff] text-[#001d35] text-xs font-semibold">
              Simulación Dinámica por Fases
            </span>
          )}
          <span className="px-3 py-1 rounded-full bg-white text-[#1f1f1f] text-xs font-medium shadow-xs">
            GPC {caso.guia_asociada} (MSP)
          </span>
          <span className="text-xs text-[#747775] capitalize">
            Nivel: {caso.nivel_esperado?.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Stepper de Fases (Visible solo si el caso soporta modo simulación por fases y no ha finalizado) */}
      {isPhaseMode && !resultado && (
        <SimulationStepper
          currentPhase={currentPhase}
          totalPhases={caso.fases.length}
          phaseScores={phaseScores}
          completedPhases={completedPhases}
          onSelectPhase={(phaseNum) => {
            setCurrentPhase(phaseNum);
            setShowingPhaseFeedback(false);
          }}
        />
      )}

      {/* DISPOSICIÓN SPLIT-SCREEN (50% / 50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* =====================================================================
            COLUMNA IZQUIERDA (6 cols): HISTORIA CLÍNICA & ESTUDIOS MULTIMODALES
            ===================================================================== */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 space-y-6">
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#0b57d0] font-medium">
                <Stethoscope className="w-4 h-4" />
                <span>
                  {isPhaseMode
                    ? `Simulador Clínico — ${activePhaseData?.titulo || `Fase ${currentPhase}`}`
                    : "Simulación Clínica Formativa"
                  }
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] leading-snug font-heading">
                {caso.titulo}
              </h1>
            </div>

            {/* Enunciado del Caso Clínico o Contexto Revelado en la Fase */}
            <div className="bg-[#f0f4f9] p-5 sm:p-6 rounded-[20px] text-sm text-[#1f1f1f] leading-relaxed space-y-4">
              <p>{isPhaseMode ? activePhaseData?.descripcion || caso.enunciado : caso.enunciado}</p>

              {/* Datos adicionales revelados en la fase */}
              {isPhaseMode && activePhaseData?.datos_revelados && (
                <div className="p-3.5 rounded-[14px] bg-white border border-slate-200/80 text-xs text-[#1f1f1f] space-y-1 shadow-xs">
                  <span className="font-semibold text-[#0b57d0] block">Datos Clínicos Desbloqueados en este Hito:</span>
                  <p>{activePhaseData.datos_revelados}</p>
                </div>
              )}

              {/* Imagen / Estudio Multimodal Adjunto */}
              {caso.imagen_url && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#1f1f1f] flex items-center gap-1.5">
                      <FileImage className="w-4 h-4 text-[#0b57d0]" />
                      <span>Informe / Imagen Médica de Referencia</span>
                    </span>
                    <span className="text-[11px] text-[#747775]">Soporte Multimodal</span>
                  </div>
                  <div className="rounded-[16px] overflow-hidden bg-white p-2 border border-slate-200/80 shadow-xs">
                    <img
                      src={`${API_URL}${caso.imagen_url}`}
                      alt="Estudio médico"
                      className="w-full h-auto object-contain max-h-80 rounded-[12px] mx-auto"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Pregunta Médica Evaluativa (del caso o de la fase activa) */}
            <div className="p-4 bg-sky-50 rounded-[18px] border border-sky-100 space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-[#0b57d0]">
                <BookOpen className="w-4 h-4" />
                <span>
                  {isPhaseMode
                    ? `Instrucción Específica para Fase ${currentPhase}`
                    : "Instrucción Diagnóstica & Terapéutica"
                  }
                </span>
              </div>
              <p className="text-sm font-medium text-[#1f1f1f] leading-snug">
                {isPhaseMode ? activePhaseData?.pregunta_evaluativa : caso.pregunta}
              </p>
            </div>

          </div>
        </div>

        {/* =====================================================================
            COLUMNA DERECHA (6 cols): ÁREA DE RAZONAMIENTO O FEEDBACK FORMATIVO
            ===================================================================== */}
        <div className="lg:col-span-6">
          {resultado ? (
            /* Dictamen Final Consolidado (Single-Turn o Multi-Fase completado) */
            <FeedbackCard
              result={resultado}
              studentAnswer={respuesta}
              onReset={() => {
                setResultado(null);
                setCurrentPhase(1);
                setPhaseAnswers({});
                setPhaseResults({});
                setPhaseScores({});
                setCompletedPhases([]);
                setShowingPhaseFeedback(false);
                setRespuesta('');
                setImagenes([]);
              }}
            />
          ) : showingPhaseFeedback && currentPhaseResult ? (
            /* Tarjeta de Retroalimentación Intermedia de Fase */
            <PhaseFeedbackCard
              phaseResult={currentPhaseResult}
              currentPhase={currentPhase}
              onProceedNextPhase={handleProceedNextPhase}
              isLastPhase={isPhaseMode && currentPhase === caso.fases.length}
            />
          ) : (
            /* Formulario de Entrada (Directo o Fase Activa) */
            <form
              onSubmit={isPhaseMode ? handleSubmitPhase : handleSubmitSingleTurn}
              className="bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 space-y-6"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <label className="block text-sm font-medium text-[#1f1f1f] pt-1">
                    {isPhaseMode
                      ? `Tu Razonamiento para la Fase ${currentPhase}:`
                      : "Tu Razonamiento Clínico y Conducta Terapéutica"
                    }
                  </label>
                  <VoiceInputButton
                    onTranscript={handleVoiceTranscript}
                    disabled={evaluating}
                  />
                </div>

                <textarea
                  rows={12}
                  value={respuesta}
                  onChange={(e) => setRespuesta(e.target.value)}
                  placeholder={
                    isPhaseMode
                      ? `Escribe o dicta tu análisis específico para este hito clínico (${activePhaseData?.titulo})...`
                      : "Detalla tu diagnóstico de presunción, criterios de severidad según la GPC del MSP y el plan terapéutico inmediato..."
                  }
                  disabled={evaluating}
                  className="w-full bg-[#f0f4f9] hover:bg-white focus:bg-white border border-[#747775] hover:border-[#1f1f1f] focus:border-[#0b57d0] focus:ring-1 focus:ring-[#0b57d0] rounded-[16px] p-4 text-sm text-[#1f1f1f] placeholder:text-[#747775] focus:outline-none transition-all resize-y disabled:opacity-50"
                  required
                />
              </div>

              {error && (
                <div className="p-4 rounded-[16px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Zona de Carga Multi-Estudio Diagnóstico */}
              <div className="border-t border-slate-100 pt-4">
                <ImageUploadZone
                  files={imagenes}
                  onChange={setImagenes}
                  disabled={evaluating}
                />
              </div>

              {/* Botón CTA de Envío */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={evaluating || !respuesta.trim()}
                  className="w-full sm:w-auto py-3 px-8 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:via-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-medium text-sm rounded-full transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  {evaluating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {isPhaseMode
                          ? `Evaluando Fase ${currentPhase} con RAG (MSP)...`
                          : "Evaluando con RAG (MSP)..."
                        }
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {isPhaseMode
                          ? `Evaluar Fase ${currentPhase}`
                          : "Enviar para Evaluación Formativa"
                        }
                      </span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>

      </div>

    </div>
  );
}
