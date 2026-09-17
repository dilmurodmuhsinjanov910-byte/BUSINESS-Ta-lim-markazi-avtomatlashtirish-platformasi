'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log runtime errors to console for auditing and debugging
    console.error('Unhandled runtime error caught by App Router error boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-5 border border-rose-100 shadow-xs">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Xatolik yuz berdi</h2>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          {error?.message || "Interfeysni yuklashda kutilmagan xatolik kuzatildi. Iltimos, qaytadan urinib ko'ring."}
        </p>
        <div className="space-y-3">
          <button
            onClick={() => reset()}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl transition duration-150 shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{"Qaytadan urinib ko'rish"}</span>
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition duration-150"
          >
            Sahifani yangilash
          </button>
        </div>
        {error?.digest && (
          <p className="mt-4 text-[10px] text-slate-400 font-mono">
            Xatolik kodi: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
