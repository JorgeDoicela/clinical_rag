import '@testing-library/jest-dom/vitest';

// Polyfills para entorno jsdom
if (typeof window !== 'undefined') {
  // Mock de matchMedia si no existe
  window.matchMedia = window.matchMedia || function () {
    return {
      matches: false,
      media: '',
      onchange: null,
      addListener: function () {},
      removeListener: function () {},
      addEventListener: function () {},
      removeEventListener: function () {},
      dispatchEvent: function () {
        return false;
      },
    };
  };

  // Mock de ResizeObserver para Recharts
  window.ResizeObserver = window.ResizeObserver || class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // Mock de WebSocket para pruebas unitarias y de integración
  class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    readyState = 1;
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    onerror: ((err: any) => void) | null = null;
    onclose: (() => void) | null = null;

    constructor(public url: string) {
      const t = setTimeout(() => {
        if (this.onopen && this.readyState === 1) {
          this.onopen();
        }
      }, 5);
      if (t && typeof (t as any).unref === 'function') {
        (t as any).unref();
      }
    }
    send(_data: string) {}
    close() {
      this.readyState = 3;
      if (this.onclose) this.onclose();
    }
  }
  (window as any).WebSocket = MockWebSocket;
  (globalThis as any).WebSocket = MockWebSocket;
}
