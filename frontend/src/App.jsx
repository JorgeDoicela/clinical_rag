import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import CaseList from './pages/CaseList';
import CaseSolve from './pages/CaseSolve';
import { Stethoscope, Activity, FileCheck2 } from 'lucide-react';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        {/* Navbar Premium */}
        <header className="sticky top-0 z-50 glass-card border-b border-slate-800/80">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:bg-teal-500/20 transition-all">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <span className="font-display font-bold text-lg text-white tracking-tight">ATENEO</span>
                <span className="hidden sm:inline-block ml-2 text-xs font-mono text-teal-400/80 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                  RAG MSP Ecuador
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>PWA Listo</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
          <Routes>
            <Route path="/" element={<CaseList />} />
            <Route path="/case/:id" element={<CaseSolve />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
          <p>(c) 2026 Ateneo - Evaluación Formativa del Razonamiento Clínico. Basado en las GPC del MSP del Ecuador.</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}
