import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import OsceStationView from '../modules/cases/components/OsceStationView';
import { OsceCircuit } from '../types/osce';

describe('Suite de Pruebas: Motor de Exámenes Clínicos Estructurados (OSCE / ECOE - Ateneo+)', () => {
  const mockCircuit: OsceCircuit = {
    id: 'circuit-nacional-2026',
    titulo: 'Examen de Habilitación Profesional Médica (ECOE)',
    descripcion: 'Circuito multiestación estandarizado de evaluación clínica objetiva',
    institucion: 'CACES / MSP Ecuador',
    fechaConvocatoria: '2026-10-02',
    tiempoTotalEstimadoMinutos: 18,
    estaciones: [
      {
        id: 'estacion-01',
        estacionNumero: 1,
        titulo: 'Manejo Inicial de Neumonía Adquirida en la Comunidad',
        tipo: 'anamnesis',
        duracionSegundos: 480, // 8 min
        tiempoLecturaSegundos: 60, // 1 min
        escenarioClinico: 'Paciente masculino de 64 años acude por disnea progresiva, tos productiva herrumbrosa y fiebre de 38.8°C.',
        instruccionesCandidato: 'Realice la anamnesis dirigida, identifique factores de riesgo y estratifique la gravedad según la escala CURB-65.',
        preguntaEvaluativa: 'Determine el juicio clínico y el lugar óptimo de manejo (ambulatorio vs hospitalario) según la GPC.',
        rubrica: [
          {
            id: 'rub-01',
            descripcion: 'Indaga por antecedentes de comorbilidad respiratoria y cardiovascular',
            peso: 25,
            categoria: 'anamnesis'
          },
          {
            id: 'rub-02',
            descripcion: 'Calcula adecuadamente el score CURB-65',
            peso: 40,
            categoria: 'razonamiento'
          },
          {
            id: 'rub-03',
            descripcion: 'Explica el plan terapéutico de forma clara y sin tecnicismos excesivos',
            peso: 35,
            categoria: 'comunicacion'
          }
        ]
      },
      {
        id: 'estacion-02',
        estacionNumero: 2,
        titulo: 'Urgencia Hipertensiva vs Emergencia',
        tipo: 'interpretacion_paraclinicos',
        duracionSegundos: 300, // 5 min
        tiempoLecturaSegundos: 30,
        escenarioClinico: 'Paciente femenina de 52 años con PA 210/120 mmHg, cefalea occipital pulsátil sin déficit focal.',
        instruccionesCandidato: 'Diferencie entre urgencia y emergencia hipertensiva y proponga el fármaco de primera línea.',
        preguntaEvaluativa: 'Plantee el esquema de descenso tensional seguro en las primeras 24 horas.',
        rubrica: [
          {
            id: 'rub-04',
            descripcion: 'Descarta daño de órgano blanco mediante anamnesis dirigida',
            peso: 50,
            categoria: 'anamnesis'
          }
        ]
      }
    ]
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renderiza la estación 1, el período de lectura previo y el cronómetro sincronizado', () => {
    render(
      <OsceStationView
        circuit={mockCircuit}
        studentId="estudiante-uce-001"
      />
    );

    expect(screen.getByTestId('osce-station-view')).toBeInTheDocument();
    expect(screen.getByText('Manejo Inicial de Neumonía Adquirida en la Comunidad')).toBeInTheDocument();
    expect(screen.getByText('Estación 1 de 2')).toBeInTheDocument();
    expect(screen.getByText(/Lectura: 01:00/i)).toBeInTheDocument();
    expect(screen.getByText(/Período de Lectura e Instrucciones Previas/i)).toBeInTheDocument();
    expect(screen.getByText(/Servidor Sincronizado/i)).toBeInTheDocument();
  });

  it('permite iniciar la estación activa de forma anticipada con el botón correspondiente', () => {
    render(
      <OsceStationView
        circuit={mockCircuit}
        studentId="estudiante-uce-001"
      />
    );

    const startBtn = screen.getByRole('button', { name: /comenzar estación inmediatamente/i });
    fireEvent.click(startBtn);

    // Debe pasar a modo de estación activa (Tiempo: 08:00)
    expect(screen.getByText(/Tiempo: 08:00/i)).toBeInTheDocument();
    expect(screen.queryByText(/Período de Lectura e Instrucciones Previas/i)).not.toBeInTheDocument();
  });

  it('permite alternar entre la resolución clínica y la rúbrica de cotejo con selección de ítems', () => {
    render(
      <OsceStationView
        circuit={mockCircuit}
        studentId="estudiante-uce-001"
      />
    );

    // Iniciar estación
    fireEvent.click(screen.getByRole('button', { name: /comenzar estación inmediatamente/i }));

    // Ver pestaña de rúbrica
    const rubricTabBtn = screen.getByRole('button', { name: /rúbrica de cotejo/i });
    fireEvent.click(rubricTabBtn);

    expect(screen.getByText(/Calcula adecuadamente el score CURB-65/i)).toBeInTheDocument();
    expect(screen.getByText(/Ponderación: 40 pts/i)).toBeInTheDocument();

    // Marcar ítem de rúbrica
    const rubricItem = screen.getByText(/Calcula adecuadamente el score CURB-65/i);
    fireEvent.click(rubricItem);

    // Volver a resolución
    const answerTabBtn = screen.getByRole('button', { name: /tu resolución clínica/i });
    fireEvent.click(answerTabBtn);

    const textarea = screen.getByPlaceholderText(/escriba de forma estructurada sus hallazgos/i);
    fireEvent.change(textarea, { target: { value: 'Paciente con CURB-65 puntaje 2 (edad 64 años, urea normal, FR 32 rpm). Requiere hospitalización en sala general con ceftriaxona + claritromicina.' } });
    expect(screen.getByText(/Caracteres: \d+/i)).toBeInTheDocument();
  });

  it('permite enviar la estación voluntariamente y genera la firma criptográfica', async () => {
    const onSubmitted = vi.fn();

    render(
      <OsceStationView
        circuit={mockCircuit}
        studentId="estudiante-uce-001"
        onStationSubmitted={onSubmitted}
      />
    );

    // Iniciar estación activa
    fireEvent.click(screen.getByRole('button', { name: /comenzar estación inmediatamente/i }));

    const textarea = screen.getByPlaceholderText(/escriba de forma estructurada sus hallazgos/i);
    fireEvent.change(textarea, { target: { value: 'Impresión diagnóstica: NAC moderada. Manejo hospitalario según GPC MSP.' } });

    const submitBtn = screen.getByRole('button', { name: /concluir y enviar estación/i });
    await act(async () => {
      fireEvent.click(submitBtn);
      await vi.advanceTimersByTimeAsync(50);
    });

    // Debe mostrar la pantalla de estación registrada
    expect(screen.getByText(/Estación 1 Registrada Exitosamente/i)).toBeInTheDocument();
    expect(onSubmitted).toHaveBeenCalledTimes(1);

    const payload = onSubmitted.mock.calls[0][0];
    expect(payload.stationId).toBe('estacion-01');
    expect(payload.studentId).toBe('estudiante-uce-001');
    expect(payload.expiradoPorServidor).toBe(false);
    expect(payload.hashFirmaCriptografica).toBeDefined();
  });

  it('bloquea la interfaz y despacha automáticamente ante el vencimiento del temporizador por servidor', async () => {
    const onSubmitted = vi.fn();

    render(
      <OsceStationView
        circuit={mockCircuit}
        studentId="estudiante-uce-001"
        onStationSubmitted={onSubmitted}
      />
    );

    // Iniciar estación activa
    fireEvent.click(screen.getByRole('button', { name: /comenzar estación inmediatamente/i }));

    const textarea = screen.getByPlaceholderText(/escriba de forma estructurada sus hallazgos/i);
    fireEvent.change(textarea, { target: { value: 'Borrador en curso antes del timeout...' } });

    // Avanzar el tiempo 481 segundos (vencimiento de los 480 segundos)
    await act(async () => {
      vi.advanceTimersByTime(481000);
    });

    // Debe haberse invocado el despacho forzado por servidor
    expect(onSubmitted).toHaveBeenCalledTimes(1);
    const payload = onSubmitted.mock.calls[0][0];
    expect(payload.expiradoPorServidor).toBe(true);
    expect(payload.studentAnswer).toContain('Borrador en curso antes del timeout...');
  });

  it('permite rotar a la siguiente estación y culmina el circuito con el acta completa', async () => {
    const onCompleted = vi.fn();

    render(
      <OsceStationView
        circuit={mockCircuit}
        studentId="estudiante-uce-001"
        onCircuitCompleted={onCompleted}
      />
    );

    // Estación 1: Iniciar y enviar
    fireEvent.click(screen.getByRole('button', { name: /comenzar estación inmediatamente/i }));
    fireEvent.change(screen.getByPlaceholderText(/escriba de forma estructurada sus hallazgos/i), {
      target: { value: 'Resolución estación 1' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /concluir y enviar estación/i }));
      await vi.advanceTimersByTimeAsync(50);
    });

    // Avanzar a Estación 2
    const nextBtn = screen.getByRole('button', { name: /avanzar a estación 2/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText('Urgencia Hipertensiva vs Emergencia')).toBeInTheDocument();
    expect(screen.getByText('Estación 2 de 2')).toBeInTheDocument();

    // Estación 2: Iniciar y enviar
    fireEvent.click(screen.getByRole('button', { name: /comenzar estación inmediatamente/i }));
    fireEvent.change(screen.getByPlaceholderText(/escriba de forma estructurada sus hallazgos/i), {
      target: { value: 'Resolución estación 2' }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /concluir y enviar estación/i }));
      await vi.advanceTimersByTimeAsync(50);
    });

    // Debe mostrar la pantalla final del circuito completado
    expect(screen.getByTestId('osce-circuit-finished')).toBeInTheDocument();
    expect(screen.getByText(/Circuito Clínico OSCE Concluido/i)).toBeInTheDocument();
    expect(screen.getByText(/Acta de Despacho de Estaciones/i)).toBeInTheDocument();
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });
});
