import { QueryClient } from '@tanstack/react-query';

/**
 * Cliente global de TanStack Query configurado con políticas clínicas de alta disponibilidad:
 * - staleTime: 5 minutos de validez para el catálogo de casos, topología KST y benchmarks.
 * - gcTime: 15 minutos en memoria de caché tras desmontar componentes.
 * - refetchOnWindowFocus: false para no invalidar estados ni generar parpadeos durante la redacción diagnóstica o dictado por voz.
 * - retry: 1 reintento exponencial defensivo en caso de anomalías de red transitorias.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      retry: 1,
    },
    mutations: {
      retry: false,
    },
  },
});

export default queryClient;
