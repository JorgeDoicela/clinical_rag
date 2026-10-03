import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation as useReactI18nextTranslation } from 'react-i18next';
import i18n, { 
  I18N_STORAGE_KEY, 
  NOSOLOGY_STORAGE_KEY, 
  SUPPORTED_LOCALES,
  getInitialLocale 
} from './i18n';
import { 
  SupportedLocale, 
  NosologyRegion, 
  NosologyAuthority, 
  NosologyTerm 
} from '../../types/i18n';
import { 
  getNosologyAuthority, 
  resolveNosologyTerm, 
  getAvailableAuthorities 
} from './nosologyAdapter';

export function getInitialNosologyRegion(): NosologyRegion {
  if (typeof window === 'undefined') return 'MSP_EC';
  try {
    const saved = localStorage.getItem(NOSOLOGY_STORAGE_KEY) as NosologyRegion | null;
    if (saved && (saved === 'MSP_EC' || saved === 'MINSA_PE' || saved === 'OMS_GLOBAL')) {
      return saved;
    }
  } catch {
    // Entorno sin localStorage
  }
  return 'MSP_EC';
}

export function useI18n() {
  const { t: translate } = useReactI18nextTranslation();
  const [locale, setLocaleState] = useState<SupportedLocale>(() => getInitialLocale());
  const [nosologyRegion, setNosologyRegionState] = useState<NosologyRegion>(() => getInitialNosologyRegion());

  const t = useCallback((key: string, options?: Record<string, unknown>): string => {
    if (key.includes('.')) {
      const [ns, ...rest] = key.split('.');
      return translate(rest.join('.'), { ns, ...options });
    }
    if (key.includes(':')) {
      const [ns, ...rest] = key.split(':');
      return translate(rest.join(':'), { ns, ...options });
    }
    return translate(key, options);
  }, [translate]);

  // Sincronizar estado local si i18n cambia de forma externa
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      if (lng === 'es-EC' || lng === 'es-PE' || lng === 'en-US') {
        setLocaleState(lng);
      }
    };
    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  const changeLocale = useCallback(async (newLocale: SupportedLocale) => {
    await i18n.changeLanguage(newLocale);
    setLocaleState(newLocale);
    try {
      localStorage.setItem(I18N_STORAGE_KEY, newLocale);
    } catch {
      // Ignorar fallos de almacenamiento
    }

    // Auto-alinear la taxonomía nosológica según el idioma si no se especificó otra
    if (newLocale === 'es-PE') {
      changeNosologyRegion('MINSA_PE');
    } else if (newLocale === 'en-US') {
      changeNosologyRegion('OMS_GLOBAL');
    } else if (newLocale === 'es-EC') {
      changeNosologyRegion('MSP_EC');
    }
  }, []);

  const changeNosologyRegion = useCallback((region: NosologyRegion) => {
    setNosologyRegionState(region);
    try {
      localStorage.setItem(NOSOLOGY_STORAGE_KEY, region);
    } catch {
      // Ignorar fallos de almacenamiento
    }
  }, []);

  const authority = useMemo<NosologyAuthority>(() => {
    return getNosologyAuthority(nosologyRegion);
  }, [nosologyRegion]);

  const resolveNosology = useCallback((pathologyKey: string): NosologyTerm => {
    return resolveNosologyTerm(pathologyKey, nosologyRegion);
  }, [nosologyRegion]);

  return {
    t,
    locale,
    changeLocale,
    nosologyRegion,
    changeNosologyRegion,
    authority,
    resolveNosology,
    supportedLocales: SUPPORTED_LOCALES,
    availableAuthorities: getAvailableAuthorities()
  };
}
