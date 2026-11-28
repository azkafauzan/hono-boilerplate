import { describe, expect, it } from "bun:test"
import { parseEnv } from "@/config/env"
import { createTestApp } from "../helper/create-test-app"

describe("App E2E", () => {
  it("responds 200 on GET /health", async () => {
    const app = createTestApp()

    const res = await app.request("/health")
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; uptime: number; timestamp: string }
    expect(body.status).toBe("ok")
  })

  it("serves OpenAPI 3.1 document at /doc and Swagger UI at /docs", async () => {
    const app = createTestApp()

    const docRes = await app.request("/doc")
    expect(docRes.status).toBe(200)
    const doc = (await docRes.json()) as {
      openapi: string
      paths: Record<string, unknown>
      components?: { securitySchemes?: Record<string, unknown> }
    }
    expect(doc.openapi).toBe("3.1.0")
    expect(doc.paths["/health"]).toBeDefined()
    expect(doc.paths["/api/v1/auth/signup"]).toBeDefined()
    expect(doc.paths["/api/v1/auth/signin"]).toBeDefined()
    expect(doc.paths["/api/v1/auth/signout"]).toBeDefined()
    expect(doc.paths["/api/v1/auth/me"]).toBeDefined()
    expect(doc.paths["/api/v1/auth/reset-password"]).toBeDefined()
    expect(doc.paths["/api/v1/users/me"]).toBeDefined()
    expect(doc.paths["/api/v1/users/{id}"]).toBeDefined()
    expect(doc.paths["/api/v1/items"]).toBeDefined()
    expect(doc.components?.securitySchemes?.CookieAuth).toBeDefined()

    const docsRes = await app.request("/docs")
    expect(docsRes.status).toBe(200)
    expect(await docsRes.text()).toContain("swagger-ui")
  })

  it("returns standardized 404 JSON and X-Request-Id header for unknown routes", async () => {
    const app = createTestApp()

    const res = await app.request("/does-not-exist")
    expect(res.status).toBe(404)
    expect(res.headers.get("x-request-id")).toBeTruthy()

    const body = (await res.json()) as {
      statusCode: number
      error: string
      requestId?: string
    }
    expect(body.statusCode).toBe(404)
    expect(body.error).toBe("Not Found")
    expect(body.requestId).toBeTruthy()
  })

  it("allows any origin when CORS_ORIGIN is *", async () => {
    const app = createTestApp({
      env: parseEnv({ NODE_ENV: "test", CORS_ORIGIN: "*" }),
    })

    const getRes = await app.request("/health", {
      headers: { Origin: "https://any.example.com" },
    })
    expect(getRes.status).toBe(200)
    expect(getRes.headers.get("access-control-allow-origin")).toBe("*")
    expect(getRes.headers.get("access-control-allow-credentials")).toBeNull()

    const preflightRes = await app.request("/api/v1/items", {
      method: "OPTIONS",
      headers: {
        Origin: "https://any.example.com",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Authorization, Content-Type",
      },
    })
    expect(preflightRes.status).toBe(204)
    expect(preflightRes.headers.get("access-control-allow-origin")).toBe("*")
    expect(preflightRes.headers.get("access-control-allow-methods")).toContain("POST")
    expect(preflightRes.headers.get("access-control-allow-headers")).toBe(
      "Authorization,Content-Type",
    )
  })

  it("enforces configured CORS_ORIGIN allowlist and preserves headers on errors", async () => {
    const app = createTestApp({
      env: parseEnv({
        NODE_ENV: "test",
        CORS_ORIGIN: "http://localhost:5173, https://app.example.com",
      }),
    })

    const allowedRes = await app.request("/health", {
      headers: { Origin: "https://app.example.com" },
    })
    expect(allowedRes.status).toBe(200)
    expect(allowedRes.headers.get("access-control-allow-origin")).toBe("https://app.example.com")
    expect(allowedRes.headers.get("access-control-allow-credentials")).toBe("true")
    expect(allowedRes.headers.get("vary")).toContain("Origin")

    const preflightRes = await app.request("/api/v1/items", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "PATCH",
        "Access-Control-Request-Headers": "Authorization",
      },
    })
    expect(preflightRes.status).toBe(204)
    expect(preflightRes.headers.get("access-control-allow-origin")).toBe("http://localhost:5173")
    expect(preflightRes.headers.get("access-control-allow-headers")).toBe("Authorization")
    expect(preflightRes.headers.get("vary")).toContain("Origin")

    const disallowedRes = await app.request("/health", {
      headers: { Origin: "https://evil.example.com" },
    })
    expect(disallowedRes.status).toBe(200)
    expect(disallowedRes.headers.get("access-control-allow-origin")).toBeNull()
    expect(disallowedRes.headers.get("vary")).toContain("Origin")

    const notFoundRes = await app.request("/does-not-exist", {
      headers: { Origin: "https://app.example.com" },
    })
    expect(notFoundRes.status).toBe(404)
    expect(notFoundRes.headers.get("access-control-allow-origin")).toBe("https://app.example.com")
    expect(notFoundRes.headers.get("vary")).toContain("Origin")
  })
})
