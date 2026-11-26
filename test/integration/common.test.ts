import { describe, expect, it } from "bun:test"
import { createHttpExceptionFilter } from "@/common/filters/http-exception.filter"
import { createBearerAuthGuard } from "@/common/guards/bearer-auth.guard"
import { createRouter } from "@/common/router"
import { parseEnv } from "@/config/env"

describe("Common pipeline & config", () => {
  it("enforces bearer auth via createBearerAuthGuard", async () => {
    const router = createRouter()
    router.onError(createHttpExceptionFilter("test"))
    router.use(
      "/protected/*",
      createBearerAuthGuard((token) => token === "secret-token"),
    )
    router.get("/protected/ping", (c) => c.json({ ok: true, token: c.get("authToken") }))

    const missingRes = await router.request("/protected/ping")
    expect(missingRes.status).toBe(401)

    const invalidRes = await router.request("/protected/ping", {
      headers: { Authorization: "Bearer wrong" },
    })
    expect(invalidRes.status).toBe(401)

    const okRes = await router.request("/protected/ping", {
      headers: { Authorization: "Bearer secret-token" },
    })
    expect(okRes.status).toBe(200)
    expect(await okRes.json()).toEqual({ ok: true, token: "secret-token" })
  })

  it("requires DATABASE_URL in production env", () => {
    expect(() => parseEnv({ NODE_ENV: "production" })).toThrow("DATABASE_URL is required")
    const prod = parseEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgres://user:pass@db.example.com:5432/prod",
      CORS_ORIGIN: "https://app.example.com",
    })
    expect(prod.PORT).toBe(3000)
    expect(prod.DATABASE_URL).toBe("postgres://user:pass@db.example.com:5432/prod")
    expect(prod.CORS_ORIGIN).toBe("https://app.example.com")
  })

  it("validates and parses CORS_ORIGIN across environments", () => {
    expect(parseEnv({ NODE_ENV: "development" }).CORS_ORIGIN).toBe("*")
    expect(parseEnv({ NODE_ENV: "test" }).CORS_ORIGIN).toBe("*")

    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgres://user:pass@db.example.com:5432/prod",
      }),
    ).toThrow("CORS_ORIGIN is required in production")

    expect(
      parseEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgres://user:pass@db.example.com:5432/prod",
        CORS_ORIGIN: "*",
      }).CORS_ORIGIN,
    ).toBe("*")

    expect(parseEnv({ CORS_ORIGIN: "https://app.example.com/" }).CORS_ORIGIN).toBe(
      "https://app.example.com",
    )

    expect(
      parseEnv({
        CORS_ORIGIN: " http://localhost:5173 , https://app.example.com, http://localhost:5173 ",
      }).CORS_ORIGIN,
    ).toEqual(["http://localhost:5173", "https://app.example.com"])

    for (const invalid of [
      "",
      "   ",
      "*,https://app.example.com",
      "app.example.com",
      "https://app.example.com/api",
      "https://user:pass@app.example.com",
    ]) {
      expect(() => parseEnv({ CORS_ORIGIN: invalid })).toThrow("CORS_ORIGIN")
    }
  })
})
