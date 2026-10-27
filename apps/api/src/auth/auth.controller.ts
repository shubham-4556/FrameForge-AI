import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SessionAuthGuard } from '../common/guards/session-auth.guard';
import { ApiAuth, ApiResponseEnvelope } from '../common/decorators/swagger.decorator';
import { SkipCsrf } from '../common/decorators/skip-csrf.decorator';

const SESSION_COOKIE = 'ff_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 * 1000;

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @SkipCsrf()
  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body() dto: SignUpDto, @Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.authService.signUp(dto, {
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip,
      userAgent: req.headers['user-agent'] ?? undefined,
    });
    reply.setCookie(SESSION_COOKIE, result.session.token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: Math.floor(COOKIE_MAX_AGE / 1000),
    });
    return { user: result.user, session: { expiresAt: result.session.expiresAt } };
  }

  @Public()
  @SkipCsrf()
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() dto: SignInDto, @Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.authService.signIn(dto, {
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip,
      userAgent: req.headers['user-agent'] ?? undefined,
    });
    reply.setCookie(SESSION_COOKIE, result.session.token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: Math.floor(COOKIE_MAX_AGE / 1000),
    });
    return { user: result.user, session: { expiresAt: result.session.expiresAt } };
  }

  @Public()
  @SkipCsrf()
  @Post('oauth/google')
  @HttpCode(HttpStatus.OK)
  async googleAuth(@Body() body: { idToken: string }, @Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.authService.oauthLogin('google', body.idToken, {
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip,
      userAgent: req.headers['user-agent'] ?? undefined,
    });
    reply.setCookie(SESSION_COOKIE, result.session.token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: Math.floor(COOKIE_MAX_AGE / 1000),
    });
    return { user: result.user, session: { expiresAt: result.session.expiresAt } };
  }

  @Public()
  @SkipCsrf()
  @Post('oauth/apple')
  @HttpCode(HttpStatus.OK)
  async appleAuth(@Body() body: { idToken: string }, @Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.authService.oauthLogin('apple', body.idToken, {
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip,
      userAgent: req.headers['user-agent'] ?? undefined,
    });
    reply.setCookie(SESSION_COOKIE, result.session.token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: Math.floor(COOKIE_MAX_AGE / 1000),
    });
    return { user: result.user, session: { expiresAt: result.session.expiresAt } };
  }

  @UseGuards(SessionAuthGuard)
  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  async signOut(@CurrentUser('sessionId') sessionId: string, @Res({ passthrough: true }) reply: FastifyReply) {
    await this.authService.signOut(sessionId);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
  }

  @UseGuards(SessionAuthGuard)
  @Get('session')
  @ApiAuth()
  @ApiResponseEnvelope()
  async session(@CurrentUser('user') user: unknown) {
    return user;
  }
}
