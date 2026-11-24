import { HTTPException } from "hono/http-exception"
import type { ContentfulStatusCode } from "hono/utils/http-status"

export interface HttpExceptionOptions {
  details?: unknown
  cause?: unknown
}

export class AppHttpException extends HTTPException {
  readonly errorName: string
  readonly details?: unknown

  constructor(
    status: ContentfulStatusCode,
    errorName: string,
    message: string,
    options?: HttpExceptionOptions,
  ) {
    super(status, { message, cause: options?.cause })
    this.errorName = errorName
    this.details = options?.details
  }
}

export class BadRequestException extends AppHttpException {
  constructor(message = "Bad Request", options?: HttpExceptionOptions) {
    super(400, "Bad Request", message, options)
  }
}

export class UnauthorizedException extends AppHttpException {
  constructor(message = "Unauthorized", options?: HttpExceptionOptions) {
    super(401, "Unauthorized", message, options)
  }
}

export class ForbiddenException extends AppHttpException {
  constructor(message = "Forbidden", options?: HttpExceptionOptions) {
    super(403, "Forbidden", message, options)
  }
}

export class NotFoundException extends AppHttpException {
  constructor(message = "Not Found", options?: HttpExceptionOptions) {
    super(404, "Not Found", message, options)
  }
}

export class ConflictException extends AppHttpException {
  constructor(message = "Conflict", options?: HttpExceptionOptions) {
    super(409, "Conflict", message, options)
  }
}
