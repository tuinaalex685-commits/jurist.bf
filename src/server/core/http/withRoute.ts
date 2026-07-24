import { toErrorResponse } from "../errors";
import { logger, type Logger } from "../logging/logger";
import type { ApiSuccess } from "@/server/contracts/http";

export interface RouteContext {
  requestId: string;
  log: Logger;
}

/**
 * Enveloppe de Route Handler : la route reste **fine** (I/O only).
 * - injecte un `request_id` + logger corrélé,
 * - normalise la réponse succès `{ data, meta? }`,
 * - mappe toute erreur (AppError → HTTP) en `{ error: { code, message } }`,
 * - transmet le contexte de segment Next (`{ params }`) aux routes dynamiques.
 * Aucune logique métier ici — elle vit dans les services.
 */
type RouteHandler<Segment> = (
  req: Request,
  ctx: RouteContext,
  segment: Segment,
) => Promise<ApiSuccess<unknown>>;

export function withRoute<Segment = unknown>(handler: RouteHandler<Segment>) {
  return async (req: Request, segment: Segment): Promise<Response> => {
    const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
    const log = logger.child({
      requestId,
      method: req.method,
      path: (() => {
        try {
          return new URL(req.url).pathname;
        } catch {
          return undefined;
        }
      })(),
    });

    try {
      const result = await handler(req, { requestId, log }, segment);
      return Response.json(result, { headers: { "x-request-id": requestId } });
    } catch (err) {
      const { status, body } = toErrorResponse(err);
      log.error("route_error", { code: body.error.code, status, message: body.error.message });
      return Response.json(body, { status, headers: { "x-request-id": requestId } });
    }
  };
}
