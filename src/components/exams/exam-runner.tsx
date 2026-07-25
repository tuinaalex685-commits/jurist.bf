"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ShieldAlert, ArrowRight, ArrowLeft, CheckCircle2, XCircle, Sparkles, LayoutDashboard } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { ExamBriefing, ExamResult, ExamSessionView } from "@/server/contracts/exams";

type Stage = "briefing" | "composing" | "result";

export function ExamRunner({ briefing }: { briefing: ExamBriefing }) {
  const [stage, setStage] = useState<Stage>("briefing");
  const [session, setSession] = useState<ExamSessionView | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(briefing.durationSeconds);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (stage !== "composing") return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [stage]);

  useEffect(() => {
    if (stage === "composing" && remaining === 0) void finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, stage]);

  async function start() {
    setBusy(true);
    try {
      const idemKey = crypto.randomUUID();
      const { sessionId } = await apiPost<{ sessionId: string }>(`/api/v1/exams/${briefing.id}/sessions`, {}).catch(async () => {
        return apiPost<{ sessionId: string }>(`/api/v1/exams/${briefing.id}/sessions`, { idempotencyKey: idemKey });
      });
      const view = await apiGet<ExamSessionView>(`/api/v1/exam-sessions/${sessionId}`);
      setSession(view);
      setAnswers(view.answers);
      const elapsed = Math.floor((Date.now() - new Date(view.startedAt).getTime()) / 1000);
      setRemaining(Math.max(0, view.durationSeconds - elapsed));
      setStage("composing");
    } finally {
      setBusy(false);
    }
  }

  async function answer(questionId: string, value: unknown) {
    setAnswers((a) => ({ ...a, [questionId]: value }));
    if (session) void apiPost(`/api/v1/exam-sessions/${session.sessionId}/answers`, { questionId, answer: value }).catch(() => {});
  }

  async function finish() {
    if (!session || busy) return;
    setBusy(true);
    try {
      const res = await apiPost<ExamResult>(`/api/v1/exam-sessions/${session.sessionId}/submit`, {});
      setResult(res);
      setStage("result");
    } finally {
      setBusy(false);
    }
  }

  const question = session?.questions[idx];
  const tension = remaining < 60 ? "text-cat-rose" : remaining < 180 ? "text-cat-amber" : "text-foreground";
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  if (stage === "briefing") {
    return (
      <div className="mx-auto max-w-lg">
        <div className="hall p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/10"><ShieldAlert className="h-7 w-7 text-gold" /></span>
          <h1 className="mt-4 font-display text-2xl font-semibold">{briefing.title}</h1>
          <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-muted/50 p-3"><p className="text-muted-foreground">Difficulté</p><p className="mt-1 font-semibold capitalize">{briefing.difficulty}</p></div>
            <div className="rounded-xl bg-muted/50 p-3"><p className="text-muted-foreground">Durée</p><p className="mt-1 font-semibold">{Math.round(briefing.durationSeconds / 60)} min</p></div>
            <div className="rounded-xl bg-muted/50 p-3"><p className="text-muted-foreground">Questions</p><p className="mt-1 font-semibold">{briefing.questionCount}</p></div>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">Réussite ≥ {Math.round(briefing.passThreshold * 100)}% · récompense : sceau d&apos;examen + XP.</p>
          <button onClick={start} disabled={busy} className="mx-auto mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-gold px-6 text-sm font-semibold text-gold-foreground shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-60">
            Je suis prêt <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (stage === "composing" && session && question) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">Question {idx + 1} / {session.questions.length}</span>
          <span className={cn("inline-flex items-center gap-1.5 font-mono text-lg font-bold tabular-nums", tension)}><Clock className="h-4 w-4" /> {mm}:{ss}</span>
        </div>
        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${((idx + 1) / session.questions.length) * 100}%` }} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={question.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="hall p-7">
            <QuestionBody question={question} value={answers[question.id]} onChange={(v) => answer(question.id, v)} />
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex justify-between">
          <button disabled={idx === 0} onClick={() => setIdx((i) => i - 1)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-5 text-sm font-semibold disabled:opacity-40 hover:bg-muted">
            <ArrowLeft className="h-4 w-4" /> Précédente
          </button>
          {idx < session.questions.length - 1 ? (
            <button onClick={() => setIdx((i) => i + 1)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">Suivante <ArrowRight className="h-4 w-4" /></button>
          ) : (
            <button onClick={finish} disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-xl bg-gold px-5 text-sm font-semibold text-gold-foreground disabled:opacity-60">Rendre ma copie</button>
          )}
        </div>
      </div>
    );
  }

  if (stage === "result" && result) {
    const pct = Math.round(result.score * 100);
    return (
      <div className="mx-auto max-w-lg text-center">
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200 }}
          className={cn("mx-auto flex h-24 w-24 items-center justify-center rounded-full text-3xl font-black text-white", result.passed ? "bg-gold text-gold-foreground" : "bg-muted-foreground/40")}>
          {pct}%
        </motion.div>
        <h2 className="mt-5 font-display text-3xl font-black tracking-tight">{result.passed ? "ADMIS" : "À REPRÉSENTER"}</h2>
        <p className="mt-1 text-muted-foreground">{result.correct} / {result.total} bonnes réponses{result.already ? " (déjà soumis)" : ""}</p>
        {result.passed && result.xpGained > 0 && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-action"><Sparkles className="h-4 w-4" /> +{result.xpGained} XP</p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/synthese" className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-5 text-sm font-semibold hover:bg-muted"><ArrowLeft className="h-4 w-4" /> Examens</Link>
          <Link href="/" className="inline-flex h-11 items-center gap-2 rounded-xl bg-action px-5 text-sm font-semibold text-action-foreground"><LayoutDashboard className="h-4 w-4" /> Tableau de bord</Link>
        </div>
      </div>
    );
  }

  return null;
}

function QuestionBody({ question, value, onChange }: { question: { type: string; prompt: Record<string, unknown> }; value: unknown; onChange: (v: unknown) => void }) {
  const p = question.prompt;
  const q = typeof p.question === "string" ? p.question : "";
  if (question.type === "vrai_faux") {
    return (
      <div className="space-y-5">
        <p className="text-lg font-semibold">{q}</p>
        <div className="grid grid-cols-2 gap-4">
          {[{ v: "true", label: "Vrai", Icon: CheckCircle2 }, { v: "false", label: "Faux", Icon: XCircle }].map(({ v, label, Icon }) => (
            <button key={v} onClick={() => onChange(v)} className={cn("flex h-14 items-center justify-center gap-2 rounded-2xl border-2 text-base font-bold transition-all", value === v ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40")}>
              <Icon className="h-5 w-5" /> {label}
            </button>
          ))}
        </div>
      </div>
    );
  }
  const options = Array.isArray(p.options) ? (p.options as string[]) : [];
  return (
    <div className="space-y-5">
      <p className="text-lg font-semibold">{q}</p>
      <div className="space-y-2.5">
        {options.map((o) => (
          <button key={o} onClick={() => onChange(o)} className={cn("block w-full rounded-xl border-2 p-3.5 text-left text-sm transition-colors", value === o ? "border-primary bg-primary/10" : "border-border hover:border-primary/40")}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
