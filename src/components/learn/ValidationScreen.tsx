import Link from "next/link";
import { useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Article } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowLeft, LayoutDashboard, ShieldCheck, Medal, Sparkles } from "lucide-react";
import { PHASES } from "./phases";
import { cn } from "@/lib/utils";

interface ValidationProps {
  article: Article;
}

const phase = PHASES[4]; // Maîtrise — amber/gold

const skills = [
  "Compréhension des enjeux sociaux",
  "Reconnaissance des situations pratiques",
  "Décomposition de la structure légale",
  "Mémorisation stricte du texte",
];

export function ValidationScreen({ article }: ValidationProps) {
  useEffect(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }, colors: ["#059669", "#f59e0b", "#f43f5e"] });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }, colors: ["#059669", "#f59e0b", "#f43f5e"] });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-10 py-4 text-center">
      <div className="space-y-6">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className={cn("mx-auto flex h-32 w-32 items-center justify-center rounded-full text-white shadow-2xl ring-8 ring-cat-amber/15", phase.gradient)}
        >
          <Trophy className="h-14 w-14" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider", phase.soft, phase.text)}>
            <Medal className="h-3.5 w-3.5" /> Article maîtrisé
          </span>
          <h2 className={cn("bg-clip-text text-4xl font-black tracking-tight text-transparent md:text-5xl", phase.gradient)}>
            Maîtrise validée
          </h2>
          <p className="text-lg font-medium text-foreground">
            Article {article.number} — {article.title}
          </p>
          <p className="mx-auto max-w-md text-muted-foreground">
            Cet article rejoint votre arsenal juridique. L&apos;algorithme de révision espacée le reprogrammera au bon moment.
          </p>
        </motion.div>
      </div>

      {/* Compétences acquises */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
        <div className="overflow-hidden rounded-2xl border border-border bg-card p-6 text-left shadow-sm md:p-8">
          <p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-4 w-4" /> Compétences certifiées
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {skills.map((text, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="flex items-center gap-3 rounded-xl bg-muted/50 p-3"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cat-emerald/15">
                  <ShieldCheck className="h-4 w-4 text-cat-emerald" />
                </span>
                <span className="text-sm font-medium">{text}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row"
      >
        <Button variant="outline" size="lg" asChild className="w-full gap-2 rounded-full sm:w-auto">
          <Link href="/library">
            <ArrowLeft className="h-5 w-5" /> Bibliothèque
          </Link>
        </Button>
        <Button size="lg" asChild className="w-full gap-2 rounded-full sm:w-auto">
          <Link href="/">
            <LayoutDashboard className="h-5 w-5" /> Voir ma progression
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
