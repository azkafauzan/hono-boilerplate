import { describe, expect, it } from "bun:test"
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
    }
    expect(doc.openapi).toBe("3.1.0")
    expect(doc.paths["/health"]).toBeDefined()
    expect(doc.paths["/api/v1/items"]).toBeDefined()

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
})
