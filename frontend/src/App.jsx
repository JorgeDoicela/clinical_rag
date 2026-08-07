import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import CaseList from './pages/CaseList';
import CaseSolve from './pages/CaseSolve';
import { Activity, ShieldCheck, HeartPulse } from 'lucide-react';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
        {/* Navbar Médico Minimalista Blanco */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 group-hover:bg-sky-100 transition-colors">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <span className="font-display font-extrabold text-xl tracking-tight text-slate-900">
                  ATENEO
                </span>
                <span className="hidden sm:inline-block ml-2.5 text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200/80">
                  RAG Clínico MSP Ecuador
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                <Activity className="w-3.5 h-3.5 text-sky-600" />
                <span>PWA Habilitada</span>
              </div>
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Supervisión Docente</span>
              </div>
            </div>
          </div>
        </header>

        {/* Contenido Principal */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
          <Routes>
            <Route path="/" element={<CaseList />} />
            <Route path="/case/:id" element={<CaseSolve />} />
          </Routes>
        </main>

        {/* Footer Minimalista */}
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          <p>(c) 2026 Ateneo - Sistema Formativo de Razonamiento Clínico. Guías Oficiales del MSP del Ecuador.</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}
