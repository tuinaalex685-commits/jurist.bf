"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, XCircle, RotateCcw, Loader2, Trophy, Sparkles, LayoutDashboard } from "lucide-react";
import type { Parcours, AttemptResult } from "@/server/contracts/learning";
import { getRenderer } from "./renderers";
import { PHASES } from "./phases";
import { Seal } from "@/components/academy/Seal";
import { apiPost } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Stage = "answer" | "feedback" | "phase-transition" | "phase-failed" | "mastered";

export function LearningEngine({ parcours }: { parcours: Parcours }) {
  const phases = parcours.phases;
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [actIdx, setActIdx] = useState(0);
  const [stage, setStage] = useState<Stage>("answer");
  const [response, setResponse] = useState<unknown>(null);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mastery, setMastery] = useState<AttemptResult["mastery"]>(null);

  const phase = phases[phaseIdx];
  const activity = phase?.activities[actIdx];
  const meta = PHASES[phase?.phase ?? 0] ?? PHASES[0];

  const handleChange = useCallback((resp: unknown, rdy: boolean) => {
    setResponse(resp);
    setReady(rdy);
  }, []);

  const resetForActivity = () => { setResponse(null); setReady(false); setResult(null); setError(null); };

  async function submit() {
    if (!activity) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiPost<AttemptResult>(`/api/v1/learning/activities/${activity.id}/attempt`, { response });
      setResult(res);
      if (res.mastery?.mastered && res.mastery.isNew) setMastery(res.mastery);
      setStage("feedback");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    const isLastActivity = actIdx >= phase.activities.length - 1;
    if (!isLastActivity) {
      setActIdx((i) => i + 1);
      resetForActivity();
      setStage("answer");
      return;
    }
    if (result && !result.phase.completed) {
      setStage("phase-failed");
      return;
    }
    const isLastPhase = phaseIdx >= phases.length - 1;
    if (isLastPhase) {
      setStage("mastered");
      if (mastery) fireConfetti();
      return;
    }
    setStage("phase-transition");
  }

  function retryPhase() {
    setActIdx(0);
    resetForActivity();
    setStage("answer");
  }

  function enterNextPhase() {
    setPhaseIdx((i) => i + 1);
    setActIdx(0);
    resetForActivity();
    setStage("answer");
  }

  function fireConfetti() {
    const end = Date.now() + 1200;
    (function frame() {
      confetti({ particleCount: 4, spread: 70, origin: { y: 0.6 }, colors: ["#059669", "#C8A44D", "#2749d4"] });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }

  if (!phase || !activity) {
    return <div className="hall p-8 text-center text-muted-foreground">Ce parcours n&apos;a pas encore d&apos;activités publiées.</div>;
  }

  const Renderer = getRenderer(activity.type);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col">
      {/* Barre de mission */}
      <div className="sticky top-0 z-30 -mx-6 border-b border-border bg-background/85 px-6 py-4 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/library" className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Quitter">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className={cn("rounded px-1.5 py-0.5 font-mono", meta.soft, meta.text)}>Art. {parcours.article.number}</span>
                {parcours.article.title}
              </p>
              <h1 className="font-display text-lg font-semibold">{meta.name}</h1>
            </div>
          </div>
          <span className="text-sm font-bold text-muted-foreground">{phaseIdx + 1}<span className="text-muted-foreground/50"> / {phases.length}</span></span>
        </div>
        <ol className="flex items-center">
          {phases.map((ph, idx) => {
            const done = idx < phaseIdx;
            const cur = idx === phaseIdx;
            const m = PHASES[ph.phase] ?? PHASES[0];
            const Ic = m.Icon;
            return (
              <li key={ph.phase} className="flex flex-1 items-center last:flex-none">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-full border-2",
                  done && cn(m.solid, m.border, "text-white"),
                  cur && cn(m.soft, m.border, m.text),
                  !done && !cur && "border-border bg-card text-muted-foreground/50")}>
                  {done ? <Check className="h-4 w-4" /> : <Ic className="h-4 w-4" />}
                </div>
                {idx < phases.length - 1 && <div className={cn("mx-2 h-0.5 flex-1 rounded-full", done ? m.solid : "bg-border")} />}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Contenu */}
      <div className="flex-1 py-8">
        <AnimatePresence mode="wait">
          {(stage === "answer" || stage === "feedback") && (
            <motion.div key={`act-${phaseIdx}-${actIdx}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              {activity.objective && <p className="mb-4 text-sm font-medium text-muted-foreground">🎯 {activity.objective}</p>}

              <div className="hall p-6 md:p-8">
                <Renderer key={activity.id} activity={activity} disabled={stage !== "answer"} onChange={handleChange} />
              </div>

              {error && <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

              <AnimatePresence>
                {stage === "feedback" && result && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={cn("mt-4 flex items-start gap-3 rounded-xl border p-5", result.passed ? "border-green-500/30 bg-green-500/5" : "border-cat-amber/30 bg-cat-amber/5")}>
                    {result.passed ? <CheckCircle2 className="h-7 w-7 shrink-0 text-green-600" /> : <XCircle className="h-7 w-7 shrink-0 text-cat-amber" />}
                    <div>
                      <p className={cn("mb-1 font-bold", result.passed ? "text-green-600" : "text-cat-amber")}>
                        {result.passed ? "Bonne analyse" : "À revoir"} · {Math.round(result.score * 100)}%
                      </p>
                      {result.feedback && <p className="leading-relaxed text-foreground/80">{result.feedback}</p>}
                      {typeof (result.detail as Record<string, unknown>)?.confusion === "string" && (
                        <p className="mt-1 text-sm text-cat-rose">Confusion fréquente avec : {(result.detail as { confusion: string }).confusion}</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-6 flex justify-end">
                {stage === "answer" ? (
                  <button onClick={submit} disabled={!ready || submitting}
                    className={cn("inline-flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-lg transition-transform enabled:hover:scale-[1.02] disabled:opacity-50", meta.solid)}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Valider <ArrowRight className="h-4 w-4" /></>}
                  </button>
                ) : (
                  <button onClick={next} className={cn("inline-flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]", meta.solid)}>
                    Continuer <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {stage === "phase-failed" && (
            <motion.div key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hall p-10 text-center">
              <p className="font-display text-2xl font-semibold">Consolidez cette phase</p>
              <p className="mx-auto mt-2 max-w-md text-muted-foreground">Votre maîtrise de la phase « {meta.name} » n&apos;est pas encore suffisante pour avancer. Reprenez-la pour ancrer les notions.</p>
              <button onClick={retryPhase} className="mx-auto mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground">
                <RotateCcw className="h-4 w-4" /> Reprendre la phase
              </button>
            </motion.div>
          )}

          {stage === "phase-transition" && (
            <motion.div key="trans" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              className={cn("rounded-2xl p-12 text-center text-white", (PHASES[phases[phaseIdx + 1]?.phase ?? 0] ?? PHASES[0]).gradient)}>
              <p className="text-sm font-semibold uppercase tracking-widest opacity-80">Phase suivante</p>
              <p className="mt-2 font-display text-4xl font-semibold">{(PHASES[phases[phaseIdx + 1]?.phase ?? 0] ?? PHASES[0]).name}</p>
              <button onClick={enterNextPhase} className="mx-auto mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-white/20 px-6 text-sm font-semibold backdrop-blur hover:bg-white/30">
                Entrer <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          {stage === "mastered" && (
            <motion.div key="mastered" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 py-4 text-center">
              <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 18 }} className="mx-auto w-fit">
                <Seal size={120} />
              </motion.div>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold"><Trophy className="h-3.5 w-3.5" /> Article maîtrisé</span>
                <h2 className="mt-3 font-display text-4xl font-black tracking-tight">Maîtrise validée</h2>
                <p className="mt-1 text-lg font-medium">Article {parcours.article.number} — {parcours.article.title}</p>
                {mastery && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-action"><Sparkles className="h-4 w-4" /> +{mastery.xpGained} XP · total {mastery.xpTotal}</p>
                )}
              </div>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/library" className="inline-flex h-12 items-center gap-2 rounded-xl border border-border px-6 text-sm font-semibold hover:bg-muted"><ArrowLeft className="h-4 w-4" /> Bibliothèque</Link>
                <Link href="/" className="inline-flex h-12 items-center gap-2 rounded-xl bg-action px-6 text-sm font-semibold text-action-foreground shadow-lg shadow-action/20"><LayoutDashboard className="h-4 w-4" /> Mon tableau de bord</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
