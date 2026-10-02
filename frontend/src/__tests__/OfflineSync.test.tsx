import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import offlineDb from '../core/storage/offlineDb';
import { useConnectivitySync } from '../core/storage/useConnectivitySync';
import evaluationApi from '../modules/evaluation/api/evaluationApi';

vi.mock('../modules/evaluation/api/evaluationApi', () => ({
  default: {
    evaluateDirect: vi.fn(),
    evaluatePhase: vi.fn(),
  },
}));

describe('Suite de Pruebas: Resiliencia Hospitalaria y Modo Offline-First (Ateneo+)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Motor de Persistencia IndexedDB / Memoria (offlineDb)', () => {
    it('debe almacenar y recuperar casos clínicos locales correctamente', async () => {
      const mockCases = [
        {
          id: 'caso-dengue-01',
          titulo: 'Dengue con Signos de Alarma',
          guia_asociada: 'dengue',
          paciente: { nombre: 'Paciente Test', edad: 28, sexo: 'F' },
          caso_preambulo: 'Paciente femenina con fiebre y dolor abdominal',
          pregunta: '¿Cuál es la conducta inicial según la GPC del MSP?',
        },
      ];

      await offlineDb.saveCases(mockCases);
      const allCases = await offlineDb.getAllCases();
      expect(allCases.some((c) => c.id === 'caso-dengue-01')).toBe(true);

      const singleCase = await offlineDb.getCase('caso-dengue-01');
      expect(singleCase?.titulo).toBe('Dengue con Signos de Alarma');
    });

    it('debe encolar evaluaciones en el buffer Outbox con estado PENDING_SYNC', async () => {
      const outboxId = await offlineDb.queueEvaluation({
        case_id: 'caso-preeclampsia-02',
        case_title: 'Preeclampsia Severa',
        respuesta_estudiante: 'Iniciar sulfato de magnesio según esquema Zuspan y control de PA',
        user_email: 'estudiante@ateneo.local',
        tipo: 'single_turn',
      });

      expect(typeof outboxId).toBe('string');
      expect(outboxId.startsWith('outbox_')).toBe(true);

      const pending = await offlineDb.getPendingEvaluations();
      const item = pending.find((p) => p.id === outboxId);
      expect(item).toBeDefined();
      expect(item?.status).toBe('PENDING_SYNC');
      expect(item?.case_id).toBe('caso-preeclampsia-02');
    });

    it('debe actualizar el estado de una evaluación en outbox y limpiar elementos sincronizados', async () => {
      const outboxId = await offlineDb.queueEvaluation({
        case_id: 'caso-tuberculosis-03',
        case_title: 'Tuberculosis Pulmonar',
        respuesta_estudiante: 'Baciloscopía seriada y esquema RIPE',
        user_email: 'estudiante@ateneo.local',
        tipo: 'single_turn',
      });

      await offlineDb.updateOutboxStatus(outboxId, 'SYNCED');
      await offlineDb.clearSynced();

      const pending = await offlineDb.getPendingEvaluations();
      expect(pending.some((p) => p.id === outboxId)).toBe(false);
    });

    it('debe almacenar y recuperar resultados de evaluación en caché local', async () => {
      const mockResult = {
        score: 9.5,
        score_max: 10,
        aciertos: ['Diagnóstico certero', 'Terapéutica conforme a GPC'],
        omisiones: [],
        competencias_deficientes: [],
        retroalimentacion_general: 'Resolución clínica de excelencia.',
      };

      await offlineDb.cacheEvaluationResult('caso-ecg-04', mockResult);
      const cached = await offlineDb.getCachedResult('caso-ecg-04');

      expect(cached).toBeDefined();
      expect(cached?.score).toBe(9.5);
      expect(cached?.aciertos).toContain('Diagnóstico certero');
    });
  });

  describe('2. Orquestador de Conectividad y Sincronización en Segundo Plano (useConnectivitySync)', () => {
    it('debe inicializar el estado de conectividad en línea y reportar conteo de outbox', async () => {
      let hookResult: any;
      await act(async () => {
        hookResult = renderHook(() => useConnectivitySync()).result;
      });

      expect(hookResult.current.isOnline).toBe(true);
      expect(typeof hookResult.current.pendingCount).toBe('number');
      expect(typeof hookResult.current.syncPendingEvaluations).toBe('function');
    });

    it('debe despachar evaluaciones pendientes al ejecutar syncPendingEvaluations', async () => {
      vi.mocked(evaluationApi.evaluateDirect).mockResolvedValueOnce({
        score: 8.8,
        score_max: 10,
        aciertos: ['Manejo adecuado'],
        omisiones: [],
        competencias_deficientes: [],
        retroalimentacion_general: 'Desempeño correcto.',
      });

      const outboxId = await offlineDb.queueEvaluation({
        case_id: 'caso-sync-01',
        case_title: 'Caso para Sync',
        respuesta_estudiante: 'Tratamiento oportuno con antibióticos',
        user_email: 'estudiante@ateneo.local',
        tipo: 'single_turn',
      });

      const { result } = renderHook(() => useConnectivitySync());

      await act(async () => {
        await result.current.syncPendingEvaluations();
      });

      expect(evaluationApi.evaluateDirect).toHaveBeenCalledWith(
        'caso-sync-01',
        'Tratamiento oportuno con antibióticos',
        null
      );

      const pending = await offlineDb.getPendingEvaluations();
      expect(pending.some((p) => p.id === outboxId)).toBe(false);
    });
  });
});
