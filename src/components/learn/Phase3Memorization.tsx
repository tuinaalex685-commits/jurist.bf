import { useState, useMemo } from "react";
import { MemorizationItem } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, CheckCircle2, RotateCcw, Sparkles, ScrollText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PHASES } from "./phases";
import { cn } from "@/lib/utils";

interface Phase3Props {
  item: MemorizationItem;
  onComplete: () => void;
}

const phase = PHASES[3]; // Mémorisation — violet

const norm = (s: string) => s.toLowerCase().trim();

export function Phase3Memorization({ item, onComplete }: Phase3Props) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  const parts = useMemo(() => {
    const regex = /\[BLANK_(\d+)\]/g;
    const result: Array<{ type: "text"; content: string } | { type: "blank"; index: number }> = [];
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(item.cloze_template)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: "text", content: item.cloze_template.slice(lastIndex, match.index) });
      }
      result.push({ type: "blank", index: parseInt(match[1], 10) - 1 });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < item.cloze_template.length) {
      result.push({ type: "text", content: item.cloze_template.slice(lastIndex) });
    }
    return result;
  }, [item.cloze_template]);

  const total = item.blanks.length;
  const filledCount = Object.values(answers).filter((a) => a.trim() !== "").length;
  const allAnswered = filledCount === total;
  const correctCount = item.blanks.filter((w, i) => answers[i] && norm(answers[i]) === norm(w)).length;
  const scorePct = Math.round((correctCount / total) * 100);
  const isPerfect = showResults && correctCount === total;

  const fullOfficialText = useMemo(
    () => item.cloze_template.replace(/\[BLANK_(\d+)\]/g, (_, n) => item.blanks[parseInt(n, 10) - 1]),
    [item]
  );

  const handleReset = () => {
    setAnswers({});
    setShowResults(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="text-center">
        <p className={cn("text-sm font-bold uppercase tracking-widest", phase.text)}>Étape 4 · Mémorisation</p>
        <h2 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">Ancrer le texte officiel</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Reconstituez l&apos;article mot pour mot. En droit, l&apos;exactitude fait tout.
        </p>
      </div>

      {/* Progression en direct */}
      {!showResults && (
        <div className="flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
            <motion.div
              className={cn("h-full rounded-full", phase.solid)}
              animate={{ width: `${(filledCount / total) * 100}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 26 }}
            />
          </div>
          <span className={cn("font-mono text-sm font-bold tabular-nums", phase.text)}>
            {filledCount}/{total} mots
          </span>
        </div>
      )}

      {/* Texte à trous */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04),0_16px_40px_-20px_rgba(16,24,40,0.18)]"
      >
        <div className={cn("h-1.5 w-full", phase.gradient)} />
        <div className="p-6 text-lg leading-[2.4] text-foreground md:p-10 md:text-xl md:leading-[2.6]">
          {parts.map((part, i) => {
            if (part.type === "text") return <span key={i}>{part.content}</span>;
            const bIndex = part.index;
            const value = answers[bIndex] || "";
            const correct = norm(value) === norm(item.blanks[bIndex]);
            return (
              <span key={i} className="relative mx-1 inline-block">
                <Input
                  type="text"
                  aria-label={`Mot manquant ${bIndex + 1}`}
                  value={value}
                  onChange={(e) => setAnswers((p) => ({ ...p, [bIndex]: e.target.value }))}
                  readOnly={showResults}
                  placeholder="•••"
                  className={cn(
                    "inline-block h-11 w-36 rounded-none border-0 border-b-2 bg-transparent px-1 text-center align-middle text-lg font-semibold shadow-none focus-visible:ring-0",
                    showResults
                      ? correct
                        ? "border-green-500 text-green-600"
                        : "border-red-500 text-red-500 line-through decoration-2"
                      : cn("border-cat-violet/40 focus:border-cat-violet", phase.text)
                  )}
                />
                {showResults && !correct && (
                  <motion.span
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-green-500/10 px-2 py-0.5 text-sm font-bold text-green-600"
                  >
                    {item.blanks[bIndex]}
                  </motion.span>
                )}
              </span>
            );
          })}
        </div>
      </motion.div>

      {/* Action / Résultat */}
      <AnimatePresence mode="wait">
        {!showResults ? (
          <motion.div key="check" exit={{ opacity: 0 }} className="flex justify-center pt-2">
            <Button
              size="lg"
              onClick={() => setShowResults(true)}
              disabled={!allAnswered}
              className={cn("h-14 gap-2 rounded-full px-10 text-base font-semibold text-white shadow-lg transition-transform enabled:hover:scale-[1.03]", phase.solid)}
            >
              <Sparkles className="h-5 w-5" />
              Vérifier ma précision
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Score */}
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className={cn(
                  "flex h-24 w-24 flex-col items-center justify-center rounded-full text-white",
                  isPerfect ? "bg-green-500" : phase.solid
                )}
              >
                <span className="text-3xl font-black leading-none tabular-nums">{scorePct}%</span>
                <span className="text-xs font-semibold opacity-80">{correctCount}/{total}</span>
              </motion.div>
              <div>
                <p className="text-xl font-bold">
                  {isPerfect ? "Exactitude parfaite !" : "Presque — affinez les termes en rouge"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isPerfect
                    ? "Vous restituez l'article officiel mot pour mot."
                    : "Les corrections apparaissent en vert sous chaque mot."}
                </p>
              </div>
            </div>

            {/* Texte officiel révélé */}
            <div className="rounded-2xl border border-border bg-muted/40 p-6">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <ScrollText className="h-4 w-4" /> Texte officiel
              </div>
              <p className="leading-relaxed text-foreground">{fullOfficialText}</p>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
              {!isPerfect && (
                <Button variant="outline" size="lg" onClick={handleReset} className="gap-2 rounded-full">
                  <RotateCcw className="h-4 w-4" /> Réessayer
                </Button>
              )}
              <Button
                size="lg"
                onClick={onComplete}
                className={cn("h-14 gap-2 rounded-full px-8 text-base font-semibold text-white shadow-lg", isPerfect ? "bg-cat-amber hover:bg-cat-amber/90" : phase.solid)}
              >
                {isPerfect ? (
                  <>
                    <CheckCircle2 className="h-5 w-5" /> Valider la maîtrise
                  </>
                ) : (
                  <>Continuer <ArrowRight className="h-5 w-5" /></>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
