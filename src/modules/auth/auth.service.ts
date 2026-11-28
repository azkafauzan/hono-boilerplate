import { isAPIError } from "better-auth/api"
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@/common/exceptions/http.exception"
import type { UserEntity } from "@/modules/users/users.entity"
import type { UsersService } from "@/modules/users/users.service"
import type { AuthInstance, AuthSession } from "./auth.config"
import type { ResetPasswordDto, SignInDto, SignUpDto } from "./auth.dto"

function mapBetterAuthError(err: unknown): never {
  if (isAPIError(err)) {
    const message = err.body?.message ?? err.message
    switch (err.statusCode) {
      case 400:
        throw new BadRequestException(message, { cause: err })
      case 401:
        throw new UnauthorizedException(message, { cause: err })
      case 403:
        throw new ForbiddenException(message, { cause: err })
      case 404:
        throw new NotFoundException(message, { cause: err })
      case 409:
      case 422:
        throw new ConflictException(message, { cause: err })
    }
  }
  throw err
}

export class AuthService {
  constructor(
    private readonly auth: Pick<AuthInstance, "api">,
    private readonly usersService: UsersService,
  ) {}

  async signup(
    dto: SignUpDto,
    headers: Headers,
  ): Promise<{ user: UserEntity; setCookies: string[] }> {
    const user = await this.usersService.create(dto)
    try {
      const { headers: resHeaders } = await this.auth.api.signInEmail({
        returnHeaders: true,
        headers,
        body: {
          email: user.email,
          password: dto.password,
        },
      })
      return { user, setCookies: resHeaders.getSetCookie() }
    } catch (err) {
      mapBetterAuthError(err)
    }
  }

  async signin(
    dto: SignInDto,
    headers: Headers,
  ): Promise<{ user: UserEntity; setCookies: string[] }> {
    try {
      const { headers: resHeaders, response } = await this.auth.api.signInEmail({
        returnHeaders: true,
        headers,
        body: {
          email: dto.email,
          password: dto.password,
          rememberMe: dto.rememberMe,
        },
      })
      const user = await this.usersService.findById(Number(response.user.id))
      return { user, setCookies: resHeaders.getSetCookie() }
    } catch (err) {
      mapBetterAuthError(err)
    }
  }

  async signout(headers: Headers): Promise<{ setCookies: string[] }> {
    try {
      const { headers: resHeaders } = await this.auth.api.signOut({
        returnHeaders: true,
        headers,
      })
      return { setCookies: resHeaders.getSetCookie() }
    } catch (err) {
      mapBetterAuthError(err)
    }
  }

  async getMe(
    userId: number,
    session: AuthSession,
  ): Promise<{ user: UserEntity; session: AuthSession }> {
    const user = await this.usersService.findById(userId)
    return { user, session }
  }

  async resetPassword(dto: ResetPasswordDto, headers: Headers): Promise<{ setCookies: string[] }> {
    try {
      const { headers: resHeaders } = await this.auth.api.changePassword({
        returnHeaders: true,
        headers,
        body: {
          currentPassword: dto.currentPassword,
          newPassword: dto.newPassword,
          revokeOtherSessions: dto.revokeOtherSessions,
        },
      })
      return { setCookies: resHeaders.getSetCookie() }
    } catch (err) {
      mapBetterAuthError(err)
    }
  }
}
