import { createRouter } from "@/lib/create-router"
import * as handlers from "./items.handlers"
import * as routes from "./items.routes"

export const itemsRouter = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.create, handlers.create)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove)
