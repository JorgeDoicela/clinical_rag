import { useState, useEffect, useCallback } from 'react';
import offlineDb from './offlineDb';
import evaluationApi from '../../modules/evaluation/api/evaluationApi';

export interface ConnectivitySyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncPendingEvaluations: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
}

/**
 * useConnectivitySync — Hook y orquestador de conectividad hospitalaria y background sync.
 * Supervisa el estado de la red (online/offline), monitoriza el buffer Outbox en IndexedDB
 * y despacha automáticamente las evaluaciones acumuladas en modo desconectado al restablecerse la red.
 */
export function useConnectivitySync(): ConnectivitySyncState {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await offlineDb.getPendingCount();
      setPendingCount(count);
    } catch {
      setPendingCount(0);
    }
  }, []);

  const syncPendingEvaluations = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    try {
      const pendingItems = await offlineDb.getPendingEvaluations();
      if (pendingItems.length === 0) {
        setPendingCount(0);
        return;
      }

      setIsSyncing(true);

      for (const item of pendingItems) {
        try {
          await offlineDb.updateOutboxStatus(item.id, 'SYNCING');

          if (item.tipo === 'phase' && item.fase_numero) {
            const res = await evaluationApi.evaluatePhase(
              item.case_id,
              item.fase_numero,
              item.respuesta_estudiante,
              ''
            );
            await offlineDb.updateOutboxStatus(item.id, 'SYNCED');
            // Cachear resultado localmente
            await offlineDb.cacheEvaluationResult(item.case_id, {
              score: res.score_fase,
              score_max: 10,
              aciertos: res.aciertos,
              omisiones: res.omisiones,
              competencias_deficientes: [],
              retroalimentacion_general: res.retroalimentacion_fase || '',
            });
          } else {
            const res = await evaluationApi.evaluateDirect(
              item.case_id,
              item.respuesta_estudiante,
              null
            );
            await offlineDb.updateOutboxStatus(item.id, 'SYNCED');
            await offlineDb.cacheEvaluationResult(item.case_id, res);
          }
        } catch (itemErr: unknown) {
          const errMsg = itemErr instanceof Error ? itemErr.message : 'Error al sincronizar evaluación';
          await offlineDb.updateOutboxStatus(item.id, 'FAILED', errMsg);
        }
      }

      await offlineDb.clearSynced();
    } finally {
      await refreshPendingCount();
      setIsSyncing(false);
    }
  }, [isSyncing, refreshPendingCount]);

  useEffect(() => {
    refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      syncPendingEvaluations();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sondeo de seguridad para conteo de outbox cada 10 segundos
    const interval = setInterval(refreshPendingCount, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [refreshPendingCount, syncPendingEvaluations]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    syncPendingEvaluations,
    refreshPendingCount,
  };
}

export default useConnectivitySync;
