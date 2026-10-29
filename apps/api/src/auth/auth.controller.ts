import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import {
  changePasswordSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  oauthLoginSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  updateProfileSchema,
  verifyEmailSchema,
} from '@frameforge/shared';
import { getServerEnv } from '@frameforge/shared/server';
import {
  CurrentAuth,
  CurrentUser,
  Public,
  RateLimit,
  type AuthContext,
  type RequestWithAuth,
} from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SESSION_COOKIE } from '../common/session-auth.guard';
import { ApiZodBody } from '../common/api-zod.decorator';
import { AuthService, type SessionBundle } from './auth.service';

const OAUTH_PROVIDERS = ['google', 'apple'] as const;

type CookieReply = FastifyReply & {
  setCookie: (name: string, value: string, options?: Record<string, unknown>) => unknown;
  clearCookie: (name: string, options?: Record<string, unknown>) => unknown;
};

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly env = getServerEnv();
  constructor(private readonly auth: AuthService) {}

  private meta(req: RequestWithAuth) {
    return { ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  private setSessionCookie(reply: CookieReply, bundle: SessionBundle): void {
    reply.setCookie(SESSION_COOKIE, bundle.token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: this.env.NODE_ENV === 'production',
      maxAge: Math.max(0, Math.floor((bundle.expiresAt.getTime() - Date.now()) / 1000)),
    });
  }

  @Public()
  @RateLimit({ limit: 5, windowSeconds: 600 })
  @Post('sign-up')
  @ApiOperation({ summary: 'Create an account and a starter workspace' })
  @ApiZodBody(signUpSchema, 'SignUp')
  async signUp(
    @Body(new ZodValidationPipe(signUpSchema)) body: any,
    @Req() req: RequestWithAuth,
    @Res({ passthrough: true }) reply: CookieReply,
  ) {
    const bundle = await this.auth.signUp({ ...body, ...this.meta(req) });
    this.setSessionCookie(reply, bundle);
    return bundle.response;
  }

  @Public()
  @RateLimit({ limit: 10, windowSeconds: 300 })
  @HttpCode(HttpStatus.OK)
  @Post('sign-in')
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiZodBody(signInSchema, 'SignIn')
  async signIn(
    @Body(new ZodValidationPipe(signInSchema)) body: any,
    @Req() req: RequestWithAuth,
    @Res({ passthrough: true }) reply: CookieReply,
  ) {
    const bundle = await this.auth.signIn({ ...body, ...this.meta(req) });
    this.setSessionCookie(reply, bundle);
    return bundle.response;
  }

  @Public()
  @RateLimit({ limit: 10, windowSeconds: 300 })
  @HttpCode(HttpStatus.OK)
  @Post('oauth/:provider')
  @ApiOperation({ summary: 'Sign in with Google or Apple' })
  @ApiZodBody(oauthLoginSchema, 'OAuthLogin')
  async oauthLogin(
    @Param('provider') provider: string,
    @Body(new ZodValidationPipe(oauthLoginSchema)) body: { idToken: string },
    @Req() req: RequestWithAuth,
    @Res({ passthrough: true }) reply: CookieReply,
  ) {
    if (!OAUTH_PROVIDERS.includes(provider as (typeof OAUTH_PROVIDERS)[number])) {
      throw new BadRequestException({ code: 'UNSUPPORTED_PROVIDER', message: 'Unsupported OAuth provider' });
    }
    const bundle = await this.auth.oauthLogin(provider, body.idToken, this.meta(req));
    this.setSessionCookie(reply, bundle);
    return bundle.response;
  }

  @HttpCode(HttpStatus.OK)
  @Post('sign-out')
  @ApiOperation({ summary: 'Revoke the current session' })
  async signOut(
    @CurrentAuth() auth: AuthContext,
    @Res({ passthrough: true }) reply: CookieReply,
  ) {
    await this.auth.signOut(auth.sessionId);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { signedOut: true };
  }

  @Get('session')
  @ApiOperation({ summary: 'Get the current user, workspaces and session' })
  async session(@CurrentAuth() auth: AuthContext) {
    return this.auth.buildSessionResponse(auth.user.id, auth.sessionId);
  }

  @Public()
  @RateLimit({ limit: 10, windowSeconds: 300 })
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  @ApiZodBody(verifyEmailSchema, 'VerifyEmail')
  async verifyEmail(@Body(new ZodValidationPipe(verifyEmailSchema)) body: { token: string }) {
    return this.auth.verifyEmail(body.token);
  }

  @Public()
  @RateLimit({ limit: 3, windowSeconds: 600 })
  @HttpCode(HttpStatus.OK)
  @Post('resend-verification')
  @ApiZodBody(resendVerificationSchema, 'ResendVerification')
  async resendVerification(@Body(new ZodValidationPipe(resendVerificationSchema)) body: { email: string }) {
    await this.auth.resendVerification(body.email);
    return { sent: true };
  }

  @Public()
  @RateLimit({ limit: 5, windowSeconds: 900 })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ApiZodBody(forgotPasswordSchema, 'ForgotPassword')
  async forgotPassword(@Body(new ZodValidationPipe(forgotPasswordSchema)) body: { email: string }) {
    await this.auth.forgotPassword(body.email);
    return { sent: true };
  }

  @Public()
  @RateLimit({ limit: 5, windowSeconds: 900 })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiZodBody(resetPasswordSchema, 'ResetPassword')
  async resetPassword(@Body(new ZodValidationPipe(resetPasswordSchema)) body: { token: string; password: string }) {
    await this.auth.resetPassword(body.token, body.password);
    return { reset: true };
  }

  @Patch('profile')
  @ApiZodBody(updateProfileSchema, 'UpdateProfile')
  async updateProfile(@CurrentUser() user: any, @Body(new ZodValidationPipe(updateProfileSchema)) body: any) {
    await this.auth.updateProfile(user.id, body);
    return { updated: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  @ApiZodBody(changePasswordSchema, 'ChangePassword')
  async changePassword(@CurrentUser() user: any, @Body(new ZodValidationPipe(changePasswordSchema)) body: any) {
    await this.auth.changePassword(user.id, body.currentPassword, body.newPassword);
    return { changed: true };
  }

  @Get('sessions')
  async sessions(@CurrentUser() user: any) {
    return this.auth.listSessions(user.id);
  }

  @Delete('sessions/:sessionId')
  async revokeSession(@CurrentUser() user: any, @Param('sessionId') sessionId: string) {
    await this.auth.revokeSession(user.id, sessionId);
    return { revoked: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post('sessions/revoke-others')
  async revokeOtherSessions(@CurrentAuth() auth: AuthContext) {
    await this.auth.revokeOtherSessions(auth.user.id, auth.sessionId);
    return { revoked: true };
  }

  @Get('audit-logs')
  async auditLogs(@CurrentAuth() auth: AuthContext) {
    return this.auth.listAuditLogs((auth as any).workspaceId ?? '');
  }
}

@ApiTags('Account')
@Controller('account')
export class AccountController {
  constructor(private readonly auth: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('delete')
  @ApiZodBody(deleteAccountSchema, 'DeleteAccount')
  async deleteAccount(@CurrentUser() user: any, @Body(new ZodValidationPipe(deleteAccountSchema)) body: any) {
    await this.auth.deleteAccount(user.id);
    return { deleted: true };
  }
}
