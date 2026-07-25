"use client";

import { useEffect, useState } from "react";
import { HelpCircle, ShieldCheck, Sparkles, Check } from "lucide-react";
import type { Activity } from "@/server/contracts/learning";
import { cn } from "@/lib/utils";

/** Un renderer reçoit l'activité et remonte { response, ready } au moteur. */
export type RendererProps = {
  activity: Activity;
  disabled: boolean;
  onChange: (response: unknown, ready: boolean) => void;
};

type P = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/* ---------------- Découverte ---------------- */
function Discovery({ activity, onChange }: RendererProps) {
  const p = activity.prompt as P;
  useEffect(() => onChange({}, true), [onChange]);
  return (
    <div className="space-y-5">
      <p className="text-lg leading-relaxed text-foreground">{str(p.intro)}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-muted/40 p-5">
          <div className="mb-2 flex items-center gap-2"><HelpCircle className="h-5 w-5 text-primary" /><h4 className="font-semibold">Pourquoi cette règle existe</h4></div>
          <p className="text-sm text-muted-foreground">{str(p.why)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-muted/40 p-5">
          <div className="mb-2 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-action" /><h4 className="font-semibold">Ce qu&apos;elle protège</h4></div>
          <p className="text-sm text-muted-foreground">{str(p.protects)}</p>
        </div>
      </div>
      {arr<string>(p.outcomes).length > 0 && (
        <div className="rounded-2xl border border-border bg-muted/40 p-5">
          <div className="mb-3 flex items-center gap-2"><Sparkles className="h-5 w-5 text-gold" /><h4 className="font-semibold">Après cette étape, vous saurez</h4></div>
          <ul className="grid gap-2 sm:grid-cols-3">
            {arr<string>(p.outcomes).map((o, i) => (
              <li key={i} className="flex items-start gap-2 rounded-xl bg-card p-3 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-action" /> {o}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ---------------- Choix de situation ---------------- */
function SituationChoice({ activity, disabled, onChange }: RendererProps) {
  const p = activity.prompt as P;
  const [value, setValue] = useState<string | null>(null);
  const options = arr<string>(p.options).length ? arr<string>(p.options) : ["Oui", "Non"];
  const chars = arr<{ name: string; role: string }>(p.characters);
  const facts = arr<string>(p.keyFacts);
  return (
    <div className="space-y-5">
      <p className="text-lg leading-relaxed text-foreground">{str(p.scenario)}</p>
      {str(p.context) && <p className="text-sm italic text-muted-foreground">{str(p.context)}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {chars.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Personnages</p>
            <ul className="space-y-2">
              {chars.map((c, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{c.name.charAt(0)}</span>
                  <div><p className="text-sm font-semibold">{c.name}</p><p className="text-xs text-muted-foreground">{c.role}</p></div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {facts.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Éléments importants</p>
            <ul className="space-y-1.5">{facts.map((f, i) => <li key={i} className="flex items-start gap-2 text-sm"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{f}</li>)}</ul>
          </div>
        )}
      </div>
      <p className="rounded-xl bg-primary/5 p-4 text-lg font-bold">{str(p.question)}</p>
      <div className="grid grid-cols-2 gap-4">
        {options.map((o) => (
          <button key={o} type="button" disabled={disabled}
            onClick={() => { setValue(o); onChange({ value: o }, true); }}
            className={cn("h-14 rounded-2xl border-2 text-lg font-bold transition-all",
              value === o ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50")}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Sélection d'éléments ---------------- */
function SelectElements({ activity, disabled, onChange }: RendererProps) {
  const p = activity.prompt as P;
  const options = arr<{ id: string; label: string }>(p.options);
  const [sel, setSel] = useState<string[]>([]);
  const toggle = (id: string) => {
    const next = sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id];
    setSel(next); onChange({ selected: next }, next.length > 0);
  };
  return (
    <div className="space-y-4">
      <p className="font-semibold">{str(p.instruction)}</p>
      {str(p.scenario) && <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">{str(p.scenario)}</p>}
      <div className="space-y-2.5">
        {options.map((o) => (
          <button key={o.id} type="button" disabled={disabled} onClick={() => toggle(o.id)}
            className={cn("flex w-full items-center gap-3 rounded-xl border-2 p-3.5 text-left text-sm transition-colors",
              sel.includes(o.id) ? "border-primary bg-primary/10" : "border-border hover:border-primary/40")}>
            <span className={cn("flex h-5 w-5 items-center justify-center rounded-md border", sel.includes(o.id) ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>
              {sel.includes(o.id) && <Check className="h-3.5 w-3.5" />}
            </span>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Remise en ordre ---------------- */
function Ordering({ activity, disabled, onChange }: RendererProps) {
  const p = activity.prompt as P;
  const items = arr<{ id: string; label: string }>(p.items);
  const [order, setOrder] = useState<{ id: string; label: string }[]>(items);
  useEffect(() => onChange({ order: items.map((i) => i.id) }, true), [onChange]); // eslint-disable-line
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[idx], next[j]] = [next[j], next[idx]];
    setOrder(next); onChange({ order: next.map((i) => i.id) }, true);
  };
  return (
    <div className="space-y-4">
      <p className="font-semibold">{str(p.instruction)}</p>
      <ul className="space-y-2">
        {order.map((it, idx) => (
          <li key={it.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
            <span className="font-mono text-sm text-muted-foreground">{idx + 1}</span>
            <span className="flex-1 text-sm">{it.label}</span>
            <div className="flex flex-col">
              <button type="button" disabled={disabled || idx === 0} onClick={() => move(idx, -1)} className="px-2 text-muted-foreground disabled:opacity-30 hover:text-foreground">▲</button>
              <button type="button" disabled={disabled || idx === order.length - 1} onClick={() => move(idx, 1)} className="px-2 text-muted-foreground disabled:opacity-30 hover:text-foreground">▼</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- Association ---------------- */
function Matching({ activity, disabled, onChange }: RendererProps) {
  const p = activity.prompt as P;
  const left = arr<{ id: string; label: string }>(p.left);
  const right = arr<{ id: string; label: string }>(p.right);
  const [map, setMap] = useState<Record<string, string>>({});
  const pick = (lid: string, rid: string) => {
    const next = { ...map, [lid]: rid };
    setMap(next);
    const pairs = Object.entries(next);
    onChange({ pairs }, pairs.length === left.length);
  };
  return (
    <div className="space-y-4">
      <p className="font-semibold">{str(p.instruction)}</p>
      <ul className="space-y-2.5">
        {left.map((l) => (
          <li key={l.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 sm:flex-row sm:items-center">
            <span className="flex-1 text-sm">{l.label}</span>
            <select disabled={disabled} value={map[l.id] ?? ""} onChange={(e) => pick(l.id, e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-primary">
              <option value="" disabled>Associer à…</option>
              {right.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- Texte à trous ---------------- */
function Cloze({ activity, disabled, onChange }: RendererProps) {
  const p = activity.prompt as P;
  const template = str(p.template);
  const parts = template.split(/(\[BLANK_\d+\])/g);
  const blanksCount = (template.match(/\[BLANK_\d+\]/g) ?? []).length;
  const [blanks, setBlanks] = useState<string[]>(Array(blanksCount).fill(""));
  const setB = (i: number, v: string) => {
    const next = [...blanks]; next[i] = v; setBlanks(next);
    onChange({ blanks: next }, next.every((x) => x.trim() !== ""));
  };
  let bi = -1;
  return (
    <div className="text-lg leading-[2.4]">
      {parts.map((part, i) => {
        if (/\[BLANK_\d+\]/.test(part)) {
          bi++;
          const idx = bi;
          return (
            <input key={i} disabled={disabled} value={blanks[idx] ?? ""} onChange={(e) => setB(idx, e.target.value)}
              placeholder="•••" className="mx-1 inline-block h-10 w-36 rounded-none border-0 border-b-2 border-primary/40 bg-transparent px-1 text-center align-middle text-lg font-semibold text-primary outline-none focus:border-primary" />
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

/* ---------------- Réponse argumentée ---------------- */
function ArguedAnswer({ activity, disabled, onChange }: RendererProps) {
  const p = activity.prompt as P;
  const [text, setText] = useState("");
  return (
    <div className="space-y-3">
      <p className="text-lg font-semibold">{str(p.question)}</p>
      {str(p.hint) && <p className="text-sm text-muted-foreground">💡 {str(p.hint)}</p>}
      <textarea disabled={disabled} value={text} rows={6}
        onChange={(e) => { setText(e.target.value); onChange({ text: e.target.value }, e.target.value.trim().length > 10); }}
        placeholder="Rédigez votre raisonnement…"
        className="w-full rounded-xl border border-input bg-background p-3.5 text-sm outline-none focus-visible:border-primary" />
      <p className="text-xs text-muted-foreground">Votre réponse sera analysée sur les concepts clés mobilisés.</p>
    </div>
  );
}

/* ---------------- Fallback ---------------- */
function Fallback({ activity, onChange }: RendererProps) {
  useEffect(() => onChange({}, true), [onChange]);
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
      Type d&apos;activité « {activity.type} » non pris en charge par cette version. Vous pouvez continuer.
    </div>
  );
}

/** Registre : type d'activité → renderer. Nouveau format = 1 entrée ici. */
export const RENDERERS: Record<string, (props: RendererProps) => React.ReactNode> = {
  discovery: Discovery,
  situation_choice: SituationChoice,
  select_elements: SelectElements,
  ordering: Ordering,
  matching: Matching,
  cloze: Cloze,
  argued_answer: ArguedAnswer,
};

export function getRenderer(type: string) {
  return RENDERERS[type] ?? Fallback;
}
