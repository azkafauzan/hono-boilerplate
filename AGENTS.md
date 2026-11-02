## Overview

This repository is a general-purpose backend API boilerplate built with Hono, Bun, Drizzle ORM (PostgreSQL), and Zod OpenAPI. This document instructs AI coding agents on the stack, folder structure, and conventions required when working in this repository.

## Tech Stack

- **Runtime & Package Manager:** Bun (`bun`, `bun:test`)
- **Web Framework:** Hono v4 (`hono`)
- **API Spec & Docs:** `@hono/zod-openapi`, `@hono/swagger-ui`, Zod v4 (`zod`)
- **Database & ORM:** PostgreSQL (`pg`), Drizzle ORM (`drizzle-orm`), `drizzle-zod`, `drizzle-kit`
- **Logging:** Pino (`pino`) + `@hono/structured-logger`
- **Linter & Formatter:** Biome (`@biomejs/biome`)
- **Language:** TypeScript (strict mode, bundler module resolution)

## Project Structure

```text
hono-boilerplate/
├── .env.example
├── biome.json
├── drizzle.config.ts
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                  # Server entrypoint, DB check, graceful shutdown
│   ├── app.ts                    # createApp() factory (middlewares, routes, OpenAPI, error handlers)
│   ├── config/
│   │   └── env.ts                # Zod-validated environment variables
│   ├── db/
│   │   ├── index.ts              # Drizzle client instance & connection helpers
│   │   ├── columns.ts            # Reusable column helpers (e.g. timestamps)
│   │   └── schema.ts             # Centralized Drizzle pgTable definitions
│   ├── lib/
│   │   ├── create-router.ts      # OpenAPIHono factory, AppEnv & AppRouteHandler types
│   │   ├── logger.ts             # Root Pino logger
│   │   ├── openapi.ts            # OpenAPI helpers (jsonContent, errorResponses, configureOpenAPI)
│   │   ├── response.ts           # Standard & paginated JSON response helpers
│   │   └── schemas.ts            # Shared Zod schemas (IdParam, PaginationQuery, ApiResponse, ApiError)
│   ├── middlewares/
│   │   ├── error.middleware.ts   # Global onError and notFound handlers
│   │   └── logger.middleware.ts  # Request structured logger middleware
│   └── modules/
│       └── <name>/
│           ├── <name>.controller.ts  # Typed AppRouteHandler HTTP controllers
│           ├── <name>.schema.ts      # Zod & OpenAPI schemas derived via drizzle-zod
│           ├── <name>.service.ts     # Database queries & business logic
│           └── <name>.routes.ts      # createRoute definitions & exported module router
└── test/
    ├── app.test.ts               # Core application, health, OpenAPI & middleware tests
    └── <name>.e2e.ts             # End-to-end route tests per feature module
```

## Rules & Conventions

- **Always use the `ponytail` skill:** Operate in lazy senior developer mode by default. Implement the smallest complete change that solves the task, never add unrequested abstractions, wrappers, options, or speculative boilerplate, reuse existing codebase helpers before writing new ones, and end every reply with 1–2 lines stating what was skipped/unchecked and any risks.
- **Path alias:** Always use the `@/` alias (mapped to `./src/*`) when importing across directories in `src/` and `test/`. Use relative imports (`./*`) only for sibling files inside the same folder.
- **Database tables:** Define all Drizzle `pgTable` schemas and inferred row types (`$inferSelect`, `$inferInsert`) centrally in `src/db/schema.ts`. Spread `timestamps` from `@/db/columns` for standard `created_at` and `updated_at` columns.
- **Module schemas (`<name>.schema.ts`):** Import the `z` instance from `@hono/zod-openapi` and derive select/insert schemas from `src/db/schema.ts` tables using `createSchemaFactory({ zodInstance: z })` from `drizzle-zod`. Attach `.openapi()` metadata to schemas.
- **Module services (`<name>.service.ts`):** Keep all Drizzle queries (`db.select`, `db.insert`, `db.update`, `db.delete`) inside `<name>.service.ts` and decoupled from HTTP context.
- **Module controllers (`<name>.controller.ts`):** Type every handler with `AppRouteHandler<RouteType>` from `@/lib/create-router`. Use `c.req.valid(...)` for validated inputs and return responses via `successResponse`, `paginatedResponse`, or `errorResponse` from `@/lib/response`.
- **Module routes (`<name>.routes.ts`):** Define OpenAPI routes with `createRoute` from `@hono/zod-openapi` using `jsonContent`, `jsonContentRequired`, and `errorResponses` from `@/lib/openapi`. Export both route types (`typeof route`) and the wired router (`createRouter().openapi(route, controller.handler)`), then mount it in `src/app.ts`.
- **Code style & types:** Enforce strict TypeScript (`noEmit`, `verbatimModuleSyntax` — always use `import type` for type-only imports). Format and lint with Biome (`2` spaces, `100` line width, double quotes, `asNeeded` semicolons). Never use `any`.

## Commands

- `bun run dev` — Start development server with hot reload (`src/index.ts`).
- `bun run lint` — Check formatting and lint rules via Biome (`biome check .`).
- `bun run check` — Auto-fix lint and formatting issues (`biome check --write .`).
- `bun run format` — Format files with Biome (`biome format --write .`).
- `bun run typecheck` — Run TypeScript compiler check (`tsc --noEmit`).
- `bun run db:generate` — Generate Drizzle SQL migrations.
- `bun run db:migrate` — Apply pending Drizzle migrations.
- `bun run db:push` — Push schema directly to PostgreSQL (development).
- `bun run db:studio` — Launch Drizzle Studio.
- `bun test` — Run all unit and E2E tests in `test/`.

## Testing

- Instantiate the app via `createApp()` from `@/app` and test HTTP routes using `app.request(...)` without starting a network server.
- Keep core app, middleware, OpenAPI spec, and health checks in `test/app.test.ts`.
- Place feature module route and validation tests in `test/<name>.e2e.ts` (run with `bun test ./test/<name>.e2e.ts`, as bare `bun test` only auto-discovers `*.test.ts` and `*.spec.ts`).
- Run `bun run typecheck`, `bun run lint`, and `bun test` after making changes.
