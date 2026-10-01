import { useState } from 'react';
import type { EmailRecord } from '../types';
import { Search, SlidersHorizontal, RotateCw, Star, Clock, Send } from 'lucide-react';

interface EmailListViewProps {
  emails: EmailRecord[];
  loading: boolean;
  type: 'scheduled' | 'sent';
  onSelectEmail: (email: EmailRecord) => void;
  onRefresh: () => void;
  onSearch: (query: string) => void;
}

function formatBadgeTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = days[d.getDay()];
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  return `${dayName} ${time}`;
}

export function EmailListView({
  emails,
  loading,
  type,
  onSelectEmail,
  onRefresh,
  onSearch,
}: EmailListViewProps) {
  const [searchInput, setSearchInput] = useState('');
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  const handleToggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(starredIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setStarredIds(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch(searchInput);
    }
  };

  const getBodySnippet = (html: string) => {
    const tmp = html.replace(/<[^>]*>?/gm, '');
    return tmp.length > 90 ? tmp.slice(0, 90) + '...' : tmp;
  };

  return (
    <div className="flex-1 bg-white h-screen overflow-y-auto flex flex-col">
      {/* Top Search & Actions Bar matching Figma Screen 2 */}
      <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between gap-4 sticky top-0 bg-white z-10">
        <div className="relative max-w-xl w-full">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (!e.target.value) onSearch('');
            }}
            onKeyDown={handleKeyDown}
            className="w-full pl-9 pr-4 py-2 bg-[#F3F4F6] border-0 rounded-full text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#00A859]"
          />
        </div>

        {/* Filter and Refresh Icons matching Figma */}
        <div className="flex items-center gap-3 text-gray-400">
          <button
            onClick={() => onSearch(searchInput)}
            className="p-1 hover:text-gray-700 transition-colors cursor-pointer"
            title="Filter search"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRefresh}
            className="p-1 hover:text-gray-700 transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Email List Content matching exact Figma Screen 2 */}
      <div className="divide-y divide-gray-100 flex-1">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center justify-between py-2">
                <div className="h-4 bg-gray-100 rounded w-1/4" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
                <div className="h-4 bg-gray-100 rounded w-12" />
              </div>
            ))}
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center p-6">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
              {type === 'scheduled' ? (
                <Clock className="w-6 h-6 text-gray-300" />
              ) : (
                <Send className="w-6 h-6 text-gray-300" />
              )}
            </div>
            <p className="text-xs font-semibold text-gray-800">
              {type === 'scheduled' ? 'No scheduled emails' : 'No sent emails yet'}
            </p>
            <p className="text-[11px] text-gray-400 mt-1 max-w-xs">
              {type === 'scheduled'
                ? 'Click "Compose" to schedule and dispatch your first campaign.'
                : 'Emails will appear here once processed by the background worker.'}
            </p>
          </div>
        ) : (
          emails.map((email) => {
            const isStarred = starredIds.has(email.id);
            const recipientName = email.recipientEmail.split('@')[0];

            return (
              <div
                key={email.id}
                onClick={() => onSelectEmail(email)}
                className="px-6 py-3 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors cursor-pointer group"
              >
                {/* Left: Recipient Name matching Figma "To: John Smith" */}
                <div className="w-48 shrink-0 pr-4">
                  <span className="text-xs font-bold text-gray-900 truncate block">
                    To: {recipientName}
                  </span>
                </div>

                {/* Middle: Timing Badge (Peach / Orange) + Bold Subject + Body Snippet */}
                <div className="flex-1 flex items-center gap-2.5 min-w-0 pr-4">
                  {type === 'scheduled' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF0E2] text-[#D9653B] shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatBadgeTime(email.scheduledAt)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EBF7EE] text-[#00A859] shrink-0">
                      Sent
                    </span>
                  )}

                  <div className="text-xs truncate">
                    <span className="font-bold text-gray-900">
                      {email.subject}
                    </span>
                    <span className="text-gray-400 font-normal">
                      {' '}— {getBodySnippet(email.body)}
                    </span>
                  </div>
                </div>

                {/* Right: Star Icon */}
                <button
                  type="button"
                  onClick={(e) => handleToggleStar(email.id, e)}
                  className={`p-1 transition-colors cursor-pointer ${
                    isStarred
                      ? 'text-yellow-400'
                      : 'text-gray-300 group-hover:text-gray-400 hover:text-yellow-400'
                  }`}
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
