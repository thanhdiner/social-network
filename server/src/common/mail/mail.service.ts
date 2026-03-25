import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type SendMailOptions } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

interface EmailPayload {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

type MailSender = {
  sendMail: (
    options: SendMailOptions,
  ) => Promise<SMTPTransport.SentMessageInfo>;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: MailSender | null;
  private readonly fromAddress: string | null;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASS');

    if (user && pass) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const transporter = createTransport<SMTPTransport.SentMessageInfo>({
        service: 'gmail',
        auth: {
          user,
          pass,
        },
      });
      this.transporter = {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
        sendMail: (options: SendMailOptions) => transporter.sendMail(options),
      };
      this.fromAddress = user;
      this.enabled = true;
      this.logger.log('Mail service is configured using provided credentials.');
    } else {
      this.transporter = null;
      this.fromAddress = null;
      this.enabled = false;
      this.logger.warn(
        'MAIL_USER or MAIL_PASS is missing. Email sending is disabled.',
      );
    }
  }

  async sendEmail(payload: EmailPayload): Promise<void> {
    if (!this.transporter || !this.fromAddress) {
      this.logger.warn(`Email not sent to ${payload.to} (mailer disabled).`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });
      this.logger.log(`Email sent to ${payload.to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${payload.to}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const subject = 'Xac nhan thay doi email - Social Network';
    const text = `Xin chao,

Ma xac thuc cua ban la: ${token}

Neu ban khong yeu cau thay doi email, vui long bo qua thong bao nay.`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Xin chao!</h2>
        <p>Ma xac thuc de thay doi email cua ban la:</p>
        <p style="font-size: 20px; font-weight: bold; letter-spacing: 2px;">${token}</p>
        <p>Neu ban khong yeu cau thay doi email, hay bo qua email nay.</p>
        <p>Tran trong,<br/>Doi ngu Social Network</p>
      </div>
    `;

    await this.sendEmail({ to, subject, text, html });
  }

  async sendPasswordResetCode(to: string, code: string): Promise<void> {
    const subject = 'Ma dat lai mat khau - Social Network';
    const text = `Xin chao,

Ma dat lai mat khau cua ban la: ${code}

Ma nay se het han sau 1 gio. Neu ban khong yeu cau dat lai mat khau, vui long bo qua thong bao nay.`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Xin chao!</h2>
        <p>Ma dat lai mat khau cua ban la:</p>
        <p style="font-size: 20px; font-weight: bold; letter-spacing: 2px;">${code}</p>
        <p style="color: #666;">Ma nay se het han sau 1 gio.</p>
        <p>Neu ban khong yeu cau dat lai mat khau, hay bo qua email nay.</p>
        <p>Tran trong,<br/>Doi ngu Social Network</p>
      </div>
    `;

    await this.sendEmail({ to, subject, text, html });
  }

  async sendAdminTwoFactorCode(to: string, code: string): Promise<void> {
    const subject = 'Ma xac thuc 2 lop - Admin Social Network';
    const text = `Xin chao,

Ma xac thuc 2 lop cua ban la: ${code}

Ma nay se het han sau 5 phut.
Neu ban khong thuc hien dang nhap, vui long doi mat khau ngay lap tuc.`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>Dang nhap Admin - Xac thuc 2 lop</h2>
        <p>Ma xac thuc 2FA cua ban la:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #1d4ed8;">${code}</p>
        <p style="color: #6b7280;">Ma se het han sau 5 phut.</p>
        <p>Neu ban khong thuc hien dang nhap, vui long doi mat khau va lien he bo phan van hanh.</p>
      </div>
    `;

    await this.sendEmail({ to, subject, text, html });
  }

  async sendAdminPasswordReset(to: string, code: string): Promise<void> {
    const subject = 'Admin - Dat lai mat khau - Social Network';
    const text = `Xin chao,

Ma dat lai mat khau Admin cua ban la: ${code}

Ma nay se het han sau 15 phut.
Neu ban khong yeu cau dat lai mat khau, vui long bo qua email nay va lien he bo phan van hanh.`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 520px; margin: 0 auto;">
        <div style="background: #1e40af; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: #fff; margin: 0; font-size: 20px;">🔐 Admin — Đặt lại mật khẩu</h2>
        </div>
        <div style="background: #f8fafc; padding: 28px; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 8px 8px;">
          <p>Xin chào,</p>
          <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản Admin. Mã xác nhận của bạn là:</p>
          <div style="background: #fff; border: 2px dashed #1d4ed8; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1d4ed8;">${code}</span>
          </div>
          <p style="color: #ef4444; font-size: 13px;">⚠ Mã này sẽ hết hạn sau <strong>15 phút</strong>.</p>
          <p style="color: #6b7280; font-size: 13px;">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này và liên hệ đội vận hành ngay lập tức.</p>
        </div>
      </div>
    `;

    await this.sendEmail({ to, subject, text, html });
  }
}

