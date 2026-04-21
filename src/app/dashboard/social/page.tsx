export const dynamic = "force-dynamic";

export default function SocialAdminPage() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Nova Connect — Social Admin</h1>
        <p className="text-slate-400">Gérez les paramètres de mise en relation IA et l'écosystème Social</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Ollama Cluster Config */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg space-y-6">
          <h2 className="text-xl font-bold">Ollama Cluster IA</h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-800 rounded-lg flex items-center justify-between border border-emerald-500/20">
              <div>
                <p className="font-bold">Instance #1 (Default)</p>
                <p className="text-xs text-slate-500">Model: llama3:8b-instruct</p>
              </div>
              <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded">ACTIF</span>
            </div>
            <div className="p-4 bg-slate-800 rounded-lg flex items-center justify-between opacity-50 border border-slate-700">
              <div>
                <p className="font-bold">Instance #2 (Vision)</p>
                <p className="text-xs text-slate-500">Model: llava-v1.5:7b</p>
              </div>
              <span className="px-2 py-1 bg-slate-700 text-slate-400 text-[10px] font-bold rounded">INACTIF</span>
            </div>
          </div>
          <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-lg text-sm font-bold transition-all">
            + Ajouter une instance Ollama
          </button>
        </div>

        {/* Matching Algorithm Stats */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg space-y-6">
          <h2 className="text-xl font-bold">Algorithme de Matching</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Matches du jour</p>
              <p className="text-2xl font-black text-orange-500">124</p>
            </div>
            <div className="p-4 bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Taux de conversion</p>
              <p className="text-2xl font-black text-blue-500">32%</p>
            </div>
          </div>
          <div className="space-y-2 pt-4 border-t border-slate-800">
            <p className="text-sm font-bold">Poids des critères IA</p>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex-1">Intérêts communs</span>
              <span className="font-mono text-orange-500">60%</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex-1">Proximité géographique</span>
              <span className="font-mono text-orange-500">30%</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex-1">Consommation similaire</span>
              <span className="font-mono text-orange-500">10%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
