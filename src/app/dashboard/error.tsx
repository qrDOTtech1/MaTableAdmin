"use client";
import { useEffect } from "react";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <p className="text-4xl mb-3">⚠️</p>
        <h2 className="text-lg font-bold text-white mb-2">Erreur</h2>
        <p className="text-slate-400 text-sm mb-4">{error.message}</p>
        <button onClick={reset} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold text-sm">Réessayer</button>
      </div>
    </div>
  );
}
