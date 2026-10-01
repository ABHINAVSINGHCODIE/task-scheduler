// ─── User Types ─────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

// ─── Email Types ────────────────────────────────────

export type EmailStatus = 'scheduled' | 'queued' | 'sending' | 'sent' | 'failed';

export interface EmailRecord {
  id: string;
  idempotencyKey: string;
  userId: string;
  senderId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailStatus;
  bullmqJobId: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: {
    email: string;
  };
}

export interface EmailListResponse {
  emails: EmailRecord[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ScheduleEmailRequest {
  subject: string;
  body: string;
  recipients: string[];
  senderId: string;
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
}

export interface ScheduleEmailResponse {
  message: string;
  scheduled: number;
  skipped: number;
  emails: EmailRecord[];
}

// ─── Sender Types ───────────────────────────────────

export interface SenderRecord {
  id: string;
  userId: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  isActive: boolean;
  createdAt: string;
}

// ─── Slack Types ────────────────────────────────────

export interface SlackStatus {
  connected: boolean;
  teamName: string | null;
  channelName: string | null;
}

// ─── Search Types ───────────────────────────────────

export interface SearchResponse {
  results: EmailRecord[];
  total: number;
}

// ─── API Error ──────────────────────────────────────

export interface ApiError {
  error: string;
}
