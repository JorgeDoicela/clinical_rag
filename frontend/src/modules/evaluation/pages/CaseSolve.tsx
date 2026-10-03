import { lazy, Suspense, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Send, 
  AlertCircle, 
  FileImage, 
  Stethoscope, 
  Activity, 
  Sparkles,
  HelpCircle,
  Layers
} from 'lucide-react';
import useCaseSolver from '../hooks/useCaseSolver';
import FeedbackCard from '../components/FeedbackCard';
import EvaluationGameLoader from '../components/EvaluationGameLoader';
import VoiceInputButton from '../components/VoiceInputButton';
import ImageUploadZone from '../components/ImageUploadZone';
import SimulationStepper from '../components/SimulationStepper';
import PhaseFeedbackCard from '../components/PhaseFeedbackCard';
import SocraticDebriefModal from '../components/SocraticDebriefModal';
import ClinicalStudyViewer from '../components/ClinicalStudyViewer';
import ClinicalButton from '../../../core/ui/ClinicalButton';

const DicomStudyViewer = lazy(() => import('../components/DicomStudyViewer'));

export default function CaseSolve() {
  const { id } = useParams<{ id: string }>();

  const {
    caso,
    loading,
    error,
    respuesta,
    setRespuesta,
    imagenes,
    setImagenes,
    evaluating,
    resultado,
    isPhaseMode,
    currentPhase,
    setCurrentPhase,
    totalPhases,
    activePhaseData,
    phaseScores,
    completedPhases,
    currentPhaseResult,
    showingPhaseFeedback,
    submitSingleTurn,
    submitPhase,
    proceedToNextPhase,
    resetCase,
  } = useCaseSolver(id);

  const [studyViewerTab, setStudyViewerTab] = useState<'standard' | 'dicom'>('standard');

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Activity className="w-10 h-10 text-[#0b57d0] animate-spin" />
        <p className="text-sm font-medium text-[#444746]">
          Cargando entorno de simulación clínica...
        </p>
      </div>
    );
  }

  if (error && !caso) {
    return (
      <div className="bg-white rounded-[28px] p-8 max-w-lg mx-auto text-center space-y-4 shadow-xs">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
        <h2 className="text-xl font-normal text-[#1f1f1f] font-heading">
          Caso No Disponible
        </h2>
        <p className="text-xs text-[#747775]">{error}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#f0f4f9] hover:bg-slate-200 text-[#1f1f1f] rounded-full text-xs font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      
      {/* 1. Header de Simulación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-full hover:bg-slate-100 text-[#444746] transition-colors"
            title="Volver al catálogo"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#0b57d0]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Entorno de Simulación Médica • Ateneo+</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-normal text-[#1f1f1f] font-heading tracking-tight">
              {caso?.titulo}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-medium bg-sky-50 text-[#0b57d0] px-3 py-1 rounded-full border border-sky-200/80">
            {caso?.guia_asociada || 'GPC MSP'}
          </span>
          <span className="text-xs text-[#747775] bg-[#f0f4f9] px-3 py-1 rounded-full">
            Dificultad: {caso?.dificultad || 'Intermedia'}
          </span>
        </div>
      </div>

      {/* 2. Barra de Progreso Secuencial por Fases */}
      {isPhaseMode && !resultado && (
        <SimulationStepper
          currentPhase={currentPhase}
          totalPhases={totalPhases}
          phaseScores={phaseScores}
          completedPhases={completedPhases}
          onSelectPhase={(f) => setCurrentPhase(f)}
        />
      )}

      {/* 3. Modal de Feedback Inmediato por Fase */}
      {showingPhaseFeedback && currentPhaseResult && (
        <PhaseFeedbackCard
          phaseResult={currentPhaseResult}
          currentPhase={currentPhase}
          onProceedNextPhase={proceedToNextPhase}
          isLastPhase={currentPhase >= totalPhases}
        />
      )}

      {/* 4. Dictamen Formativo Global (cuando finaliza la simulación) */}
      {resultado && (
        <FeedbackCard
          result={resultado}
          studentAnswer={respuesta}
          onReset={resetCase}
        />
      )}

      {/* 5. Área de Trabajo Split-Screen (50% Caso / 50% Resolución) */}
      {!resultado && !showingPhaseFeedback && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Panel Izquierdo: Enunciado Clínico y Hallazgos */}
          <div className="lg:col-span-6 bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-[#444746]">
                <Stethoscope className="w-4 h-4 text-[#0b57d0]" />
                <span>Presentación del Cuadro Clínico</span>
              </div>
              <h2 className="text-lg font-normal text-[#1f1f1f] font-heading leading-snug">
                {isPhaseMode && activePhaseData
                  ? activePhaseData.titulo_fase
                  : caso?.titulo}
              </h2>
            </div>

            <div className="p-4 bg-[#f0f4f9] rounded-[20px] text-xs sm:text-sm text-[#1f1f1f] leading-relaxed whitespace-pre-wrap">
              {isPhaseMode && activePhaseData
                ? activePhaseData.escenario_clinico
                : caso?.enunciado}
            </div>

            {/* Visor Diagnóstico de Estudio Paraclínico Acelerado (Estándar 2D y DICOM Multicorte) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <div className="flex items-center gap-4">
                  {caso?.imagen_url && (
                    <button
                      type="button"
                      onClick={() => setStudyViewerTab('standard')}
                      className={`text-xs pb-1.5 font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
                        studyViewerTab === 'standard'
                          ? 'border-blue-600 text-blue-700 font-semibold -mb-[2px]'
                          : 'border-transparent text-[#747775] hover:text-[#1f1f1f]'
                      }`}
                    >
                      <FileImage className="w-3.5 h-3.5" />
                      <span>Imagen 2D</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setStudyViewerTab('dicom')}
                    className={`text-xs pb-1.5 font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
                      studyViewerTab === 'dicom'
                        ? 'border-cyan-600 text-cyan-700 font-semibold -mb-[2px]'
                        : 'border-transparent text-[#747775] hover:text-[#1f1f1f]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Tomografía Volumétrica DICOM</span>
                  </button>
                </div>

                <span className="text-[11px] text-[#747775]">
                  {studyViewerTab === 'dicom' ? 'PACS WADO-RS' : 'Resolución Acelerada'}
                </span>
              </div>

              {studyViewerTab === 'dicom' ? (
                <Suspense
                  fallback={
                    <div className="min-h-[460px] bg-[#090d16] rounded-[24px] flex flex-col items-center justify-center space-y-3 text-slate-400 border border-slate-800">
                      <Activity className="w-7 h-7 text-cyan-400 animate-spin" />
                      <span className="text-xs font-medium">Inicializando visor tomográfico DICOM...</span>
                    </div>
                  }
                >
                  <DicomStudyViewer
                    study={isPhaseMode && activePhaseData?.dicom_study ? activePhaseData.dicom_study : caso?.dicom_study}
                  />
                </Suspense>
              ) : (
                caso?.imagen_url && (
                  <ClinicalStudyViewer
                    imageUrl={caso.imagen_url}
                    title={caso.titulo || 'Estudio Clínico'}
                    studyType={caso.id?.toLowerCase().includes('ecg') ? 'ecg' : 'general'}
                  />
                )
              )}
            </div>

            {/* Pregunta Orientadora */}
            <div className="p-4 bg-sky-50/60 rounded-[20px] border border-sky-100 space-y-1">
              <span className="text-xs font-semibold text-[#0b57d0] flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                Interrogante Formativa
              </span>
              <p className="text-xs sm:text-sm text-[#1f1f1f] leading-relaxed font-medium">
                {isPhaseMode && activePhaseData
                  ? activePhaseData.pregunta_orientadora
                  : caso?.pregunta || 'Plantee su juicio diagnóstico, exámenes prioritarios y esquema terapéutico de acuerdo a la GPC oficial del MSP.'}
              </p>
            </div>
          </div>

          {/* Panel Derecho: Área de Resolución Diagnóstica */}
          <div className="lg:col-span-6 bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="space-y-0.5">
                <h3 className="text-base font-normal text-[#1f1f1f] font-heading">
                  Tu Resolución Clínica
                </h3>
                <p className="text-xs text-[#747775]">
                  Escribe o dicta tu análisis estructurado según la metodología SOAP
                </p>
              </div>

              <VoiceInputButton
                value={respuesta}
                onChange={setRespuesta}
                disabled={evaluating}
              />
            </div>

            <form
              onSubmit={isPhaseMode ? submitPhase : submitSingleTurn}
              className="space-y-6"
            >
              <div>
                <textarea
                  id="clinical-answer-input"
                  rows={8}
                  value={respuesta}
                  onChange={(e) => setRespuesta(e.target.value)}
                  disabled={evaluating}
                  placeholder="Detalla tu impresión diagnóstica, paraclínicos solicitados, hidratación, dosificación y criterios de seguimiento según la norma oficial..."
                  className="w-full p-4 bg-[#f0f4f9] rounded-[20px] text-sm text-[#1f1f1f] border border-slate-200/80 focus:outline-none focus:border-[#0b57d0] focus:bg-white transition-all leading-relaxed placeholder:text-[#747775] resize-none"
                  required
                />
              </div>

              {/* Subida de Estudios Diagnósticos Multimodales */}
              <ImageUploadZone
                files={imagenes}
                onChange={setImagenes}
                disabled={evaluating}
              />

              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-[16px] flex items-start gap-2.5 text-xs text-rose-800 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-[#747775]">
                  {respuesta.trim().split(/\s+/).filter(Boolean).length} palabras
                </span>

                <ClinicalButton
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={evaluating}
                  disabled={!respuesta.trim() || evaluating}
                  icon={Send}
                >
                  {isPhaseMode
                    ? `Evaluar Fase ${currentPhase}`
                    : 'Emitir Diagnóstico'}
                </ClinicalButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loader de Juego Evaluador */}
      {evaluating && (
        <EvaluationGameLoader hasImage={imagenes.length > 0} />
      )}

      {/* Modal de Debate y Debriefing Socrático Multiturno */}
      <SocraticDebriefModal />
    </div>
  );
}
