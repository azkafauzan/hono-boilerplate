## Overview

This repository is a NestJS-inspired modular HTTP API boilerplate built with Hono, Bun, TypeScript, Drizzle ORM (PostgreSQL), Zod OpenAPI, Swagger UI, and Pino. This file instructs AI coding agents on the architecture, conventions, commands, and constraints to follow when modifying or extending the codebase.

## Agent Skills

- Always read and follow the `hono` skill (`.agents/skills/hono/SKILL.md`) for Hono routing, middleware, validation, testing, and RPC patterns.
- Always read and follow the `ponytail` skill (`.agents/skills/ponytail/SKILL.md`) on every coding task to keep solutions minimal, direct, and free of unnecessary abstractions or bloat.

## Tech Stack

- **Runtime & Test Runner**: Bun (`bun run`, `bun test`)
- **Language**: TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`)
- **HTTP & OpenAPI**: `hono`, `@hono/zod-openapi`, `@hono/swagger-ui`, `zod` (v4)
- **Database & ORM**: PostgreSQL (`pg`), `drizzle-orm`, `drizzle-zod`, `drizzle-kit`
- **Logging**: `pino` with `@hono/structured-logger` and `hono/request-id`
- **Linting & Formatting**: `@biomejs/biome`

## Project Structure

```text
src/
├── index.ts                              # Runtime entrypoint (default export app + AppType)
├── app.module.ts                         # Root module wiring middleware, filters, docs, and feature modules
├── config/
│   ├── env.ts                            # Zod-validated environment configuration (parseEnv)
│   └── logger.ts                         # Root Pino logger factory
├── db/
│   ├── index.ts                          # Lazy Drizzle + pg.Pool factory (createDb)
│   ├── schema.ts                         # Central Drizzle schema barrel (re-export all module entities)
│   └── zod.ts                            # drizzle-zod factory bound to @hono/zod-openapi's extended z
├── common/
│   ├── types.ts                          # Shared AppEnv (Context variables)
│   ├── router.ts                         # createRouter() -> OpenAPIHono with global ValidationPipe hook
│   ├── dto/error.dto.ts                  # Shared OpenAPI error response schema
│   ├── exceptions/http.exception.ts      # NestJS-style HTTP exceptions extending Hono HTTPException
│   ├── filters/http-exception.filter.ts  # Global app.onError and app.notFound JSON filters
│   ├── guards/bearer-auth.guard.ts       # Reusable Guard middleware pattern (createMiddleware)
│   └── interceptors/logging.interceptor.ts # Structured request/error logging middleware
└── modules/
    └── <feature>/
        ├── <feature>.entity.ts           # Drizzle pgTable definition & entity types (if DB-backed)
        ├── <feature>.dto.ts              # Zod OpenAPI request/response schemas & response mappers
        ├── <feature>.repository.ts       # Repository interface + Drizzle implementation
        ├── <feature>.service.ts          # Pure business logic class (constructor-injected dependencies)
        ├── <feature>.controller.ts       # OpenAPIHono route definitions & thin HTTP handlers
        └── <feature>.module.ts           # Module factory wiring repository, service, and controller

