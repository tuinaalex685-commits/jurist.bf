/**
 * Ordre catégoriel FIXE du cockpit — jamais cyclé, jamais réattribué selon le
 * rang d'une série. Ces quatre teintes (émeraude → indigo → rose → ciel) sont
 * les seules validées : la paire indigo/violet des tokens `cat-*` est
 * indiscernable en protanopie (ΔE 0,6) et `cat-amber` tombe sous 3:1 de
 * contraste sur fond clair — aucune des deux n'est utilisable comme série.
 */
export const SERIES_ORDER = ["emerald", "indigo", "rose", "sky"] as const;
export type SeriesTone = (typeof SERIES_ORDER)[number];

/** Classes statiques : Tailwind ne peut pas résoudre un nom de classe construit. */
export const SERIES_STROKE: Record<SeriesTone, string> = {
  emerald: "stroke-cat-emerald",
  indigo: "stroke-cat-indigo",
  rose: "stroke-cat-rose",
  sky: "stroke-cat-sky",
};

export const SERIES_FILL: Record<SeriesTone, string> = {
  emerald: "fill-cat-emerald",
  indigo: "fill-cat-indigo",
  rose: "fill-cat-rose",
  sky: "fill-cat-sky",
};

export const SERIES_TEXT: Record<SeriesTone, string> = {
  emerald: "text-cat-emerald",
  indigo: "text-cat-indigo",
  rose: "text-cat-rose",
  sky: "text-cat-sky",
};

export const SERIES_BG: Record<SeriesTone, string> = {
  emerald: "bg-cat-emerald",
  indigo: "bg-cat-indigo",
  rose: "bg-cat-rose",
  sky: "bg-cat-sky",
};
