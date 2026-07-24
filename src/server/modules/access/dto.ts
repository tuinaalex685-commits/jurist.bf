import { z } from "zod";

/** Entrée de rédemption d'un code d'accès. */
export const RedeemCodeInput = z.object({
  code: z.string().trim().min(4, "Code trop court").max(64, "Code trop long"),
});
export type RedeemCodeInput = z.infer<typeof RedeemCodeInput>;

/** Sortie (contrat consommé par le frontend). */
export type RedeemCodeResult = {
  status: "redeemed" | "already";
  batchId: string | null;
};
