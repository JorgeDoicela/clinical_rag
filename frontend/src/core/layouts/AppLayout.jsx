import React from 'react';
import Navbar from './Navbar';
import { HeartPulse } from 'lucide-react';

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#f0f4f9] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-8 lg:px-12 py-8 flex-1">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200/80 py-6 text-center text-xs text-[#747775]">
        <div className="w-full max-w-[1680px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-[#0b57d0]" />
            <span>ATENEO+ • Simulador Clínico Basado en RAG Híbrido & Normativa Oficial MSP Ecuador</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>GPC Ecuador 2026</span>
            <span>•</span>
            <span>Inteligencia Artificial Clínica</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
