import type { EmailRecord } from '../types';
import { ArrowLeft, Star, Trash2, Archive } from 'lucide-react';

interface EmailDetailViewProps {
  email: EmailRecord;
  onBack: () => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function EmailDetailView({ email, onBack }: EmailDetailViewProps) {
  const senderInitial = email.sender?.email?.charAt(0).toUpperCase() || 'S';

  return (
    <div className="flex-1 bg-white h-screen overflow-y-auto flex flex-col">
      {/* Top Header matching Figma Screen 3 */}
      <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h2 className="text-base font-semibold text-gray-900 truncate">
            {email.subject}
          </h2>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3 text-gray-400">
          <button className="p-1 hover:text-yellow-500 transition-colors cursor-pointer">
            <Star className="w-4 h-4" />
          </button>
          <button className="p-1 hover:text-gray-700 transition-colors cursor-pointer">
            <Archive className="w-4 h-4" />
          </button>
          <button className="p-1 hover:text-red-500 transition-colors cursor-pointer">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Email Content */}
      <div className="p-8 max-w-4xl space-y-6">
        {/* Sender Info Row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Green Initial Avatar */}
            <div className="w-10 h-10 rounded-full bg-[#00A859] text-white flex items-center justify-center font-semibold text-sm">
              {senderInitial}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {email.sender?.email ? email.sender.email.split('@')[0] : 'Sender'}
                </span>
                <span className="text-xs text-gray-400">
                  &lt;{email.sender?.email || 'sender@reachinbox.ai'}&gt;
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                To: {email.recipientEmail} ▾
              </p>
            </div>
          </div>

          <span className="text-xs text-gray-400">
            {formatDate(email.sentAt || email.scheduledAt)}
          </span>
        </div>

        {/* Highlight Callout Box (from Figma) */}
        <div className="bg-[#FEF9EE] border-l-4 border-[#F59E0B] p-4 rounded-r-lg text-xs text-gray-800 space-y-1">
          <p className="font-semibold text-amber-900 flex items-center gap-1.5">
            ⚡ Batch Scheduled Dispatch | Rate limit & concurrency enforced
          </p>
          <p className="text-gray-600">
            Delivery Status: <span className="font-medium text-[#00A859] uppercase">{email.status}</span>
            {email.sentAt && ` • Delivered at ${formatDate(email.sentAt)}`}
          </p>
        </div>

        {/* Email Body */}
        <div
          className="text-sm text-gray-800 leading-relaxed space-y-4 prose max-w-none pt-2"
          dangerouslySetInnerHTML={{ __html: email.body }}
        />

        {/* Attachment Card Previews matching Figma */}
        <div className="pt-6 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Attachments
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs hover:border-[#00A859] transition-colors">
              <img
                src="https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=400&auto=format&fit=crop&q=80"
                alt="Attachment preview"
                className="w-full h-32 object-cover"
              />
              <div className="p-2.5 bg-[#F9FAFB]">
                <p className="text-xs font-medium text-gray-900 truncate">Outreach_Asset_1.png</p>
                <p className="text-[10px] text-gray-400">1.2 MB</p>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs hover:border-[#00A859] transition-colors">
              <img
                src="https://images.unsplash.com/photo-1519834785169-98be25ec3f84?w=400&auto=format&fit=crop&q=80"
                alt="Attachment preview"
                className="w-full h-32 object-cover"
              />
              <div className="p-2.5 bg-[#F9FAFB]">
                <p className="text-xs font-medium text-gray-900 truncate">Outreach_Asset_2.png</p>
                <p className="text-[10px] text-gray-400">1.2 MB</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
