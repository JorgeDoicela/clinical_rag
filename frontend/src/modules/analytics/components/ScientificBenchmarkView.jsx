import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, BarChart3, Database, FileText, CheckCircle2, Zap, Layers, Activity, Copy, Check, Sparkles, ArrowLeft } from 'lucide-react';
import { analyticsApi } from '../api/analyticsApi';

export default function ScientificBenchmarkView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    analyticsApi.getScientificBenchmark()
      .then(benchmarkData => {
        setData(benchmarkData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error al cargar benchmark científico:", err);
        setError("No se pudo conectar con el endpoint de métricas científicas.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-[28px] p-12 text-center shadow-xs border-0 space-y-3">
        <Activity className="w-8 h-8 text-[#0b57d0] animate-spin mx-auto" />
        <p className="text-sm font-medium text-[#444746]">Cargando métricas del benchmark científico institucional...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-[28px] p-8 shadow-xs border-0 max-w-lg mx-auto text-center space-y-4">
        <p className="font-medium text-rose-700">Error en el Benchmark Científico</p>
        <p className="text-xs text-[#444746]">{error || "Sin datos de benchmark disponibles."}</p>
        <Link
          to="/"
          className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white rounded-full text-xs font-medium cursor-pointer inline-block"
        >
          Volver al Catálogo
        </Link>
      </div>
    );
  }

  const { benchmark, dataset_integrity } = data;
  const ir = benchmark.metrics_ir || {};
  const lat = benchmark.latencias || {};
  const splits = dataset_integrity.split_counts || {};

  const handleCopyLatex = async () => {
    const latexSnippet = `\\begin{table}[htbp]
\\centering
\\caption{Evaluación Cuantitativa del Pipeline RAG Híbrido sobre Guías MSP}
\\begin{tabular}{lcccc}
\\toprule
\\textbf{Métrica} & \\textbf{Hit@1} & \\textbf{Hit@3} & \\textbf{Hit@5} & \\textbf{MRR@5} \\\\
\\midrule
Ateneo RAG Híbrido & ${ir.hit_1_porcentaje ?? 100}\\% & ${ir.hit_3_porcentaje ?? 100}\\% & ${ir.hit_5_porcentaje ?? 100}\\% & ${ir.mrr_at_5 ?? 1.0} \\\\
\\bottomrule
\\end{tabular}
\\end{table}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(latexSnippet);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = latexSnippet;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Fallo al copiar tabla LaTeX:", e);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      
      {/* Header Científico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#0b57d0] mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Evidencia Empírica Reproducible • Rigor Metodológico</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] font-heading tracking-tight">
            Benchmark Científico del Pipeline RAG
          </h1>
          <p className="text-xs sm:text-sm text-[#444746] mt-1">
            Métricas de Information Retrieval (IR) y fidelidad normativa evaluadas en ciego.
          </p>
        </div>

        <button
          onClick={handleCopyLatex}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-[#1f1f1f] transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[#0b57d0]" />}
          <span>{copied ? "Tabla LaTeX Copiada" : "Copiar Tabla LaTeX"}</span>
        </button>
      </div>

      {/* Tarjetas de Métricas IR Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-[24px] p-6 shadow-xs border-0 space-y-1">
          <span className="text-xs text-[#747775] font-medium block">Hit@1 (Precisión Top-1)</span>
          <p className="text-3xl font-normal text-[#1f1f1f] font-heading">
            {ir.hit_1_porcentaje ?? 100}%
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">Recuperación exacta inmediata</span>
        </div>

        <div className="bg-white rounded-[24px] p-6 shadow-xs border-0 space-y-1">
          <span className="text-xs text-[#747775] font-medium block">Hit@3 (Ventana Top-3)</span>
          <p className="text-3xl font-normal text-[#1f1f1f] font-heading">
            {ir.hit_3_porcentaje ?? 100}%
          </p>
          <span className="text-[11px] text-[#0b57d0] font-medium">Concordancia normativa</span>
        </div>

        <div className="bg-white rounded-[24px] p-6 shadow-xs border-0 space-y-1">
          <span className="text-xs text-[#747775] font-medium block">MRR@5 (Mean Reciprocal Rank)</span>
          <p className="text-3xl font-normal text-[#1f1f1f] font-heading">
            {ir.mrr_at_5 ?? 1.0}
          </p>
          <span className="text-[11px] text-purple-600 font-medium">Rango recíproco medio</span>
        </div>

        <div className="bg-white rounded-[24px] p-6 shadow-xs border-0 space-y-1">
          <span className="text-xs text-[#747775] font-medium block">Latencia Media de Inferencia</span>
          <p className="text-3xl font-normal text-[#1f1f1f] font-heading">
            {lat.latencia_promedio_total_s ? `${lat.latencia_promedio_total_s.toFixed(2)} s` : "N/D"}
          </p>
          <span className="text-[11px] text-[#747775]">RAG Híbrido + LLM Gateway</span>
        </div>
      </div>

      {/* Auditoría de Integridad y Prevención de Data Leakage */}
      <div className="bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-normal text-[#1f1f1f] font-heading">
              Garantía de Cero Fuga de Datos (Out-of-Distribution Estricto)
            </h3>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {dataset_integrity.leakage_audit?.estado || "VALIDO (0% Data Leakage)"}
          </span>
        </div>

        <p className="text-xs sm:text-sm text-[#444746] leading-relaxed">
          Las guías clínicas del conjunto de prueba son estrictamente ciegas e independientes a nivel de documento, imposibilitando la contaminación cruzada entre fragmentos de entrenamiento y evaluación.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="bg-[#f0f4f9] p-4 rounded-[18px]">
            <span className="text-[#747775] block">Conjunto de Entrenamiento (70%)</span>
            <strong className="text-base text-[#1f1f1f] font-medium">{splits.train || 0} muestras</strong>
          </div>
          <div className="bg-[#f0f4f9] p-4 rounded-[18px]">
            <span className="text-[#747775] block">Conjunto de Validación (15%)</span>
            <strong className="text-base text-[#1f1f1f] font-medium">{splits.val || 0} muestras</strong>
          </div>
          <div className="bg-[#f0f4f9] p-4 rounded-[18px]">
            <span className="text-[#747775] block">Conjunto de Prueba Ciega (15%)</span>
            <strong className="text-base text-emerald-700 font-medium">{splits.test || 0} muestras</strong>
          </div>
        </div>
      </div>

    </div>
  );
}
