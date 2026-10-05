import nodemailer, { type Transporter } from "nodemailer";
import { config } from "../../config";
import { logger } from "../logger";

export interface SentEmail {
  to: string;
  subject: string;
  html: string;
  text?: string;
  sentAt: Date;
}

const memoryOutbox: SentEmail[] = [];

let transporter: Transporter | null = null;

function useMemoryTransport(): boolean {
  return process.env.MAIL_TRANSPORT === "memory" || config.isTest;
}

function getTransporter(): Transporter {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPassword } : undefined,
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 10_000,
  });
  return transporter;
}

export async function sendEmail(options: { to: string; subject: string; html: string; text?: string }): Promise<void> {
  const mail: SentEmail = { ...options, sentAt: new Date() };

  if (useMemoryTransport()) {
    memoryOutbox.push(mail);
    logger.info("Email captured in memory outbox", { to: mail.to, subject: mail.subject });
    return;
  }

  await getTransporter().sendMail({
    from: config.mailFrom,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
  logger.info("Email sent", { to: mail.to, subject: mail.subject });
}

export function getOutbox(): SentEmail[] {
  return memoryOutbox;
}

export function clearOutbox(): void {
  memoryOutbox.length = 0;
}

const layout = (title: string, body: string): string => `
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, Helvetica, sans-serif; background:#f5f6f8; padding:24px;">
    <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:8px; padding:32px; border:1px solid #e5e7eb;">
      <h2 style="margin-top:0; color:#111827;">${title}</h2>
      ${body}
      <p style="color:#6b7280; font-size:12px; margin-bottom:0;">If you did not request this, you can safely ignore this email.</p>
    </div>
  </body>
</html>`;

const button = (href: string, label: string): string => `
  <p style="margin:24px 0;">
    <a href="${href}" style="display:inline-block; padding:12px 24px; background:#2563eb; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:bold;">${label}</a>
  </p>
  <p style="color:#6b7280; font-size:13px;">Or copy and paste this link: <br/><a href="${href}">${href}</a></p>`;

export async function sendVerificationEmail(to: string, verificationUrl: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Verify your email address",
    html: layout(
      "Verify your email",
      `<p>Hi,</p><p>Welcome! Please confirm your email address to activate your account.</p>${button(verificationUrl, "Verify email")}<p style="color:#6b7280; font-size:13px;">This link expires in 24 hours.</p>`
    ),
    text: `Verify your email: ${verificationUrl}`,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Reset your password",
    html: layout(
      "Reset your password",
      `<p>Hi,</p><p>We received a request to reset your password. Click the button below to choose a new one.</p>${button(resetUrl, "Reset password")}<p style="color:#6b7280; font-size:13px;">This link expires in 1 hour.</p>`
    ),
    text: `Reset your password: ${resetUrl}`,
  });
}

export async function sendPasswordChangedEmail(to: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Your password was changed",
    html: layout(
      "Password changed",
      `<p>Hi,</p><p>Your password has been updated. All existing sessions were signed out.</p><p style="color:#dc2626;">If this wasn't you, reset your password immediately and contact support.</p>`
    ),
    text: "Your password has been updated.",
  });
}
