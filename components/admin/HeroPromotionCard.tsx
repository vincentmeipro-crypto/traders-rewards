"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import {
  HERO_PROMOTION_LABEL_MAX_LENGTH,
  type HeroPromotionPresentation,
  type HeroPromotionStatus,
} from "@/lib/hero-promotion-config";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "tr2026-admin-k9x";

type Props = {
  onNotify: (message: string, ok?: boolean) => void;
};

type FormState = {
  enabled: boolean;
  startsAt: string;
  endsAt: string;
  leftLabel: string;
  leftDiscount: number;
  rightLabel: string;
  rightDiscount: number;
};

const EMPTY_FORM: FormState = {
  enabled: true,
  startsAt: "",
  endsAt: "",
  leftLabel: "1 CHALLENGE",
  leftDiscount: 80,
  rightLabel: "PACK ×3 BEST DEAL",
  rightDiscount: 90,
};

const STATUS_STYLE: Record<
  HeroPromotionStatus,
  { label: string; color: string; background: string; border: string }
> = {
  active: {
    label: "ACTIVE",
    color: "#4ade80",
    background: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.2)",
  },
  scheduled: {
    label: "PLANIFIÉE",
    color: "#c084fc",
    background: "rgba(168,85,247,0.1)",
    border: "rgba(168,85,247,0.2)",
  },
  expired: {
    label: "EXPIRÉE",
    color: "#fbbf24",
    background: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.2)",
  },
  disabled: {
    label: "DÉSACTIVÉE",
    color: "rgba(255,255,255,0.38)",
    background: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.1)",
  },
};

function toDateTimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toForm(data: HeroPromotionPresentation): FormState {
  return {
    enabled: data.enabled,
    startsAt: toDateTimeLocal(data.startsAt),
    endsAt: toDateTimeLocal(data.endsAt),
    leftLabel: data.leftLabel,
    leftDiscount: data.leftDiscount,
    rightLabel: data.rightLabel,
    rightDiscount: data.rightDiscount,
  };
}

function getFormStatus(form: FormState): HeroPromotionStatus {
  if (!form.enabled) return "disabled";

  const now = Date.now();
  const startsAt = form.startsAt ? new Date(form.startsAt).getTime() : null;
  const endsAt = form.endsAt ? new Date(form.endsAt).getTime() : null;

  if (startsAt !== null && Number.isFinite(startsAt) && startsAt > now) {
    return "scheduled";
  }
  if (endsAt !== null && Number.isFinite(endsAt) && endsAt <= now) {
    return "expired";
  }
  return "active";
}

type ColumnEditorProps = {
  side: "left" | "right";
  title: string;
  label: string;
  discount: number;
  disabled: boolean;
  onLabelChange: (value: string) => void;
  onDiscountChange: (value: number) => void;
};

function ColumnEditor({
  side,
  title,
  label,
  discount,
  disabled,
  onLabelChange,
  onDiscountChange,
}: ColumnEditorProps) {
  return (
    <div className="hero-promo-column">
      <div className="hero-promo-column-title">{title}</div>

      <label className="hero-promo-label" htmlFor={`hero-promo-${side}-label`}>
        Libellé
      </label>
      <input
        id={`hero-promo-${side}-label`}
        className="hero-promo-input"
        value={label}
        maxLength={HERO_PROMOTION_LABEL_MAX_LENGTH}
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onLabelChange(event.target.value)
        }
      />

      <label
        className="hero-promo-label hero-promo-label-spaced"
        htmlFor={`hero-promo-${side}-discount`}
      >
        Remise affichée
      </label>
      <div className="hero-promo-number-wrap">
        <input
          id={`hero-promo-${side}-discount`}
          className="hero-promo-input hero-promo-number"
          type="number"
          min={1}
          max={100}
          step={1}
          value={discount}
          disabled={disabled}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onDiscountChange(Number(event.target.value))
          }
        />
        <span className="hero-promo-percent">%</span>
      </div>
    </div>
  );
}

