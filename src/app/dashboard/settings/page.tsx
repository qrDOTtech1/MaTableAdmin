export default function AdminSettingsPage() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Configuration Plateforme</h1>
        <p className="text-slate-400">Paramètres globaux de MaTable</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl max-w-2xl">
        <h2 className="text-xl font-bold mb-6">Variables d'environnement actives</h2>
        
        <div className="space-y-6">
          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Authentification Admin</div>
            <div className="text-sm text-slate-300">Configurée via <code className="text-orange-400">ADMIN_CREDENTIALS</code></div>
          </div>

          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Base de données</div>
            <div className="text-sm text-slate-300">Connecté à PostgreSQL via Prisma</div>
          </div>

          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sécurité Session</div>
            <div className="text-sm text-slate-300">JWT Secret actif</div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
          <p className="text-sm text-orange-200">
            <strong>Note :</strong> Pour modifier ces paramètres, rendez-vous dans l'onglet <strong>Variables</strong> de votre projet sur Railway. Les modifications nécessitent un redémarrage de l'instance.
          </p>
        </div>
      </div>
    </div>
  );
}
