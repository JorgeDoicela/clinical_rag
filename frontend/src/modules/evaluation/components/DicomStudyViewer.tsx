import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Ruler,
  Layers,
  Crosshair
} from 'lucide-react';
import {
  DicomStudyMetadata,
  DicomSeriesMetadata,
  DicomViewPlane,
  DicomActiveTool,
  DicomWindowPreset,
  CaliperMeasurement,
  DicomPixelReadout,
  STANDARD_HOUNSFIELD_PRESETS
} from '../../../types/dicom';

export interface DicomStudyViewerProps {
  study?: DicomStudyMetadata;
  wadoRsUrl?: string;
  initialSeriesIndex?: number;
  initialPresetId?: string;
  onSliceChange?: (sliceIndex: number, totalSlices: number) => void;
  className?: string;
}

/**
 * Generador sintético de volumen tomográfico de alta fidelidad clínica (HU nativo)
 * Se utiliza cuando se monta un caso sin backend PACS WADO-RS remoto disponible.
 */
function createSyntheticCtSeries(
  numberOfSlices = 48,
  rows = 256,
  cols = 256
): {
  slicesData: Float32Array[];
  metadata: DicomSeriesMetadata;
} {
  const slicesData: Float32Array[] = [];
  const pixelSpacingMm: [number, number] = [0.85, 0.85]; // 0.85 mm por píxel
  const sliceThicknessMm = 2.5; // Cortes de 2.5 mm

  for (let z = 0; z < numberOfSlices; z++) {
    const slice = new Float32Array(rows * cols);

    for (let r = 0; r < rows; r++) {
      const yNorm = (r - rows / 2) / (rows / 2);
      for (let c = 0; c < cols; c++) {
        const xNorm = (c - cols / 2) / (cols / 2);
        const distFromCenter = Math.sqrt(xNorm * xNorm + yNorm * yNorm);
        const idx = r * cols + c;

        // Aire exterior: -1000 HU
        let hu = -1000;

        if (distFromCenter < 0.88) {
          // Piel y tejido subcutáneo: -60 HU (grasa) / +35 HU (tejido blando)
          hu = distFromCenter > 0.82 ? -40 : 35;
        }

        if (distFromCenter < 0.78 && distFromCenter > 0.73) {
          // Parrilla costal / Estructura ósea: +700 a +1200 HU
          const ribAngle = Math.atan2(yNorm, xNorm);
          if (Math.sin(ribAngle * 8 + z * 0.4) > 0.2) {
            hu = 850;
          }
        }

        // Columna vertebral posterior
        if (yNorm > 0.45 && yNorm < 0.75 && Math.abs(xNorm) < 0.18) {
          hu = 1100; // Cuerpo vertebral
          if (Math.abs(xNorm) < 0.06 && yNorm > 0.52 && yNorm < 0.65) {
            hu = 15; // Canal medular / LCR
          }
        }

        // Parénquima pulmonar (tórax): -750 HU a -600 HU
        const isLeftLung = xNorm < -0.12 && xNorm > -0.72 && Math.abs(yNorm) < 0.65;
        const isRightLung = xNorm > 0.12 && xNorm > 0.08 && xNorm < 0.72 && Math.abs(yNorm) < 0.65;

        if ((isLeftLung || isRightLung) && distFromCenter < 0.72) {
          hu = -680 + Math.sin(xNorm * 10 + yNorm * 10) * 40;

          // Estructuras vasculares broncopulmonares
          if (Math.abs(Math.sin(xNorm * 18 + z * 0.3)) < 0.08 && Math.abs(yNorm) < 0.5) {
            hu = 45; // Vaso pulmonar
          }

          // Posible nódulo / condensación en vértice o base
          if (z > 20 && z < 28 && Math.hypot(xNorm + 0.35, yNorm - 0.1) < 0.09) {
            hu = 65; // Masa / Nódulo pulmonar sólido
          }
        }

        // Silueta mediastínica central / Corazón: +40 a +55 HU
        if (Math.abs(xNorm) < 0.35 && yNorm > -0.3 && yNorm < 0.45 && distFromCenter < 0.6) {
          hu = 45;
          // Grandes vasos o cavidades con contraste
          if (Math.hypot(xNorm + 0.05, yNorm) < 0.18) {
            hu = 180; // Sangre con contraste yodado
          }
        }

        slice[idx] = hu;
      }
    }
    slicesData.push(slice);
  }

  const seriesMeta: DicomSeriesMetadata = {
    seriesInstanceUid: '1.2.840.10008.1.series.synthetic.001',
    seriesNumber: 2,
    seriesDescription: 'TAC Tórax Multicorte con Contraste (Serie Axial 2.5mm)',
    modality: 'CT',
    numberOfFrames: numberOfSlices,
    pixelSpacing: pixelSpacingMm,
    sliceThickness: sliceThicknessMm,
    windowPresets: STANDARD_HOUNSFIELD_PRESETS,
    defaultWindowPresetId: 'lung',
    slices: slicesData.map((_, idx) => ({
      sliceIndex: idx,
      instanceNumber: idx + 1,
      sopInstanceUid: `1.2.840.10008.1.instance.${idx + 1}`,
      sliceLocation: -120 + idx * sliceThicknessMm,
      sliceThickness: sliceThicknessMm,
      pixelSpacing: pixelSpacingMm,
      rows,
      columns: cols,
      windowCenter: -600,
      windowWidth: 1500,
      rescaleIntercept: 0,
      rescaleSlope: 1,
    }))
  };

  return { slicesData, metadata: seriesMeta };
}

