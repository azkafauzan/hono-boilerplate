import { swaggerUI } from "@hono/swagger-ui"
import type { z } from "@hono/zod-openapi"
import pkg from "../../package.json"
import type { AppOpenAPI } from "./create-router"
import { ApiErrorSchema } from "./schemas"

/** Builds an OpenAPI response/body object for a JSON payload. */
export const jsonContent = <T extends z.ZodType>(schema: T, description: string) => ({
  content: {
    "application/json": {
      schema,
    },
  },
  description,
})

/** Same as `jsonContent`, but marks the request body as required. */
export const jsonContentRequired = <T extends z.ZodType>(schema: T, description: string) => ({
  ...jsonContent(schema, description),
  required: true,
})

/** Reusable error responses shared across routes. */
export const errorResponses = {
  notFound: jsonContent(ApiErrorSchema, "Resource not found"),
  validation: jsonContent(ApiErrorSchema, "Validation error"),
}

/** Registers the OpenAPI JSON spec (`/doc`) and Swagger UI (`/swagger`). */
export const configureOpenAPI = (app: AppOpenAPI) => {
  app.doc("/doc", {
    openapi: "3.0.0",
    info: {
      title: "Hono Boilerplate API",
      version: pkg.version,
      description: "RESTful API Boilerplate with Hono, Bun, Drizzle ORM, and Swagger UI",
    },
  })

  app.get("/swagger", swaggerUI({ url: "/doc" }))
}
