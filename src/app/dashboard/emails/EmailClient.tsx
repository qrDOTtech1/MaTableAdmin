"use client";

import { useState, useEffect } from "react";
import { Send, Inbox, RefreshCw, Check, AlertCircle, Mail, Clock, ChevronDown } from "lucide-react";

const PRESET_SENDERS = [
  { label: "Steven", value: "steven" },
  { label: "Contact", value: "contact" },
  { label: "Support", value: "support" },
  { label: "No-Reply", value: "noreply" },
  { label: "Equipe", value: "equipe" },
];

type SentEmail = {
  id: string;
  from: string;
  to: string | string[];
  subject: string;
  created_at: string;
};

type ReceivedEmail = {
  id: string;
  from: string;
  to: string;
  subject: string;
  text: string | null;
  html: string | null;
  createdAt: string;
};

export default function EmailClient() {
  const [tab, setTab] = useState<"compose" | "sent" | "inbox">("inbox");


  // Compose state
  const [senderPrefix, setSenderPrefix] = useState("steven");
  const [customPrefix, setCustomPrefix] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isHtml, setIsHtml] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sent emails state
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);

  // Inbox state
  const [inboxEmails, setInboxEmails] = useState<ReceivedEmail[]>([]);
  const [inboxFilter, setInboxFilter] = useState<"all" | "steven" | "hugo" | "contact">("all");
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  const fromAddress = useCustom
    ? `${customPrefix.toLowerCase().replace(/[^a-z0-9._-]/g, "")}@matable.pro`
    : `${senderPrefix}@matable.pro`;

  async function loadEmails() {
    setLoadingEmails(true);
    try {
      const res = await fetch("/api/emails");
      const data = await res.json();
      setEmails(data.emails ?? []);
    } catch {}
    setLoadingEmails(false);
  }

  useEffect(() => {
    if (tab === "sent") loadEmails();
    if (tab === "inbox") loadInbox();
  }, [tab, inboxFilter]);

  async function loadInbox() {
    setLoadingInbox(true);
    try {
      const res = await fetch(`/api/emails/inbound/list?to=${inboxFilter}`);
      const data = await res.json();
      setInboxEmails(data.emails ?? []);
    } catch {}
    setLoadingInbox(false);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!to.trim() || !subject.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromAddress,
          to: to.split(",").map((e) => e.trim()).filter(Boolean),
          subject,
          ...(isHtml ? { html: body } : { text: body }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ type: "error", text: data.error ?? "Erreur lors de l'envoi." });
      } else {
        setResult({ type: "success", text: `Email envoye ! (ID: ${data.id})` });
        setTo("");
        setSubject("");
        setBody("");
      }
    } catch {
      setResult({ type: "error", text: "Erreur reseau." });
    }
    setSending(false);
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Emails</h1>
        <p className="text-slate-400 mt-1">Envoyer et consulter les emails via <span className="text-orange-400 font-semibold">@matable.pro</span></p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("inbox")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            tab === "inbox" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          <Inbox className="w-4 h-4" /> Boîte de réception
        </button>
        <button
          onClick={() => setTab("compose")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            tab === "compose" ? "bg-orange-600 text-white shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          <Send className="w-4 h-4" /> Composer
        </button>
        <button
          onClick={() => setTab("sent")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            tab === "sent" ? "bg-orange-600 text-white shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          <Check className="w-4 h-4" /> Envoyés
        </button>
      </div>

      {/* Inbox Tab */}
      {tab === "inbox" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden flex flex-col min-h-[600px]">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-4">
            <h2 className="font-bold text-white flex items-center gap-2">
              Boîte de réception
              <span className="bg-blue-600/20 text-blue-400 text-xs px-2 py-0.5 rounded-full border border-blue-500/20">{inboxEmails.length}</span>
            </h2>

            <div className="flex items-center gap-4">
              <select
                value={inboxFilter}
                onChange={(e) => setInboxFilter(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
              >
                <option value="all">Toutes les adresses</option>
                <option value="steven">steven@matable.pro</option>
                <option value="hugo">hugo@matable.pro</option>
                <option value="contact">contact@matable.pro</option>
              </select>

              <button
                onClick={loadInbox}
                disabled={loadingInbox}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingInbox ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {inboxEmails.length === 0 ? (
              <div className="p-12 text-center mt-10">
                <Inbox className="w-10 h-10 mx-auto text-slate-700 mb-3" />
                <p className="text-slate-500 text-sm">
                  {loadingInbox ? "Chargement..." : "Boîte de réception vide."}
                </p>
                <p className="text-slate-600 text-xs mt-2 max-w-md mx-auto">
                  Assurez-vous que le webhook Inbound Resend pointe vers <code>https://votre-admin.matable.pro/api/emails/inbound</code>.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {inboxEmails.map((email) => {
                  const isExpanded = expandedEmail === email.id;
                  
                  // Label specifique pour le destinataire
                  let toBadge = <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">{email.to}</span>;
                  if (email.to.includes("steven")) toBadge = <span className="bg-blue-900/40 border border-blue-800 text-blue-300 px-2 py-0.5 rounded text-[10px]">steven@</span>;
                  if (email.to.includes("hugo")) toBadge = <span className="bg-emerald-900/40 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded text-[10px]">hugo@</span>;
                  if (email.to.includes("contact")) toBadge = <span className="bg-orange-900/40 border border-orange-800 text-orange-300 px-2 py-0.5 rounded text-[10px]">contact@</span>;

                  return (
                    <div key={email.id} className={`transition-colors ${isExpanded ? "bg-slate-800/30" : "hover:bg-slate-800/50"}`}>
                      {/* Row principale */}
                      <div 
                        className="px-6 py-4 flex items-center justify-between cursor-pointer gap-4"
                        onClick={() => setExpandedEmail(isExpanded ? null : email.id)}
                      >
                        <div className="flex-1 min-w-0 flex items-center gap-4">
                          <div className="w-10 shrink-0">{toBadge}</div>
                          <div className="truncate text-slate-300 font-medium text-sm min-w-[150px]">{email.from}</div>
                          <div className="truncate text-white font-medium flex-1">{email.subject || "(Sans objet)"}</div>
                        </div>
                        <div className="text-slate-500 text-xs flex items-center gap-3 shrink-0">
                          {new Date(email.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </div>

                      {/* Contenu developpe */}
                      {isExpanded && (
                        <div className="px-6 pb-6 pt-2 border-t border-slate-800/50 bg-slate-950/30">
                          <div className="text-xs text-slate-500 mb-4 bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                            <p><strong>De:</strong> {email.from}</p>
                            <p><strong>À:</strong> {email.to}</p>
                            <p><strong>Date:</strong> {new Date(email.createdAt).toLocaleString("fr-FR")}</p>
                          </div>
                          
                          <div className="bg-white text-black p-6 rounded-lg text-sm max-h-[500px] overflow-auto">
                            {email.html ? (
                              <div dangerouslySetInnerHTML={{ __html: email.html }} />
                            ) : (
                              <pre className="whitespace-pre-wrap font-sans">{email.text || "Message vide"}</pre>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compose Tab */}
      {tab === "compose" && (
        <form onSubmit={handleSend} className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">

          {/* From selector */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">De</label>
            <div className="flex items-center gap-3">
              {!useCustom ? (
                <div className="flex gap-2 flex-wrap">
                  {PRESET_SENDERS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setSenderPrefix(s.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border ${
                        senderPrefix === s.value
                          ? "bg-orange-600 border-orange-500 text-white"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setUseCustom(true)}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
                  >
                    Personnalise...
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={customPrefix}
                    onChange={(e) => setCustomPrefix(e.target.value)}
                    placeholder="nom"
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 w-40"
                    autoFocus
                  />
                  <span className="text-slate-500 text-sm font-mono">@matable.pro</span>
                  <button
                    type="button"
                    onClick={() => { setUseCustom(false); setCustomPrefix(""); }}
                    className="text-xs text-slate-500 hover:text-white ml-2"
                  >
                    Presets
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1.5 font-mono">{fromAddress}</p>
          </div>

          {/* To */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">A</label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="destinataire@email.com (virgule pour plusieurs)"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 placeholder:text-slate-600"
              required
            />
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Objet</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet de l'email"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 placeholder:text-slate-600"
              required
            />
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Message</label>
              <button
                type="button"
                onClick={() => setIsHtml(!isHtml)}
                className={`text-xs px-2 py-1 rounded-md border transition-all ${
                  isHtml
                    ? "bg-purple-600/20 border-purple-500/30 text-purple-300"
                    : "bg-slate-800 border-slate-700 text-slate-500"
                }`}
              >
                {isHtml ? "HTML" : "Texte"}
              </button>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={isHtml ? "<h1>Bonjour</h1><p>Contenu HTML...</p>" : "Bonjour, ..."}
              rows={10}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 placeholder:text-slate-600 resize-none font-mono"
              required
            />
          </div>

          {/* Result */}
          {result && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
              result.type === "success"
                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}>
              {result.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {result.text}
            </div>
          )}

          {/* Send */}
          <button
            type="submit"
            disabled={sending || !to.trim() || !subject.trim() || !body.trim()}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {sending ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi en cours...</>
            ) : (
              <><Send className="w-4 h-4" /> Envoyer depuis {fromAddress}</>
            )}
          </button>
        </form>
      )}

      {/* Sent Emails Tab */}
      {tab === "sent" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-bold text-white">Historique des envois</h2>
            <button
              onClick={loadEmails}
              disabled={loadingEmails}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingEmails ? "animate-spin" : ""}`} /> Rafraichir
            </button>
          </div>

          {emails.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="w-10 h-10 mx-auto text-slate-700 mb-3" />
              <p className="text-slate-500 text-sm">
                {loadingEmails ? "Chargement..." : "Aucun email envoye pour le moment."}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-800">
                <tr className="text-slate-400 text-xs uppercase tracking-widest">
                  <th className="text-left px-6 py-3 font-semibold">De</th>
                  <th className="text-left px-6 py-3 font-semibold">A</th>
                  <th className="text-left px-6 py-3 font-semibold">Objet</th>
                  <th className="text-left px-6 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {emails.map((email) => (
                  <tr key={email.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-3 text-orange-400 font-mono text-xs">{email.from}</td>
                    <td className="px-6 py-3 text-slate-300">{Array.isArray(email.to) ? email.to.join(", ") : email.to}</td>
                    <td className="px-6 py-3 text-white font-medium">{email.subject}</td>
                    <td className="px-6 py-3 text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(email.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
