import { createHealthController } from "./health.controller"
import { HealthService } from "./health.service"

export function createHealthModule() {
  const service = new HealthService()
  return createHealthController(service)
}
