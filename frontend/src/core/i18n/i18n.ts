import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { esEC } from './locales/es-EC';
import { esPE } from './locales/es-PE';
import { enUS } from './locales/en-US';
import { SupportedLocale } from '../../types/i18n';

export const I18N_STORAGE_KEY = 'ateneo_locale';
export const NOSOLOGY_STORAGE_KEY = 'ateneo_nosology_region';

export const SUPPORTED_LOCALES: { code: SupportedLocale; label: string; region: string }[] = [
  { code: 'es-EC', label: 'Español (Ecuador)', region: 'MSP Ecuador' },
  { code: 'es-PE', label: 'Español (Perú)', region: 'MINSA Perú' },
  { code: 'en-US', label: 'English (US / Global)', region: 'WHO / PAHO' }
];

export function getInitialLocale(): SupportedLocale {
  if (typeof window === 'undefined') return 'es-EC';
  try {
    const saved = localStorage.getItem(I18N_STORAGE_KEY) as SupportedLocale | null;
    if (saved && (saved === 'es-EC' || saved === 'es-PE' || saved === 'en-US')) {
      return saved;
    }
  } catch {
    // Entorno sin localStorage
  }
  return 'es-EC';
}

export const resources = {
  'es-EC': {
    common: esEC.common,
    clinical: esEC.clinical,
    evaluation: esEC.evaluation,
    nosology: esEC.nosology
  },
  'es-PE': {
    common: esPE.common,
    clinical: esPE.clinical,
    evaluation: esPE.evaluation,
    nosology: esPE.nosology
  },
  'en-US': {
    common: enUS.common,
    clinical: enUS.clinical,
    evaluation: enUS.evaluation,
    nosology: enUS.nosology
  }
} as const;

// Inicialización de la instancia de i18next
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: getInitialLocale(),
    fallbackLng: 'es-EC',
    defaultNS: 'common',
    ns: ['common', 'clinical', 'evaluation', 'nosology'],
    interpolation: {
      escapeValue: false // React ya escapa XSS
    },
    react: {
      useSuspense: false
    }
  });
}

export default i18n;
