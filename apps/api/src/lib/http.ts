import type { ContentfulStatusCode } from "hono/utils/http-status";

export class ApiError extends Error {
  constructor(
    public readonly status: ContentfulStatusCode,
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const Errors = {
  notFound: (what: string) => new ApiError(404, `${what} introuvable`, "RESOURCE_NOT_FOUND"),
  conflict: (msg: string) => new ApiError(409, msg, "CONFLICT"),
  unprocessable: (msg: string) => new ApiError(422, msg, "UNPROCESSABLE_ENTITY"),
  unauthorized: () => new ApiError(401, "Non authentifié", "UNAUTHORIZED"),
  badRequest: (msg: string) => new ApiError(400, msg, "BAD_REQUEST"),
};
