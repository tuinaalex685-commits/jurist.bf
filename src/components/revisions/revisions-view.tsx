"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Check, X, Sparkles, Zap, CheckCircle2 } from "lucide-react";
import { apiPost } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { SrsCard, SrsSession, SrsState } from "@/server/contracts/srs";

const STATE_META: Record<SrsState, { label: string; text: string; soft: string }> = {
  urgent: { label: "Urgent", text: "text-cat-rose", soft: "bg-cat-rose/10" },
  fragile: { label: "Fragile", text: "text-cat-amber", soft: "bg-cat-amber/10" },
  correct: { label: "Correct", text: "text-cat-sky", soft: "bg-cat-sky/10" },
  mastered: { label: "Maîtrisé", text: "text-action", soft: "bg-action/10" },
  anchored: { label: "Ancré", text: "text-primary", soft: "bg-primary/10" },
};
const ORDER: SrsState[] = ["urgent", "fragile", "correct", "mastered", "anchored"];

type GradeResult = { state: SrsState; intervalDays: number };

export function RevisionsView({ session }: { session: SrsSession }) {
  const [queue, setQueue] = useState<SrsCard[]>(session.cards);
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState<{ card: SrsCard; result: GradeResult }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const total = session.cards.length;
  const current = queue[idx];

  async function grade(value: number) {
    if (!current || submitting) return;
    setSubmitting(true);
    try {
      const res = await apiPost<{ state: SrsState; intervalDays: number }>(`/api/v1/revisions/${current.id}/grade`, { grade: value });
      setDone((d) => [...d, { card: current, result: res }]);
      setRevealed(false);
      if (idx + 1 < queue.length) setIdx((i) => i + 1);
      else setIdx(queue.length); // fin
    } finally {
      setSubmitting(false);
    }
  }

  if (total === 0) {
    return (
      <div className="hall flex flex-col items-center gap-3 p-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-action/10"><CheckCircle2 className="h-7 w-7 text-action" /></span>
        <p className="font-display text-lg font-semibold">Tout est ancré aujourd&apos;hui</p>
        <p className="max-w-sm text-sm text-muted-foreground">Le maître vous laisse repos. Revenez demain pour votre prochaine séance.</p>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="hall p-8">
        <p className="text-sm font-bold uppercase tracking-widest text-primary">Séance du jour</p>
        <h2 className="mt-1 font-display text-2xl font-semibold">Le maître a préparé {total} carte{total > 1 ? "s" : ""}</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {ORDER.filter((s) => session.countsByState[s] > 0).map((s) => (
            <span key={s} className={cn("rounded-full px-3 py-1.5 text-sm font-semibold", STATE_META[s].soft, STATE_META[s].text)}>
              {STATE_META[s].label} · {session.countsByState[s]}
            </span>
          ))}
        </div>
        <button onClick={() => setStarted(true)} className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-cat-amber px-6 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]">
          <Play className="h-4 w-4" /> Démarrer la séance
        </button>
      </div>
    );
  }

  if (idx >= queue.length) {
    return (
      <div className="hall flex flex-col items-center gap-4 p-12 text-center">
        <Sparkles className="h-10 w-10 text-gold" />
        <p className="font-display text-2xl font-semibold">Séance terminée</p>
        <p className="text-muted-foreground">{done.length} carte{done.length > 1 ? "s" : ""} consolidée{done.length > 1 ? "s" : ""}.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Carte {idx + 1} / {total}</span>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STATE_META[current.state].soft, STATE_META[current.state].text)}>{STATE_META[current.state].label}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={current.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="hall p-8 text-center">
          <p className="font-mono text-xs text-muted-foreground">Art. {current.number}</p>
          <h3 className="mt-2 font-display text-2xl font-semibold">{current.title ?? `Article ${current.number}`}</h3>

          {!revealed ? (
            <button onClick={() => setRevealed(true)} className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl border border-border px-6 text-sm font-semibold hover:bg-muted">
              <Zap className="h-4 w-4" /> Je m&apos;en souviens…
            </button>
          ) : (
            <div className="mt-8 space-y-3">
              <p className="text-sm text-muted-foreground">Étiez-vous capable de le restituer correctement ?</p>
              <div className="flex justify-center gap-3">
                <button disabled={submitting} onClick={() => grade(1)} className="inline-flex h-12 items-center gap-2 rounded-xl bg-cat-rose/10 px-5 text-sm font-semibold text-cat-rose hover:bg-cat-rose/20">
                  <X className="h-4 w-4" /> Oublié
                </button>
                <button disabled={submitting} onClick={() => grade(3)} className="inline-flex h-12 items-center gap-2 rounded-xl bg-cat-sky/10 px-5 text-sm font-semibold text-cat-sky hover:bg-cat-sky/20">
                  Avec effort
                </button>
                <button disabled={submitting} onClick={() => grade(5)} className="inline-flex h-12 items-center gap-2 rounded-xl bg-action/10 px-5 text-sm font-semibold text-action hover:bg-action/20">
                  <Check className="h-4 w-4" /> Facilement
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
