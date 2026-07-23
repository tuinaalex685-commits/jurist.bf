"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Article, Notion, Situation, ComprehensionBlock, MemorizationItem } from "@/lib/mock-data";
import { Phase0Discovery } from "./Phase0Discovery";
import { Phase1Situations } from "./Phase1Situations";
import { Phase2Comprehension } from "./Phase2Comprehension";
import { Phase3Memorization } from "./Phase3Memorization";
import { ValidationScreen } from "./ValidationScreen";
import { PHASES } from "./phases";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check } from "lucide-react";

interface LearningEngineProps {
  article: Article;
  notion: Notion;
  situations: Situation[];
  comprehension: ComprehensionBlock[];
  memorization: MemorizationItem;
}

export function LearningEngine({
  article,
  notion,
  situations,
  comprehension,
  memorization,
}: LearningEngineProps) {
  const [currentPhase, setCurrentPhase] = useState<number>(0);
  const active = PHASES[currentPhase];

  const handleNextPhase = () => {
    if (currentPhase < PHASES.length - 1) {
      setCurrentPhase((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col">
      {/* ===== Barre de mission ===== */}
      <div className="sticky top-0 z-30 -mx-6 border-b border-border bg-background/85 px-6 py-4 backdrop-blur-xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/library"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Quitter la mission"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className={cn("rounded px-1.5 py-0.5 font-mono", active.soft, active.text)}>
                  Art. {article.number}
                </span>
                <span className="truncate">{article.title}</span>
              </p>
              <h1 className="truncate text-xl font-extrabold tracking-tight">{notion.name}</h1>
            </div>
          </div>
          <span className="shrink-0 text-sm font-bold text-muted-foreground">
            {currentPhase + 1}<span className="text-muted-foreground/50"> / {PHASES.length}</span>
          </span>
        </div>

        {/* Stepper de phases */}
        <ol className="flex items-center">
          {PHASES.map((phase, idx) => {
            const done = idx < currentPhase;
            const isCurrent = idx === currentPhase;
            const PhaseIcon = phase.Icon;
            return (
              <li key={phase.id} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <motion.div
                    initial={false}
                    animate={{ scale: isCurrent ? 1.1 : 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22 }}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                      done && cn(phase.solid, phase.border, "text-white"),
                      isCurrent && cn(phase.soft, phase.border, phase.text, "ring-4", phase.ring),
                      !done && !isCurrent && "border-border bg-card text-muted-foreground/50"
                    )}
                  >
                    {done ? <Check className="h-5 w-5" /> : <PhaseIcon className="h-5 w-5" />}
                  </motion.div>
                  <span
                    className={cn(
                      "hidden text-[11px] font-semibold sm:block",
                      isCurrent ? phase.text : done ? "text-foreground/70" : "text-muted-foreground/60"
                    )}
                  >
                    {phase.name}
                  </span>
                </div>
                {idx < PHASES.length - 1 && (
                  <div className="mx-2 h-0.5 flex-1 overflow-hidden rounded-full bg-border">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", phase.solid)}
                      style={{ width: done ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* ===== Contenu de la phase ===== */}
      <div className="relative flex-1 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPhase}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {currentPhase === 0 && <Phase0Discovery notion={notion} onComplete={handleNextPhase} />}
            {currentPhase === 1 && <Phase1Situations situations={situations} onComplete={handleNextPhase} />}
            {currentPhase === 2 && <Phase2Comprehension blocks={comprehension} onComplete={handleNextPhase} />}
            {currentPhase === 3 && <Phase3Memorization item={memorization} onComplete={handleNextPhase} />}
            {currentPhase === 4 && <ValidationScreen article={article} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
