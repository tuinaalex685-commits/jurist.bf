/**
 * Logger structuré (JSON) — point unique de journalisation.
 * En prod, la sortie est destinée à être expédiée vers Axiom/Logflare.
 * Corrélation via `request_id` / `job_id` portés dans le contexte enfant.
 */
type Level = "debug" | "info" | "warn" | "error";
type Ctx = Record<string, unknown>;

function emit(level: Level, message: string, base: Ctx, extra?: Ctx) {
  const line = JSON.stringify({ level, message, ...base, ...extra, ts: new Date().toISOString() });
  // Point unique et assumé d'écriture (sink) — remplacé par un transport en prod.
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export interface Logger {
  debug(message: string, ctx?: Ctx): void;
  info(message: string, ctx?: Ctx): void;
  warn(message: string, ctx?: Ctx): void;
  error(message: string, ctx?: Ctx): void;
  child(ctx: Ctx): Logger;
}

function make(base: Ctx): Logger {
  return {
    debug: (m, c) => emit("debug", m, base, c),
    info: (m, c) => emit("info", m, base, c),
    warn: (m, c) => emit("warn", m, base, c),
    error: (m, c) => emit("error", m, base, c),
    child: (ctx) => make({ ...base, ...ctx }),
  };
}

export const logger = make({});
