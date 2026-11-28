import { createRoute } from "@hono/zod-openapi"
import type { Context, MiddlewareHandler } from "hono"
import { ErrorResponseSchema } from "@/common/dto/error.dto"
import { UnauthorizedException } from "@/common/exceptions/http.exception"
import { createRouter } from "@/common/router"
import type { AppEnv } from "@/common/types"
import { toUserResponse } from "@/modules/users/users.dto"
import {
  AuthMeResponseSchema,
  AuthMessageResponseSchema,
  AuthResponseSchema,
  ResetPasswordDtoSchema,
  SignInDtoSchema,
  SignUpDtoSchema,
} from "./auth.dto"
import type { AuthService } from "./auth.service"

function appendSetCookies(c: Context<AppEnv>, setCookies: string[]) {
  for (const cookie of setCookies) {
    c.header("Set-Cookie", cookie, { append: true })
  }
}

const signUpRoute = createRoute({
  method: "post",
  path: "/signup",
  tags: ["Auth"],
  summary: "Register a new user and issue a session cookie",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: SignUpDtoSchema } },
    },
  },
  responses: {
    201: {
      description: "User registered and signed in",
      content: { "application/json": { schema: AuthResponseSchema } },
    },
    400: {
      description: "Validation failed",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    409: {
      description: "Email already registered",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const signInRoute = createRoute({
  method: "post",
  path: "/signin",
  tags: ["Auth"],
  summary: "Sign in with email and password",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: SignInDtoSchema } },
    },
  },
  responses: {
    200: {
      description: "Signed in successfully",
      content: { "application/json": { schema: AuthResponseSchema } },
    },
    400: {
      description: "Validation failed",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Invalid email or password",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const signOutRoute = createRoute({
  method: "post",
  path: "/signout",
  tags: ["Auth"],
  summary: "Sign out and revoke the current session cookie",
  security: [{ CookieAuth: [] }],
  responses: {
    200: {
      description: "Signed out successfully",
      content: { "application/json": { schema: AuthMessageResponseSchema } },
    },
    401: {
      description: "Authentication required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const meRoute = createRoute({
  method: "get",
  path: "/me",
  tags: ["Auth"],
  summary: "Get the current authenticated user and session",
  security: [{ CookieAuth: [] }],
  responses: {
    200: {
      description: "Active user and session",
      content: { "application/json": { schema: AuthMeResponseSchema } },
    },
    401: {
      description: "Authentication required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const resetPasswordRoute = createRoute({
  method: "post",
  path: "/reset-password",
  tags: ["Auth"],
  summary: "Change password for the currently signed-in user",
  security: [{ CookieAuth: [] }],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: ResetPasswordDtoSchema } },
    },
  },
  responses: {
    200: {
      description: "Password updated successfully",
      content: { "application/json": { schema: AuthMessageResponseSchema } },
    },
    400: {
      description: "Validation failed or invalid current password",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Authentication required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

export function createAuthController(
  authService: AuthService,
  requireAuth: MiddlewareHandler<AppEnv>,
) {
  const router = createRouter()
  router.post("/signout", requireAuth)
  router.get("/me", requireAuth)
  router.post("/reset-password", requireAuth)

  return router
    .openapi(signUpRoute, async (c) => {
      const dto = c.req.valid("json")
      const { user, setCookies } = await authService.signup(dto, c.req.raw.headers)
      appendSetCookies(c, setCookies)
      return c.json({ user: toUserResponse(user) }, 201)
    })
    .openapi(signInRoute, async (c) => {
      const dto = c.req.valid("json")
      const { user, setCookies } = await authService.signin(dto, c.req.raw.headers)
      appendSetCookies(c, setCookies)
      return c.json({ user: toUserResponse(user) }, 200)
    })
    .openapi(signOutRoute, async (c) => {
      const { setCookies } = await authService.signout(c.req.raw.headers)
      appendSetCookies(c, setCookies)
      return c.json({ message: "Signed out successfully" }, 200)
    })
    .openapi(meRoute, async (c) => {
      const authUser = c.get("authUser")
      const authSession = c.get("authSession")
      if (!authUser || !authSession) {
        throw new UnauthorizedException("Authentication required")
      }
      const { user, session } = await authService.getMe(authUser.id, authSession)
      return c.json(
        {
          user: toUserResponse(user),
          session: {
            id: session.id,
            expiresAt: session.expiresAt.toISOString(),
          },
        },
        200,
      )
    })
    .openapi(resetPasswordRoute, async (c) => {
      const dto = c.req.valid("json")
      const { setCookies } = await authService.resetPassword(dto, c.req.raw.headers)
      appendSetCookies(c, setCookies)
      return c.json({ message: "Password updated successfully" }, 200)
    })
}
