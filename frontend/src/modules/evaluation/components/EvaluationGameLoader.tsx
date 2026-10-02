import { useState, useEffect } from 'react';
import { Loader2, BookOpen, Lightbulb, ShieldCheck, Activity, LucideIcon } from 'lucide-react';

interface ClinicalPearl {
  tag: string;
  icon: LucideIcon;
  text: string;
}

const CLINICAL_PEARLS: ClinicalPearl[] = [
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

export interface EvaluationGameLoaderProps {
  hasImage?: boolean;
}

export default function EvaluationGameLoader({ hasImage = false }: EvaluationGameLoaderProps) {
  const [progress, setProgress] = useState<number>(10);
  const [pearlIndex, setPearlIndex] = useState<number>(0);

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

        {/* Perlas Clínicas Formativas */}
        <div className="p-4 bg-[#f0f4f9] rounded-[20px] space-y-2 border border-slate-200/60">
          <div className="flex items-center gap-2 text-xs font-medium text-[#0b57d0]">
            <PearlIcon className="w-3.5 h-3.5" />
            <span>{currentPearl.tag}</span>
          </div>
          <p className="text-xs text-[#444746] leading-relaxed">
            {currentPearl.text}
          </p>
        </div>
      </div>
    </div>
  );
}
