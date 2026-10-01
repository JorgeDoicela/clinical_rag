import '@testing-library/jest-dom';

// Polyfills para entorno jsdom
if (typeof window !== 'undefined') {
  // Mock de matchMedia si no existe
  window.matchMedia = window.matchMedia || function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

  // Mock de ResizeObserver para Recharts
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
