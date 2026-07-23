import { Compass, FolderSearch, Lightbulb, BrainCircuit, Trophy, type LucideIcon } from "lucide-react";

/**
 * Identité visuelle de chaque phase du parcours (la "mission").
 * Chaque phase possède sa couleur, son icône et son vocabulaire.
 * Les classes sont écrites en toutes lettres (Tailwind JIT ne lit pas les
 * noms de classes construits dynamiquement).
 */
export type PhaseIdentity = {
  id: number;
  key: string;
  name: string;
  tagline: string;
  Icon: LucideIcon;
  /** text-* accent */
  text: string;
  /** bg accent 10% (puces, surfaces douces) */
  soft: string;
  /** bg accent plein */
  solid: string;
  /** border accent */
  border: string;
  /** ring accent (focus / halo) */
  ring: string;
  /** dégradé signature de la phase (héro) */
  gradient: string;
};

export const PHASES: PhaseIdentity[] = [
  {
    id: 0,
    key: "decouverte",
    name: "Découverte",
    tagline: "Comprendre la notion",
    Icon: Compass,
    text: "text-cat-sky",
    soft: "bg-cat-sky/10",
    solid: "bg-cat-sky",
    border: "border-cat-sky",
    ring: "ring-cat-sky/30",
    gradient: "bg-[linear-gradient(135deg,hsl(var(--cat-sky)),hsl(var(--cat-indigo)))]",
  },
  {
    id: 1,
    key: "reconnaissance",
    name: "Reconnaissance",
    tagline: "Analyser des dossiers",
    Icon: FolderSearch,
    text: "text-cat-indigo",
    soft: "bg-cat-indigo/10",
    solid: "bg-cat-indigo",
    border: "border-cat-indigo",
    ring: "ring-cat-indigo/30",
    gradient: "bg-[linear-gradient(135deg,hsl(var(--cat-indigo)),hsl(var(--cat-violet)))]",
  },
  {
    id: 2,
    key: "comprehension",
    name: "Compréhension",
    tagline: "Décomposer la règle",
    Icon: Lightbulb,
    text: "text-cat-emerald",
    soft: "bg-cat-emerald/10",
    solid: "bg-cat-emerald",
    border: "border-cat-emerald",
    ring: "ring-cat-emerald/30",
    gradient: "bg-[linear-gradient(135deg,hsl(var(--cat-emerald)),hsl(var(--cat-sky)))]",
  },
  {
    id: 3,
    key: "memorisation",
    name: "Mémorisation",
    tagline: "Ancrer le texte officiel",
    Icon: BrainCircuit,
    text: "text-cat-violet",
    soft: "bg-cat-violet/10",
    solid: "bg-cat-violet",
    border: "border-cat-violet",
    ring: "ring-cat-violet/30",
    gradient: "bg-[linear-gradient(135deg,hsl(var(--cat-violet)),hsl(var(--cat-indigo)))]",
  },
  {
    id: 4,
    key: "maitrise",
    name: "Maîtrise",
    tagline: "Valider l'article",
    Icon: Trophy,
    text: "text-cat-amber",
    soft: "bg-cat-amber/10",
    solid: "bg-cat-amber",
    border: "border-cat-amber",
    ring: "ring-cat-amber/30",
    gradient: "bg-[linear-gradient(135deg,hsl(var(--cat-amber)),hsl(var(--cat-rose)))]",
  },
];
