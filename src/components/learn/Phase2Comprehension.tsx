import { ComprehensionBlock } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Layers, AlertCircle, ShieldAlert, ListChecks, SplitSquareHorizontal, XCircle, type LucideIcon,
} from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { PHASES } from "./phases";
import { cn } from "@/lib/utils";

interface Phase2Props {
  blocks: ComprehensionBlock[];
  onComplete: () => void;
}

const phase = PHASES[2]; // Compréhension — emerald

const typeConfig: Record<
  ComprehensionBlock["type"],
  { icon: LucideIcon; text: string; soft: string; bar: string; label: string }
> = {
  elements: { icon: Layers, text: "text-cat-indigo", soft: "bg-cat-indigo/10", bar: "bg-cat-indigo", label: "Élément constitutif" },
  conditions: { icon: ListChecks, text: "text-cat-emerald", soft: "bg-cat-emerald/10", bar: "bg-cat-emerald", label: "Condition préalable" },
  limites: { icon: ShieldAlert, text: "text-cat-amber", soft: "bg-cat-amber/10", bar: "bg-cat-amber", label: "Limite" },
  exceptions: { icon: AlertCircle, text: "text-cat-rose", soft: "bg-cat-rose/10", bar: "bg-cat-rose", label: "Exception" },
  distinction: { icon: SplitSquareHorizontal, text: "text-cat-violet", soft: "bg-cat-violet/10", bar: "bg-cat-violet", label: "Distinction" },
  contre_exemple: { icon: XCircle, text: "text-cat-sky", soft: "bg-cat-sky/10", bar: "bg-cat-sky", label: "Contre-exemple" },
};

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export function Phase2Comprehension({ blocks, onComplete }: Phase2Props) {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="text-center">
        <p className={cn("text-sm font-bold uppercase tracking-widest", phase.text)}>Étape 3 · Compréhension</p>
        <h2 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">Décomposer la règle</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Chaque bloc est une pièce du raisonnement juridique. Assemblez-les pour comprendre
          <span className="font-semibold text-foreground"> pourquoi</span> l&apos;article s&apos;applique.
        </p>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-5 sm:grid-cols-2">
        {blocks.map((block, i) => {
          const config = typeConfig[block.type];
          const BlockIcon = config.icon;
          return (
            <motion.div
              key={block.id}
              variants={item}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-16px_rgba(16,24,40,0.12)] transition-transform hover:-translate-y-1"
            >
              <div className={cn("absolute inset-x-0 top-0 h-1", config.bar)} />
              <div className="mb-4 flex items-center gap-3">
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", config.soft)}>
                  <BlockIcon className={cn("h-5 w-5", config.text)} />
                </div>
                <div>
                  <p className={cn("text-xs font-bold uppercase tracking-wider", config.text)}>{config.label}</p>
                  <p className="font-mono text-xs text-muted-foreground">N°{String(i + 1).padStart(2, "0")}</p>
                </div>
              </div>
              <p className="text-[15px] font-medium leading-relaxed text-foreground">{block.content}</p>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center pt-2"
      >
        <Button
          size="lg"
          onClick={onComplete}
          className={cn("h-14 gap-2 rounded-full px-8 text-base font-semibold text-white shadow-lg transition-transform hover:scale-[1.03]", phase.solid)}
        >
          Passer à la mémorisation
          <ArrowRight className="h-5 w-5" />
        </Button>
      </motion.div>
    </div>
  );
}
