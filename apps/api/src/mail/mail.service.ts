import { Inject, Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import type { ServerEnv } from '@frameforge/shared/server';
import { ENV } from '../config/env.module';

@Injectable()
export class MailService {
  private readonly logger = new Logger('Mail');
  private readonly transporter: Transporter | null;

  constructor(@Inject(ENV) private readonly env: ServerEnv) {
    if (env.MAIL_DRIVER === 'smtp' && env.SMTP_URL) {
      this.transporter = nodemailer.createTransport(env.SMTP_URL);
    } else {
      this.transporter = null;
    }
    if (env.NODE_ENV === 'production' && !this.transporter) {
      this.logger.warn(
        'MAIL_DRIVER=log in production: verification links will only be written to server logs.',
      );
    }
  }

  private async send(to: string, subject: string, text: string, actionUrl?: string): Promise<void> {
    if (this.transporter) {
      await this.transporter.sendMail({
        from: this.env.MAIL_FROM,
        to,
        subject,
        text,
        ...(actionUrl ? { html: `<p>${escapeHtml(text)}</p><p><a href="${actionUrl}">Continue</a></p>` } : {}),
      });
      return;
    }
    this.logger.log(`[email:${subject}] to=${to}${actionUrl ? ` link=${actionUrl}` : ''}\n${text}`);
  }

  async sendVerification(to: string, name: string, url: string): Promise<void> {
    await this.send(
      to,
      'Verify your FrameForge AI email',
      `Hi ${name}, confirm your email to secure your studio. This link expires in 24 hours.`,
      url,
    );
  }

  async sendPasswordReset(to: string, name: string, url: string): Promise<void> {
    await this.send(
      to,
      'Reset your FrameForge AI password',
      `Hi ${name}, use this link within one hour to reset your password. If you did not request this, ignore the email.`,
      url,
    );
  }

  async sendWorkspaceInvite(to: string, workspaceName: string, inviterName: string): Promise<void> {
    await this.send(
      to,
      `You were added to ${workspaceName} on FrameForge AI`,
      `${inviterName} added you to the ${workspaceName} workspace. Sign in to start collaborating.`,
      `${this.env.APP_URL}/sign-in`,
    );
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
