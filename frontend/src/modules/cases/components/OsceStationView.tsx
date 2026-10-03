import React, { useState } from 'react';
import {
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Send,
  Lock,
  Award,
  ArrowRight,
  ClipboardList,
  Stethoscope,
  Info
} from 'lucide-react';
import {
  OsceCircuit,
  OsceSubmissionPayload
} from '../../../types/osce';
import { useOsceCircuit } from '../hooks/useOsceCircuit';

export interface OsceStationViewProps {
  circuit: OsceCircuit;
  studentId: string;
  initialServerTimestamp?: number;
  onStationSubmitted?: (payload: OsceSubmissionPayload) => Promise<void> | void;
  onCircuitCompleted?: (allSubmissions: OsceSubmissionPayload[]) => void;
  className?: string;
}

/**
 * Formatea segundos a MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * OsceStationView — Vista de Estación y Circuito Clínico Estructurado (OSCE / ECOE)
 * Integra temporizador sincronizado por servidor anti-trampa, bloqueo forzado
 * ante timeout, rúbricas de cotejo por jurado y actas firmadas con SHA-256.
 * Cumple estrictamente con las directrices de diseño Ateneo+ (cero emojis).
 */
export const OsceStationView: React.FC<OsceStationViewProps> = ({
  circuit,
  studentId,
  initialServerTimestamp,
  onStationSubmitted,
  onCircuitCompleted,
  className = ''
}) => {
  const {
    currentStationIndex,
    currentStation,
    totalStations,
    circuitState,
    remainingSeconds,
    isLocked,
    isSubmitting,
    studentAnswer,
    setStudentAnswer,
    evaluatedRubric,
    toggleRubricItem,
    submissions,
    startStationActive,
    submitCurrentStation,
    proceedToNextStation,
    clockSyncInfo
  } = useOsceCircuit({
    circuit,
    studentId,
    initialServerTimestamp,
    onStationSubmitted,
    onCircuitCompleted
  });

  const [activeTab, setActiveTab] = useState<'answer' | 'rubric'>('answer');

  if (!currentStation) {
    return (
      <div className="p-8 text-center bg-white rounded-[28px] text-[#444746]">
        No hay estaciones configuradas en este circuito.
      </div>
    );
  }

  // Estilo visual del cronómetro según urgencia
  const isUrgent = remainingSeconds <= 30 && circuitState === 'STATION_ACTIVE';
  const isWarning = remainingSeconds <= 120 && remainingSeconds > 30 && circuitState === 'STATION_ACTIVE';

  let timerColorClass = 'text-[#0b57d0] bg-sky-50 border-sky-200/80';
  if (isUrgent) {
    timerColorClass = 'text-rose-700 bg-rose-50 border-rose-200 animate-pulse';
  } else if (isWarning) {
    timerColorClass = 'text-amber-700 bg-amber-50 border-amber-200';
  }

  // 1. Pantalla de Culminación de Circuito Completo
  if (circuitState === 'CIRCUIT_FINISHED') {
    return (
      <div className={`w-full max-w-4xl mx-auto space-y-6 ${className}`} data-testid="osce-circuit-finished">
        <div className="bg-white rounded-[28px] p-8 sm:p-10 shadow-xs border-0 text-center space-y-4">
          <div className="flex justify-center">
            <Award className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-2xl font-normal text-[#1f1f1f] font-heading">
            Circuito Clínico OSCE Concluido
          </h2>
          <p className="text-sm text-[#444746] max-w-lg mx-auto leading-relaxed">
            Has completado las {totalStations} estaciones estandarizadas del circuito{' '}
            <span className="font-semibold text-slate-800">{circuit.titulo}</span>. Todas las respuestas fueron transmitidas y firmadas criptográficamente.
          </p>

          <div className="pt-6 border-t border-slate-100 text-left space-y-3">
            <h3 className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
              Acta de Despacho de Estaciones (Firmas SHA-256)
            </h3>
            <div className="space-y-2">
              {submissions.map((sub, idx) => (
                <div
                  key={sub.stationId}
                  className="p-3 bg-[#f0f4f9] rounded-[16px] flex flex-wrap items-center justify-between text-xs gap-2"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium text-slate-900">
                      Estación {idx + 1}: {circuit.estaciones[idx]?.titulo || sub.stationId}
                    </span>
                    {sub.expiradoPorServidor && (
                      <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-medium">
                        Cierre por Servidor
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[10px] text-slate-500">
                    Firma: {sub.hashFirmaCriptografica.substring(0, 16)}...
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-5xl mx-auto space-y-6 ${className}`} data-testid="osce-station-view">
      {/* 1. Barra Superior del Circuito: Progreso y Cronómetro Anti-Trampa */}
      <div className="bg-white rounded-[28px] p-6 shadow-xs border-0 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0b57d0]">
              {circuit.institucion}
            </span>
            <span className="text-xs text-[#747775]">·</span>
            <span className="text-xs text-[#747775]">
              Estación {currentStationIndex + 1} de {totalStations}
            </span>
          </div>
          <h1 className="text-xl font-normal text-[#1f1f1f] font-heading">
            {currentStation.titulo}
          </h1>
        </div>

        {/* Cronómetro Sincronizado por Servidor */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-mono font-semibold transition-all ${timerColorClass}`}
            data-testid="osce-timer"
          >
            <Clock className="w-4 h-4" />
            <span>
              {circuitState === 'READING_INSTRUCTIONS' ? 'Lectura: ' : 'Tiempo: '}
              {formatTime(remainingSeconds)}
            </span>
          </div>

          <div
            className="flex items-center gap-1 text-[11px] text-slate-500 bg-[#f0f4f9] px-2.5 py-1.5 rounded-full"
            title={`Sincronización horaria activa. Deriva de reloj: ${clockSyncInfo.skewMs} ms`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Servidor Sincronizado</span>
          </div>
        </div>
      </div>

      {/* 2. Banner de Estado: Tiempo de Lectura Previo */}
      {circuitState === 'READING_INSTRUCTIONS' && (
        <div className="bg-sky-50/70 border border-sky-200/80 rounded-[24px] p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-[#0b57d0]" />
            <div>
              <h4 className="text-xs font-semibold text-[#0b57d0] uppercase tracking-wide">
                Período de Lectura e Instrucciones Previas
              </h4>
              <p className="text-xs text-slate-700">
                Lea con detenimiento el escenario antes de iniciar la interacción clínica. El tiempo comenzará automáticamente al finalizar la cuenta regresiva.
              </p>
            </div>
          </div>
          <button
            onClick={startStationActive}
            className="px-4 py-2 bg-[#0b57d0] hover:bg-blue-700 text-white rounded-full text-xs font-medium transition-colors cursor-pointer"
          >
            Comenzar Estación Inmediatamente
          </button>
        </div>
      )}

      {/* 3. Banner de Bloqueo por Servidor ante Timeout */}
      {isLocked && circuitState === 'SUBMITTING' && (
        <div className="bg-rose-50 border border-rose-200 rounded-[24px] p-4 flex items-center gap-3 text-xs text-rose-800">
          <Lock className="w-4 h-4 text-rose-600" />
          <span>
            Tiempo de estación expirado por servidor. Transmitiendo acta firmada y bloqueando edición...
          </span>
        </div>
      )}

      {/* 4. Pantalla de Transición tras Completar Estación */}
      {circuitState === 'STATION_COMPLETED' ? (
        <div className="bg-white rounded-[28px] p-8 shadow-xs border-0 text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
          </div>
          <h3 className="text-lg font-normal text-[#1f1f1f] font-heading">
            Estación {currentStationIndex + 1} Registrada Exitosamente
          </h3>
          <p className="text-xs sm:text-sm text-[#444746] max-w-md mx-auto leading-relaxed">
            Tu resolución clínica ha sido almacenada con firma criptográfica. Procede a la siguiente estación del circuito.
          </p>
          <div className="pt-2">
            <button
              onClick={proceedToNextStation}
              className="py-2.5 px-6 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 text-white text-xs font-medium rounded-full inline-flex items-center gap-2 cursor-pointer shadow-sm transition-all"
            >
              <span>Avanzar a Estación {currentStationIndex + 2}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* 5. Área de Trabajo Split-Screen (50% Escenario / 50% Resolución y Rúbrica) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Panel Izquierdo: Escenario Clínico y Tarea */}
          <div className="lg:col-span-6 bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 space-y-5">
            <div className="flex items-center gap-2 text-xs font-medium text-[#444746]">
              <Stethoscope className="w-4 h-4 text-[#0b57d0]" />
              <span>Escenario de Evaluación OSCE</span>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Tipo de Estación: {currentStation.tipo.replace('_', ' ').toUpperCase()}
              </span>
              <div className="p-4 bg-[#f0f4f9] rounded-[20px] text-xs sm:text-sm text-[#1f1f1f] leading-relaxed whitespace-pre-wrap">
                {currentStation.escenarioClinico}
              </div>
            </div>

            <div className="space-y-1.5 p-4 bg-sky-50/60 rounded-[20px] border border-sky-100">
              <span className="text-xs font-semibold text-[#0b57d0] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Instrucciones para el Candidato
              </span>
              <p className="text-xs sm:text-sm text-[#1f1f1f] leading-relaxed">
                {currentStation.instruccionesCandidato}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-[20px] border border-slate-200/80 space-y-1">
              <span className="text-xs font-semibold text-slate-800">
                Interrogante Principal
              </span>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                {currentStation.preguntaEvaluativa}
              </p>
            </div>
          </div>

          {/* Panel Derecho: Área de Resolución y Rúbricas */}
          <div className="lg:col-span-6 bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 space-y-5">
            {/* Pestañas Planas (según ateneo-design-system) */}
            <div className="flex items-center gap-6 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('answer')}
                className={`pb-2.5 text-xs font-medium flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'answer'
                    ? 'border-blue-600 text-blue-700 font-semibold -mb-[2px]'
                    : 'border-transparent text-[#747775] hover:text-[#1f1f1f]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Tu Resolución Clínica</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('rubric')}
                className={`pb-2.5 text-xs font-medium flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'rubric'
                    ? 'border-indigo-600 text-indigo-700 font-semibold -mb-[2px]'
                    : 'border-transparent text-[#747775] hover:text-[#1f1f1f]'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Rúbrica de Cotejo ({currentStation.rubrica.length})</span>
              </button>
            </div>

            {activeTab === 'answer' ? (
              <div className="space-y-4">
                <div>
                  <textarea
                    id="osce-answer-input"
                    rows={10}
                    value={studentAnswer}
                    onChange={(e) => setStudentAnswer(e.target.value)}
                    disabled={isLocked || circuitState === 'READING_INSTRUCTIONS'}
                    placeholder={
                      circuitState === 'READING_INSTRUCTIONS'
                        ? 'La redacción se habilitará al concluir el período de lectura...'
                        : 'Escriba de forma estructurada sus hallazgos, hipótesis diagnósticas, plan terapéutico y comunicación al paciente...'
                    }
                    className="w-full p-4 bg-[#f0f4f9] rounded-[20px] text-xs sm:text-sm text-[#1f1f1f] border border-slate-200/80 focus:outline-none focus:border-[#0b57d0] focus:bg-white transition-all leading-relaxed placeholder:text-[#747775] resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                    required
                  />
                  <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1 px-1">
                    <span>Caracteres: {studentAnswer.length}</span>
                    {isLocked && (
                      <span className="text-rose-600 font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Edición Bloqueada
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => submitCurrentStation(false)}
                    disabled={isLocked || isSubmitting || studentAnswer.trim().length === 0}
                    className="py-2.5 px-6 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 text-white font-medium text-xs rounded-full transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Concluir y Enviar Estación</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Pestaña de Rúbrica de Cotejo (Modo Jurado / Evaluación Objetiva) */
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Criterios estructurados de desempeño clínico observables en esta estación:
                </p>
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {currentStation.rubrica.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => toggleRubricItem(item.id)}
                      className={`p-3 rounded-[16px] border text-xs flex items-start gap-3 transition-colors cursor-pointer ${
                        evaluatedRubric[item.id]
                          ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                          : 'bg-[#f0f4f9] border-slate-200/80 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!evaluatedRubric[item.id]}
                        onChange={() => {}}
                        className="mt-0.5 accent-emerald-600 cursor-pointer"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{item.descripcion}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                          <span className="capitalize">{item.categoria.replace('_', ' ')}</span>
                          <span>·</span>
                          <span>Ponderación: {item.peso} pts</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OsceStationView;
