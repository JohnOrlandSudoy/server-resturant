import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = this.initializeTransporter();
  }

  private initializeTransporter(): boolean {
    try {
      // Check if email configuration is available
      const smtpHost = process.env['SMTP_HOST'];
      const smtpPort = process.env['SMTP_PORT'];
      const smtpUser = process.env['SMTP_USER'];
      const smtpPass = process.env['SMTP_PASS'];

      if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
        logger.warn('Email service not configured. SMTP settings missing.');
        return false;
      }

      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: smtpPort === '465', // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      logger.info('Email service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      return false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured || !this.transporter) {
      logger.warn('Email service not configured. Email not sent.');
      return {
        success: false,
        error: 'Email service not configured'
      };
    }

    try {
      const mailOptions = {
        from: `"Restaurant POS" <${process.env['SMTP_USER']}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html),
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully:', { messageId: result.messageId, to: options.to });
      
      return { success: true };
    } catch (error) {
      logger.error('Failed to send email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email'
      };
    }
  }

  async sendPasswordResetEmail(email: string, username: string, resetToken: string, resetUrl: string): Promise<{ success: boolean; error?: string }> {
    const subject = 'Reset Your Password - Restaurant POS';
    const html = this.generatePasswordResetEmailHtml(username, resetToken, resetUrl);
    
    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  async sendEmailVerificationEmail(email: string, username: string, verificationToken: string, verificationUrl: string): Promise<{ success: boolean; error?: string }> {
    const subject = 'Verify Your Email - Restaurant POS';
    const html = this.generateEmailVerificationHtml(username, verificationToken, verificationUrl);
    
    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  private generatePasswordResetEmailHtml(username: string, resetToken: string, resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .button:hover { background: #1d4ed8; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hello ${username}!</h2>
          <p>We received a request to reset your password for your Restaurant POS account.</p>
          
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}?token=${resetToken}" class="button">Reset Password</a>
          
          <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul>
              <li>This link will expire in 1 hour</li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>For security, never share this link with anyone</li>
            </ul>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px;">
            ${resetUrl}?token=${resetToken}
          </p>
          
          <p>If you have any questions, please contact your system administrator.</p>
        </div>
        <div class="footer">
          <p>This email was sent from Restaurant POS System</p>
          <p>© ${new Date().getFullYear()} Restaurant POS. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  private generateEmailVerificationHtml(username: string, verificationToken: string, verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .button:hover { background: #047857; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .info { background: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>✅ Verify Your Email</h1>
        </div>
        <div class="content">
          <h2>Welcome ${username}!</h2>
          <p>Thank you for registering with Restaurant POS. Please verify your email address to complete your account setup.</p>
          
          <p>Click the button below to verify your email:</p>
          <a href="${verificationUrl}?token=${verificationToken}" class="button">Verify Email</a>
          
          <div class="info">
            <strong>ℹ️ Information:</strong>
            <ul>
              <li>This link will expire in 24 hours</li>
              <li>You must verify your email to access all features</li>
              <li>If you didn't create this account, please ignore this email</li>
            </ul>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px;">
            ${verificationUrl}?token=${verificationToken}
          </p>
          
          <p>Once verified, you'll be able to access all features of the Restaurant POS system.</p>
        </div>
        <div class="footer">
          <p>This email was sent from Restaurant POS System</p>
          <p>© ${new Date().getFullYear()} Restaurant POS. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  private htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  isEmailConfigured(): boolean {
    return this.isConfigured;
  }

  getConfigurationStatus(): { 
    isConfigured: boolean; 
    hasSmtpHost: boolean; 
    hasSmtpPort: boolean; 
    hasSmtpUser: boolean; 
    hasSmtpPass: boolean; 
  } {
    return {
      isConfigured: this.isConfigured,
      hasSmtpHost: !!process.env['SMTP_HOST'],
      hasSmtpPort: !!process.env['SMTP_PORT'],
      hasSmtpUser: !!process.env['SMTP_USER'],
      hasSmtpPass: !!process.env['SMTP_PASS'],
    };
  }
}

// Export singleton instance
export const emailService = new EmailService();
