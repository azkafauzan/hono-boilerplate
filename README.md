# Hono Boilerplate

Boilerplate REST API dengan **Hono** dan **Bun** yang mengadopsi arsitektur modular ala **NestJS** (Controller, Service, Repository, Module, Guard, Interceptor, Exception Filter, dan DTO validation)—namun tetap ringan, type-safe penuh, dan tanpa decorator maupun `reflect-metadata`.

## Tech Stack

| Kebutuhan                | Library / Tool                                       |
| ------------------------ | ---------------------------------------------------- |
| Runtime & Test Runner    | [Bun](https://bun.sh/) (`bun run`, `bun test`)       |
| HTTP Framework & OpenAPI | `hono`, `@hono/zod-openapi`, `@hono/swagger-ui`      |
| Validasi & Schema        | `zod` (v4), `drizzle-zod`                            |
| Database & ORM           | PostgreSQL (`pg`), `drizzle-orm`, `drizzle-kit`      |
| Logging                  | `pino`, `@hono/structured-logger`, `hono/request-id` |
| Linter & Formatter       | `@biomejs/biome`                                     |

## Struktur Folder

```text
├── src/
│   ├── index.ts                  # Entrypoint aplikasi (menjalankan server via Bun)
│   ├── app.module.ts             # Root module: middleware global, filter error, Swagger, dan mount fitur
│   ├── config/
│   │   ├── env.ts                # Validasi variabel environment saat startup dengan Zod
│   │   └── logger.ts             # Konfigurasi logger Pino
│   ├── db/
│   │   ├── index.ts              # Koneksi PostgreSQL + Drizzle (lazy pool)
│   │   ├── schema.ts             # Kumpulan export semua tabel Drizzle dari tiap modul
│   │   └── zod.ts                # Helper drizzle-zod agar terhubung ke OpenAPI
│   ├── common/
│   │   ├── router.ts             # Pembuat router OpenAPIHono + format error validasi global
│   │   ├── types.ts              # Tipe shared Context (requestId, logger, authToken)
│   │   ├── dto/                  # Schema OpenAPI bersama (misal format error standar)
│   │   ├── exceptions/           # Class error HTTP ala NestJS (NotFoundException, ConflictException, dll.)
│   │   ├── filters/              # Global error & 404 handler agar format JSON selalu konsisten
│   │   ├── guards/               # Middleware autentikasi/otorisasi (contoh: BearerAuthGuard)
│   │   └── interceptors/         # Logging request/response otomatis per requestId
│   └── modules/
│       ├── health/               # Contoh modul sederhana tanpa database (GET /health)
│       └── items/                # Contoh modul CRUD lengkap (id, name, createdAt, updatedAt)
└── test/
    ├── helper/                   # Helper test aplikasi & database (`createTestDb`, `cleanupTestDb`)
    ├── integration/              # Test per modul, service, config, dan guard (*.test.ts)
    └── e2e/                      # Test alur HTTP lengkap melalui createApp() (*.e2e.test.ts)
```

## Cara Menjalankan

1. **Install dependency:**

   ```sh
   bun install
   ```

2. **Siapkan environment variable:**

   Salin `.env.example` menjadi `.env`, lalu sesuaikan nilai `DATABASE_URL` jika ingin terhubung ke PostgreSQL:

   ```sh
   cp .env.example .env
   ```

3. **Sinkronkan schema database (opsional jika memakai fitur database):**

   ```sh
   bun run db:push
   ```

4. **Jalankan server development (hot reload):**

   ```sh
   bun run dev
   ```

5. **Buka dokumentasi API:**
   - Swagger UI: `http://localhost:3000/docs`
   - OpenAPI 3.1 JSON: `http://localhost:3000/doc`
   - Health check: `http://localhost:3000/health`

## Daftar Perintah (Scripts)

| Perintah                   | Kegunaan                                                      |
| -------------------------- | ------------------------------------------------------------- |
| `bun run dev`              | Menjalankan server development dengan hot reload              |
| `bun run start`            | Menjalankan server tanpa hot reload                           |
| `bun run typecheck`        | Mengecek tipe TypeScript secara ketat (`tsc --noEmit`)        |
| `bun run lint`             | Mengecek kerapian kode & aturan lint dengan Biome             |
| `bun run lint:fix`         | Merapikan format & perbaikan lint otomatis dengan Biome       |
| `bun test`                 | Menjalankan seluruh test (`integration` dan `e2e`)            |
| `bun run test:integration` | Menjalankan test di folder `test/integration` saja            |
| `bun run test:e2e`         | Menjalankan test di folder `test/e2e` saja                    |
| `bun run db:generate`      | Membuat file migrasi SQL dari perubahan schema Drizzle        |
| `bun run db:migrate`       | Menjalankan migrasi database                                  |
| `bun run db:push`          | Mendorong perubahan schema langsung ke database (development) |
| `bun run db:studio`        | Membuka Drizzle Studio untuk melihat isi database             |

## Alur Request & Arsitektur Modul

Setiap request HTTP melewati urutan yang terstruktur:

1. **Middleware & Interceptor**: `secureHeaders` → `cors` → `requestId` → `loggingInterceptor` (mencatat durasi dan status request dengan `pino`).
2. **Guard** _(opsional per route)_: Memeriksa hak akses/token sebelum handler dijalankan.
3. **Validation Pipe**: `@hono/zod-openapi` memvalidasi `param`, `query`, `header`, dan `json` body otomatis. Jika tidak valid, `defaultHook` langsung mengembalikan error `400` dengan format JSON seragam.
4. **Controller (`*.controller.ts`)**: Hanya membaca input yang sudah tervalidasi, memanggil Service, dan mengembalikan response JSON.
5. **Service (`*.service.ts`)**: Berisi logika bisnis murni (tanpa menyentuh `Context` Hono) dan melempar semantic exception (`NotFoundException`, `ConflictException`, dll.) jika ada kesalahan bisnis.
6. **Repository (`*.repository.ts`)**: Mengelola query Drizzle di balik interface. Saat `bun test` dijalankan, test langsung terhubung ke PostgreSQL dan data uji otomatis dibersihkan kembali setelah tiap test lewat `cleanupTestDb` di `test/helper/db.ts`.
7. **Exception Filter**: `app.onError` dan `app.notFound` menangkap semua error (HTTPException, ZodError, maupun error kode PostgreSQL seperti `23505` duplicate key) menjadi format JSON konsisten:

   ```json
   {
     "statusCode": 400,
     "error": "Bad Request",
     "message": "Validation failed",
     "requestId": "...",
     "details": [{ "path": "name", "message": "Too small: expected string to have >=1 characters" }]
   }
   ```

## Cara Menambah Modul Fitur Baru

Misalkan ingin membuat modul `posts`:

1. Buat folder `src/modules/posts/` berisi:
   - `posts.entity.ts` (jika butuh tabel PostgreSQL, lalu re-export di `src/db/schema.ts`)
   - `posts.dto.ts` (schema request/response dengan `z` dari `@hono/zod-openapi` dan `@/db/zod`)
   - `posts.repository.ts` (interface + implementasi Drizzle)
   - `posts.service.ts` (logika bisnis dengan dependency injection lewat constructor)
   - `posts.controller.ts` (definisi route `createRoute` + `createRouter()` dari `@/common/router`)
   - `posts.module.ts` (merakit repository, service, dan controller)
2. Gunakan import alias `@/` (mengarah ke `src/`, misalnya `@/common/router`) untuk import lintas folder di `src/` maupun `test/`.
3. Daftarkan modul di `src/app.module.ts` dengan `.route("/api/v1/posts", postsModule)`.
4. Tambahkan test modulnya di `test/integration/posts.test.ts` dan test alur HTTP lengkapnya di `test/e2e/posts.e2e.test.ts`.
5. Jalankan `bun run typecheck`, `bun run lint`, dan `bun test` untuk memastikan semuanya aman.
