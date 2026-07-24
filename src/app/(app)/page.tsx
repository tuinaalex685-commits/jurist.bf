"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  Target, ArrowRight, Check, BookOpenText, History, Lock, Sparkles,
  AlertTriangle, ShieldCheck, ChevronRight, Flame,
} from "lucide-react";
import { MOCK_DASHBOARD } from "@/lib/mock-data";
import { Seal } from "@/components/academy/Seal";
import { RankInsignia } from "@/components/academy/RankInsignia";
import { ProgressRing } from "@/components/academy/ProgressRing";
import { CountUp } from "@/components/academy/CountUp";
import { cn } from "@/lib/utils";

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 28 } },
};

export default function DashboardPage() {
  const d = MOCK_DASHBOARD;
  const doneTasks = d.mission.tasks.filter((t) => t.done).length;
  const missionPct = doneTasks / d.mission.tasks.length;
  const codePct = d.code.mastered / d.code.total;
  const rankPct = d.user.xpIntoRank / d.user.xpForNextRank;
  const unlockPct = 1 - d.unlock.remainingArticles / 8;

  return (
    <div className="space-y-6">
      {/* Salutation */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-[2.4rem]">
          Bonjour, <span className="text-primary">{d.user.honorific} {d.user.firstName}</span>.
        </h1>
        <p className="mt-1 text-muted-foreground">
          Votre ascension continue. Voici votre plan de bataille du jour.
        </p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* ===== MISSION DU JOUR ===== */}
        <motion.section variants={item} className="hall relative overflow-hidden p-6 lg:col-span-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-primary/5 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <Target className="h-5 w-5 text-primary" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Mission du jour</p>
                <p className="font-display text-lg font-semibold">Trois objectifs vers la maîtrise</p>
              </div>
            </div>
            <ProgressRing value={missionPct} size={64} colorClassName="text-action" trackClassName="text-border">
              <span className="font-mono text-sm font-bold">{doneTasks}<span className="text-muted-foreground">/{d.mission.tasks.length}</span></span>
            </ProgressRing>
          </div>

          <ul className="relative mt-5 space-y-2.5">
            {d.mission.tasks.map((t) => (
              <li key={t.id} className={cn("flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors", t.done ? "border-action/25 bg-action/[0.06]" : "border-border bg-muted/40")}>
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border", t.done ? "border-action bg-action text-action-foreground" : "border-muted-foreground/30 text-transparent")}>
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className={cn("text-sm font-medium", t.done && "text-muted-foreground line-through")}>{t.label}</span>
              </li>
            ))}
          </ul>

          <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Récompense</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-action/10 px-2.5 py-1 font-semibold text-action">
                <Sparkles className="h-3.5 w-3.5" /> +{d.mission.rewardXp} XP
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 font-semibold text-gold">
                <Seal size={16} /> +{d.mission.rewardSeals} Sceau
              </span>
            </div>
            <Link href="/learn/art-613-1" className="inline-flex h-11 items-center gap-2 rounded-xl bg-action px-5 text-sm font-semibold text-action-foreground shadow-lg shadow-action/20 transition-transform hover:scale-[1.02]">
              Poursuivre la mission <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.section>

        {/* ===== REPRENDRE ===== */}
        <motion.section variants={item} className="hall flex flex-col p-6 lg:col-span-5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <BookOpenText className="h-5 w-5 text-primary" />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Reprendre où vous en étiez</p>
          </div>

          <div className="mt-5 flex-1">
            <p className="font-mono text-xs text-muted-foreground">Art. {d.resume.articleNumber}</p>
            <h3 className="mt-1 font-display text-2xl font-semibold leading-tight">{d.resume.notion}</h3>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Phase {d.resume.phaseIndex} · {d.resume.phaseName}
            </span>
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                <span>Progression de l&apos;article</span>
                <span className="font-mono">{Math.round(d.resume.progress * 100)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-action" style={{ width: `${d.resume.progress * 100}%` }} />
              </div>
            </div>
          </div>

          <Link href="/learn/art-613-1" className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-muted/50 text-sm font-semibold transition-colors hover:border-action/40 hover:bg-action/10 hover:text-action">
            Continuer <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.section>

        {/* ===== PROGRESSION DU CODE ===== */}
        <motion.section variants={item} className="hall relative overflow-hidden p-6 lg:col-span-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Votre progression</p>
              <h3 className="mt-0.5 font-display text-xl font-semibold">{d.code.name}</h3>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">Code en cours</span>
          </div>

          <div className="mt-5 flex items-end gap-3">
            <span className="font-display text-6xl font-semibold leading-none text-action">
              <CountUp value={d.code.mastered} />
            </span>
            <span className="pb-1.5 text-lg text-muted-foreground">/ {d.code.total} articles maîtrisés</span>
          </div>

          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-action/70 to-action" initial={{ width: 0 }} animate={{ width: `${codePct * 100}%` }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <TrendGlyph />
            À ce rythme, <span className="font-semibold text-foreground">Maîtrise du code dans ~{d.code.weeksToMastery} semaines</span>.
          </div>
        </motion.section>

        {/* ===== RANG & XP ===== */}
        <motion.section variants={item} className="hall flex flex-col items-center p-6 text-center lg:col-span-4">
          <p className="self-start text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Votre rang</p>
          <RankInsignia level={d.user.rankLevel} size={72} className="mt-3" />
          <p className="mt-3 font-display text-2xl font-semibold">{d.user.rankName}</p>
          <p className="text-sm text-muted-foreground">
            Encore <span className="font-semibold text-foreground">{d.user.xpForNextRank - d.user.xpIntoRank} XP</span> pour {d.user.nextRankName}
          </p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-action" style={{ width: `${rankPct * 100}%` }} />
          </div>
        </motion.section>

        {/* ===== FAIBLESSES ===== */}
        <motion.section variants={item} className="hall p-6 lg:col-span-6">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/10 ring-1 ring-warning/25">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">À consolider</p>
          </div>
          <p className="mt-4 text-[15px] text-foreground">Vous confondez souvent&nbsp;:</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {d.weaknesses.map((w, i) => (
              <span key={w} className="inline-flex items-center gap-2">
                {i > 0 && <span className="text-muted-foreground/50">·</span>}
                <span className="rounded-lg border border-warning/25 bg-warning/[0.08] px-3 py-1.5 text-sm font-medium text-foreground">{w}</span>
              </span>
            ))}
          </div>
          <Link href="/revisions" className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-warning/15 px-4 text-sm font-semibold text-warning transition-colors hover:bg-warning/25">
            Réviser cette confusion <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.section>

        {/* ===== FORCES ===== */}
        <motion.section variants={item} className="hall p-6 lg:col-span-6">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-action/10 ring-1 ring-action/25">
              <ShieldCheck className="h-5 w-5 text-action" />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Vos points forts</p>
          </div>
          <ul className="mt-4 space-y-2.5">
            {d.strengths.map((s) => (
              <li key={s} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-action/15">
                  <Check className="h-3.5 w-3.5 text-action" />
                </span>
                <span className="text-sm font-medium">{s}</span>
                <span className="ml-auto font-mono text-xs text-action">maîtrisé</span>
              </li>
            ))}
          </ul>
        </motion.section>

        {/* ===== RÉVISIONS URGENTES ===== */}
        <motion.section variants={item} className="hall flex flex-col p-6 lg:col-span-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cat-amber/10 ring-1 ring-cat-amber/25">
              <History className="h-5 w-5 text-cat-amber" />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Révisions</p>
          </div>
          <div className="mt-4 flex-1 space-y-1.5">
            {[
              { label: "Aujourd'hui", value: d.revisions.today, urgent: true },
              { label: "Demain", value: d.revisions.tomorrow, urgent: false },
              { label: "Cette semaine", value: d.revisions.week, urgent: false },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between rounded-lg px-3 py-2 odd:bg-muted/50">
                <span className="text-sm text-muted-foreground">{r.label}</span>
                <span className={cn("font-mono text-lg font-bold", r.urgent ? "text-cat-amber" : "text-foreground")}>{r.value}</span>
              </div>
            ))}
          </div>
          <Link href="/revisions" className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cat-amber px-4 text-sm font-semibold text-white transition-transform hover:scale-[1.02]">
            <Flame className="h-4 w-4" /> Démarrer la séance
          </Link>
        </motion.section>

        {/* ===== PROCHAIN DÉBLOCAGE ===== */}
        <motion.section variants={item} className="hall gilt relative flex flex-col overflow-hidden p-6 lg:col-span-4">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />
          <div className="relative flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/10 ring-1 ring-gold/30">
              <Lock className="h-4.5 w-4.5 text-gold" />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">À débloquer</p>
          </div>
          <div className="relative mt-4 flex flex-1 items-center gap-4">
            <Seal size={56} locked />
            <div>
              <h3 className="font-display text-lg font-semibold">{d.unlock.name}</h3>
              <p className="text-sm text-muted-foreground">Encore <span className="font-semibold text-gold">{d.unlock.remainingArticles} articles</span></p>
            </div>
          </div>
          <div className="relative mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-gold/60 to-gold" style={{ width: `${unlockPct * 100}%` }} />
          </div>
        </motion.section>

        {/* ===== DERNIERS SCEAUX ===== */}
        <motion.section variants={item} className="hall p-6 lg:col-span-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Derniers sceaux</p>
            <Link href="/profil" className="inline-flex items-center gap-0.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-gold">
              Le mur <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 flex items-center gap-1.5">
            {d.seals.map((s) => (
              <div key={s.id} className="group relative" title={`Art. ${s.articleNumber} — ${s.title}`}>
                <Seal size={46} className="transition-transform group-hover:-translate-y-1" />
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{d.seals.length} sceaux</span> gagnés récemment. Chaque article maîtrisé forge le vôtre.
          </p>
        </motion.section>

        {/* ===== ASSIDUITÉ ===== */}
        <motion.section variants={item} className="hall p-6 lg:col-span-12">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Assiduité</p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Moins</span>
              {[0, 1, 2, 3, 4].map((l) => (
                <span key={l} className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: `hsl(var(--action) / ${[0.10, 0.3, 0.5, 0.72, 0.95][l]})` }} />
              ))}
              <span>Plus</span>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <div className="grid grid-flow-col grid-rows-7 gap-1" style={{ width: "max-content" }}>
              {d.activity.map((lvl, i) => (
                <span key={i} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: `hsl(var(--action) / ${[0.10, 0.3, 0.5, 0.72, 0.95][lvl]})` }} />
              ))}
            </div>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}

function TrendGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-action" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M17 7h4v4" />
    </svg>
  );
}
