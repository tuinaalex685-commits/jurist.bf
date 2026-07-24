import { z } from "zod";

export const SearchQuery = z.object({
  q: z.string().trim().min(2, "Recherche trop courte").max(80),
});
export type SearchQuery = z.infer<typeof SearchQuery>;
