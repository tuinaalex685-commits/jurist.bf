import { Notion } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, HelpCircle, ShieldCheck, Sparkles, Check } from "lucide-react";
import { PHASES } from "./phases";
import { cn } from "@/lib/utils";

interface Phase0Props {
  notion: Notion;
  onComplete: () => void;
}

const phase = PHASES[0]; // Découverte — sky

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 26 } },
};

export function Phase0Discovery({ notion, onComplete }: Phase0Props) {
  const PhaseIcon = phase.Icon;

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      {/* Héro */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0, rotate: -12 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 16 }}
          className={cn(
            "mx-auto flex h-20 w-20 items-center justify-center rounded-3xl text-white shadow-lg",
            phase.gradient
          )}
        >
          <PhaseIcon className="h-9 w-9" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={cn("mt-5 text-sm font-bold uppercase tracking-widest", phase.text)}
        >
          Étape 1 · Découverte
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl"
        >
          {notion.name}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground"
        >
          {notion.intro}
        </motion.p>
      </div>

      {/* Cartes narratives */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-5 md:grid-cols-2">
        <motion.div
          variants={item}
          className="rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-16px_rgba(16,24,40,0.12)]"
        >
          <div className={cn("mb-4 flex h-10 w-10 items-center justify-center rounded-xl", phase.soft)}>
            <HelpCircle className={cn("h-5 w-5", phase.text)} />
          </div>
          <h3 className="mb-2 text-lg font-bold">Pourquoi cette notion existe&nbsp;?</h3>
          <p className="leading-relaxed text-muted-foreground">{notion.why}</p>
        </motion.div>

        <motion.div
          variants={item}
          className="rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-16px_rgba(16,24,40,0.12)]"
        >
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-cat-emerald/10">
            <ShieldCheck className="h-5 w-5 text-cat-emerald" />
          </div>
          <h3 className="mb-2 text-lg font-bold">Que protège la loi&nbsp;?</h3>
          <p className="leading-relaxed text-muted-foreground">{notion.protects}</p>
        </motion.div>

        <motion.div
          variants={item}
          className="rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-16px_rgba(16,24,40,0.12)] md:col-span-2"
        >
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cat-amber/10">
              <Sparkles className="h-5 w-5 text-cat-amber" />
            </div>
            <h3 className="text-lg font-bold">Après cette étape, vous saurez</h3>
          </div>
          <ul className="grid gap-3 sm:grid-cols-3">
            {notion.outcomes.map((outcome, i) => (
              <li key={i} className="flex items-start gap-2.5 rounded-xl bg-muted/50 p-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cat-emerald/15">
                  <Check className="h-3.5 w-3.5 text-cat-emerald" />
                </span>
                <span className="text-sm font-medium leading-snug">{outcome}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex justify-center pt-2"
      >
        <Button
          size="lg"
          onClick={onComplete}
          className={cn(
            "h-14 gap-2 rounded-full px-8 text-base font-semibold text-white shadow-lg transition-transform hover:scale-[1.03]",
            phase.solid
          )}
        >
          Commencer l&apos;analyse des dossiers
          <ArrowRight className="h-5 w-5" />
        </Button>
      </motion.div>
    </div>
  );
}
