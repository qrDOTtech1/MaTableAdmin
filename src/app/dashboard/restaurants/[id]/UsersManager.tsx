"use client";

import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  createdAt: string;
  hasPassword: boolean;
}

interface ResetResult {
  password: string;
  emailSent: boolean;
}

export default function UsersManager({ restaurantId, restaurantSlug }: { restaurantId: string; restaurantSlug: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Add user
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState<{ email: string; password: string } | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  // Per-user state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [resetResult, setResetResult] = useState<Record<string, ResetResult>>({});
  const [resetting, setResetting] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<string | null>(null);

  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/users`);
      const json = await res.json();
      setUsers(json.users ?? []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, [restaurantId]);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAdding(true);
    setAddError(null);
    setAddResult(null);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAddError(json.error === "email_taken" ? "Email déjà utilisé." : json.error ?? "Erreur");
        return;
      }
      setAddResult({ email: json.user.email, password: json.password });
      setNewEmail("");
      load();
    } catch (e: any) { setAddError(e.message); }
    setAdding(false);
  }

  async function saveEmail(userId: string) {
    if (!editEmail.trim()) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: editEmail.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setEditError(json.error === "email_taken" ? "Email déjà utilisé." : json.error ?? "Erreur");
        return;
      }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, email: json.email } : u));
      setEditingId(null);
    } catch (e: any) { setEditError(e.message); }
    setEditSaving(false);
  }

  async function resetPassword(userId: string, sendEmail: boolean) {
    setResetting(userId);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetPassword: true, sendEmail }),
      });
      const json = await res.json();
      if (res.ok) {
        setResetResult(prev => ({ ...prev, [userId]: { password: json.password, emailSent: json.emailSent } }));
      }
    } catch {}
    setResetting(null);
  }

  async function deleteUser(userId: string) {
    if (users.length <= 1) {
      if (!confirm("Supprimer le seul utilisateur ? Le restaurant n'aura plus de compte accessible.")) return;
    } else {
      if (!confirm("Supprimer cet utilisateur ?")) return;
    }
    setDeleting(userId);
    await fetch(`/api/restaurants/${restaurantId}/users/${userId}`, { method: "DELETE" });
    setUsers(prev => prev.filter(u => u.id !== userId));
    setDeleting(null);
  }

  if (loading) {
    return <div className="animate-pulse h-20 bg-slate-800 rounded-xl" />;
  }

  return (
    <div className="space-y-4">

      {/* User list */}
      {users.length === 0 ? (
        <p className="text-slate-500 text-sm">Aucun utilisateur pour ce restaurant.</p>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex-1 min-w-0">
                  {editingId === u.id ? (
                    <div className="flex gap-2 items-center">
                      <input
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        type="email"
                        className="flex-1 bg-black/40 border border-slate-600 focus:border-orange-500 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:outline-none min-w-0"
                        onKeyDown={(e) => e.key === "Enter" && saveEmail(u.id)}
                        autoFocus
                      />
                      <button onClick={() => saveEmail(u.id)} disabled={editSaving}
                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex-shrink-0">
                        {editSaving ? "…" : "✓"}
                      </button>
                      <button onClick={() => { setEditingId(null); setEditError(null); }}
                        className="px-2 py-1.5 bg-slate-700 text-slate-400 rounded-lg text-xs flex-shrink-0">✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-white break-all">{u.email}</span>
                      <button onClick={() => copy(u.email, `email-${u.id}`)}
                        className="text-slate-500 hover:text-slate-300 transition-colors text-xs">
                        {copied === `email-${u.id}` ? "✓" : "📋"}
                      </button>
                    </div>
                  )}
                  {editError && editingId === u.id && <p className="text-red-400 text-xs mt-1">{editError}</p>}
                  <p className="text-slate-500 text-xs mt-0.5">
                    Créé le {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                    {!u.hasPassword && <span className="ml-2 text-amber-400">⚠ Pas de mot de passe</span>}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
                  <a href={`https://matable.pro/${restaurantSlug}`} target="_blank" rel="noopener"
                    className="px-2.5 py-1.5 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-500/25 transition-colors">
                    🚀 Dashboard
                  </a>
                  <button
                    onClick={() => { setEditingId(u.id); setEditEmail(u.email); setEditError(null); }}
                    className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs hover:text-white hover:border-slate-500 transition-colors">
                    ✏️ Email
                  </button>
                  <button onClick={() => setDeleting(u.id === deleting ? null : u.id)} disabled={!!deleting}
                    className="px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/20 transition-colors disabled:opacity-50">
                    🗑
                  </button>
                </div>
              </div>

              {/* Delete confirm */}
              {deleting === u.id && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 flex items-center gap-3 flex-wrap">
                  <span className="text-red-400 text-xs flex-1">Supprimer {u.email} ?</span>
                  <button onClick={() => deleteUser(u.id)}
                    className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-400">Supprimer</button>
                  <button onClick={() => setDeleting(null)} className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs">Annuler</button>
                </div>
              )}

              {/* Reset password */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => resetPassword(u.id, false)}
                  disabled={resetting === u.id}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs font-semibold hover:bg-amber-500/20 transition-colors disabled:opacity-50">
                  {resetting === u.id ? <><span className="w-3 h-3 border border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />Génération…</> : "🔑 Réinitialiser le mot de passe"}
                </button>
                <button
                  onClick={() => resetPassword(u.id, true)}
                  disabled={resetting === u.id}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-semibold hover:bg-blue-500/20 transition-colors disabled:opacity-50">
                  📧 Envoyer par email
                </button>
              </div>

              {/* Reset result */}
              {resetResult[u.id] && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-emerald-400 text-xs font-bold">
                      ✅ Mot de passe réinitialisé
                      {resetResult[u.id].emailSent && <span className="ml-2 text-blue-400">· Email envoyé</span>}
                    </p>
                    <button onClick={() => setResetResult(prev => { const n = { ...prev }; delete n[u.id]; return n; })}
                      className="text-slate-500 hover:text-white text-xs">✕</button>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 rounded-lg px-3 py-2">
                    <span className="font-mono text-orange-400 font-bold text-sm flex-1">{resetResult[u.id].password}</span>
                    <button onClick={() => copy(resetResult[u.id].password, `pwd-${u.id}`)}
                      className="text-slate-400 hover:text-white text-xs transition-colors">
                      {copied === `pwd-${u.id}` ? "✓ Copié" : "📋 Copier"}
                    </button>
                  </div>
                  <button
                    onClick={() => copy(`Email: ${u.email}\nMot de passe: ${resetResult[u.id].password}\nLien: https://matable.pro/${restaurantSlug}`, `creds-${u.id}`)}
                    className="text-xs text-slate-400 hover:text-white transition-colors">
                    {copied === `creds-${u.id}` ? "✓ Identifiants complets copiés" : "📋 Copier identifiants complets"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add user result */}
      {addResult && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
          <p className="text-emerald-400 font-bold text-sm">✅ Utilisateur créé</p>
          <div className="font-mono text-xs space-y-1 bg-black/40 rounded-lg p-3">
            <p className="text-slate-300">📧 {addResult.email}</p>
            <p className="text-orange-400 font-bold">🔑 {addResult.password}</p>
            <p className="text-slate-400">🔗 https://matable.pro/{restaurantSlug}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => copy(`Email: ${addResult.email}\nMDP: ${addResult.password}\nLien: https://matable.pro/${restaurantSlug}`, "add-creds")}
              className="flex-1 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300 hover:text-white transition-colors">
              {copied === "add-creds" ? "✓ Copié" : "📋 Copier identifiants"}
            </button>
            <button onClick={() => setAddResult(null)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-400">✕</button>
          </div>
        </div>
      )}

      {/* Add user form */}
      <form onSubmit={addUser} className="flex gap-2 flex-wrap">
        <input
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          type="email"
          placeholder="Ajouter un utilisateur (email)…"
          className="flex-1 min-w-0 bg-slate-900 border border-slate-700 focus:border-orange-500 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none transition-colors"
        />
        <button type="submit" disabled={adding || !newEmail.trim()}
          className="px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0 transition-colors">
          {adding ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />…</> : "+ Ajouter"}
        </button>
      </form>
      {addError && <p className="text-red-400 text-xs">{addError}</p>}
    </div>
  );
}
