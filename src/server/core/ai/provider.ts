import "server-only";
import { env, isConfigured } from "../config/env";
import { AppError } from "../errors";

export interface AiGenerationRequest {
  /** Prompt final (composé par le PromptService) — ce qui serait envoyé au modèle. */
  prompt: string;
  model: string;
  /** Contexte structuré (texte officiel, notion…) — utilisé par le mock pour produire un contenu plausible. */
  context: {
    articleNumber: string;
    articleTitle: string | null;
    officialText: string;
  };
}

export interface AiGenerationResponse {
  /** Réponse brute du modèle (JSON attendu — validé ensuite par le schéma de bundle). */
  text: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  model: string;
}

export interface AiProvider {
  generate(req: AiGenerationRequest): Promise<AiGenerationResponse>;
}

/** Estimation grossière (~4 caractères/token) — suffisante pour le suivi de coût. */
const estimateTokens = (s: string) => Math.max(1, Math.ceil(s.length / 4));

/**
 * Provider MOCK — zéro appel réseau, zéro coût réel. Produit un bundle
 * pédagogique déterministe et plausible à partir du texte officiel, dans le
 * même format que celui attendu du modèle réel. Sert à valider tout le pipeline
 * (dédup, budget, écriture DB, frontend) sans dépenser un centime.
 */
export class MockAiProvider implements AiProvider {
  async generate(req: AiGenerationRequest): Promise<AiGenerationResponse> {
    const { articleNumber, articleTitle, officialText } = req.context;
    const words = [...new Set(officialText.split(/\s+/).map((w) => w.replace(/[^\p{L}-]/gu, "")))]
      .filter((w) => w.length >= 6)
      .slice(0, 3);
    const blanks = words.length >= 2 ? words.slice(0, 3) : ["détourner", "remis", "rendre"];
    const cloze = blanks.reduce(
      (tpl, w, i) => tpl.replace(new RegExp(w, "i"), `[BLANK_${i + 1}]`),
      officialText,
    );

    const bundle = {
      activities: [
        {
          phase: 0,
          type: "discovery",
          objective: "Comprendre la notion avant de l'appliquer",
          weight: 0,
          prompt: {
            intro: `[MOCK] ${articleTitle ?? `Article ${articleNumber}`} : ${officialText.slice(0, 160)}…`,
            why: "[MOCK] Cette règle protège un équilibre social identifié dans le texte officiel.",
            protects: "[MOCK] Elle protège la partie lésée par un manquement à une obligation légale.",
            outcomes: [
              `Comprendre le champ d'application de l'article ${articleNumber}`,
              "Identifier les éléments constitutifs de la règle",
              "Restituer le texte officiel avec exactitude",
            ],
          },
        },
        {
          phase: 1,
          type: "situation_choice",
          objective: "Reconnaître une situation d'application",
          difficulty: "simple",
          weight: 1,
          prompt: {
            scenario: `[MOCK] Une situation dérivée de l'article ${articleNumber} met en scène deux parties liées par les faits décrits dans le texte officiel.`,
            context: "Contenu généré automatiquement (mock) — à valider avant publication.",
            question: "Cette situation illustre-t-elle l'article étudié ?",
            options: ["Oui", "Non"],
          },
          solution: { answer: "Oui" },
          evaluation: { method: "exact", pass_threshold: 1 },
          feedback: { correct: "[MOCK] Analyse correcte.", incorrect: "[MOCK] Relisez le texte officiel." },
        },
        {
          phase: 3,
          type: "cloze",
          objective: "Restituer le texte officiel exact",
          difficulty: "intermediaire",
          weight: 1,
          prompt: { template: cloze },
          solution: { blanks },
          evaluation: { method: "cloze", pass_threshold: 1 },
          feedback: { correct: "[MOCK] Exactitude confirmée.", incorrect: `[MOCK] Les mots attendus étaient : ${blanks.join(", ")}.` },
        },
      ],
      examQuestions: [
        {
          type: "vrai_faux",
          difficulty: "simple",
          payload: { question: `[MOCK] L'article ${articleNumber} s'applique-t-il tel que décrit dans son texte officiel ?`, correct: "true" },
        },
      ],
    };

    const text = JSON.stringify(bundle);
    return {
      text,
      tokensIn: estimateTokens(req.prompt),
      tokensOut: estimateTokens(text),
      costUsd: 0, // mock : aucune dépense réelle
      model: "mock-v1",
    };
  }
}

/**
 * Provider GEMINI — code réel, jamais exécuté tant que GEMINI_API_KEY est absent.
 * Écrit pour qu'il suffise d'ajouter la clé + activer le Prompt Maître pour que
 * la génération fonctionne, sans aucune autre modification de code.
 */
export class GeminiProvider implements AiProvider {
  async generate(req: AiGenerationRequest): Promise<AiGenerationResponse> {
    if (!isConfigured.gemini()) {
      throw AppError.config("GEMINI_API_KEY absente — provider Gemini non disponible");
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${req.model}:generateContent?key=${env.GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: req.prompt }] }] }),
    });
    if (!res.ok) {
      throw AppError.dependency(`Gemini a répondu ${res.status}`, await res.text().catch(() => undefined));
    }
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const tokensIn = json.usageMetadata?.promptTokenCount ?? estimateTokens(req.prompt);
    const tokensOut = json.usageMetadata?.candidatesTokenCount ?? estimateTokens(text);
    // Tarification indicative — à ajuster selon le modèle réellement utilisé.
    const costUsd = (tokensIn / 1_000_000) * 0.1 + (tokensOut / 1_000_000) * 0.4;
    return { text, tokensIn, tokensOut, costUsd, model: req.model };
  }
}

/** Sélectionne le provider actif. Gemini seulement si configuré (jamais par défaut). */
export function getAiProvider(): AiProvider {
  return isConfigured.gemini() ? new GeminiProvider() : new MockAiProvider();
}
