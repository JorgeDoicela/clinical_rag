import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { useI18n } from '../core/i18n/useI18n';
import { 
  resolveNosologyTerm, 
  getNosologyAuthority, 
  NOSOLOGY_AUTHORITIES 
} from '../core/i18n/nosologyAdapter';
import i18n, { I18N_STORAGE_KEY } from '../core/i18n/i18n';
import type { SupportedLocale } from '../types/i18n';

function I18nConsumerComponent() {
  const { 
    t, 
    locale, 
    changeLocale, 
    nosologyRegion, 
    changeNosologyRegion, 
    authority, 
    resolveNosology,
    supportedLocales 
  } = useI18n();

  const apendicitis = resolveNosology('apendicitis_aguda');

  return (
    <div>
      <span data-testid="current-locale">{locale}</span>
      <span data-testid="current-region">{nosologyRegion}</span>
      <span data-testid="authority-name">{authority.nombreAutoridad}</span>
      <span data-testid="authority-system">{authority.sistemaClasificacion}</span>

      {/* Textos traducidos por namespace */}
      <span data-testid="text-sistema">{t('common.sistema')}</span>
      <span data-testid="text-caso">{t('clinical.casoClinico')}</span>
      <span data-testid="text-rubrica">{t('evaluation.rubricaEvaluacion')}</span>
      <span data-testid="text-nosology-authority">{t('nosology.autoridadSalud')}</span>

      {/* Datos nosológicos resueltos */}
      <span data-testid="nosology-code">{apendicitis.codigoDiagnostico}</span>
      <span data-testid="nosology-term">{apendicitis.terminoLocal}</span>
      <span data-testid="nosology-guide">{apendicitis.guiaReferencia}</span>

      {/* Selectores interactivos */}
      <select
        data-testid="locale-select"
        value={locale}
        onChange={(e) => changeLocale(e.target.value as SupportedLocale)}
      >
        {supportedLocales.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>

      <button
        data-testid="btn-region-minsa"
        onClick={() => changeNosologyRegion('MINSA_PE')}
      >
        Cambiar MINSA
      </button>

      <button
        data-testid="btn-region-oms"
        onClick={() => changeNosologyRegion('OMS_GLOBAL')}
      >
        Cambiar OMS
      </button>
    </div>
  );
}

describe('Internacionalización Tipada y Localización Nosológica (Fase 15)', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('es-EC');
  });

  it('1. Carga por defecto en es-EC con terminología y normativas del MSP Ecuador', () => {
    render(<I18nConsumerComponent />);

    expect(screen.getByTestId('current-locale')).toHaveTextContent('es-EC');
    expect(screen.getByTestId('text-sistema')).toHaveTextContent('Ateneo+ Simulador Clínico');
    expect(screen.getByTestId('text-caso')).toHaveTextContent('Caso Clínico');
    expect(screen.getByTestId('text-rubrica')).toHaveTextContent('Rúbrica de Evaluación Médica');
    expect(screen.getByTestId('text-nosology-authority')).toHaveTextContent(
      'Ministerio de Salud Pública del Ecuador (MSP)'
    );

    // Verificación de código nosológico MSP
    expect(screen.getByTestId('nosology-code')).toHaveTextContent('CIE-10: K35.8');
    expect(screen.getByTestId('nosology-term')).toHaveTextContent('Apendicitis Aguda No Especificada');
    expect(screen.getByTestId('nosology-guide')).toHaveTextContent('GPC MSP');
  });

  it('2. Permite conmutar dinámicamente a inglés (en-US) actualizando diccionarios y persistiendo en localStorage', async () => {
    render(<I18nConsumerComponent />);

    const select = screen.getByTestId('locale-select');
    fireEvent.change(select, { target: { value: 'en-US' } });

    await waitFor(() => {
      expect(screen.getByTestId('current-locale')).toHaveTextContent('en-US');
    });

    expect(screen.getByTestId('text-sistema')).toHaveTextContent('Ateneo+ Clinical Simulator');
    expect(screen.getByTestId('text-caso')).toHaveTextContent('Clinical Case');
    expect(screen.getByTestId('text-rubrica')).toHaveTextContent('Medical Evaluation Rubric');

    // Persistencia en localStorage
    expect(localStorage.getItem(I18N_STORAGE_KEY)).toBe('en-US');
  });

  it('3. Adapta la nomenclatura nosológica a MINSA Perú con códigos CIE-10 y Normas Técnicas', async () => {
    render(<I18nConsumerComponent />);

    const select = screen.getByTestId('locale-select');
    fireEvent.change(select, { target: { value: 'es-PE' } });

    await waitFor(() => {
      expect(screen.getByTestId('current-locale')).toHaveTextContent('es-PE');
    });

    expect(screen.getByTestId('text-nosology-authority')).toHaveTextContent(
      'Ministerio de Salud del Perú (MINSA)'
    );

    expect(screen.getByTestId('nosology-guide')).toHaveTextContent(
      'Guía de Práctica Clínica para Abdomen Agudo Quirúrgico - MINSA'
    );
  });

  it('4. Resuelve la taxonomía internacional OMS/OPS con códigos CIE-11 para patologías críticas', () => {
    // Apendicitis Aguda en CIE-11 OMS
    const apendicitisOms = resolveNosologyTerm('apendicitis_aguda', 'OMS_GLOBAL');
    expect(apendicitisOms.codigoDiagnostico).toBe('CIE-11: DB10.Z');
    expect(apendicitisOms.terminoEstandar).toBe('Acute Appendicitis');

    // Neumonía en CIE-11 OMS
    const neumoniaOms = resolveNosologyTerm('neumonia_comunitaria', 'OMS_GLOBAL');
    expect(neumoniaOms.codigoDiagnostico).toBe('CIE-11: CA40.0');

    // Preeclampsia severa en CIE-11 OMS
    const preeclampsiaOms = resolveNosologyTerm('preeclampsia_severa', 'OMS_GLOBAL');
    expect(preeclampsiaOms.codigoDiagnostico).toBe('CIE-11: JA20.1');

    // Autoridad Sanitaria Global
    const authOms = getNosologyAuthority('OMS_GLOBAL');
    expect(authOms.sistemaClasificacion).toBe('CIE-11');
    expect(authOms.pais).toBe('Internacional');
  });

  it('5. Mantiene coherencia de fallback nosológico ante patologías no registradas', () => {
    const unknownTerm = resolveNosologyTerm('sindrome_desconocido_xyz', 'MSP_EC');
    expect(unknownTerm.codigoDiagnostico).toBe('CIE-10: R69');
    expect(unknownTerm.terminoLocal).toBe('Patología Médica No Especificada');
    expect(unknownTerm.guiaReferencia).toBe(NOSOLOGY_AUTHORITIES.MSP_EC.normativaBase);
  });
});
