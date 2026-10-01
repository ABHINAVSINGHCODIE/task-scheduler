import type { EmailStatus } from '../../types';

interface BadgeProps {
  status: EmailStatus | string;
}

export function Badge({ status }: BadgeProps) {
  const styles: Record<string, string> = {
    scheduled: 'bg-[var(--info)]/15 text-[var(--info)] border-[var(--info)]/30',
    queued: 'bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/30',
    sending: 'bg-[var(--primary-light)]/15 text-[var(--primary-light)] border-[var(--primary-light)]/30',
    sent: 'bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30',
    failed: 'bg-[var(--danger)]/15 text-[var(--danger)] border-[var(--danger)]/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        styles[status] || styles.scheduled
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
