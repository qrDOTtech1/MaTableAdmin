"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { MapProspect } from "./LeafletMap";
import { STATUS_COLOR, STATUS_LABEL, SCORE_OPTIONS } from "./LeafletMap";

const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false });

type Status = "NEW" | "CONTACTED" | "ACTIVATED" | "IGNORED";

const STATUS_CLASSES: Record<Status, string> = {
  NEW: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  CONTACTED: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  ACTIVATED: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  IGNORED: "bg-slate-700/40 text-slate-400 border-slate-600/30",
};

function slugify(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

// ─── Edit form state ─────────────────────────────────────────────────────────
interface EditForm {
  name: string; phone: string; email: string;
  address: string; website: string; category: string; description: string;
}

function buildForm(p: MapProspect): EditForm {
  return {
    name: p.name ?? "", phone: p.phone ?? "", email: p.email ?? "",
    address: p.address ?? "", website: p.website ?? "",
    category: p.category ?? "", description: p.description ?? "",
  };
}

// ─── Call list item ───────────────────────────────────────────────────────────
function CallItem({ p, idx, onSelect }: { p: MapProspect; idx: number; onSelect: () => void }) {
  const scoreEmoji = p.score ?? "—";
  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800/60 rounded-lg cursor-pointer transition-colors border-b border-slate-800/40 last:border-0"
    >
      <span className="text-slate-500 text-xs w-5 text-right flex-shrink-0">{idx + 1}</span>
      <span className="text-base flex-shrink-0 w-6 text-center">{scoreEmoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-semibold truncate">{p.name}</p>
        {p.phone ? (
          <a href={`tel:${p.phone}`} onClick={(e) => e.stopPropagation()}
            className="text-emerald-400 text-xs font-mono hover:underline">{p.phone}</a>
        ) : (
          <span className="text-slate-600 text-xs">Pas de numéro</span>
        )}
      </div>
      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold flex-shrink-0 ${STATUS_CLASSES[p.status as Status] ?? ""}`}>
        {STATUS_LABEL[p.status] ?? p.status}
      </span>
    </div>
  );
}

export default function MapProspectTab() {
  const [prospects, setProspects] = useState<MapProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MapProspect | null>(null);
  const [filterStatus, setFilterStatus] = useState<Status | "ALL">("ALL");
  const [panel, setPanel] = useState<"detail" | "edit" | "activate" | null>(null);

  // Floating panels toggle
  const [showCallList, setShowCallList] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState<EditForm>({ name: "", phone: "", email: "", address: "", website: "", category: "", description: "" });
  const [editSaving, setEditSaving] = useState(false);

  // Notes
  const [notesEdit, setNotesEdit] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  // Score
  const [scoreSaving, setScoreSaving] = useState(false);

  // Activate
  const [activateEmail, setActivateEmail] = useState("");
  const [activateLoading, setActivateLoading] = useState(false);
  const [activateResult, setActivateResult] = useState<{ email: string; password: string; loginUrl: string } | null>(null);
  const [activateError, setActivateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/prospection/map");
      const json = await res.json();
      setProspects(json.prospects ?? []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  function selectProspect(p: MapProspect) {
    setSelected(p);
    setNotesEdit(p.notes ?? "");
    setEditForm(buildForm(p));
    setPanel("detail");
    setActivateResult(null);
    setActivateError(null);
    setShowCallList(false);
  }

  async function patch(id: string, data: Record<string, any>) {
    await fetch(`/api/prospects/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setProspects(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, ...data } : null);
  }

  async function saveEdit() {
    if (!selected) return;
    setEditSaving(true);
    await patch(selected.id, editForm);
    setEditSaving(false);
    setPanel("detail");
  }

  async function saveNotes() {
    if (!selected) return;
    setNotesSaving(true);
    await patch(selected.id, { notes: notesEdit });
    setNotesSaving(false);
  }

  async function setScore(score: string | null) {
    if (!selected) return;
    setScoreSaving(true);
    await patch(selected.id, { score: score ?? "" });
    setScoreSaving(false);
  }

  async function activate() {
    if (!selected || !activateEmail.trim()) return;
    setActivateLoading(true);
    setActivateError(null);
    try {
      const res = await fetch(`/api/prospects/${selected.id}/activate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: activateEmail.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setActivateError(
          json.error === "email_taken" ? "Email déjà utilisé." :
          json.error === "already_activated" ? "Déjà activé." : json.error ?? "Erreur serveur"
        );
        return;
      }
      setActivateResult(json.credentials);
      await patch(selected.id, { status: "ACTIVATED" });
      setProspects(prev => prev.map(p =>
        p.id === selected.id ? { ...p, status: "ACTIVATED", restaurantId: json.restaurant.id, slug: json.restaurant.slug } : p
      ));
      setSelected(prev => prev ? { ...prev, status: "ACTIVATED", restaurantId: json.restaurant.id, slug: json.restaurant.slug } : null);
    } catch (e: any) { setActivateError(e.message ?? "Erreur"); }
    setActivateLoading(false);
  }

  const filtered = filterStatus === "ALL" ? prospects : prospects.filter(p => p.status === filterStatus);

  // Call list: WITH phone, sorted by score priority then status
  const scoreOrder = ["🔥", "😊", "🤔", "❄️", ""];
  const callList = [...prospects]
    .filter(p => p.status !== "IGNORED")
    .sort((a, b) => {
      const sa = scoreOrder.indexOf(a.score ?? "");
      const sb = scoreOrder.indexOf(b.score ?? "");
      return (sa === -1 ? 99 : sa) - (sb === -1 ? 99 : sb);
    });

  const stats = {
    NEW: prospects.filter(p => p.status === "NEW").length,
    CONTACTED: prospects.filter(p => p.status === "CONTACTED").length,
    ACTIVATED: prospects.filter(p => p.status === "ACTIVATED").length,
    IGNORED: prospects.filter(p => p.status === "IGNORED").length,
  };

  const DetailPanel = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Photo */}
      {selected!.imageUrl && (
        <img src={selected!.imageUrl} alt={selected!.name}
          className="w-full h-24 object-cover rounded-xl border border-slate-800"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      )}

      {/* Score */}
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-2">Score probabilité</p>
        <div className="flex gap-1.5 flex-wrap">
          {SCORE_OPTIONS.map(opt => (
            <button key={opt.emoji} onClick={() => setScore(selected!.score === opt.emoji ? null : opt.emoji)}
              disabled={scoreSaving}
              title={opt.label}
              className={`px-3 py-2 rounded-xl text-lg border transition-all ${
                selected!.score === opt.emoji
                  ? "border-orange-500/60 bg-orange-500/15 scale-110"
                  : "border-slate-700 bg-slate-900 hover:border-slate-500 opacity-60 hover:opacity-100"
              }`}>
              {opt.emoji}
            </button>
          ))}
          {selected!.score && (
            <button onClick={() => setScore(null)} disabled={scoreSaving}
              className="px-3 py-2 rounded-xl text-xs border border-slate-700 text-slate-500 hover:text-white hover:border-slate-500 transition-all">
              ✕
            </button>
          )}
        </div>
        {selected!.score && (
          <p className="text-xs text-slate-500 mt-1">{SCORE_OPTIONS.find(o => o.emoji === selected!.score)?.label}</p>
        )}
      </div>

      {/* Status */}
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-2">Statut</p>
        <div className="grid grid-cols-2 gap-1.5">
          {(["NEW", "CONTACTED", "ACTIVATED", "IGNORED"] as Status[]).map(s => (
            <button key={s} onClick={() => patch(selected!.id, { status: s })}
              className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                selected!.status === s ? STATUS_CLASSES[s] : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
              }`}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Contacts */}
      <div className="space-y-1.5">
        {selected!.phone && (
          <a href={`tel:${selected!.phone}`}
            className="flex items-center gap-2 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition-colors">
            📞 {selected!.phone}
          </a>
        )}
        {selected!.website && (
          <a href={selected!.website.startsWith("http") ? selected!.website : `https://${selected!.website}`}
            target="_blank" rel="noopener"
            className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-sm hover:bg-blue-500/20 transition-colors truncate">
            🌐 {selected!.website.replace(/^https?:\/\//, "").split("/")[0]}
          </a>
        )}
        {selected!.sourceUrl && (
          <a href={selected!.sourceUrl} target="_blank" rel="noopener"
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 text-sm hover:border-slate-500 transition-colors">
            🗺️ Google Maps
          </a>
        )}
      </div>

      {/* Notes */}
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-2">Notes</p>
        <textarea value={notesEdit} onChange={(e) => setNotesEdit(e.target.value)}
          placeholder="Résultat d'appel, observations…" rows={3}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-orange-500 resize-none" />
        <button onClick={saveNotes} disabled={notesSaving}
          className="mt-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50">
          {notesSaving ? "…" : "💾 Sauvegarder notes"}
        </button>
      </div>

      {/* Documents */}
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-2">Documents</p>
        <Link href={`/dashboard/documents?prospect=${selected!.id}&name=${encodeURIComponent(selected!.name)}`}
          className="flex items-center gap-2 px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 text-sm hover:border-orange-500/50 hover:text-orange-400 transition-colors">
          📄 Générer une plaquette / document
        </Link>
      </div>

      {/* Dashboard / Create account */}
      {selected!.status === "ACTIVATED" && selected!.slug ? (
        <a href={`https://matable.pro/${selected!.slug}`} target="_blank" rel="noopener"
          className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-500/25 transition-colors">
          🚀 Accéder au Dashboard client
        </a>
      ) : (
        <button onClick={() => { setPanel("activate"); setActivateEmail(`${slugify(selected!.name)}@matable.pro`); setActivateResult(null); }}
          className="w-full py-3 bg-orange-500/15 border border-orange-500/30 text-orange-400 rounded-xl text-sm font-bold hover:bg-orange-500/25 transition-colors">
          ✨ Créer le compte MaTable
        </button>
      )}
    </div>
  );

  const EditPanel = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {(["name", "phone", "email", "address", "website", "category", "description"] as (keyof EditForm)[]).map(field => (
        <div key={field}>
          <label className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold block mb-1">
            {field === "name" ? "Nom" : field === "phone" ? "Téléphone" : field === "email" ? "Email" :
             field === "address" ? "Adresse" : field === "website" ? "Site web" :
             field === "category" ? "Catégorie" : "Description"}
          </label>
          {field === "description" ? (
            <textarea value={editForm[field]} onChange={(e) => setEditForm(f => ({ ...f, [field]: e.target.value }))}
              rows={2} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-orange-500 resize-none" />
          ) : (
            <input value={editForm[field]} onChange={(e) => setEditForm(f => ({ ...f, [field]: e.target.value }))}
              type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-orange-500" />
          )}
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <button onClick={saveEdit} disabled={editSaving}
          className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
          {editSaving ? "Sauvegarde…" : "✅ Enregistrer"}
        </button>
        <button onClick={() => setPanel("detail")} className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-400 hover:text-white transition-colors">
          Annuler
        </button>
      </div>
    </div>
  );

  const ActivatePanel = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 space-y-4">
        <p className="text-orange-400 font-bold">✨ Créer le compte MaTable</p>
        <div className="space-y-2">
          <label className="text-xs text-slate-400">Email du compte</label>
          <input value={activateEmail} onChange={(e) => setActivateEmail(e.target.value)} type="email"
            className="w-full bg-black/40 border border-slate-700 focus:border-orange-500 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none" />
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setActivateEmail(`${slugify(selected!.name)}@matable.pro`)}
              className="text-xs px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
              📧 @matable.pro
            </button>
            {selected!.email && (
              <button onClick={() => setActivateEmail(selected!.email!)}
                className="text-xs px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                📩 {selected!.email}
              </button>
            )}
          </div>
        </div>
        {activateError && <p className="text-red-400 text-xs">{activateError}</p>}
        {!activateResult ? (
          <div className="flex gap-2">
            <button onClick={activate} disabled={activateLoading || !activateEmail.trim()}
              className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {activateLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Création…</> : "✅ Créer"}
            </button>
            <button onClick={() => setPanel("detail")} className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 text-sm hover:text-white transition-colors">Annuler</button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-emerald-400 font-bold text-sm">✅ Compte créé !</p>
            <div className="font-mono text-xs space-y-1 text-slate-300 bg-black/40 rounded-lg p-3">
              <p>📧 {activateResult.email}</p>
              <p>🔑 {activateResult.password}</p>
              <p>🔗 {activateResult.loginUrl}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigator.clipboard.writeText(`Email: ${activateResult!.email}\nMDP: ${activateResult!.password}\nLien: ${activateResult!.loginUrl}`)}
                className="flex-1 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300 hover:text-white transition-colors">📋 Copier</button>
              <a href={activateResult.loginUrl} target="_blank" rel="noopener"
                className="flex-1 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-bold text-center">🚀 Dashboard</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden relative">

      {/* ── Map ── */}
      <div className="flex-1 relative overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Chargement…</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Top-left overlay controls ── */}
            <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
              {/* Status filters */}
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setFilterStatus("ALL")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur transition-all ${filterStatus === "ALL" ? "bg-white text-slate-900 border-white" : "bg-slate-900/80 border-slate-700 text-slate-300 hover:border-slate-500"}`}>
                  Tous ({prospects.length})
                </button>
                {(["NEW", "CONTACTED", "ACTIVATED", "IGNORED"] as Status[]).map(s => (
                  <button key={s} onClick={() => setFilterStatus(s === filterStatus ? "ALL" : s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur transition-all ${filterStatus === s ? STATUS_CLASSES[s] : "bg-slate-900/80 border-slate-700 text-slate-400 hover:border-slate-500"}`}>
                    {STATUS_LABEL[s]} ({stats[s]})
                  </button>
                ))}
              </div>

              {/* Score filters legend */}
              <div className="flex gap-1.5">
                {SCORE_OPTIONS.map(o => (
                  <span key={o.emoji} title={o.label}
                    className="w-8 h-8 flex items-center justify-center bg-slate-900/80 border border-slate-700 rounded-full text-base backdrop-blur cursor-default">
                    {o.emoji}
                  </span>
                ))}
                <button onClick={load} title="Rafraîchir"
                  className="w-8 h-8 flex items-center justify-center bg-slate-900/80 border border-slate-700 rounded-full text-slate-400 hover:text-white backdrop-blur transition-colors">
                  🔄
                </button>
              </div>
            </div>

            {/* ── Top-right: call list toggle ── */}
            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 items-end">
              <button onClick={() => setShowCallList(v => !v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border backdrop-blur transition-all shadow-lg ${showCallList ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-900/90 border-slate-700 text-slate-300 hover:border-slate-500"}`}>
                📞 Liste d'appel <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">{callList.length}</span>
              </button>

              {/* Call list floating panel */}
              {showCallList && (
                <div className="w-72 bg-slate-950/95 border border-slate-700 rounded-2xl shadow-2xl backdrop-blur overflow-hidden">
                  <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                    <p className="text-white font-bold text-sm">📞 Liste d'appel</p>
                    <p className="text-slate-500 text-xs">{callList.filter(p => p.phone).length} avec numéro</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2">
                    {callList.length === 0 ? (
                      <p className="text-slate-500 text-xs text-center py-6">Aucun prospect actif</p>
                    ) : callList.map((p, i) => (
                      <CallItem key={p.id} p={p} idx={i} onSelect={() => selectProspect(p)} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                <div className="text-center">
                  <p className="text-5xl mb-3">🗺️</p>
                  <p className="text-white font-bold">Aucun prospect géolocalisé</p>
                  <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
                    Lancez des circuits de prospection et sauvegardez les résultats depuis l'onglet <strong>Circuits</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <LeafletMap prospects={filtered} selected={selected?.id} onSelect={selectProspect} />
            )}
          </>
        )}
      </div>

      {/* ── Detail / Edit / Activate side panel ── */}
      {selected && panel && (
        <div className="w-[360px] max-w-[90vw] flex-shrink-0 border-l border-slate-800 bg-slate-950 flex flex-col overflow-hidden">
          {/* Panel header */}
          <div className="p-4 border-b border-slate-800 flex-shrink-0">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {selected.score && <span className="text-xl">{selected.score}</span>}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${STATUS_CLASSES[selected.status as Status] ?? ""}`}>
                    {STATUS_LABEL[selected.status] ?? selected.status}
                  </span>
                  {selected.category && (
                    <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full border border-slate-700">{selected.category}</span>
                  )}
                </div>
                <p className="font-black text-white text-base leading-tight truncate">{selected.name}</p>
                {selected.address && <p className="text-slate-400 text-xs mt-0.5 truncate">📍 {selected.address}</p>}
              </div>
              <button onClick={() => { setSelected(null); setPanel(null); }}
                className="text-slate-500 hover:text-white text-xl flex-shrink-0 mt-0.5">✕</button>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1 mt-3">
              {(["detail", "edit", "activate"] as const).map(t => (
                <button key={t} onClick={() => setPanel(t)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    panel === t ? "bg-slate-700 text-white border-slate-600" : "border-slate-800 text-slate-500 hover:text-white hover:border-slate-700"
                  }`}>
                  {t === "detail" ? "👁️ Détails" : t === "edit" ? "✏️ Modifier" : "✨ Créer compte"}
                </button>
              ))}
            </div>
          </div>

          {/* Panel content */}
          {panel === "detail" && <DetailPanel />}
          {panel === "edit" && <EditPanel />}
          {panel === "activate" && <ActivatePanel />}
        </div>
      )}
    </div>
  );
}