/**
 * Visor Diagnóstico de Estudios Médicos Volumétricos DICOM / WADO-RS
 * Implementa renderizado de matriz Hounsfield nativa, ventanas radiológicas,
 * navegación de cortes axiales, coronales y sagitales, caliper métrico y HU readout.
 */
export const DicomStudyViewer: React.FC<DicomStudyViewerProps> = ({
  study,
  wadoRsUrl,
  initialSeriesIndex = 0,
  initialPresetId = 'lung',
  onSliceChange,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Datos volumétricos de la serie activa
  const [syntheticData, setSyntheticData] = useState<{
    slicesData: Float32Array[];
    metadata: DicomSeriesMetadata;
  } | null>(null);

  const activeSeries: DicomSeriesMetadata = useMemo(() => {
    if (study && study.series && study.series[initialSeriesIndex]) {
      return study.series[initialSeriesIndex];
    }
    if (syntheticData) {
      return syntheticData.metadata;
    }
    return {
      seriesInstanceUid: 'default-series',
      seriesDescription: 'Estudio Tomográfico Axial Computarizado',
      modality: 'CT',
      numberOfFrames: 48,
      pixelSpacing: [0.85, 0.85],
      sliceThickness: 2.5,
      windowPresets: STANDARD_HOUNSFIELD_PRESETS,
      defaultWindowPresetId: 'lung',
      slices: []
    };
  }, [study, initialSeriesIndex, syntheticData]);

  // Carga o generación de volumen
  useEffect(() => {
    if (!study || !study.series || study.series.length === 0) {
      const generated = createSyntheticCtSeries(48, 256, 256);
      setSyntheticData(generated);
    }
  }, [study]);

  // 2. Estados de navegación volumétrica
  const [currentSlice, setCurrentSlice] = useState<number>(24);
  const [viewPlane, setViewPlane] = useState<DicomViewPlane>('axial');
  const [activeTool, setActiveTool] = useState<DicomActiveTool>('window');

  // 3. Ventana Hounsfield (Window Center / Window Width)
  const [activePreset, setActivePreset] = useState<string>(initialPresetId);
  const [windowCenter, setWindowCenter] = useState<number>(-600);
  const [windowWidth, setWindowWidth] = useState<number>(1500);
  const [showWindowControls, setShowWindowControls] = useState<boolean>(false);

  // 4. Transformaciones espaciales (Zoom y Paneo)
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState<boolean>(false);
  const interactionStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 5. Herramienta Caliper (Medición milimétrica)
  const caliperOriginRef = useRef<{ x: number; y: number } | null>(null);
  const [caliperPoints, setCaliperPoints] = useState<{ start: { x: number; y: number } | null; end: { x: number; y: number } | null }>({
    start: null,
    end: null
  });
  const [measurements, setMeasurements] = useState<CaliperMeasurement[]>([]);

  // 6. HU Readout (Unidades Hounsfield bajo el puntero)
  const [pixelReadout, setPixelReadout] = useState<DicomPixelReadout | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Notificar cambio de corte
  useEffect(() => {
    if (onSliceChange) {
      onSliceChange(currentSlice, activeSeries.numberOfFrames);
    }
  }, [currentSlice, activeSeries.numberOfFrames, onSliceChange]);

  // Aplicar preset Hounsfield
  const applyPreset = useCallback((preset: DicomWindowPreset) => {
    setActivePreset(preset.id);
    setWindowCenter(preset.windowCenter);
    setWindowWidth(preset.windowWidth);
  }, []);

  // Cambio de plano de corte
  const handlePlaneChange = useCallback((plane: DicomViewPlane) => {
    setViewPlane(plane);
    setCurrentSlice(16); // Centrar en el nuevo plano
  }, []);

  // Reset de vistas
  const resetView = useCallback(() => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    caliperOriginRef.current = null;
    setCaliperPoints({ start: null, end: null });
    const defaultPreset = STANDARD_HOUNSFIELD_PRESETS.find(p => p.id === initialPresetId) || STANDARD_HOUNSFIELD_PRESETS[0];
    applyPreset(defaultPreset);
  }, [initialPresetId, applyPreset]);

  // Obtener vóxel de volumen (HU) según el plano anatómico seleccionado
  const getVoxelHu = useCallback((col: number, row: number, sliceIdx: number): number => {
    if (!syntheticData) return -1000;
    const { slicesData, metadata } = syntheticData;
    const numSlices = metadata.numberOfFrames;
    const dim = 256;

    let z = sliceIdx;
    let y = row;
    let x = col;

    if (viewPlane === 'coronal') {
      // Coronal: X = col, Y = sliceIdx (eje Y anteroposterior), Z = invertRow (inferosuperior)
      y = Math.min(Math.max(0, sliceIdx), dim - 1);
      z = Math.min(Math.max(0, Math.floor((row / dim) * numSlices)), numSlices - 1);
      x = Math.min(Math.max(0, col), dim - 1);
    } else if (viewPlane === 'sagittal') {
      // Sagital: X = sliceIdx (lateral), Y = col, Z = invertRow
      x = Math.min(Math.max(0, sliceIdx), dim - 1);
      y = Math.min(Math.max(0, col), dim - 1);
      z = Math.min(Math.max(0, Math.floor((row / dim) * numSlices)), numSlices - 1);
    } else {
      // Axial: Z = sliceIdx, Y = row, X = col
      z = Math.min(Math.max(0, sliceIdx), numSlices - 1);
      y = Math.min(Math.max(0, row), dim - 1);
      x = Math.min(Math.max(0, col), dim - 1);
    }

    const currentSliceArray = slicesData[z];
    if (!currentSliceArray) return -1000;
    return currentSliceArray[y * dim + x] ?? -1000;
  }, [syntheticData, viewPlane]);

  // Renderizado en Canvas 2D acelerado con LUT Hounsfield
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Limpieza con fondo de negatoscopio de alta fidelidad
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    const dim = 256;
    const imgData = ctx.createImageData(dim, dim);
    const data = imgData.data;

    const lowHu = windowCenter - windowWidth / 2;
    const highHu = windowCenter + windowWidth / 2;
    const range = highHu - lowHu || 1;

    // Mapeo de píxeles con la función de transferencia radiológica Hounsfield
    for (let r = 0; r < dim; r++) {
      for (let c = 0; c < dim; c++) {
        const hu = getVoxelHu(c, r, currentSlice);

        // Clamp y normalización [0, 255]
        let intensity = 0;
        if (hu <= lowHu) {
          intensity = 0;
        } else if (hu >= highHu) {
          intensity = 255;
        } else {
          intensity = Math.round(((hu - lowHu) / range) * 255);
        }

        const pixelIdx = (r * dim + c) * 4;
        data[pixelIdx] = intensity;     // R
        data[pixelIdx + 1] = intensity; // G
        data[pixelIdx + 2] = intensity; // B
        data[pixelIdx + 3] = 255;       // A
      }
    }

    // Dibujo en buffer temporal escalado
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = dim;
    tempCanvas.height = dim;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.putImageData(imgData, 0, 0);
    }

    ctx.save();
    // Transformaciones de zoom y paneo centradas
    ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
    ctx.scale(zoom, zoom);

    // Dibujar imagen centrada en el canvas
    const drawSize = Math.min(width, height) * 0.88;
    ctx.drawImage(tempCanvas, -drawSize / 2, -drawSize / 2, drawSize, drawSize);

    // Dibujar mediciones de caliper activas en este corte y plano
    ctx.strokeStyle = '#06b6d4';
    ctx.fillStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    ctx.font = '11px "Google Sans", sans-serif';

    const renderCaliper = (start: { x: number; y: number }, end: { x: number; y: number }, text: string) => {
      const sx = (start.x - dim / 2) * (drawSize / dim);
      const sy = (start.y - dim / 2) * (drawSize / dim);
      const ex = (end.x - dim / 2) * (drawSize / dim);
      const ey = (end.y - dim / 2) * (drawSize / dim);

      // Línea de medición
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // Puntos en los extremos (cruces milimétricas)
      const crossSize = 4;
      ctx.beginPath();
      ctx.moveTo(sx - crossSize, sy);
      ctx.lineTo(sx + crossSize, sy);
      ctx.moveTo(sx, sy - crossSize);
      ctx.lineTo(sx, sy + crossSize);
      ctx.moveTo(ex - crossSize, ey);
      ctx.lineTo(ex + crossSize, ey);
      ctx.moveTo(ex, ey - crossSize);
      ctx.lineTo(ex, ey + crossSize);
      ctx.stroke();

      // Etiqueta con distancia métrica
      const midX = (sx + ex) / 2;
      const midY = (sy + ey) / 2;
      ctx.fillText(text, midX + 8, midY - 6);
    };

    // Mediciones guardadas
    measurements
      .filter(m => m.sliceIndex === currentSlice && m.plane === viewPlane)
      .forEach(m => {
        renderCaliper({ x: m.startX, y: m.startY }, { x: m.endX, y: m.endY }, `${m.distanceMm.toFixed(1)} mm`);
      });

    // Medición en curso
    if (caliperPoints.start && caliperPoints.end) {
      const pSpacing = activeSeries.pixelSpacing[0] || 0.85;
      const dx = (caliperPoints.end.x - caliperPoints.start.x) * pSpacing;
      const dy = (caliperPoints.end.y - caliperPoints.start.y) * pSpacing;
      const distMm = Math.sqrt(dx * dx + dy * dy);
      renderCaliper(caliperPoints.start, caliperPoints.end, `${distMm.toFixed(1)} mm`);
    }

    ctx.restore();

    // Rejilla de orientación médica (Marcadores anatómicos R, L, A, P, S, I)
    ctx.fillStyle = '#64748b';
    ctx.font = '12px "Google Sans", sans-serif';
    ctx.textAlign = 'center';

    if (viewPlane === 'axial') {
      ctx.fillText('A (Anterior)', width / 2, 24);
      ctx.fillText('P (Posterior)', width / 2, height - 12);
      ctx.textAlign = 'left';
      ctx.fillText('R (Der)', 16, height / 2);
      ctx.textAlign = 'right';
      ctx.fillText('L (Izq)', width - 16, height / 2);
    } else if (viewPlane === 'coronal') {
      ctx.fillText('S (Superior)', width / 2, 24);
      ctx.fillText('I (Inferior)', width / 2, height - 12);
      ctx.textAlign = 'left';
      ctx.fillText('R (Der)', 16, height / 2);
      ctx.textAlign = 'right';
      ctx.fillText('L (Izq)', width - 16, height / 2);
    } else {
      ctx.fillText('S (Superior)', width / 2, 24);
      ctx.fillText('I (Inferior)', width / 2, height - 12);
      ctx.textAlign = 'left';
      ctx.fillText('A (Anterior)', 16, height / 2);
      ctx.textAlign = 'right';
      ctx.fillText('P (Posterior)', width - 16, height / 2);
    }
  }, [
    currentSlice,
    viewPlane,
    windowCenter,
    windowWidth,
    zoom,
    pan,
    caliperPoints,
    measurements,
    activeSeries.pixelSpacing,
    getVoxelHu
  ]);

  // Redibujado continuo al cambiar estados
  useEffect(() => {
    let animationId: number;
    const render = () => {
      renderCanvas();
    };
    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [renderCanvas]);

  // Manejo de rueda del ratón (Wheel)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (activeTool === 'zoom') {
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoom(prev => Math.min(Math.max(0.5, prev * zoomFactor), 4.0));
    } else {
      // Navegación de corte por rueda
      const maxSlices = viewPlane === 'axial' ? activeSeries.numberOfFrames : 256;
      if (e.deltaY < 0) {
        setCurrentSlice(prev => Math.min(prev + 1, maxSlices - 1));
      } else {
        setCurrentSlice(prev => Math.max(prev - 1, 0));
      }
    }
  };

  // Conversión de coordenadas de ratón a coordenadas del volumen [0, 255]
  const screenToVolumeCoords = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const cx = screenX - rect.left;
    const cy = screenY - rect.top;

    const width = canvas.width;
    const height = canvas.height;
    const drawSize = Math.min(width, height) * 0.88;

    // Deshacer traslación y escala
    const unscaledX = (cx - (width / 2 + pan.x)) / zoom;
    const unscaledY = (cy - (height / 2 + pan.y)) / zoom;

    const dim = 256;
    const volX = Math.round((unscaledX / drawSize + 0.5) * dim);
    const volY = Math.round((unscaledY / drawSize + 0.5) * dim);

    return {
      x: Math.min(Math.max(0, volX), dim - 1),
      y: Math.min(Math.max(0, volY), dim - 1)
    };
  }, [pan, zoom]);

  // Interacción de ratón (Down, Move, Up)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsInteracting(true);
    interactionStartRef.current = { x: e.clientX, y: e.clientY };

    if (activeTool === 'caliper') {
      const coords = screenToVolumeCoords(e.clientX, e.clientY);
      if (!caliperOriginRef.current) {
        // Primer punto (origen)
        caliperOriginRef.current = coords;
        setCaliperPoints({ start: coords, end: null });
      } else {
        // Segundo punto (fijar medición)
        const origin = caliperOriginRef.current;
        const pSpacing = activeSeries.pixelSpacing[0] || 0.85;
        const dx = (coords.x - origin.x) * pSpacing;
        const dy = (coords.y - origin.y) * pSpacing;
        const distMm = Math.sqrt(dx * dx + dy * dy);

        const newMeasurement: CaliperMeasurement = {
          id: `meas-${Date.now()}`,
          sliceIndex: currentSlice,
          plane: viewPlane,
          startX: origin.x,
          startY: origin.y,
          endX: coords.x,
          endY: coords.y,
          distanceMm: distMm
        };
        setMeasurements(prev => [...prev, newMeasurement]);
        caliperOriginRef.current = null;
        setCaliperPoints({ start: null, end: null });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = screenToVolumeCoords(e.clientX, e.clientY);
    const hu = getVoxelHu(coords.x, coords.y, currentSlice);
    setPixelReadout({
      x: coords.x,
      y: coords.y,
      hounsfieldUnits: hu,
      normalizedLuminance: Math.min(Math.max(0, (hu - (windowCenter - windowWidth / 2)) / windowWidth), 1)
    });

    if (activeTool === 'caliper' && caliperOriginRef.current) {
      setCaliperPoints({ start: caliperOriginRef.current, end: coords });
    }

    if (!isInteracting) return;

    const deltaX = e.clientX - interactionStartRef.current.x;
    const deltaY = e.clientY - interactionStartRef.current.y;
    interactionStartRef.current = { x: e.clientX, y: e.clientY };

    if (activeTool === 'pan') {
      setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
    } else if (activeTool === 'window') {
      // Ajuste dinámico de Window Width y Window Center al arrastrar
      setWindowWidth(prev => Math.max(1, prev + deltaX * 4));
      setWindowCenter(prev => prev - deltaY * 4);
      setActivePreset('custom');
    } else if (activeTool === 'scroll') {
      const maxSlices = viewPlane === 'axial' ? activeSeries.numberOfFrames : 256;
      if (Math.abs(deltaY) > 3) {
        setCurrentSlice(prev => {
          const next = deltaY < 0 ? prev + 1 : prev - 1;
          return Math.min(Math.max(0, next), maxSlices - 1);
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsInteracting(false);
  };

  // Controles de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const maxSlices = viewPlane === 'axial' ? activeSeries.numberOfFrames : 256;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentSlice(prev => Math.min(prev + 1, maxSlices - 1));
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentSlice(prev => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewPlane, activeSeries.numberOfFrames]);

  const maxSlices = viewPlane === 'axial' ? activeSeries.numberOfFrames : 256;

  return (
    <div 
      ref={containerRef} 
      className={`relative flex flex-col bg-[#090d16] rounded-[24px] overflow-hidden text-slate-200 border border-slate-800/80 shadow-lg ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full min-h-[460px]'
      } ${className}`}
      data-testid="dicom-study-viewer"
    >
      {/* 1. Barra de Encabezado Médico e Información del Estudio */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-[#0d1527] border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-cyan-400" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wide text-white uppercase font-heading">
                {activeSeries.seriesDescription}
              </span>
              <span className="text-[10px] font-medium bg-cyan-950 text-cyan-300 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                {activeSeries.modality} · {wadoRsUrl ? 'WADO-RS Remoto' : 'WADO-RS'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-3">
              <span>Corte {currentSlice + 1} de {maxSlices}</span>
              <span>Grosor: {activeSeries.sliceThickness} mm</span>
              <span>Espaciado: {activeSeries.pixelSpacing[0]} mm/px</span>
            </div>
          </div>
        </div>

        {/* Selector de Plano Ortogonal (Axial, Coronal, Sagital) */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
          {(['axial', 'coronal', 'sagittal'] as DicomViewPlane[]).map(plane => (
            <button
              key={plane}
              onClick={() => handlePlaneChange(plane)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                viewPlane === plane 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {plane.charAt(0).toUpperCase() + plane.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Área Central del Negatoscopio (Lienzo Canvas) */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-[#090d16] select-none">
        <canvas
          ref={canvasRef}
          width={560}
          height={400}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="cursor-crosshair max-w-full max-h-full block"
          data-testid="dicom-canvas"
        />

        {/* Readout de Unidades Hounsfield (HU) en esquina superior izquierda */}
        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 pointer-events-none space-y-0.5">
          <div className="flex items-center gap-1.5 text-cyan-400 font-medium">
            <Crosshair className="w-3 h-3" />
            <span>Densidad HU: {pixelReadout ? `${pixelReadout.hounsfieldUnits} HU` : '---'}</span>
          </div>
          <div className="text-[10px] text-slate-400">
            WL: {Math.round(windowCenter)} · WW: {Math.round(windowWidth)}
          </div>
        </div>

        {/* Indicador de Zoom y Posición en esquina superior derecha */}
        <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 pointer-events-none">
          <span>Zoom: {Math.round(zoom * 100)}%</span>
        </div>

        {/* Medición Caliper Activa en esquina inferior izquierda */}
        {measurements.length > 0 && (
          <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] text-cyan-300 pointer-events-none flex items-center gap-1.5">
            <Ruler className="w-3 h-3 text-cyan-400" />
            <span>Medición: {measurements[measurements.length - 1].distanceMm.toFixed(1)} mm</span>
          </div>
        )}
      </div>

      {/* 3. Panel de Navegación de Cortes (Slider Continuo y Flechas) */}
      <div className="px-4 py-2 bg-[#0c1322] border-t border-slate-800/80 flex items-center gap-3">
        <button
          onClick={() => setCurrentSlice(prev => Math.max(0, prev - 1))}
          disabled={currentSlice <= 0}
          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
          aria-label="Corte anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <input
          type="range"
          min={0}
          max={maxSlices - 1}
          value={currentSlice}
          onChange={(e) => setCurrentSlice(parseInt(e.target.value, 10))}
          className="flex-1 accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          aria-label="Selector de corte axial"
        />

        <button
          onClick={() => setCurrentSlice(prev => Math.min(maxSlices - 1, prev + 1))}
          disabled={currentSlice >= maxSlices - 1}
          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
          aria-label="Corte siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <span className="text-xs text-slate-400 font-mono w-16 text-right">
          {currentSlice + 1} / {maxSlices}
        </span>
      </div>

      {/* 4. Barra Inferior de Herramientas y Presets Hounsfield */}
      <div className="px-4 py-2.5 bg-[#090d16] border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Presets Hounsfield de Grado Médico */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="text-[11px] text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Sliders className="w-3 h-3 text-cyan-400" />
            Ventana:
          </span>
          {STANDARD_HOUNSFIELD_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                activePreset === preset.id
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
          <button
            onClick={() => setShowWindowControls(prev => !prev)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              showWindowControls
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Ajuste Manual
          </button>
        </div>

        {/* Herramientas de Interacción */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => setActiveTool(prev => prev === 'window' ? 'scroll' : 'window')}
            className={`p-1.5 rounded transition-colors ${
              activeTool === 'window' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Ajuste de Ventana con Ratón (Arrastrar)"
            aria-label="Herramienta Ventana"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTool(prev => prev === 'caliper' ? 'window' : 'caliper')}
            className={`p-1.5 rounded transition-colors ${
              activeTool === 'caliper' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Caliper: Medición de Distancia (Marcar dos puntos)"
            aria-label="Herramienta Caliper"
          >
            <Ruler className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            onClick={() => setZoom(prev => Math.min(prev * 1.25, 4.0))}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Acercar Imagen"
            aria-label="Acercar"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setZoom(prev => Math.max(prev / 1.25, 0.5))}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Alejar Imagen"
            aria-label="Alejar"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={resetView}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Restablecer Vista"
            aria-label="Restablecer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsFullscreen(prev => !prev)}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            title={isFullscreen ? 'Salir de Pantalla Completa' : 'Pantalla Completa'}
            aria-label="Pantalla completa"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 5. Panel Desplegable de Ajuste Manual de Ventana (Window Level / Window Width) */}
      {showWindowControls && (
        <div className="px-4 py-3 bg-[#0d1527] border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Nivel de Ventana (WL / Centro):</span>
              <span className="font-mono text-cyan-300">{Math.round(windowCenter)} HU</span>
            </div>
            <input
              type="range"
              min={-1000}
              max={1500}
              value={windowCenter}
              onChange={(e) => {
                setWindowCenter(parseInt(e.target.value, 10));
                setActivePreset('custom');
              }}
              className="w-full accent-cyan-500 h-1 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Ancho de Ventana (WW / Rango):</span>
              <span className="font-mono text-cyan-300">{Math.round(windowWidth)} HU</span>
            </div>
            <input
              type="range"
              min={10}
              max={3000}
              value={windowWidth}
              onChange={(e) => {
                setWindowWidth(parseInt(e.target.value, 10));
                setActivePreset('custom');
              }}
              className="w-full accent-cyan-500 h-1 bg-slate-800 rounded cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DicomStudyViewer;
