import { describe, expect, it } from "bun:test"
import { createHealthModule } from "@/modules/health/health.module"
import { HealthService } from "@/modules/health/health.service"

describe("HealthModule", () => {
  it("returns ok payload from HealthService", () => {
    const service = new HealthService()
    const result = service.check()

    expect(result.status).toBe("ok")
    expect(result.uptime).toBeGreaterThanOrEqual(0)
    expect(Date.parse(result.timestamp)).not.toBeNaN()
  })

  it("responds 200 on GET /", async () => {
    const healthModule = createHealthModule()
    const res = await healthModule.request("/")

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      status: string
      uptime: number
      timestamp: string
    }
    expect(body.status).toBe("ok")
    expect(typeof body.uptime).toBe("number")
  })
})
