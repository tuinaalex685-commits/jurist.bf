/**
 * Géométrie des graphiques — fonctions PURES, aucun React, aucun DOM.
 * Le rendu SVG se contente de consommer ces coordonnées : la logique de calcul
 * ne vit jamais dans le JSX.
 */

export interface ChartBox {
  width: number;
  height: number;
  padTop: number;
  padRight: number;
  padBottom: number;
  padLeft: number;
}

export const DEFAULT_BOX: ChartBox = {
  width: 760,
  height: 240,
  padTop: 12,
  padRight: 12,
  padBottom: 26,
  padLeft: 44,
};

/** Borne haute « ronde » (1/2/5 × 10ⁿ) pour que les graduations tombent juste. */
export function niceMax(rawMax: number): number {
  if (!Number.isFinite(rawMax) || rawMax <= 0) return 1;
  const exponent = Math.floor(Math.log10(rawMax));
  const magnitude = 10 ** exponent;
  const normalized = rawMax / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export interface Scales {
  yMax: number;
  ticks: number[];
  /** Centre de la i-ème catégorie (barres) ou position du i-ème point (courbes). */
  x: (index: number) => number;
  y: (value: number) => number;
  /** Largeur d'une bande catégorielle (barres). */
  bandWidth: number;
  innerWidth: number;
  innerHeight: number;
  baseline: number;
}

export function buildScales(count: number, maxValue: number, box: ChartBox, tickCount = 4): Scales {
  const innerWidth = box.width - box.padLeft - box.padRight;
  const innerHeight = box.height - box.padTop - box.padBottom;
  const yMax = niceMax(maxValue);
  const baseline = box.padTop + innerHeight;
  const bandWidth = count > 0 ? innerWidth / count : innerWidth;

  return {
    yMax,
    ticks: Array.from({ length: tickCount + 1 }, (_, i) => (yMax / tickCount) * i),
    // Les points d'une courbe s'étalent d'un bord à l'autre ; une seule valeur
    // se place au centre plutôt que collée à gauche.
    x: (index) => (count <= 1 ? box.padLeft + innerWidth / 2 : box.padLeft + (innerWidth * index) / (count - 1)),
    y: (value) => baseline - (Math.max(0, value) / yMax) * innerHeight,
    bandWidth,
    innerWidth,
    innerHeight,
    baseline,
  };
}

/** Centre de la i-ème bande — pour les barres, distinct de `x` (points). */
export function bandCenter(index: number, box: ChartBox, scales: Scales): number {
  return box.padLeft + scales.bandWidth * (index + 0.5);
}

export function linePath(values: number[], scales: Scales): string {
  if (values.length === 0) return "";
  return values.map((v, i) => `${i === 0 ? "M" : "L"}${scales.x(i).toFixed(2)},${scales.y(v).toFixed(2)}`).join(" ");
}

export function areaPath(values: number[], scales: Scales): string {
  if (values.length === 0) return "";
  const line = linePath(values, scales);
  const firstX = scales.x(0).toFixed(2);
  const lastX = scales.x(values.length - 1).toFixed(2);
  return `${line} L${lastX},${scales.baseline.toFixed(2)} L${firstX},${scales.baseline.toFixed(2)} Z`;
}

/**
 * Index du point le plus proche d'une abscisse (en fraction 0..1 de la largeur
 * utile) — alimente le curseur de survol.
 */
export function nearestIndex(fraction: number, count: number): number {
  if (count <= 1) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(fraction * (count - 1))));
}

// ---------------------------------------------------------------------------
// Formatage — extrait du JSX, testable, réutilisé par les tuiles et les axes.
// ---------------------------------------------------------------------------
const compact = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export const formatCompact = (v: number): string => compact.format(v);
export const formatInt = (v: number): string => integer.format(v);

export function formatUsd(v: number): string {
  if (v === 0) return "0 $";
  if (v < 0.01) return "< 0,01 $";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: v < 10 ? 2 : 0 }).format(v)} $`;
}

export function formatPercent(ratio: number, digits = 0): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(ratio * 100)} %`;
}

/** Montant stocké en centimes → libellé monétaire (XOF par défaut, sans décimales). */
export function formatMoneyCents(cents: number, currency: string): string {
  const amount = currency === "XOF" ? Math.round(cents / 100) : cents / 100;
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount)} ${currency}`;
}

/** « 2026-07-26 » → « 26 juil. » (axe des abscisses, compact). */
export function formatDayShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(d);
}

export function formatDayLong(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(d);
}

/** Durée en secondes → « 3 min », « 2 h 10 », « 4 j » (âge de file, séries). */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86_400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
  }
  return `${Math.floor(seconds / 86_400)} j`;
}
