import nodemailer, { Transporter } from 'nodemailer';
import { Sender } from '../models';

// Cache transporters by sender ID to avoid recreating them
const transporterCache = new Map<string, Transporter>();

/**
 * Get or create an SMTP transporter for a given sender
 * Uses Ethereal Email credentials stored in the Sender model
 */
export function getTransporter(sender: Sender): Transporter {
  const cached = transporterCache.get(sender.id);
  if (cached) return cached;

  const transporter = nodemailer.createTransport({
    host: sender.smtpHost,
    port: sender.smtpPort,
    secure: false,
    auth: {
      user: sender.smtpUser,
      pass: sender.smtpPass,
    },
  });

  transporterCache.set(sender.id, transporter);
  return transporter;
}

/**
 * Generate a new Ethereal Email test account
 * Returns the SMTP credentials for use as a sender
 */
export async function generateEtherealAccount(): Promise<{
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
}> {
  const testAccount = await nodemailer.createTestAccount();
  return {
    email: testAccount.user,
    smtpHost: testAccount.smtp.host,
    smtpPort: testAccount.smtp.port,
    smtpUser: testAccount.user,
    smtpPass: testAccount.pass,
  };
}

/**
 * Send an email through a sender's SMTP configuration
 */
export async function sendEmail(
  sender: Sender,
  to: string,
  subject: string,
  body: string
): Promise<{ messageId: string; previewUrl: string | false }> {
  const transporter = getTransporter(sender);

  const info = await transporter.sendMail({
    from: `"${sender.email}" <${sender.email}>`,
    to,
    subject,
    html: body,
    text: body.replace(/<[^>]*>/g, ''), // Strip HTML for plain text
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);

  return {
    messageId: info.messageId,
    previewUrl: previewUrl,
  };
}

/**
 * Clear a cached transporter (e.g., when sender is updated/deleted)
 */
export function clearTransporterCache(senderId: string): void {
  transporterCache.delete(senderId);
}
