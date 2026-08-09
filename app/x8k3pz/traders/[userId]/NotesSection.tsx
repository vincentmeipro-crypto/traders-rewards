"use client";
// ── NotesSection — Section notes internes admin ───────────────────────────────
// Client Component : gère l'ajout et la suppression de notes.
// author_email jamais envoyé depuis ce composant — résolu par l'API.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "tr2026-admin-k9x";

type Note = {
  id: string;
  content: string;
  author_email: string;
  created_at: string;
};

interface NotesSectionProps {
  traderId:     string;
  initialNotes: Note[];
}

export default function NotesSection({ traderId, initialNotes }: NotesSectionProps) {
  const [notes, setNotes]     = useState<Note[]>(initialNotes);
  const [draft, setDraft]     = useState("");
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  const addNote = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
        body: JSON.stringify({ target_type: "trader", target_id: traderId, content: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erreur inconnue"); return; }
      setNotes(prev => [data.note as Note, ...prev]);
      setDraft("");
    } catch {
      setError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (id: string) => {
    setDeleting(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/notes?id=${id}`, {
        method: "DELETE",
        headers: { "x-admin-key": ADMIN_KEY },
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Erreur suppression"); return; }
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch {
      setError("Erreur réseau");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Formulaire ajout */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Ajouter une note interne…"
          rows={3}
          style={{
            width: "100%", boxSizing: "border-box",
            background: "#111", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "10px 14px",
            color: "#fff", fontSize: 13, resize: "vertical",
            outline: "none", fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={addNote}
            disabled={saving || !draft.trim()}
            style={{
              padding: "8px 18px",
              background: saving || !draft.trim() ? "rgba(59,130,246,0.25)" : "#3b82f6",
              border: "none", borderRadius: 7,
              color: "#fff", fontSize: 12, fontWeight: 700,
              cursor: saving || !draft.trim() ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Enregistrement…" : "Ajouter"}
          </button>
          {draft.trim().length > 0 && (
            <span style={{ fontSize: 11, color: `${draft.trim().length > 3800 ? "#ef4444" : "rgba(255,255,255,0.25)"}` }}>
              {draft.trim().length} / 4000
            </span>
          )}
          {error && (
            <span style={{ fontSize: 12, color: "#ef4444" }}>{error}</span>
          )}
        </div>
      </div>

      {/* Liste des notes */}
      {notes.length === 0 && (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", padding: "8px 0" }}>
          Aucune note pour ce trader.
        </div>
      )}

      {notes.map(note => (
        <div
          key={note.id}
          style={{
            background: "#0f1117",
            border: "1px solid rgba(59,130,246,0.12)",
            borderRadius: 8,
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {/* Méta */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                {note.author_email}
              </span>
              <span>
                {new Date(note.created_at).toLocaleDateString("fr-FR", {
                  day: "2-digit", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </div>
            <button
              onClick={() => deleteNote(note.id)}
              disabled={deleting === note.id}
              title="Supprimer cette note"
              style={{
                background: "none", border: "none",
                color: deleting === note.id ? "rgba(255,255,255,0.2)" : "rgba(239,68,68,0.5)",
                cursor: deleting === note.id ? "not-allowed" : "pointer",
                fontSize: 11, fontWeight: 600, padding: "2px 4px",
                flexShrink: 0,
              }}
            >
              {deleting === note.id ? "…" : "Supprimer"}
            </button>
          </div>

          {/* Contenu */}
          <div style={{
            fontSize: 13, color: "rgba(255,255,255,0.85)",
            lineHeight: "1.55", whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
            {note.content}
          </div>
        </div>
      ))}
    </div>
  );
}
