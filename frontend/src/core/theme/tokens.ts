/**
 * Tokens de Diseño Institucional y Catálogo de Tenants Médicos (Ateneo+)
 * Define identidades cromáticas, normativas por defecto y ratios de contraste WCAG AA.
 * Estricto cumplimiento: cero emojis y tipografía médica sobria.
 */

export type TenantId = 'default' | 'uce' | 'usfq' | 'msp_hospital';

export const TENANT_STORAGE_KEY = 'ateneo_active_tenant';

export interface TenantColors {
  brandPrimary: string;
  brandPrimaryHover: string;
  brandGradient: string;
  brandAccent: string;
  surfaceCanvas: string;
  cardRadius: string;
  textOnPrimary: string;
}

export interface TenantTheme {
  id: TenantId;
  nombreInstitucion: string;
  siglas: string;
  facultad: string;
  logoUrl: string;
  subdominios: string[];
  colores: TenantColors;
  gpcNormativaDefault: string;
  ratioContrasteWcag: number; // Ratio contra blanco o superficie
}

/**
 * Función para calcular la luminancia relativa y el ratio de contraste WCAG (ISO-9241-3)
 */
export function calculateContrastRatio(hex1: string, hex2: string): number {
  const getLuminance = (hex: string): number => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

    const sRGB = [r, g, b].map(val => {
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  };

  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Catálogo Oficial de Tenants Médicos Institucionales
 */
export const TENANT_THEMES: Record<TenantId, TenantTheme> = {
  default: {
    id: 'default',
    nombreInstitucion: 'Ateneo+ Sistema Nacional',
    siglas: 'ATENEO+',
    facultad: 'Plataforma Interhospitalaria de Simulación Clínica',
    logoUrl: '/ateneo.png',
    subdominios: ['localhost', 'ateneo.edu.ec', 'app.ateneo.edu.ec'],
    colores: {
      brandPrimary: '#2563eb', // Blue 600
      brandPrimaryHover: '#1d4ed8',
      brandGradient: 'linear-gradient(135deg, #06b6d4 0%, #2563eb 50%, #7c3aed 100%)',
      brandAccent: '#06b6d4',
      surfaceCanvas: '#f0f4f9',
      cardRadius: '28px',
      textOnPrimary: '#ffffff'
    },
    gpcNormativaDefault: 'Guías de Práctica Clínica MSP Ecuador',
    ratioContrasteWcag: Number(calculateContrastRatio('#2563eb', '#ffffff').toFixed(2))
  },
  uce: {
    id: 'uce',
    nombreInstitucion: 'Universidad Central del Ecuador',
    siglas: 'UCE',
    facultad: 'Facultad de Ciencias Médicas',
    logoUrl: '/ateneo.png',
    subdominios: ['medicina.uce.edu.ec', 'uce.ateneo.edu.ec'],
    colores: {
      brandPrimary: '#0f4c81', // Azul Marino Centralino
      brandPrimaryHover: '#0a365c',
      brandGradient: 'linear-gradient(135deg, #0f4c81 0%, #1e3a8a 60%, #b91c1c 100%)',
      brandAccent: '#b91c1c', // Rojo institucional
      surfaceCanvas: '#f1f5f9',
      cardRadius: '24px',
      textOnPrimary: '#ffffff'
    },
    gpcNormativaDefault: 'Cátedra de Medicina UCE / MSP',
    ratioContrasteWcag: Number(calculateContrastRatio('#0f4c81', '#ffffff').toFixed(2))
  },
  usfq: {
    id: 'usfq',
    nombreInstitucion: 'Universidad San Francisco de Quito',
    siglas: 'USFQ',
    facultad: 'Colegio de Ciencias de la Salud (COCSA)',
    logoUrl: '/ateneo.png',
    subdominios: ['salud.usfq.edu.ec', 'usfq.ateneo.edu.ec'],
    colores: {
      brandPrimary: '#991b1b', // Rojo Dragón USFQ
      brandPrimaryHover: '#7f1d1d',
      brandGradient: 'linear-gradient(135deg, #991b1b 0%, #b91c1c 50%, #d97706 100%)',
      brandAccent: '#d97706', // Dorado Dragón
      surfaceCanvas: '#faf5f5',
      cardRadius: '24px',
      textOnPrimary: '#ffffff'
    },
    gpcNormativaDefault: 'Protocolos Clínicos COCSA / USFQ',
    ratioContrasteWcag: Number(calculateContrastRatio('#991b1b', '#ffffff').toFixed(2))
  },
  msp_hospital: {
    id: 'msp_hospital',
    nombreInstitucion: 'Hospital Docente de Especialidades',
    siglas: 'RPIS / MSP',
    facultad: 'Comité de Docencia e Investigación Médica',
    logoUrl: '/ateneo.png',
    subdominios: ['hospital.msp.gob.ec', 'docencia.hospital.gob.ec'],
    colores: {
      brandPrimary: '#047857', // Verde Quirúrgico Sanitario
      brandPrimaryHover: '#065f46',
      brandGradient: 'linear-gradient(135deg, #047857 0%, #0284c7 60%, #0369a1 100%)',
      brandAccent: '#0284c7',
      surfaceCanvas: '#f0fdf4',
      cardRadius: '24px',
      textOnPrimary: '#ffffff'
    },
    gpcNormativaDefault: 'Protocolos de Emergencia y Cuidados Críticos MSP',
    ratioContrasteWcag: Number(calculateContrastRatio('#047857', '#ffffff').toFixed(2))
  }
};
