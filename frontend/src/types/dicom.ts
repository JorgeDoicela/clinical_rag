/**
 * Definiciones de Tipos de Imagenología Médica Estándar (DICOM / PACS / WADO-RS)
 * Soporte para estudios volumétricos multicorte (TAC / RMN) y visualización multiplanar.
 * Estándar Ateneo+: tipado estricto, cero dependencias frágiles y precisión clínica.
 */

export type DicomModality = 'CT' | 'MR' | 'CR' | 'DX' | 'XA' | 'NM' | 'PET';

export type DicomViewPlane = 'axial' | 'coronal' | 'sagittal';

export type DicomActiveTool = 
  | 'scroll'
  | 'window'
  | 'pan'
  | 'zoom'
  | 'caliper'
  | 'hu-readout';

export interface DicomWindowPreset {
  id: string;
  name: string;
  windowWidth: number;
  windowCenter: number;
  description: string;
}

export interface DicomSliceMetadata {
  sliceIndex: number;
  instanceNumber: number;
  sopInstanceUid: string;
  sliceLocation?: number;
  sliceThickness?: number;
  pixelSpacing?: [number, number]; // [rowSpacing_mm, colSpacing_mm]
  rows: number;
  columns: number;
  windowCenter?: number;
  windowWidth?: number;
  rescaleIntercept?: number;
  rescaleSlope?: number;
  frameUrl?: string; // Endpoint WADO-RS / WADO-URI
}

export interface DicomSeriesMetadata {
  seriesInstanceUid: string;
  seriesNumber?: number;
  seriesDescription: string;
  modality: DicomModality;
  numberOfFrames: number;
  pixelSpacing: [number, number]; // mm por píxel
  sliceThickness: number; // mm
  patientOrientation?: string;
  windowPresets: DicomWindowPreset[];
  defaultWindowPresetId?: string;
  slices: DicomSliceMetadata[];
}

export interface DicomStudyMetadata {
  studyInstanceUid: string;
  studyDate?: string;
  patientId?: string;
  patientName?: string;
  patientSex?: 'M' | 'F' | 'O';
  patientAge?: string;
  studyDescription: string;
  institutionName?: string;
  wadoRsRoot?: string;
  series: DicomSeriesMetadata[];
}

export interface CaliperMeasurement {
  id: string;
  sliceIndex: number;
  plane: DicomViewPlane;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  distanceMm: number;
}

export interface DicomPixelReadout {
  x: number;
  y: number;
  hounsfieldUnits: number;
  normalizedLuminance: number;
}

/**
 * Presets Hounsfield Estándar de la American College of Radiology (ACR)
 */
export const STANDARD_HOUNSFIELD_PRESETS: DicomWindowPreset[] = [
  {
    id: 'lung',
    name: 'Pulmonar',
    windowWidth: 1500,
    windowCenter: -600,
    description: 'Visualización de parénquima pulmonar, bronquios y lesiones cavitadas (WW: 1500, WL: -600)',
  },
  {
    id: 'mediastinum',
    name: 'Mediastínica',
    windowWidth: 350,
    windowCenter: 40,
    description: 'Visualización de silueta cardiovascular, adenopatías y tejidos blandos (WW: 350, WL: 40)',
  },
  {
    id: 'bone',
    name: 'Ósea',
    windowWidth: 2000,
    windowCenter: 450,
    description: 'Estructuras corticales y trabeculares, fracturas y densidad ósea (WW: 2000, WL: 450)',
  },
  {
    id: 'brain',
    name: 'Cerebral',
    windowWidth: 80,
    windowCenter: 40,
    description: 'Diferenciación sustancia gris/blanca, isquemia y hematomas (WW: 80, WL: 40)',
  },
  {
    id: 'abdomen',
    name: 'Abdominal',
    windowWidth: 400,
    windowCenter: 40,
    description: 'Vísceras sólidas abdominales: hígado, bazo, páncreas y riñones (WW: 400, WL: 40)',
  },
];
