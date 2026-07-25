"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, BookOpenText, History, AlertTriangle, ShieldCheck, ChevronRight, Flame, Trophy } from "lucide-react";
import { Seal } from "@/components/academy/Seal";
import { RankInsignia } from "@/components/academy/RankInsignia";
import { CountUp } from "@/components/academy/CountUp";
import { cn } from "@/lib/utils";
import type { DashboardData } from "@/server/contracts/me";

const PHASE_NAMES = ["Découverte", "Reconnaissance", "Compréhension", "Mémorisation", "Maîtrise"];

const container: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item: Variants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 28 } } };

export function DashboardView({ data }: { data: DashboardData }) {
  const { user, resume, code, seals, weaknesses, strengths } = data;
  const rankPct = user.xpForNextRank ? user.xpIntoRank / user.xpForNextRank : 1;
  const codePct = code && code.total > 0 ? code.mastered / code.total : 0;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-[2.4rem]">
          Bonjour, <span className="text-primary">{user.displayName}</span>.
        </h1>
        <p className="mt-1 text-muted-foreground">Votre ascension continue. Voici votre poste de commandement.</p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Reprise */}
        <motion.section variants={item} className="hall flex flex-col p-6 lg:col-span-7">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <BookOpenText className="h-5 w-5 text-primary" />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Reprendre</p>
          </div>
          {resume ? (
            <div className="mt-5 flex flex-1 flex-col">
              <p className="font-mono text-xs text-muted-foreground">Art. {resume.number}</p>
              <h3 className="mt-1 font-display text-2xl font-semibold leading-tight">{resume.notion}</h3>
              <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Phase {resume.phaseIndex} · {resume.phaseName}
              </span>
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                  <span>Progression</span><span className="font-mono">{Math.round(resume.progress * 100)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-action" style={{ width: `${resume.progress * 100}%` }} />
                </div>
              </div>
              <Link href={`/learn/${resume.articleId}`} className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-action text-sm font-semibold text-action-foreground shadow-lg shadow-action/20 transition-transform hover:scale-[1.02]">
                Continuer <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="mt-5 flex flex-1 flex-col items-start justify-center gap-3">
              <p className="text-muted-foreground">Aucun article en cours. Choisissez votre prochaine cible dans le Codex.</p>
              <Link href="/library" className="inline-flex h-11 items-center gap-2 rounded-xl bg-action px-5 text-sm font-semibold text-action-foreground shadow-lg shadow-action/20 transition-transform hover:scale-[1.02]">
                Ouvrir la bibliothèque <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </motion.section>

        {/* Rang */}
        <motion.section variants={item} className="hall flex flex-col items-center p-6 text-center lg:col-span-5">
          <p className="self-start text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Votre rang</p>
          <RankInsignia level={user.rankLevel} size={72} className="mt-3" />
          <p className="mt-3 font-display text-2xl font-semibold">{user.rankName}</p>
          <p className="text-sm text-muted-foreground">
            {user.nextRankName
              ? <>Encore <span className="font-semibold text-foreground">{(user.xpForNextRank ?? 0) - user.xpIntoRank} XP</span> pour {user.nextRankName}</>
              : "Rang maximal atteint"}
          </p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-action" style={{ width: `${Math.min(1, rankPct) * 100}%` }} />
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5 text-warning"><Flame className="h-4 w-4" /> {user.streakDays} j</span>
            <span className="inline-flex items-center gap-1.5 text-gold"><Trophy className="h-4 w-4" /> {user.masteredCount} maîtrisés</span>
          </div>
        </motion.section>

        {/* Progression du code */}
        <motion.section variants={item} className="hall p-6 lg:col-span-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Votre progression</p>
          {code ? (
            <>
              <h3 className="mt-0.5 font-display text-xl font-semibold">{code.name}</h3>
              <div className="mt-4 flex items-end gap-3">
                <span className="font-display text-6xl font-semibold leading-none text-action"><CountUp value={code.mastered} /></span>
                <span className="pb-1.5 text-lg text-muted-foreground">/ {code.total} articles maîtrisés</span>
              </div>
              <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-action/70 to-action" style={{ width: `${codePct * 100}%` }} />
              </div>
            </>
          ) : (
            <p className="mt-4 text-muted-foreground">Commencez un article pour suivre votre progression par code.</p>
          )}
        </motion.section>

        {/* Sceaux */}
        <motion.section variants={item} className="hall p-6 lg:col-span-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Derniers sceaux</p>
            <Link href="/profil" className="inline-flex items-center gap-0.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-gold">Le mur <ChevronRight className="h-3.5 w-3.5" /></Link>
          </div>
          {seals.length ? (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {seals.map((s) => (
                  <div key={s.id} className="group relative" title={`Art. ${s.articleNumber} — ${s.title ?? ""}`}>
                    <Seal size={44} className="transition-transform group-hover:-translate-y-1" />
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">Chaque article maîtrisé forge le vôtre.</p>
            </>
          ) : (
            <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
              <Seal size={44} locked />
              Maîtrisez un article pour gagner votre premier sceau.
            </div>
          )}
        </motion.section>

        {/* Faiblesses */}
        <motion.section variants={item} className="hall p-6 lg:col-span-6">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/10 ring-1 ring-warning/25"><AlertTriangle className="h-5 w-5 text-warning" /></span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">À consolider</p>
          </div>
          {weaknesses.length ? (
            <>
              <p className="mt-4 text-[15px]">Vous confondez souvent&nbsp;:</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {weaknesses.map((w) => (
                  <span key={w} className="rounded-lg border border-warning/25 bg-warning/[0.08] px-3 py-1.5 text-sm font-medium">{w}</span>
                ))}
              </div>
              <Link href="/revisions" className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-warning/15 px-4 text-sm font-semibold text-warning transition-colors hover:bg-warning/25">Réviser <ArrowRight className="h-4 w-4" /></Link>
            </>
          ) : (
            <p className="mt-4 text-muted-foreground">Aucune confusion détectée pour l&apos;instant. Continuez ainsi.</p>
          )}
        </motion.section>

        {/* Forces */}
        <motion.section variants={item} className="hall p-6 lg:col-span-6">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-action/10 ring-1 ring-action/25"><ShieldCheck className="h-5 w-5 text-action" /></span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Vos points forts</p>
          </div>
          {strengths.length ? (
            <ul className="mt-4 space-y-2.5">
              {strengths.map((s) => (
                <li key={s} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-action/15"><ShieldCheck className="h-3.5 w-3.5 text-action" /></span>
                  <span className="text-sm font-medium">{s}</span>
                  <span className="ml-auto font-mono text-xs text-action">maîtrisé</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-muted-foreground">Vos premières maîtrises apparaîtront ici.</p>
          )}
        </motion.section>

        {/* Révisions (SRS — à venir en B5) */}
        <motion.section variants={item} className="hall flex items-center justify-between p-6 lg:col-span-12">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cat-amber/10 ring-1 ring-cat-amber/25"><History className="h-5 w-5 text-cat-amber" /></span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Révisions</p>
              <p className="text-sm text-muted-foreground">La répétition espacée arrive bientôt — vos articles à revoir apparaîtront ici.</p>
            </div>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">Bientôt</span>
        </motion.section>
      </motion.div>
    </div>
  );
}
