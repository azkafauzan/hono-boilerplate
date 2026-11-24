import type { HealthResponse } from "./health.dto"

export class HealthService {
  check(): HealthResponse {
    return {
      status: "ok",
      uptime: Math.round(process.uptime() * 100) / 100,
      timestamp: new Date().toISOString(),
    }
  }
}
