export const HERO_PROMOTION_SETTING_KEY = "general.hero_promotion";
export const HERO_PROMOTION_DESCRIPTION =
  "Configuration du cadre promotionnel affiché dans le Hero";

export const HERO_PROMOTION_LABEL_MAX_LENGTH = 32;
export const HERO_PROMOTION_HEADLINE_MAX_LENGTH = 100;

export interface HeroPromotionConfig {
  headline: string;
  enabled: boolean;
  startsAt: string | null;
  endsAt: string | null;
  leftLabel: string;
  leftDiscount: number;
  rightLabel: string;
  rightDiscount: number;
}

export type HeroPromotionStatus =
  | "active"
  | "scheduled"
  | "expired"
  | "disabled";

export interface HeroPromotionPresentation extends HeroPromotionConfig {
  status: HeroPromotionStatus;
  visible: boolean;
}

export type HeroPromotionValidationResult =
  | { ok: true; value: HeroPromotionConfig }
  | { ok: false; errors: string[] };

export const DEFAULT_HERO_PROMOTION_CONFIG: HeroPromotionConfig = {
  headline: "",
  enabled: true,
  startsAt: null,
  endsAt: null,
  leftLabel: "1 CHALLENGE",
  leftDiscount: 80,
  rightLabel: "PACK ×3 BEST DEAL",
  rightDiscount: 90,
};

export const DEFAULT_HERO_PROMOTION_PRESENTATION: HeroPromotionPresentation = {
  ...DEFAULT_HERO_PROMOTION_CONFIG,
  status: "active",
  visible: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeLabel(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > HERO_PROMOTION_LABEL_MAX_LENGTH) {
    return fallback;
  }
  return trimmed;
}

function normalizeDiscount(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    return fallback;
  }
  return parsed;
}

function normalizeDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function normalizeHeroPromotionConfig(
  value: unknown
): HeroPromotionConfig {
  const source = isRecord(value) ? value : {};

  return {
    enabled:
      typeof source.enabled === "boolean"
        ? source.enabled
        : DEFAULT_HERO_PROMOTION_CONFIG.enabled,
    headline: typeof source.headline === "string" && source.headline.trim().length <= HERO_PROMOTION_HEADLINE_MAX_LENGTH ? source.headline.trim() : "",
    startsAt: normalizeDate(source.startsAt),
    endsAt: normalizeDate(source.endsAt),
    leftLabel: normalizeLabel(
      source.leftLabel,
      DEFAULT_HERO_PROMOTION_CONFIG.leftLabel
    ),
    leftDiscount: normalizeDiscount(
      source.leftDiscount,
      DEFAULT_HERO_PROMOTION_CONFIG.leftDiscount
    ),
    rightLabel: normalizeLabel(
      source.rightLabel,
      DEFAULT_HERO_PROMOTION_CONFIG.rightLabel
    ),
    rightDiscount: normalizeDiscount(
      source.rightDiscount,
      DEFAULT_HERO_PROMOTION_CONFIG.rightDiscount
    ),
  };
}

function validateLabel(
  value: unknown,
  fieldLabel: string,
  errors: string[]
): string {
  if (typeof value !== "string") {
    errors.push(`${fieldLabel} doit être un texte`);
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    errors.push(`${fieldLabel} ne peut pas être vide`);
  } else if (trimmed.length > HERO_PROMOTION_LABEL_MAX_LENGTH) {
    errors.push(
      `${fieldLabel} doit faire au maximum ${HERO_PROMOTION_LABEL_MAX_LENGTH} caractères`
    );
  }

  return trimmed;
}

function validateDiscount(
  value: unknown,
  fieldLabel: string,
  errors: string[]
): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    errors.push(`${fieldLabel} doit être un entier entre 1 et 100`);
    return 0;
  }
  return parsed;
}

function validateDate(
  value: unknown,
  fieldLabel: string,
  errors: string[]
): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") {
    errors.push(`${fieldLabel} doit être une date valide`);
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    errors.push(`${fieldLabel} doit être une date valide`);
    return null;
  }

  return parsed.toISOString();
}

export function validateHeroPromotionConfig(
  value: unknown
): HeroPromotionValidationResult {
  if (!isRecord(value)) {
    return { ok: false, errors: ["Configuration invalide"] };
  }

  const errors: string[] = [];
  const headline = typeof value.headline === "string" ? value.headline.trim() : "";
  if (value.headline !== undefined && typeof value.headline !== "string") {
    errors.push("Le libellé des offres doit être un texte");
  }
  if (headline.length > HERO_PROMOTION_HEADLINE_MAX_LENGTH) {
    errors.push(`Le libellé des offres doit faire au maximum ${HERO_PROMOTION_HEADLINE_MAX_LENGTH} caractères`);
  }

  const enabled =
    typeof value.enabled === "boolean"
      ? value.enabled
      : DEFAULT_HERO_PROMOTION_CONFIG.enabled;
  if (value.enabled !== undefined && typeof value.enabled !== "boolean") {
    errors.push("La visibilité doit être un booléen");
  }

  const startsAt = validateDate(value.startsAt, "La date de début", errors);
  const endsAt = validateDate(value.endsAt, "La date de fin", errors);
  const leftLabel = validateLabel(value.leftLabel, "Le libellé de gauche", errors);
  const leftDiscount = validateDiscount(
    value.leftDiscount,
    "La remise de gauche",
    errors
  );
  const rightLabel = validateLabel(
    value.rightLabel,
    "Le libellé de droite",
    errors
  );
  const rightDiscount = validateDiscount(
    value.rightDiscount,
    "La remise de droite",
    errors
  );

  if (
    startsAt &&
    endsAt &&
    new Date(startsAt).getTime() >= new Date(endsAt).getTime()
  ) {
    errors.push("La date de début doit être antérieure à la date de fin");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      headline,
      enabled,
      startsAt,
      endsAt,
      leftLabel,
      leftDiscount,
      rightLabel,
      rightDiscount,
    },
  };
}

export function getHeroPromotionPresentation(
  config: HeroPromotionConfig,
  now = new Date()
): HeroPromotionPresentation {
  let status: HeroPromotionStatus = "active";

  if (!config.enabled) {
    status = "disabled";
  } else if (config.startsAt && new Date(config.startsAt) > now) {
    status = "scheduled";
  } else if (config.endsAt && new Date(config.endsAt) <= now) {
    status = "expired";
  }

  return {
    ...config,
    status,
    visible: status === "active",
  };
}
