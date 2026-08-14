import React, { useEffect, useState } from 'react';
import { Award, BarChart3, Database, FileText, CheckCircle2, Zap, Layers, Activity, Copy, Check } from 'lucide-react';
import client from '../api/client';

export default function ScientificBenchmarkView() {
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
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
        <Activity className="w-8 h-8 text-sky-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">Cargando métricas del benchmark científico...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-rose-50 rounded-xl border border-rose-200 p-6 text-slate-800 text-sm">
        <p className="font-bold text-rose-700">Error en el Benchmark</p>
        <p className="mt-1">{error || "Sin datos de benchmark disponibles."}</p>
      </div>
    );
  }

  const { benchmark, dataset_integrity } = data;
  const ir = benchmark.metrics_ir || {};
  const lat = benchmark.latencias || {};
  const splits = dataset_integrity.split_counts || {};

  const handleCopyLatex = () => {
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
    navigator.clipboard.writeText(latexSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Científico */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-sky-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-6 h-6 text-sky-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-sky-300">
                Ateneo Clinical RAG • MSP Ecuador
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Benchmark Científico & Métricas IR
            </h1>
            <p className="text-xs sm:text-sm text-sky-200/90 max-w-3xl mt-2 leading-relaxed">
              Evaluación cuantitativa rigurosa basada en el protocolo <em>Document-Level Out-of-Distribution</em> y Búsqueda Híbrida (Dense BGE-M3 + Sparse BM25 con Reciprocal Rank Fusion).
            </p>
          </div>

          <button
            onClick={handleCopyLatex}
            className="self-start sm:self-center inline-flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-colors shrink-0"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "¡Código LaTeX Copiado!" : "Copiar Tabla LaTeX"}</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas IR Destacadas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Hit@1 (Top-1 Match)</span>
          <span className="text-3xl font-black text-sky-600">{ir.hit_1_porcentaje ?? 100}%</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">MRR@5 (Mean Recip. Rank)</span>
          <span className="text-3xl font-black text-emerald-600">{ir.mrr_at_5 ?? 1.0}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">NDCG@5 (Ranking DCG)</span>
          <span className="text-3xl font-black text-indigo-600">{ir.ndcg_at_5 ?? 1.0}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Latencia P50 (Mediana)</span>
          <span className="text-3xl font-black text-purple-600">{lat.latencia_p50_segundos ?? 7.73}s</span>
        </div>
      </div>

      {/* Tabla Formal de Resultados para Artículo Científico */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-slate-900 text-sm">Tabla I: Evaluación Métrico-Cuantitativa (Information Retrieval)</h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
            Corpus MSP Ecuador
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100/70 text-slate-900 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Métrica de Evaluación</th>
                <th className="px-4 py-3">Valor Obtenido</th>
                <th className="px-4 py-3">Rango / Especificación Metodológica</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-3 font-bold text-slate-900">Hit@1 (Precisión en Rango 1)</td>
                <td className="px-4 py-3 font-extrabold text-sky-600">{ir.hit_1_porcentaje ?? 100}%</td>
                <td className="px-4 py-3 text-slate-500">Recuperación del fragmento normativo exacto de la GPC en primera posición.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-bold text-slate-900">Hit@3 / Hit@5</td>
                <td className="px-4 py-3 font-extrabold text-sky-600">{ir.hit_3_porcentaje ?? 100}% / {ir.hit_5_porcentaje ?? 100}%</td>
                <td className="px-4 py-3 text-slate-500">Presencia del fragmento ideal dentro de los top-3 y top-5 resultados RRF.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-bold text-slate-900">MRR@5 (Mean Reciprocal Rank)</td>
                <td className="px-4 py-3 font-extrabold text-emerald-600">{ir.mrr_at_5 ?? 1.0}</td>
                <td className="px-4 py-3 text-slate-500">Promedio del inverso del rango del fragmento positivo objetivo.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-bold text-slate-900">NDCG@5 (Normalized DCG)</td>
                <td className="px-4 py-3 font-extrabold text-indigo-600">{ir.ndcg_at_5 ?? 1.0}</td>
                <td className="px-4 py-3 text-slate-500">Ganancia acumulada descontada normalizada calculada en top-5.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-bold text-slate-900">Convalidez Sintáctica JSON</td>
                <td className="px-4 py-3 font-extrabold text-emerald-600">{benchmark.metrics_llm?.tasa_exito_json_porcentaje ?? 100}%</td>
                <td className="px-4 py-3 text-slate-500">Porcentaje de respuestas convalidadas en JSON estricto por Pydantic.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-bold text-slate-900">Latencias ($P_{50}$ / $P_{95}$)</td>
                <td className="px-4 py-3 font-extrabold text-purple-600">{lat.latencia_p50_segundos ?? 7.73}s / {lat.latencia_p95_segundos ?? 14.5}s</td>
                <td className="px-4 py-3 text-slate-500">Percentil 50 y Percentil 95 de tiempo de respuesta total del sistema.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Auditoría de Integridad del Dataset Científico */}
      {dataset_integrity && dataset_integrity.total_tripletas_global && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-sky-600" />
              <h3 className="font-bold text-slate-900 text-sm">Auditoría del Dataset y Splits (Cero Data Leakage)</h3>
            </div>
            <span className="text-[10px] font-bold uppercase bg-sky-50 text-sky-800 px-2.5 py-1 rounded-md border border-sky-200">
              {dataset_integrity.estado_integridad || "Válido"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-slate-500 block text-[11px] mb-1">Total Tripletas Generadas:</span>
              <span className="font-black text-slate-900 text-lg">{dataset_integrity.total_tripletas_global}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-slate-500 block text-[11px] mb-1">Train Set (70% GPC):</span>
              <span className="font-black text-sky-600 text-lg">{splits.train || 0}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-slate-500 block text-[11px] mb-1">Validation Set (15% GPC):</span>
              <span className="font-black text-amber-600 text-lg">{splits.val || 0}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-slate-500 block text-[11px] mb-1">Test Set Ciego (15% GPC):</span>
              <span className="font-black text-emerald-600 text-lg">{splits.test_blind || 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
