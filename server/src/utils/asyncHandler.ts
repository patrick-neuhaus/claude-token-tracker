import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { ParsedQs } from "qs";

/**
 * Wraps an async route handler so any thrown/rejected error is forwarded
 * to Express' next() — letting the central errorHandler middleware respond
 * with a uniform shape. Eliminates try/catch boilerplate per route.
 *
 * Generic over Express' default request types so destructuring like
 * `req.params.id` keeps the same `string` typing as a non-wrapped handler.
 *
 * Usage:
 *   router.get("/:id", asyncHandler(async (req, res) => {
 *     const data = await service.get(req.params.id);
 *     res.json(data);
 *   }));
 */
export function asyncHandler<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  Locals extends Record<string, unknown> = Record<string, unknown>,
>(
  fn: (
    req: Request<P, ResBody, ReqBody, ReqQuery, Locals>,
    res: Response<ResBody, Locals>,
    next: NextFunction,
  ) => Promise<unknown>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
