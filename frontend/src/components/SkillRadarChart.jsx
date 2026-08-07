import React from 'react';
import { Target, Activity } from 'lucide-react';

export default function SkillRadarChart({ competenciasPorEje = [] }) {
  // Configuración de los 4 vértices del radar en un viewBox de 300x300 (centro 150,150, radio 95)
  const center = 150;
  const radius = 95;

  // Vértices para 4 ejes: Arriba (0°), Derecha (90°), Abajo (180°), Izquierda (270°)
  const axesConfig = [
    { key: 'diagnóstico', label: 'Diagnóstico', angle: -Math.PI / 2, align: 'middle' },
    { key: 'tratamiento', label: 'Tratamiento', angle: 0, align: 'start' },
    { key: 'seguimiento', label: 'Seguimiento', angle: Math.PI / 2, align: 'middle' },
    { key: 'prevención', label: 'Prevención', angle: Math.PI, align: 'end' },
  ];

  // Calcular porcentaje de dominio (0-100) por eje
  const scoresByAxis = axesConfig.map(axis => {
    const matched = competenciasPorEje.find(e => {
      const eKey = (e.key || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const aKey = axis.key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      return eKey.includes(aKey);
    });

    if (matched) {
      if (typeof matched.score === 'number') {
        return Math.max(0, Math.min(100, matched.score));
      }
      const brechasCount = matched.items ? matched.items.length : 0;
      if (brechasCount === 0) return 95;
      if (brechasCount === 1) return 65;
      return 35;
    }
    return 85;
  });

  // Generar puntos del polígono de grid para niveles 25%, 50%, 75%, 100%
  const levels = [0.25, 0.50, 0.75, 1.0];
  const gridPolygons = levels.map(level => {
    return axesConfig.map(axis => {
      const r = radius * level;
      const x = center + r * Math.cos(axis.angle);
      const y = center + r * Math.sin(axis.angle);
      return `${x},${y}`;
    }).join(' ');
  });

  // Generar puntos del polígono real del estudiante
  const dataPoints = axesConfig.map((axis, i) => {
    const pct = scoresByAxis[i] / 100;
    const r = radius * pct;
    const x = center + r * Math.cos(axis.angle);
    const y = center + r * Math.sin(axis.angle);
    return { x, y, score: scoresByAxis[i], axis };
  });

  const polygonPath = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-sky-600 shrink-0" />
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Radar de Habilidades Clínicas (4 Ejes GPC)
            </h3>
            <p className="text-[11px] text-slate-500">
              Evaluación de consistencia según la GPC oficial MSP
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-sky-50 text-sky-700 px-3 py-1 rounded-full border border-sky-200">
          Analytics 4 Ejes
        </span>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-2">
        {/* SVG Radar estilo clínico minimalista */}
        <div className="w-full max-w-[280px] aspect-square relative flex items-center justify-center">
          <svg viewBox="0 0 300 300" className="w-full h-full">
            <defs>
              <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.08" />
              </linearGradient>
            </defs>

            {/* Guías de Ejes principales */}
            {axesConfig.map((axis, idx) => {
              const xEnd = center + radius * Math.cos(axis.angle);
              const yEnd = center + radius * Math.sin(axis.angle);
              return (
                <line
                  key={idx}
                  x1={center}
                  y1={center}
                  x2={xEnd}
                  y2={yEnd}
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              );
            })}

            {/* Polígonos de Nivel (Grid) */}
            {gridPolygons.map((polyStr, idx) => (
              <polygon
                key={idx}
                points={polyStr}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={idx === gridPolygons.length - 1 ? "1.5" : "1"}
              />
            ))}

            {/* Polígono de Datos del Estudiante */}
            <polygon
              points={polygonPath}
              fill="url(#radarGradient)"
              stroke="#0284c7"
              strokeWidth="2.5"
              className="transition-all duration-700 ease-out"
            />

            {/* Vértices (Nodos) */}
            {dataPoints.map((p, idx) => (
              <g key={idx} className="group">
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="5"
                  fill="#0284c7"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              </g>
            ))}

            {/* Etiquetas de los Ejes */}
            {axesConfig.map((axis, idx) => {
              const rLabel = radius + 22;
              const lx = center + rLabel * Math.cos(axis.angle);
              const ly = center + rLabel * Math.sin(axis.angle);
              const score = scoresByAxis[idx];

              return (
                <text
                  key={idx}
                  x={lx}
                  y={ly}
                  textAnchor={axis.align}
                  className="fill-slate-700 text-[11px] font-bold tracking-tight"
                >
                  {axis.label} ({score}%)
                </text>
              );
            })}
          </svg>
        </div>

        {/* Legend & Breakdown */}
        <div className="w-full md:w-1/2 space-y-3">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-sky-600" />
            <span>Nivel de Dominio por Competencia</span>
          </div>

          <div className="space-y-2.5">
            {axesConfig.map((axis, idx) => {
              const score = scoresByAxis[idx];
              const matched = competenciasPorEje.find(e => {
                const eKey = (e.key || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                const aKey = axis.key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                return eKey.includes(aKey);
              });

              let barColor = 'bg-sky-600';
              let badgeText = matched?.estadoLabel || 'Alto';
              let badgeBg = 'bg-sky-50 text-sky-800 border-sky-200';

              if (score === 0) {
                barColor = 'bg-slate-400';
                badgeText = matched?.estadoLabel || 'No Demostrado';
                badgeBg = 'bg-slate-100 text-slate-700 border-slate-200';
              } else if (score < 50) {
                barColor = 'bg-rose-500';
                badgeText = matched?.estadoLabel || 'Brecha Crítica';
                badgeBg = 'bg-rose-50 text-rose-800 border-rose-200';
              } else if (score < 80) {
                barColor = 'bg-amber-500';
                badgeText = matched?.estadoLabel || 'En Desarrollo';
                badgeBg = 'bg-amber-50 text-amber-800 border-amber-200';
              } else {
                badgeText = matched?.estadoLabel || 'Consolidado';
                badgeBg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                barColor = 'bg-emerald-600';
              }

              return (
                <div key={axis.key} className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs font-bold min-w-0">
                    <span className="text-slate-800 truncate">{axis.label}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold whitespace-nowrap ${badgeBg}`}>
                        {badgeText}
                      </span>
                      <span className="font-mono text-sky-700 font-bold">{score}%</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                      style={{ width: `${score}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
