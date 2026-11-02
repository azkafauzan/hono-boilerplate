# Hono Boilerplate

Boilerplate backend modern, ringan, dan cepat berbasis **Hono**, **Bun**, dan **Drizzle ORM (PostgreSQL)** dengan arsitektur **feature-based modules**, dokumentasi otomatis **Swagger UI / OpenAPI**, schema Zod yang diturunkan langsung dari tabel Drizzle (**drizzle-zod**), linter/formatter **Biome**, dan structured logging dengan **Pino**.

---

## Tech Stack

- **Runtime:** [Bun](https://bun.sh/)
- **Framework:** [Hono v4](https://hono.dev/)
- **Database & ORM:** [Drizzle ORM](https://orm.drizzle.team/) + PostgreSQL
- **Validation & OpenAPI:** [Zod](https://zod.dev/) + [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi) + [drizzle-zod](https://orm.drizzle.team/docs/zod)
- **API Documentation:** [@hono/swagger-ui](https://github.com/honojs/middleware/tree/main/packages/swagger-ui)
- **Logging & Tracing:** [Pino](https://getpino.io/) + [@hono/structured-logger](https://github.com/honojs/middleware/tree/main/packages/structured-logger) + `hono/request-id`
- **Linter & Formatter:** [Biome](https://biomejs.dev/)
- **Testing:** Bun built-in test runner (`bun:test`)

---

## Struktur Direktori

```text
hono-boilerplate/
├── .env.example
├── biome.json
├── drizzle.config.ts
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                  # Bootstrap: cek DB → Bun.serve → graceful shutdown
│   ├── app.ts                    # createApp(): middleware, mount modules, docs, error handler (tanpa side effect)
│   ├── config/
│   │   └── env.ts                # Type-safe environment variables via Zod
│   ├── db/
│   │   ├── index.ts              # Drizzle client, pool error logging, verify/close helpers
│   │   ├── columns.ts            # Kolom reusable (timestamps)
│   │   └── schema.ts             # Barrel semua tabel module (dipakai drizzle-kit)
│   ├── lib/
│   │   ├── create-router.ts      # OpenAPIHono factory + AppEnv & AppRouteHandler types
│   │   ├── logger.ts             # Root Pino logger
│   │   ├── openapi.ts            # jsonContent helpers & konfigurasi /doc + /swagger
│   │   ├── response.ts           # Standard & paginated API response helpers
│   │   └── schemas.ts            # Reusable schemas (Pagination, ID param, ApiResponse, ApiError)
│   ├── middlewares/
│   │   ├── error.middleware.ts   # Global error & 404 handlers
│   │   └── logger.middleware.ts  # Structured request logger
│   └── modules/
│       ├── health/               # Health check (200 OK / 503 Degraded)
│       └── items/                # Contoh CRUD module
│           ├── index.ts          # Wiring router (route ↔ handler)
│           ├── items.table.ts    # Tabel Drizzle
│           ├── items.schema.ts   # Zod schema (diturunkan dari tabel via drizzle-zod)
│           ├── items.service.ts  # Akses data
│           ├── items.routes.ts   # Definisi route OpenAPI
│           └── items.handlers.ts # HTTP handlers
└── test/
    └── app.test.ts               # Unit & integration tests
```

### Menambah Module Baru

1. Salin folder `src/modules/items` menjadi `src/modules/<nama>` lalu sesuaikan isinya.
2. Daftarkan tabel baru di `src/db/schema.ts`:

   ```ts
   export * from "@/modules/<nama>/<nama>.table"
   ```
3. Mount router di `src/app.ts`:

   ```ts
   app.route("/<nama>", <nama>Router)
   ```
4. Jalankan `bun run db:generate` (atau `db:push` saat development).

---

## Panduan Memulai (Getting Started)

### 1. Instalasi Dependensi

```sh
bun install
```

### 2. Atur Environment Variables

Salin file `.env.example` ke `.env`:
```sh
cp .env.example .env
```
Sesuaikan `DATABASE_URL` dengan konfigurasi PostgreSQL Anda.

### 3. Database Migration

```sh
# Generate migrasi dari schema Drizzle
bun run db:generate

# Terapkan migrasi ke database
bun run db:migrate

# Atau langsung sinkronkan schema (development)
bun run db:push

# Buka Drizzle Studio di browser
bun run db:studio
```

### 4. Jalankan Server

```sh
bun run dev
```

Server akan aktif di `http://localhost:3000`.

---

## API Documentation (Swagger)

Setelah server berjalan, buka browser dan akses:
- **Interactive Swagger UI:** `http://localhost:3000/swagger`
- **OpenAPI JSON Spec:** `http://localhost:3000/doc`

---

## Testing & Code Quality

```sh
# Menjalankan unit tests (log otomatis silent saat NODE_ENV=test)
bun test

# Cek lint & format tanpa mengubah file (cocok untuk CI)
bun run lint

# Lint + auto-fix
bun run check

# Type check
bun run typecheck

# Menjalankan auto-formatting kode
bun run format
```
