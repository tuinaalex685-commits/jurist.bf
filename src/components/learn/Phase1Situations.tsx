import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Situation } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, XCircle, FileText, Users, ListChecks, Scale, FolderOpen } from "lucide-react";
import { PHASES } from "./phases";
import { cn } from "@/lib/utils";

interface Phase1Props {
  situations: Situation[];
  onComplete: () => void;
}

const phase = PHASES[1]; // Reconnaissance — indigo

const levelMeta: Record<Situation["level"], { label: string; text: string; soft: string }> = {
  simple: { label: "Cas simple", text: "text-cat-emerald", soft: "bg-cat-emerald/10" },
  intermediaire: { label: "Cas intermédiaire", text: "text-cat-sky", soft: "bg-cat-sky/10" },
  complexe: { label: "Cas complexe", text: "text-cat-amber", soft: "bg-cat-amber/10" },
  piege: { label: "Cas piège", text: "text-cat-rose", soft: "bg-cat-rose/10" },
};

export function Phase1Situations({ situations, onComplete }: Phase1Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const situation = situations[currentIndex];
  const isCorrect = selectedAnswer === situation.answer;
  const isFinished = currentIndex === situations.length - 1;
  const level = levelMeta[situation.level];

  const handleSelect = (answer: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);
  };

  const handleNext = () => {
    if (isFinished) {
      onComplete();
    } else {
      setSelectedAnswer(null);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* En-tête de phase */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className={cn("text-sm font-bold uppercase tracking-widest", phase.text)}>Étape 2 · Reconnaissance</p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight">Analyse de dossiers</h2>
        </div>
        <div className="flex gap-1.5 pb-1">
          {situations.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                idx === currentIndex ? cn("w-8", phase.solid) : idx < currentIndex ? "w-4 bg-cat-indigo/40" : "w-4 bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
        >
          {/* Dossier */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04),0_16px_40px_-20px_rgba(16,24,40,0.18)]">
            {/* Onglet du dossier */}
            <div className={cn("flex items-center justify-between px-6 py-4", phase.soft)}>
              <div className="flex items-center gap-2.5">
                <FolderOpen className={cn("h-5 w-5", phase.text)} />
                <span className={cn("font-mono text-sm font-bold uppercase tracking-wider", phase.text)}>
                  Dossier {String(currentIndex + 1).padStart(2, "0")} / {String(situations.length).padStart(2, "0")}
                </span>
              </div>
              <span className={cn("rounded-full px-3 py-1 text-xs font-bold", level.soft, level.text)}>
                {level.label}
              </span>
            </div>

            <div className="space-y-6 p-6 md:p-8">
              {/* Contexte */}
              <section>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <FileText className="h-4 w-4" /> Contexte
                </div>
                <p className="text-lg leading-relaxed text-foreground">{situation.scenario}</p>
                {situation.context && (
                  <p className="mt-2 text-sm italic text-muted-foreground">{situation.context}</p>
                )}
              </section>

              {/* Personnages + Éléments */}
              <div className="grid gap-6 sm:grid-cols-2">
                {situation.characters && situation.characters.length > 0 && (
                  <section>
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <Users className="h-4 w-4" /> Personnages
                    </div>
                    <ul className="space-y-2.5">
                      {situation.characters.map((c, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold", phase.soft, phase.text)}>
                            {c.name.charAt(0)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{c.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{c.role}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {situation.keyFacts && situation.keyFacts.length > 0 && (
                  <section>
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <ListChecks className="h-4 w-4" /> Éléments importants
                    </div>
                    <ul className="space-y-2">
                      {situation.keyFacts.map((fact, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", phase.solid)} />
                          <span className="leading-snug">{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>

              {/* Question */}
              <section className={cn("flex items-start gap-3 rounded-xl border p-4", phase.border, "border-opacity-30", phase.soft)}>
                <Scale className={cn("mt-0.5 h-5 w-5 shrink-0", phase.text)} />
                <p className="text-lg font-bold">{situation.question}</p>
              </section>

              {/* Réponses */}
              <div className="grid grid-cols-2 gap-4">
                {["Oui", "Non"].map((opt) => {
                  const chosen = selectedAnswer === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelect(opt)}
                      disabled={selectedAnswer !== null}
                      className={cn(
                        "h-16 rounded-2xl border-2 text-xl font-bold transition-all disabled:cursor-default",
                        chosen
                          ? isCorrect
                            ? "border-green-500 bg-green-500/10 text-green-600"
                            : "border-red-500 bg-red-500/10 text-red-600"
                          : selectedAnswer
                            ? "border-border text-muted-foreground/50"
                            : "border-border hover:border-cat-indigo hover:bg-cat-indigo/5"
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {/* Feedback */}
              <AnimatePresence>
                {selectedAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-5",
                      isCorrect ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
                    )}
                  >
                    {isCorrect ? (
                      <CheckCircle2 className="h-7 w-7 shrink-0 text-green-600" />
                    ) : (
                      <XCircle className="h-7 w-7 shrink-0 text-red-600" />
                    )}
                    <div>
                      <p className={cn("mb-1 font-bold", isCorrect ? "text-green-600" : "text-red-600")}>
                        {isCorrect ? "Analyse correcte" : "Erreur d'analyse"}
                      </p>
                      <p className="leading-relaxed text-foreground/80">{situation.explanation}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Pied */}
            <AnimatePresence>
              {selectedAnswer && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end border-t border-border bg-muted/40 p-5">
                  <Button
                    onClick={handleNext}
                    size="lg"
                    className={cn("gap-2 font-semibold text-white", phase.solid)}
                  >
                    {isFinished ? "Conclure l'analyse" : "Dossier suivant"}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
