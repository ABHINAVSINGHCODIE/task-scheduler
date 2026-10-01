import { useState } from 'react';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { TableSkeleton } from './ui/Spinner';
import { Modal } from './ui/Modal';
import type { EmailRecord } from '../types';
import { Clock, Send, Eye, User, Calendar, AlertCircle } from 'lucide-react';

interface EmailTableProps {
  emails: EmailRecord[];
  loading: boolean;
  type: 'scheduled' | 'sent';
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function EmailTable({
  emails,
  loading,
  type,
  page,
  totalPages,
  total,
  onPageChange,
}: EmailTableProps) {
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);

  if (loading) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-6">
        <TableSkeleton rows={5} cols={5} />
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
        <EmptyState
          title={type === 'scheduled' ? 'No scheduled emails' : 'No sent emails yet'}
          description={
            type === 'scheduled'
              ? 'Schedule your first email campaign to see it here.'
              : 'Emails will appear here once they have been processed and sent.'
          }
          icon={
            type === 'scheduled' ? (
              <Clock className="w-8 h-8 text-[var(--text-muted)]" />
            ) : (
              <Send className="w-8 h-8 text-[var(--text-muted)]" />
            )
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-[var(--bg-card-hover)]/50">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Recipient Email
                </th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Subject
                </th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  {type === 'scheduled' ? 'Scheduled Time' : 'Sent Time'}
                </th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-6 py-3.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {emails.map((email) => (
                <tr
                  key={email.id}
                  className="hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
                  onClick={() => setSelectedEmail(email)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {email.recipientEmail}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-md truncate">
                    <span className="text-sm text-[var(--text-primary)]">
                      {email.subject}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-[var(--text-secondary)]">
                      {formatDate(type === 'scheduled' ? email.scheduledAt : email.sentAt)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge status={email.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEmail(email);
                      }}
                      className="text-xs text-[var(--primary-light)] hover:text-white px-2.5 py-1 rounded bg-[var(--bg-input)] hover:bg-[var(--primary)] transition-all flex items-center gap-1 ml-auto"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-[var(--border-color)] bg-[var(--bg-card-hover)]/30">
            <span className="text-sm text-[var(--text-secondary)]">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total} emails
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1 text-sm rounded-lg bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1 text-sm rounded-lg bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Email Details Modal */}
      {selectedEmail && (
        <Modal
          isOpen={!!selectedEmail}
          onClose={() => setSelectedEmail(null)}
          title="Email Details"
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[var(--bg-input)] p-3.5 rounded-lg border border-[var(--border-color)] text-xs">
              <div>
                <span className="text-[var(--text-muted)] flex items-center gap-1 mb-1">
                  <User className="w-3.5 h-3.5" /> Recipient
                </span>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {selectedEmail.recipientEmail}
                </p>
              </div>
              <div>
                <span className="text-[var(--text-muted)] flex items-center gap-1 mb-1">
                  <Calendar className="w-3.5 h-3.5" /> Timing
                </span>
                <p className="text-xs text-[var(--text-primary)]">
                  Scheduled: {formatDate(selectedEmail.scheduledAt)}
                </p>
                {selectedEmail.sentAt && (
                  <p className="text-xs text-[var(--success)]">
                    Sent: {formatDate(selectedEmail.sentAt)}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase">
                Subject
              </label>
              <p className="text-base font-medium text-[var(--text-primary)] mt-1">
                {selectedEmail.subject}
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase">
                Email Content
              </label>
              <div
                className="mt-1 p-4 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] max-h-60 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
              />
            </div>

            {selectedEmail.errorMessage && (
              <div className="p-3 bg-[var(--danger)]/15 border border-[var(--danger)]/30 rounded-lg flex items-start gap-2 text-xs text-[var(--danger)]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Error: {selectedEmail.errorMessage}</span>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
