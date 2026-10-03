import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  TenantId,
  TenantTheme,
  TENANT_THEMES,
  TENANT_STORAGE_KEY
} from './tokens';

export interface ThemeContextType {
  tenant: TenantTheme;
  tenantId: TenantId;
  setTenantId: (id: TenantId) => void;
  availableTenants: TenantTheme[];
}

const ThemeContext = createContext<ThemeContextType | null>(null);

/**
 * Detecta el tenant apropiado a partir del hostname actual o almacenamiento local
 */
export function detectInitialTenant(): TenantId {
  if (typeof window === 'undefined') return 'default';

  // 1. Preferencia explícita en localStorage
  try {
    const stored = localStorage.getItem(TENANT_STORAGE_KEY) as TenantId | null;
    if (stored && TENANT_THEMES[stored]) {
      return stored;
    }
  } catch {
    // Entorno sin acceso a localStorage
  }

  // 2. Detección por subdominio o hostname
  const hostname = window.location.hostname.toLowerCase();
  for (const [id, theme] of Object.entries(TENANT_THEMES)) {
    if (theme.subdominios.some(sub => hostname.includes(sub))) {
      return id as TenantId;
    }
  }

  return 'default';
}

/**
 * Inyecta dinámicamente las variables CSS institucionales en el root del documento
 */
export function applyTenantCssVariables(theme: TenantTheme): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const { colores } = theme;

  root.style.setProperty('--ateneo-brand-primary', colores.brandPrimary);
  root.style.setProperty('--ateneo-brand-primary-hover', colores.brandPrimaryHover);
  root.style.setProperty('--ateneo-brand-gradient', colores.brandGradient);
  root.style.setProperty('--ateneo-brand-accent', colores.brandAccent);
  root.style.setProperty('--ateneo-surface-canvas', colores.surfaceCanvas);
  root.style.setProperty('--ateneo-card-radius', colores.cardRadius);
  root.style.setProperty('--ateneo-text-on-primary', colores.textOnPrimary);

  // Atributo de datos para selectores CSS específicos
  root.setAttribute('data-tenant', theme.id);
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  initialTenantId?: TenantId;
  defaultTenantId?: TenantId;
}

/**
 * ThemeProvider — Orquestador de Temas Médicos Institucionales y Multi-Tenancy
 * Aplica tokens de diseño en tiempo de ejecución sin parpadeo visual ni recompilación.
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialTenantId,
  defaultTenantId
}) => {
  const [tenantId, setTenantIdState] = useState<TenantId>(() => {
    return initialTenantId || defaultTenantId || detectInitialTenant();
  });

  const tenant = useMemo(() => {
    return TENANT_THEMES[tenantId] || TENANT_THEMES.default;
  }, [tenantId]);

  const setTenantId = useCallback((id: TenantId) => {
    if (TENANT_THEMES[id]) {
      setTenantIdState(id);
      try {
        localStorage.setItem(TENANT_STORAGE_KEY, id);
      } catch {
        // Ignorar fallos de cuota en localStorage
      }
    }
  }, []);

  // Inyección de variables CSS en cada cambio de tenant
  useEffect(() => {
    applyTenantCssVariables(tenant);
  }, [tenant]);

  const availableTenants = useMemo(() => {
    return Object.values(TENANT_THEMES);
  }, []);

  const value = useMemo<ThemeContextType>(() => ({
    tenant,
    tenantId,
    setTenantId,
    availableTenants
  }), [tenant, tenantId, setTenantId, availableTenants]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser utilizado dentro de un ThemeProvider.');
  }
  return context;
}

export const useTenantTheme = useTheme;

export default ThemeProvider;
