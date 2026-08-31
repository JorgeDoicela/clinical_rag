import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, BookOpen, Lightbulb, ShieldCheck, Activity, Sparkles } from 'lucide-react';

const STEPS = [
  "Buscando evidencias en la GPC del MSP Ecuador...",
  "Extrayendo criterios diagnósticos y terapéuticos...",
  "Analizando razonamiento clínico del estudiante...",
  "Sintetizando informe de retroalimentación formativa..."
];

const CLINICAL_PEARLS = [
  {
    tag: "Normativa GPC MSP",
    icon: BookOpen,
    text: "Las Guías de Práctica Clínica del MSP Ecuador priorizan evidencias tipo A mediante sistema GRADE para orientar decisiones terapéuticas críticas."
  },
  {
    tag: "Motor RAG Multimodal",
    icon: Activity,
    text: "El sistema vectoriza el caso y recupera fragmentos exactos de la norma nacional para contrastar el diagnóstico y plan del estudiante."
  },
  {
    tag: "Metodología SOAP",
    icon: Lightbulb,
    text: "Se evalúa la concatenación lógica entre la anamnesis (Subjetivo), hallazgos (Objetivo), juicio (Análisis) y tratamiento (Plan)."
  },
  {
    tag: "Ponderación Formativa",
    icon: ShieldCheck,
    text: "La identificación temprana de signos de alarma e intervenciones iniciales oportunas constituyen el núcleo del puntaje formativo."
  }
];

export default function EvaluationGameLoader({ hasImage }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(10);
  const [pearlIndex, setPearlIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        return prev + Math.floor(Math.random() * 8) + 3;
      });
    }, 450);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (progress < 30) setCurrentStep(0);
    else if (progress < 60) setCurrentStep(1);
    else if (progress < 85) setCurrentStep(2);
    else setCurrentStep(3);
  }, [progress]);

  useEffect(() => {
    const pearlTimer = setInterval(() => {
      setPearlIndex((prev) => (prev + 1) % CLINICAL_PEARLS.length);
    }, 4000);
    return () => clearInterval(pearlTimer);
  }, []);

  const currentPearl = CLINICAL_PEARLS[pearlIndex];
  const PearlIcon = currentPearl.icon;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-[28px] shadow-xl border-0 max-w-md w-full p-6 sm:p-8 space-y-6">
        
        {/* Encabezado Clínico Minimalista */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 text-[#0b57d0] animate-spin shrink-0" />
            <div>
              <h3 className="text-base font-normal text-[#1f1f1f] font-heading">
                Evaluando Razonamiento Clínico
              </h3>
              <p className="text-xs text-[#747775] mt-0.5">
                {hasImage ? "Procesamiento RAG Multimodal (Texto + Imagen)" : "Motor RAG Ateneo (GPC MSP Ecuador)"}
              </p>
            </div>
          </div>
          <span className="font-mono text-xs font-medium text-[#0b57d0] bg-sky-50 px-2.5 py-1 rounded-full">
            {progress}%
          </span>
        </div>

        {/* Barra de Progreso Fina con Gradiente Tricolor */}
        <div className="space-y-1.5">
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Pasos de Estado Planos */}
        <div className="space-y-2.5 border-t border-slate-100 pt-4">
          {STEPS.map((stepText, idx) => {
            const isDone = idx < currentStep;
            const isCurrent = idx === currentStep;

            return (
              <div
                key={idx}
                className="flex items-center gap-2.5 text-xs transition-colors"
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : isCurrent ? (
                  <div className="w-4 h-4 flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-[#0b57d0] animate-ping" />
                  </div>
                ) : (
                  <div className="w-4 h-4 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  </div>
                )}
                <span
                  className={
                    isCurrent
                      ? "font-medium text-[#1f1f1f]"
                      : isDone
                      ? "text-[#444746]"
                      : "text-[#747775]"
                  }
                >
                  {stepText}
                </span>
              </div>
            );
          })}
        </div>

        {/* Cápsula Formativa GPC / Datos Extras (Rotativo) */}
        <div className="border-t border-slate-100 pt-4">
          <div className="bg-[#f0f4f9] rounded-[20px] p-4 flex items-start gap-3 transition-all duration-300">
            <PearlIcon className="w-4 h-4 text-[#0b57d0] mt-0.5 shrink-0" />
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-medium tracking-wider text-[#0b57d0] uppercase">
                {currentPearl.tag}
              </span>
              <p className="text-xs text-[#444746] leading-relaxed">
                {currentPearl.text}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

