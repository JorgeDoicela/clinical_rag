import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ThemeProvider, useTheme } from '../core/theme/ThemeProvider';
import { 
  TENANT_THEMES, 
  calculateContrastRatio, 
  TenantId, 
  TENANT_STORAGE_KEY 
} from '../core/theme/tokens';

function TestConsumerComponent() {
  const { tenant, tenantId, setTenantId, availableTenants } = useTheme();

  return (
    <div>
      <span data-testid="current-tenant-id">{tenantId}</span>
      <span data-testid="current-tenant-name">{tenant.nombreInstitucion}</span>
      <span data-testid="current-tenant-siglas">{tenant.siglas}</span>
      <span data-testid="current-tenant-gpc">{tenant.gpcNormativaDefault}</span>
      <span data-testid="current-contrast">{tenant.ratioContrasteWcag.toFixed(1)}</span>

      <select
        data-testid="tenant-changer"
        value={tenantId}
        onChange={(e) => setTenantId(e.target.value as TenantId)}
      >
        {availableTenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.siglas}
          </option>
        ))}
      </select>
    </div>
  );
}

describe('ThemeProvider & Multi-Tenancy UI (Fase 14)', () => {
  beforeEach(() => {
    localStorage.clear();
    // Limpiar atributos y variables de documentElement
    document.documentElement.removeAttribute('data-tenant');
    document.documentElement.style.removeProperty('--ateneo-brand-primary');
    document.documentElement.style.removeProperty('--ateneo-brand-hover');
    document.documentElement.style.removeProperty('--ateneo-brand-gradient');
    document.documentElement.style.removeProperty('--ateneo-surface-canvas');
    document.documentElement.style.removeProperty('--ateneo-card-radius');
  });

  it('1. Inyecta correctamente las variables CSS de tokens institucionales en document.documentElement', () => {
    render(
      <ThemeProvider>
        <TestConsumerComponent />
      </ThemeProvider>
    );

    // Debe asignar data-tenant="default"
    expect(document.documentElement.getAttribute('data-tenant')).toBe('default');

    // Comprobar variables CSS inyectadas
    const defaultTheme = TENANT_THEMES.default;
    expect(document.documentElement.style.getPropertyValue('--ateneo-brand-primary')).toBe(
      defaultTheme.colores.brandPrimary
    );
    expect(document.documentElement.style.getPropertyValue('--ateneo-surface-canvas')).toBe(
      defaultTheme.colores.surfaceCanvas
    );
    expect(document.documentElement.style.getPropertyValue('--ateneo-card-radius')).toBe(
      defaultTheme.colores.cardRadius
    );

    // Comprobar render en el consumidor
    expect(screen.getByTestId('current-tenant-id')).toHaveTextContent('default');
    expect(screen.getByTestId('current-tenant-siglas')).toHaveTextContent('ATENEO+');
  });

  it('2. Permite cambiar de tenant en caliente actualizando estilos y persistiendo en localStorage', () => {
    render(
      <ThemeProvider>
        <TestConsumerComponent />
      </ThemeProvider>
    );

    const selector = screen.getByTestId('tenant-changer');

    // Cambiar a Universidad Central del Ecuador (UCE)
    fireEvent.change(selector, { target: { value: 'uce' } });

    expect(screen.getByTestId('current-tenant-id')).toHaveTextContent('uce');
    expect(screen.getByTestId('current-tenant-siglas')).toHaveTextContent('UCE');
    expect(screen.getByTestId('current-tenant-name')).toHaveTextContent(
      'Universidad Central del Ecuador'
    );

    // Variables CSS actualizadas a UCE (#b91c1c)
    expect(document.documentElement.getAttribute('data-tenant')).toBe('uce');
    expect(document.documentElement.style.getPropertyValue('--ateneo-brand-primary')).toBe(
      TENANT_THEMES.uce.colores.brandPrimary
    );

    // Persistencia verificada con la clave canónica
    expect(localStorage.getItem(TENANT_STORAGE_KEY)).toBe('uce');
  });

  it('3. Cumple la norma de accesibilidad WCAG AA (ratio de contraste >= 4.5:1) en todos los tenants', () => {
    const tenants: TenantId[] = ['default', 'uce', 'usfq', 'msp_hospital'];

    tenants.forEach((id) => {
      const theme = TENANT_THEMES[id];
      // El color primario sobre fondo blanco debe tener al menos ratio 4.5:1 (WCAG AA para texto)
      const ratio = calculateContrastRatio(theme.colores.brandPrimary, '#ffffff');
      
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(theme.ratioContrasteWcag).toBeCloseTo(ratio, 1);
    });
  });

  it('4. Recupera automáticamente el tenant guardado en localStorage al iniciar', () => {
    localStorage.setItem(TENANT_STORAGE_KEY, 'usfq');

    render(
      <ThemeProvider>
        <TestConsumerComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-tenant-id')).toHaveTextContent('usfq');
    expect(screen.getByTestId('current-tenant-siglas')).toHaveTextContent('USFQ');
    expect(document.documentElement.getAttribute('data-tenant')).toBe('usfq');
    expect(document.documentElement.style.getPropertyValue('--ateneo-brand-primary')).toBe(
      TENANT_THEMES.usfq.colores.brandPrimary
    );
  });

  it('5. Aplica la normativa GPC oficial por defecto según el tenant seleccionado', () => {
    render(
      <ThemeProvider defaultTenantId="msp_hospital">
        <TestConsumerComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-tenant-gpc')).toHaveTextContent(
      'Protocolos de Emergencia y Cuidados Críticos MSP'
    );
    expect(document.documentElement.getAttribute('data-tenant')).toBe('msp_hospital');
  });
});
