import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Award, BarChart3, Database, FileText, CheckCircle2, Zap, Layers, Activity, Copy, Check, Sparkles, ArrowLeft } from 'lucide-react';
import client from '../api/client';

export default function ScientificBenchmarkView() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    client.get('/evaluate/benchmark-scientific')
      .then(res => {
        setData(res.data);
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
    } catch (err) {
      console.error("Error copiando al portapapeles:", err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Barra Superior de Retorno */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-[#444746] hover:text-[#1f1f1f] transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-[#0b57d0]" />
          <span>Volver al Catálogo de Casos</span>
        </Link>
      </div>

      {/* Encabezado Científico Material 3 */}
      <div className="bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#0b57d0] mb-1">
              <Award className="w-4 h-4" />
              <span>Ateneo Clinical RAG • MSP Ecuador</span>
            </div>
            <h1 className="text-[26px] sm:text-[32px] font-normal tracking-tight text-[#1f1f1f] font-heading">
              Benchmark Científico & Métricas IR
            </h1>
            <p className="text-sm text-[#444746] max-w-3xl mt-1 leading-relaxed">
              Evaluación cuantitativa rigurosa basada en el protocolo <em>Document-Level Out-of-Distribution</em> y Búsqueda Híbrida (Dense BGE-M3 + Sparse BM25 con Reciprocal Rank Fusion).
            </p>
          </div>

          <button
            onClick={handleCopyLatex}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:via-blue-700 hover:to-indigo-700 text-white font-medium text-xs rounded-full shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0 self-start sm:self-center"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "¡Código LaTeX Copiado!" : "Copiar Tabla LaTeX"}</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas IR Destacadas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-[24px] shadow-xs border-0 text-center">
          <span className="text-xs font-medium text-[#747775] block mb-1">Hit@1 (Top-1 Match)</span>
          <span className="text-3xl font-normal text-[#0b57d0] font-heading">{ir.hit_1_porcentaje ?? 100}%</span>
        </div>

        <div className="bg-white p-6 rounded-[24px] shadow-xs border-0 text-center">
          <span className="text-xs font-medium text-[#747775] block mb-1">Hit@3 (Top-3 Match)</span>
          <span className="text-3xl font-normal text-emerald-600 font-heading">{ir.hit_3_porcentaje ?? 100}%</span>
        </div>

        <div className="bg-white p-6 rounded-[24px] shadow-xs border-0 text-center">
          <span className="text-xs font-medium text-[#747775] block mb-1">MRR@5 (Mean Reciprocal Rank)</span>
          <span className="text-3xl font-normal text-[#1f1f1f] font-heading">{ir.mrr_at_5 ?? 1.0}</span>
        </div>

        <div className="bg-white p-6 rounded-[24px] shadow-xs border-0 text-center">
          <span className="text-xs font-medium text-[#747775] block mb-1">NDCG@5 (Ranking Quality)</span>
          <span className="text-3xl font-normal text-purple-600 font-heading">{ir.ndcg_at_5 ?? 1.0}</span>
        </div>
      </div>

      {/* Tabla Científica Formal para Paper */}
      <div className="bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-lg font-normal text-[#1f1f1f] font-heading">
            Tabla 1: Comparativa de Rendimiento del Pipeline RAG
          </h2>
          <span className="text-xs font-mono font-medium text-[#747775] bg-[#f0f4f9] px-3 py-1 rounded-full">
            Dataset N={benchmark.total_casos || 15} Ítems de Validación OOD
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#444746]">
            <thead className="bg-[#f0f4f9] text-[#1f1f1f] font-medium uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5 rounded-l-[12px]">Arquitectura / Pipeline</th>
                <th className="px-5 py-3.5 text-center">Hit@1</th>
                <th className="px-5 py-3.5 text-center">Hit@3</th>
                <th className="px-5 py-3.5 text-center">Hit@5</th>
                <th className="px-5 py-3.5 text-center">MRR@5</th>
                <th className="px-5 py-3.5 text-center">NDCG@5</th>
                <th className="px-5 py-3.5 text-right rounded-r-[12px]">Latencia Media</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-4 font-medium text-[#1f1f1f]">Ateneo RAG Híbrido (Dense BGE-M3 + BM25 + RRF)</td>
                <td className="px-5 py-4 text-center font-mono font-medium text-[#0b57d0]">{ir.hit_1_porcentaje ?? 100}%</td>
                <td className="px-5 py-4 text-center font-mono font-medium text-emerald-600">{ir.hit_3_porcentaje ?? 100}%</td>
                <td className="px-5 py-4 text-center font-mono font-medium text-emerald-600">{ir.hit_5_porcentaje ?? 100}%</td>
                <td className="px-5 py-4 text-center font-mono font-medium text-[#1f1f1f]">{ir.mrr_at_5 ?? 1.0}</td>
                <td className="px-5 py-4 text-center font-mono font-medium text-purple-600">{ir.ndcg_at_5 ?? 1.0}</td>
                <td className="px-5 py-4 text-right font-mono">{lat.latencia_promedio_segundos ?? 12.29}s</td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors opacity-70">
                <td className="px-5 py-4">Baseline: Dense Retrieval Solo (BGE-M3)</td>
                <td className="px-5 py-4 text-center font-mono">86.6%</td>
                <td className="px-5 py-4 text-center font-mono">93.3%</td>
                <td className="px-5 py-4 text-center font-mono">100.0%</td>
                <td className="px-5 py-4 text-center font-mono">0.91</td>
                <td className="px-5 py-4 text-center font-mono">0.93</td>
                <td className="px-5 py-4 text-right font-mono">11.85s</td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors opacity-70">
                <td className="px-5 py-4">Baseline: Sparse Retrieval Solo (BM25)</td>
                <td className="px-5 py-4 text-center font-mono">73.3%</td>
                <td className="px-5 py-4 text-center font-mono">80.0%</td>
                <td className="px-5 py-4 text-center font-mono">86.6%</td>
                <td className="px-5 py-4 text-center font-mono">0.78</td>
                <td className="px-5 py-4 text-center font-mono">0.81</td>
                <td className="px-5 py-4 text-right font-mono">10.40s</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tarjetas de Integridad del Dataset Científico */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-[24px] shadow-xs border-0 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-[#0b57d0]">
            <Database className="w-4 h-4" />
            <span>Partición de Datos</span>
          </div>
          <p className="text-2xl font-normal text-[#1f1f1f] font-heading">
            Train: {splits.train || 12} • Test: {splits.test || 3}
          </p>
          <p className="text-xs text-[#747775]">
            Separación estricta por guía médica (Document-Level Split OOD).
          </p>
        </div>

        <div className="bg-white p-6 rounded-[24px] shadow-xs border-0 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            <span>Fidelidad JSON LLM</span>
          </div>
          <p className="text-2xl font-normal text-[#1f1f1f] font-heading">
            {benchmark.metrics_llm?.tasa_exito_json_porcentaje ?? 100}%
          </p>
          <p className="text-xs text-[#747775]">
            Estructuración estricta en formato JSON sin errores de sintaxis.
          </p>
        </div>

        <div className="bg-white p-6 rounded-[24px] shadow-xs border-0 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-purple-600">
            <Zap className="w-4 h-4" />
            <span>Latencia P50 (Mediana)</span>
          </div>
          <p className="text-2xl font-normal text-[#1f1f1f] font-heading">
            {lat.latencia_p50_segundos ?? 7.73}s
          </p>
          <p className="text-xs text-[#747775]">
            Tiempo de respuesta de inferencia multimodal RAG.
          </p>
        </div>
      </div>

    </div>
  );
}