test/
├── helper/                               # Shared test helpers (createTestApp, createTestDb, cleanupTestDb)
├── integration/                          # Module, service, config, and guard tests (*.test.ts)
└── e2e/                                  # Full-app HTTP pipeline tests (*.e2e.test.ts)
```

## Architecture & Module Conventions

- Organize every new feature as a self-contained module under `src/modules/<feature>/` and mount it in `src/app.module.ts` via `.route(...)`.
- Keep layers strictly separated:
  - **Controllers** (`*.controller.ts`) handle only HTTP routing, OpenAPI route schemas (`createRoute`), extracting validated input (`c.req.valid(...)`), calling services, and returning typed responses with explicit status codes.
  - **Services** (`*.service.ts`) contain business logic and throw semantic exceptions from `src/common/exceptions/http.exception.ts`. Never pass Hono's `Context` (`c`) into a service.
  - **Repositories** (`*.repository.ts`) encapsulate all Drizzle queries behind an interface so services and HTTP routes remain testable without a live database.
  - **Modules** (`*.module.ts`) wire dependencies explicitly via constructors/factories and return the mounted `OpenAPIHono` router.
- Always create feature routers using `createRouter()` from `@/common/router` so every module shares `AppEnv` and the global Zod validation error format.
- Always use the `@/*` path alias (mapped to `src/*` in `tsconfig.json`) for cross-directory imports across `src/` and `test/`, and keep same-directory imports relative (`./*`).
- Always chain `.openapi(...)` and `.route(...)` calls so `AppType` preserves full Hono RPC (`hc<AppType>`) type inference.
- Keep `src/index.ts` exporting `export default app` so both `bun run --hot src/index.ts` and `@hono/cli` work directly.

## Request Pipeline & Error Handling

- Preserve the global middleware order in `src/app.module.ts`: `secureHeaders()` -> `cors()` -> `requestId()` -> `createLoggingInterceptor(logger)`.
- Implement route-level authorization checks as Hono `createMiddleware<AppEnv>` guards under `src/common/guards/` or the owning feature module, throwing `UnauthorizedException` or `ForbiddenException`.
- Return errors using the uniform JSON envelope `{ statusCode, error, message, requestId, details? }` handled centrally by `createHttpExceptionFilter` and `notFoundFilter`.
- Keep error logging exclusively in `@hono/structured-logger`'s `onError` hook. Never log errors again inside `createHttpExceptionFilter` (`app.onError`), or every error will be logged twice.

## Database & Validation

- Always re-export new Drizzle tables from `src/db/schema.ts` so Drizzle Kit and `createDb` discover them.
- Always import `z` from `@hono/zod-openapi` (and `createSelectSchema` / `createInsertSchema` / `createUpdateSchema` from `src/db/zod.ts`) when defining DTOs so `.openapi()` metadata works across Zod v4 schemas.
- Always read configuration through `parseEnv()` in `src/config/env.ts`; never scatter raw `process.env` reads across modules.
- Always pass explicit status codes to `c.json(payload, 200)` in `.openapi()` handlers.

## Commands

- `bun run dev` — start the development server with hot reload
- `bun run typecheck` — run strict TypeScript type checking (`tsc --noEmit`)
- `bun run lint` / `bun run lint:fix` — check or auto-fix formatting and lint rules with Biome
- `bun test` — run all integration and E2E tests via `app.request()`
- `bun run test:integration` / `bun run test:e2e` — run integration or end-to-end tests separately
- `bun run db:generate` / `bun run db:migrate` / `bun run db:push` / `bun run db:studio` — manage Drizzle PostgreSQL schemas and migrations

## Testing

- Place all tests in the root `test/` directory (never co-locate `*.test.ts` files inside `src/`):
  - `test/integration/*.test.ts` for module, service, config, and guard tests
  - `test/e2e/*.e2e.test.ts` for end-to-end HTTP tests through `createApp()`
  - `test/helper/` for shared app and PostgreSQL database helpers (`createTestDb`, `cleanupTestDb`)
- Use `bun:test` and Hono's `app.request()` for HTTP tests — do not spin up an HTTP server in tests.
- Connect DB-backed tests to PostgreSQL via `createTestDb()` / `createTestApp()` and clear test rows in `beforeEach`/`afterEach` via `cleanupTestDb(db)` (and close pools with `db.$client.end()` in `afterAll`).
- Run `bun run typecheck`, `bun run lint`, and `bun test` before finishing any task.

## Things to Avoid

- Never introduce decorator-based DI containers or `reflect-metadata`; use explicit constructor/factory injection.
- Never use `any` or silence TypeScript errors with `@ts-ignore`.
- Never put Drizzle queries directly inside controllers.
- Never log secrets, credentials, or raw authorization headers.