export default function HeroPromotionCard({ onNotify }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/admin/hero-promotion", {
          headers: { "x-admin-key": ADMIN_KEY },
          cache: "no-store",
        });
        const data = (await response.json()) as
          | HeroPromotionPresentation
          | { error?: string };

        if (!response.ok) {
          throw new Error("error" in data ? data.error : "Erreur chargement");
        }
        if (!cancelled) setForm(toForm(data as HeroPromotionPresentation));
      } catch (error) {
        if (!cancelled) {
          onNotify(
            error instanceof Error && error.message
              ? error.message
              : "Erreur chargement de la Promotion Hero",
            false
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
    // Le parent recrée sa fonction de notification à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/hero-promotion", {
        method: "PUT",
        headers: {
          "x-admin-key": ADMIN_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: form.enabled,
          startsAt: toIso(form.startsAt),
          endsAt: toIso(form.endsAt),
          leftLabel: form.leftLabel,
          leftDiscount: form.leftDiscount,
          rightLabel: form.rightLabel,
          rightDiscount: form.rightDiscount,
        }),
      });
      const data = (await response.json()) as
        | HeroPromotionPresentation
        | { error?: string };

      if (!response.ok) {
        throw new Error("error" in data ? data.error : "Erreur enregistrement");
      }

      setForm(toForm(data as HeroPromotionPresentation));
      onNotify("Promotion Hero enregistrée");
    } catch (error) {
      onNotify(
        error instanceof Error && error.message
          ? error.message
          : "Impossible d’enregistrer la Promotion Hero",
        false
      );
    } finally {
      setSaving(false);
    }
  };

  const disabled = loading || saving;
  const status = STATUS_STYLE[getFormStatus(form)];

  return (
    <section className="hero-promo-card">
      <style>{`
        .hero-promo-card { background:#0c0c0c; border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:20px; margin-bottom:24px; }
        .hero-promo-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:18px; flex-wrap:wrap; }
        .hero-promo-title-row { display:flex; align-items:center; gap:10px; margin-bottom:6px; flex-wrap:wrap; }
        .hero-promo-title { margin:0; font-size:16px; font-weight:800; }
        .hero-promo-help { margin:0; color:rgba(255,255,255,.32); font-size:12px; line-height:1.5; }
        .hero-promo-grid, .hero-promo-period { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:14px; }
        .hero-promo-grid { margin-bottom:14px; }
        .hero-promo-period { margin-bottom:16px; }
        .hero-promo-column { background:rgba(255,255,255,.018); border:1px solid rgba(255,255,255,.06); border-radius:9px; padding:14px; }
        .hero-promo-column-title { color:rgba(255,255,255,.55); font-size:11px; font-weight:700; margin-bottom:12px; }
        .hero-promo-label { display:block; margin-bottom:7px; color:rgba(255,255,255,.38); font-size:10px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; }
        .hero-promo-label-spaced { margin-top:12px; }
        .hero-promo-input { width:100%; box-sizing:border-box; background:#080808; border:1px solid rgba(255,255,255,.1); border-radius:7px; color:#fff; font-size:13px; padding:9px 11px; }
        .hero-promo-number-wrap { position:relative; }
        .hero-promo-number { padding-right:34px; }
        .hero-promo-percent { position:absolute; right:12px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,.3); font-size:12px; pointer-events:none; }
        .hero-promo-footer { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
        @media (max-width:720px) { .hero-promo-grid, .hero-promo-period { grid-template-columns:minmax(0,1fr); } }
      `}</style>

      <div className="hero-promo-head">
        <div>
          <div className="hero-promo-title-row">
            <h2 className="hero-promo-title">Promotion Hero</h2>
            <span
              style={{
                padding: "3px 8px",
                borderRadius: 4,
                color: status.color,
                background: status.background,
                border: `1px solid ${status.border}`,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.5px",
              }}
            >
              {loading ? "CHARGEMENT" : status.label}
            </span>
          </div>
          <p className="hero-promo-help">
            Pilote uniquement le cadre promotionnel à deux colonnes du Hero. Les
            remises du checkout restent gérées séparément par les codes
            promotionnels.
          </p>
        </div>

        <button
          type="button"
          disabled={disabled}
          aria-pressed={form.enabled}
          onClick={() =>
            setForm((current) => ({ ...current, enabled: !current.enabled }))
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            padding: "8px 11px",
            borderRadius: 7,
            border: `1px solid ${
              form.enabled
                ? "rgba(34,197,94,0.25)"
                : "rgba(255,255,255,0.1)"
            }`,
            background: form.enabled
              ? "rgba(34,197,94,0.08)"
              : "rgba(255,255,255,0.03)",
            color: form.enabled ? "#4ade80" : "rgba(255,255,255,0.42)",
            fontSize: 12,
            fontWeight: 700,
            cursor: disabled ? "default" : "pointer",
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: form.enabled ? "#4ade80" : "rgba(255,255,255,0.25)",
            }}
          />
          {form.enabled ? "Affichée dans le Hero" : "Masquée dans le Hero"}
        </button>
      </div>

      <div className="hero-promo-grid">
        <ColumnEditor
          side="left"
          title="Colonne gauche"
          label={form.leftLabel}
          discount={form.leftDiscount}
          disabled={disabled}
          onLabelChange={(leftLabel) =>
            setForm((current) => ({ ...current, leftLabel }))
          }
          onDiscountChange={(leftDiscount) =>
            setForm((current) => ({ ...current, leftDiscount }))
          }
        />
        <ColumnEditor
          side="right"
          title="Colonne droite"
          label={form.rightLabel}
          discount={form.rightDiscount}
          disabled={disabled}
          onLabelChange={(rightLabel) =>
            setForm((current) => ({ ...current, rightLabel }))
          }
          onDiscountChange={(rightDiscount) =>
            setForm((current) => ({ ...current, rightDiscount }))
          }
        />
      </div>

      <div className="hero-promo-period">
        <div>
          <label className="hero-promo-label" htmlFor="hero-promo-start">
            Début d’affichage — facultatif
          </label>
          <input
            id="hero-promo-start"
            className="hero-promo-input"
            type="datetime-local"
            value={form.startsAt}
            disabled={disabled}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setForm((current) => ({
                ...current,
                startsAt: event.target.value,
              }))
            }
            style={{ colorScheme: "dark" }}
          />
        </div>
        <div>
          <label className="hero-promo-label" htmlFor="hero-promo-end">
            Fin d’affichage — facultatif
          </label>
          <input
            id="hero-promo-end"
            className="hero-promo-input"
            type="datetime-local"
            value={form.endsAt}
            disabled={disabled}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setForm((current) => ({
                ...current,
                endsAt: event.target.value,
              }))
            }
            style={{ colorScheme: "dark" }}
          />
        </div>
      </div>

      <div className="hero-promo-footer">
        <div style={{ color: "rgba(255,255,255,0.24)", fontSize: 11 }}>
          Sans dates, l’affichage suit uniquement le bouton d’activation.
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void save()}
          style={{
            border: "none",
            borderRadius: 8,
            background: "#C9963F",
            color: "#fff",
            padding: "9px 18px",
            fontSize: 13,
            fontWeight: 700,
            cursor: disabled ? "default" : "pointer",
            opacity: disabled ? 0.55 : 1,
          }}
        >
          {saving ? "Enregistrement…" : "Enregistrer la Promotion Hero"}
        </button>
      </div>
    </section>
  );
}
