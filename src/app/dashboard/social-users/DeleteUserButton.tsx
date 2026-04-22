"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface Props {
  userId: string;
  userName: string;
}

export default function DeleteUserButton({ userId, userName }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/social-users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert("Erreur : " + (data.error ?? "Suppression impossible"));
      } else {
        router.refresh();
      }
    } catch {
      alert("Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  };

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-red-400 font-bold">Supprimer ?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-[10px] bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded font-bold disabled:opacity-50"
        >
          {loading ? "…" : "Oui"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded font-bold"
        >
          Non
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      title={`Supprimer ${userName}`}
      className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
