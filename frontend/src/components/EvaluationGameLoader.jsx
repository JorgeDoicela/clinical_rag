import React, { useState, useEffect } from 'react';
import { Stethoscope, CheckCircle2, BookOpen, Brain, Sparkles, ShieldCheck } from 'lucide-react';

const CLINICAL_PEARLS_BY_GUIA = {
  gpc_ehirn2019: [
    {
      titulo: "Profilaxis Neonatal al Nacimiento",
      criterio: "La GPC del MSP recomienda 1 mg IM de Fitomenadiona (Vitamina K1) como dosis única profiláctica al nacer en neonatos ≥ 1500g para prevenir la EHIRN."
    },
    {
      titulo: "Clasificación por Edad de Presentación",
      criterio: "Temprana (< 24h, asociada a fármacos maternos), Clásica (2 a 7 días, sangrado umbilical/digestivo) y Tardía (2 a 12 semanas, alta frecuencia de sangrado del SNC)."
    },
    {
      titulo: "Tratamiento de Emergencia ante Sangrado",
      criterio: "Administración inmediata de Fitomenadiona 1 a 2 mg IV lenta. Si el sangrado es grave o amenaza la vida, administrar Concentrado de Complejo Protrombínico o Plasma Fresco Congelado (10-15 ml/kg)."
    }
  ],
  dengue: [
    {
      titulo: "Signos de Alarma según GPC MSP",
      criterio: "Dolor abdominal intenso y continuo, vómitos persistentes, acumulación de líquidos, sangrado de mucosas, letargo/irritabilidad y aumento del hematocrito con rápida caída de plaquetas."
    },
    {
      titulo: "Reposición de Hidratación en Grupo B1/B2",
      criterio: "Iniciar cristaloides isotónicos (Lactato Ringer o Solución Salina 0.9%) a 5-7 ml/kg/h en las primeras 1 a 2 horas, monitoreando diuresis (meta ≥ 1 ml/kg/h)."
    }
  ],
  preeclampsia: [
    {
      titulo: "Esquema de Sulfato de Magnesio (Zuspan)",
      criterio: "Dosis de ataque: 4g IV diluidos en 100 ml de Solución Salina 0.9% a pasar en 15-20 minutos. Dosis de mantenimiento: 1g/hora en infusión continua por 24 horas."
    },
    {
      titulo: "Manejo de la Crisis Hipertensiva Severa",
      criterio: "PA sistólica ≥ 160 mmHg o diastólica ≥ 110 mmHg. Tratar con Labetalol IV (20mg inicial) o Nifedipino de acción rápida VO (10mg) para reducir la PA sin comprometer la perfusión utero-placentaria."
    }
  ],
  neumonia: [
    {
      titulo: "Escala de Severidad CURB-65",
      criterio: "Evalúa Confusión, Urea > 19 mg/dL, FR ≥ 30 rpm, PA sistólica < 90 o diastólica ≤ 60 mmHg y Edad ≥ 65 años. Un puntaje ≥ 2 requiere manejo hospitalario."
    }
  ],
  default: [
    {
      titulo: "Normativa Nacional MSP Ecuador",
      criterio: "El sistema contrasta la conducta diagnóstica y terapéutica propuesta contra los algoritmos oficiales publicados por el Ministerio de Salud Pública."
    },
    {
      titulo: "Evaluación de Omisiones Críticas",
      criterio: "Se verifica la correcta dosificación, vía de administración, monitoreo de signos vitales y criterios de referencia o manejo hospitalario."
    }
  ]
};

const STEPS = [
  { id: 1, label: "Recuperación Vectorial ChromaDB", desc: "Buscando pasajes normativos en GPC MSP Ecuador" },
  { id: 2, label: "Extracción de Criterios Clínicos", desc: "Identificando dosis, signos y conductas clave" },
  { id: 3, label: "Evaluación Gemini Multimodal", desc: "Contrastando razonamiento redactado vs norma" },
  { id: 4, label: "Síntesis Formativa", desc: "Generando aciertos, omisiones y puntaje (0-10)" }
];

export default function EvaluationGameLoader({ guiaCodigo, hasImage }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(8);
  const [pearlIndex, setPearlIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 94) return 94;
        return prev + Math.floor(Math.random() * 6) + 3;
      });
    }, 400);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (progress < 25) setCurrentStep(0);
    else if (progress < 55) setCurrentStep(1);
    else if (progress < 85) setCurrentStep(2);
    else setCurrentStep(3);
  }, [progress]);

  const pearls = CLINICAL_PEARLS_BY_GUIA[guiaCodigo] || CLINICAL_PEARLS_BY_GUIA.default;

  useEffect(() => {
    if (pearls.length <= 1) return;
    const interval = setInterval(() => {
      setPearlIndex((prev) => (prev + 1) % pearls.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [pearls]);

  const activePearl = pearls[pearlIndex] || pearls[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 sm:p-7 space-y-6">
        
        {/* Encabezado Institucional y Sobrio */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <Brain className="w-5 h-5 text-sky-600 animate-pulse shrink-0" />
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                Procesando Evaluación Formativa RAG
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {hasImage ? "Análisis Multimodal de Evidencias (Texto + Imagen)" : "Análisis Comparativo vs GPC MSP Ecuador"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-mono font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
            <span>MSP ECUADOR</span>
          </div>
        </div>

        {/* Barra de Progreso del Sistema */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-slate-800">
            <span>{STEPS[currentStep].label}</span>
            <span className="font-mono text-sky-600">{progress}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
            <div
              className="h-full bg-sky-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 italic">
            {STEPS[currentStep].desc}
          </p>
        </div>

        {/* Etapas del Procesamiento RAG (Explicabilidad / XAI) */}
        <div className="grid grid-cols-4 gap-2 border-y border-slate-100 py-3">
          {STEPS.map((step, idx) => {
            const isDone = idx < currentStep;
            const isCurrent = idx === currentStep;
            return (
              <div
                key={step.id}
                className={`p-2 rounded-xl text-center border transition-all ${
                  isDone
                    ? 'bg-slate-50 border-emerald-300 text-emerald-800'
                    : isCurrent
                    ? 'bg-sky-50 border-sky-300 text-sky-900 font-semibold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-center mb-1">
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : isCurrent ? (
                    <Stethoscope className="w-3.5 h-3.5 text-sky-600 animate-spin" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                  )}
                </div>
                <span className="text-[10px] block leading-tight truncate">
                  Paso {step.id}
                </span>
              </div>
            );
          })}
        </div>

        {/* REFUERZO PEDAGÓGICO: CRITERIOS NORMATIVOS CLAVE DE LA GPC DEL CASO ACTIVO */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 tracking-wide uppercase">
              <BookOpen className="w-4 h-4 text-sky-600" />
              <span>Criterio Normativo Clave (GPC MSP)</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Ref. Oficial
            </span>
          </div>

          <div className="space-y-1 animate-fade-in">
            <h4 className="text-xs font-bold text-slate-900">
              {activePearl.titulo}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {activePearl.criterio}
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-500 font-medium">
          Sistema de Evaluación del Razonamiento Clínico basado en RAG — Plataforma Ateneo
        </p>
      </div>
    </div>
  );
}
