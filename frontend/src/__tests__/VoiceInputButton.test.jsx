import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import VoiceInputButton from '../modules/evaluation/components/VoiceInputButton';
import * as voiceHook from '../hooks/useVoiceRecognition';

describe('Componente VoiceInputButton (Dictado Clínico por Voz)', () => {
  it('debe informar si el navegador no soporta Web Speech API', () => {
    vi.spyOn(voiceHook, 'useVoiceRecognition').mockReturnValue({
      isRecording: false,
      interimText: '',
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      error: null,
      isSupported: false,
    });

    render(<VoiceInputButton value="" onChange={() => {}} />);
    expect(screen.getByText(/Dictado no disponible/i)).toBeInTheDocument();
  });

  it('debe renderizar el botón de dictar cuando la API es compatible', () => {
    vi.spyOn(voiceHook, 'useVoiceRecognition').mockReturnValue({
      isRecording: false,
      interimText: '',
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      error: null,
      isSupported: true,
    });

    render(<VoiceInputButton value="" onChange={() => {}} />);
    expect(screen.getByText(/Dictar razonamiento/i)).toBeInTheDocument();
  });

  it('debe mostrar estado de Detener y texto interino cuando está grabando', () => {
    vi.spyOn(voiceHook, 'useVoiceRecognition').mockReturnValue({
      isRecording: true,
      interimText: 'paciente taquicárdico...',
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      error: null,
      isSupported: true,
    });

    render(<VoiceInputButton value="" onChange={() => {}} />);
    expect(screen.getByText(/Detener/i)).toBeInTheDocument();
    expect(screen.getByText(/paciente taquicárdico\.\.\./i)).toBeInTheDocument();
  });
});
