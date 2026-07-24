import "server-only";

/**
 * Moteur d'évaluation — registre de méthodes extensible.
 * Ajouter un format d'évaluation = ajouter une entrée ici (aucune autre modif).
 * Tout est calculé côté serveur ; la solution n'est jamais renvoyée au client.
 */
export type EvalOutput = {
  score: number; // 0..1
  passed: boolean;
  detail: Record<string, unknown>;
};

type Sol = Record<string, unknown>;
type Cfg = Record<string, unknown>;

const norm = (v: unknown) => String(v ?? "").toLowerCase().trim();
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const threshold = (cfg: Cfg, dflt: number) =>
  typeof cfg.pass_threshold === "number" ? cfg.pass_threshold : dflt;

/** Extrait une valeur d'un response polymorphe : soit brut, soit {key}. */
function pick(response: unknown, key: string): unknown {
  if (response && typeof response === "object" && key in (response as object)) {
    return (response as Record<string, unknown>)[key];
  }
  return response;
}

type Method = (response: unknown, sol: Sol, cfg: Cfg) => EvalOutput;

const methods: Record<string, Method> = {
  // Découverte / lecture : pas de notation, l'acte de consulter suffit.
  acknowledge: () => ({ score: 1, passed: true, detail: {} }),

  // Choix exact (ex. Oui/Non, QCM). Détecte les confusions configurées.
  exact: (response, sol, cfg) => {
    const val = norm(pick(response, "value"));
    const correct = val === norm(sol.answer);
    const detail: Record<string, unknown> = {};
    if (!correct) {
      const confusions = (cfg.confusions ?? {}) as Record<string, string>;
      const key = Object.keys(confusions).find((k) => norm(k) === val);
      if (key) detail.confusion = confusions[key];
    }
    return { score: correct ? 1 : 0, passed: correct, detail };
  },

  // Sélection d'éléments (ensemble). Score = Jaccard.
  set: (response, sol, cfg) => {
    const chosen = new Set(asArray(pick(response, "selected")).map(norm));
    const target = new Set(asArray(sol.correct).map(norm));
    const inter = [...chosen].filter((x) => target.has(x)).length;
    const union = new Set([...chosen, ...target]).size || 1;
    const score = inter / union;
    return {
      score,
      passed: score >= threshold(cfg, 1),
      detail: {
        missing: [...target].filter((x) => !chosen.has(x)),
        extra: [...chosen].filter((x) => !target.has(x)),
      },
    };
  },

  // Remise en ordre. Score = fraction de positions correctes.
  order: (response, sol, cfg) => {
    const got = asArray(pick(response, "order")).map(norm);
    const want = asArray(sol.order).map(norm);
    const n = want.length || 1;
    const ok = want.filter((x, i) => got[i] === x).length;
    const score = ok / n;
    return { score, passed: score >= threshold(cfg, 1), detail: { correctPositions: ok, total: want.length } };
  },

  // Association. Score = paires correctes / total.
  matching: (response, sol, cfg) => {
    const got = asArray(pick(response, "pairs")).map((p) => asArray(p).map(norm).join("→"));
    const want = asArray(sol.pairs).map((p) => asArray(p).map(norm).join("→"));
    const gotSet = new Set(got);
    const ok = want.filter((p) => gotSet.has(p)).length;
    const score = ok / (want.length || 1);
    return { score, passed: score >= threshold(cfg, 1), detail: { correctPairs: ok, total: want.length } };
  },

  // Texte à trous. Score = mots corrects / total.
  cloze: (response, sol, cfg) => {
    const got = asArray(pick(response, "blanks")).map(norm);
    const want = asArray(sol.blanks).map(norm);
    const wrong: number[] = [];
    let ok = 0;
    want.forEach((w, i) => (got[i] === w ? ok++ : wrong.push(i)));
    const score = ok / (want.length || 1);
    return { score, passed: score >= threshold(cfg, 1), detail: { wrongIndexes: wrong } };
  },

  // Réponse rédigée (heuristique par mots-clés ; l'IA affinera plus tard).
  keywords: (response, sol, cfg) => {
    const text = norm(pick(response, "text"));
    const kws = asArray(sol.keywords).map(norm).filter(Boolean);
    const matched = kws.filter((k) => text.includes(k));
    const score = kws.length ? matched.length / kws.length : 0;
    return {
      score,
      passed: score >= threshold(cfg, 0.5),
      detail: { matched, missing: kws.filter((k) => !text.includes(k)), aiPending: cfg.ai_assisted === true },
    };
  },

  // Évaluation par IA — différée (B7). En attendant : non validé, marqué "en attente".
  ai: () => ({ score: 0, passed: false, detail: { aiPending: true } }),
};

export function evaluate(method: string, response: unknown, sol: Sol, cfg: Cfg): EvalOutput {
  const fn = methods[method] ?? methods.exact;
  return fn(response, sol, cfg);
}
