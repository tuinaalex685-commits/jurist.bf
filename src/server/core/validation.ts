import { z } from "zod";

/**
 * Identifiant UUID tel que Postgres l'accepte.
 *
 * POURQUOI PAS `z.string().uuid()` : Zod valide les bits de version et de
 * variante de la RFC 4122 (version 1-8, variante 8/9/a/b). Le type `uuid` de
 * Postgres, lui, accepte n'importe quels 32 chiffres hexadécimaux. La
 * validation était donc PLUS STRICTE que la base : des identifiants
 * parfaitement valides en base — ceux des jeux de données de départ, par
 * exemple `44444444-4444-4444-4444-444444444444` — étaient rejetés par l'API
 * avec « Invalid UUID », rendant l'article concerné impossible à traiter.
 *
 * On valide donc la FORME acceptée par la base, pas la conformité RFC.
 */
export const uuid = (message = "Identifiant invalide") =>
  z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, message);
