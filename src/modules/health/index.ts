import { createRouter } from "@/lib/create-router"
import * as handlers from "./health.handlers"
import * as routes from "./health.routes"

export const healthRouter = createRouter().openapi(routes.check, handlers.check)
