import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StreamingMarkdownViewer from '../modules/evaluation/components/StreamingMarkdownViewer';
import SocraticDebriefModal from '../modules/evaluation/components/SocraticDebriefModal';
import { useSocraticDebriefStore } from '../modules/evaluation/store/useSocraticDebriefStore';

describe('Suite de Pruebas: Debriefing Socrático Multiturno (Ateneo+)', () => {
  beforeEach(() => {
    useSocraticDebriefStore.getState().closeDebrief();
    useSocraticDebriefStore.getState().resetDialog();
  });

  describe('Componente StreamingMarkdownViewer', () => {
    it('no renderiza nada si no hay contenido y no está en streaming', () => {
      const { container } = render(<StreamingMarkdownViewer content="" isStreaming={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('renderiza párrafos normales y formatea preguntas socráticas destacadas', () => {
      const text = 'Primer análisis clínico.\n\n¿Por qué omitió la fluidoterapia inicial?';
      render(<StreamingMarkdownViewer content={text} isStreaming={false} />);

      expect(screen.getByText('Primer análisis clínico.')).toBeInTheDocument();
      const questionEl = screen.getByText('¿Por qué omitió la fluidoterapia inicial?');
      expect(questionEl).toBeInTheDocument();
      expect(questionEl.className).toContain('border-cyan-500');
    });

    it('renderiza listas con viñetas normativas', () => {
      const text = '- Reposición parenteral con Ringer Lactato\n- Monitoreo de hematocrito cada 6 horas';
      render(<StreamingMarkdownViewer content={text} isStreaming={false} />);

      expect(screen.getByText('Reposición parenteral con Ringer Lactato')).toBeInTheDocument();
      expect(screen.getByText('Monitoreo de hematocrito cada 6 horas')).toBeInTheDocument();
    });

    it('renderiza el cursor pulsante cuando isStreaming es true', () => {
      render(<StreamingMarkdownViewer content="Generando dictamen..." isStreaming={true} />);
      expect(screen.getByTestId('streaming-cursor')).toBeInTheDocument();
    });
  });

  describe('Store useSocraticDebriefStore', () => {
    it('inicia cerrado con valores vacíos por defecto', () => {
      const state = useSocraticDebriefStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.caseId).toBe('');
      expect(state.historial).toEqual([]);
    });

    it('openDebrief inicializa el contexto del caso y abre el modal', () => {
      useSocraticDebriefStore.getState().openDebrief(
        'caso_dengue_01',
        'Dengue con Signos de Alarma',
        'Falta de carga rápida con solución salina'
      );

      const state = useSocraticDebriefStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.caseId).toBe('caso_dengue_01');
      expect(state.caseTitle).toBe('Dengue con Signos de Alarma');
      expect(state.omisionActiva).toBe('Falta de carga rápida con solución salina');
      expect(state.historial).toEqual([]);
    });

    it('closeDebrief cierra el modal y detiene streaming', () => {
      useSocraticDebriefStore.getState().openDebrief('c1', 'T', 'O');
      expect(useSocraticDebriefStore.getState().isOpen).toBe(true);

      useSocraticDebriefStore.getState().closeDebrief();
      expect(useSocraticDebriefStore.getState().isOpen).toBe(false);
      expect(useSocraticDebriefStore.getState().isStreaming).toBe(false);
    });
  });

  describe('Componente SocraticDebriefModal', () => {
    it('retorna null si el store indica isOpen = false', () => {
      const { container } = render(<SocraticDebriefModal />);
      expect(container.firstChild).toBeNull();
    });

    it('renderiza cabecera, omisión clínica y permite cerrar con el botón X', () => {
      useSocraticDebriefStore.getState().openDebrief(
        'caso_01',
        'Caso Preeclampsia Severa',
        'Omisión de sulfato de magnesio esquema Zuspan'
      );

      render(<SocraticDebriefModal />);

      expect(screen.getByText('Debriefing Socrático Guiado')).toBeInTheDocument();
      expect(screen.getByText('Caso Preeclampsia Severa')).toBeInTheDocument();
      expect(screen.getByText(/Omisión de sulfato de magnesio esquema Zuspan/i)).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /cerrar debriefing socrático/i });
      fireEvent.click(closeButton);

      expect(useSocraticDebriefStore.getState().isOpen).toBe(false);
    });

    it('permite escribir réplica y deshabilita el botón si el campo está vacío', () => {
      useSocraticDebriefStore.getState().openDebrief('caso_01', 'Caso Clínico', 'Omisión de prueba');
      render(<SocraticDebriefModal />);

      const submitButton = screen.getByRole('button', { name: /enviar respuesta socrática/i });
      expect(submitButton).toBeDisabled();

      const input = screen.getByPlaceholderText(/escribe tu justificación clínica/i);
      fireEvent.change(input, { target: { value: 'Consideré que el paciente estaba hemodinámicamente estable.' } });

      expect(submitButton).not.toBeDisabled();
    });
  });
});
