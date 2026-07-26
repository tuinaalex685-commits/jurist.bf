import { z } from "zod";

/** Fenêtre d'analyse des séries temporelles (bornée : évite un scan illimité). */
export const TimeseriesQuery = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});
export type TimeseriesQuery = z.infer<typeof TimeseriesQuery>;

export const ListUsersQuery = z.object({
  search: z.string().trim().max(120).optional(),
  role: z.enum(["student", "content_admin", "admin"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListUsersQuery = z.infer<typeof ListUsersQuery>;

/**
 * Mutation d'un utilisateur. `role` et `suspended` sont volontairement les
 * SEULS champs mutables : le cockpit pilote l'accès, il n'édite pas l'identité.
 */
export const UpdateUserInput = z
  .object({
    role: z.enum(["student", "content_admin", "admin"]).optional(),
    suspended: z.boolean().optional(),
  })
  .refine((v) => v.role !== undefined || v.suspended !== undefined, {
    message: "Aucune modification fournie",
  });
export type UpdateUserInput = z.infer<typeof UpdateUserInput>;

export const UpdateBudgetInput = z
  .object({
    monthlyUsd: z.number().nonnegative().max(100_000).optional(),
    dailyUsd: z.number().nonnegative().max(100_000).optional(),
    circuitOpen: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Aucune modification fournie",
  });
export type UpdateBudgetInput = z.infer<typeof UpdateBudgetInput>;

export const ListJobsQuery = z.object({
  type: z.string().trim().max(64).optional(),
  status: z.enum(["pending", "running", "done", "error", "dead"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListJobsQuery = z.infer<typeof ListJobsQuery>;

export const ListAlertsQuery = z.object({
  includeResolved: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === "true"),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type ListAlertsQuery = z.infer<typeof ListAlertsQuery>;
