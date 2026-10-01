import { useState, useEffect, useRef } from 'react';
import { senderApi, emailApi } from '../services/api';
import type { SenderRecord } from '../types';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Upload,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ComposeEmailViewProps {
  onBack: () => void;
  onScheduled: () => void;
}

export function ComposeEmailView({ onBack, onScheduled }: ComposeEmailViewProps) {
  const [senders, setSenders] = useState<SenderRecord[]>([]);
  const [senderId, setSenderId] = useState('');
  const [generatingSender, setGeneratingSender] = useState(false);

  const [recipients, setRecipients] = useState<string[]>([
    'tame@gmail.com',
    'lame@gmail.com',
    'dame@gmail.com',
  ]);
  const [recipientInput, setRecipientInput] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delayBetweenEmails, setDelayBetweenEmails] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(50);

  // Send Later Popover state
  const [showSendLater, setShowSendLater] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');

  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load Senders
    senderApi.list().then((data) => {
      setSenders(data);
      if (data.length > 0) setSenderId(data[0].id);
    }).catch(() => {});

    // Default scheduled time: now + 5 mins
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5);
    setScheduledTime(d.toISOString().slice(0, 16));
  }, []);

  const handleGenerateSender = async () => {
    setGeneratingSender(true);
    try {
      const res = await senderApi.generate();
      setSenders((prev) => [res.sender, ...prev]);
      setSenderId(res.sender.id);
      toast.success('Test Ethereal Sender generated');
    } catch {
      toast.error('Failed to generate sender');
    } finally {
      setGeneratingSender(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const found = text.match(emailRegex) || [];
      const unique = [...new Set([...recipients, ...found])];
      setRecipients(unique);
      toast.success(`Loaded ${unique.length} recipient emails`);
    };
    reader.readAsText(file);
  };

  const handleAddRecipient = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = recipientInput.trim().replace(',', '');
      if (val && val.includes('@') && !recipients.includes(val)) {
        setRecipients([...recipients, val]);
        setRecipientInput('');
      }
    }
  };

  const handleRemoveRecipient = (emailToRemove: string) => {
    setRecipients(recipients.filter((r) => r !== emailToRemove));
  };

  const handleScheduleSubmit = async () => {
    if (!subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    if (!body.trim()) {
      toast.error('Body is required');
      return;
    }
    if (recipients.length === 0) {
      toast.error('At least one recipient is required');
      return;
    }

    let targetSenderId = senderId;
    if (!targetSenderId) {
      if (senders.length > 0) {
        targetSenderId = senders[0].id;
      } else {
        try {
          const res = await senderApi.generate();
          setSenders([res.sender]);
          targetSenderId = res.sender.id;
        } catch {
          toast.error('Please configure or generate a sender');
          return;
        }
      }
    }

    setLoading(true);
    try {
      const startTime = scheduledTime
        ? new Date(scheduledTime).toISOString()
        : new Date(Date.now() + 2000).toISOString();

      const result = await emailApi.schedule({
        subject,
        body,
        recipients,
        senderId: targetSenderId,
        startTime,
        delayBetweenEmails: Number(delayBetweenEmails) || 2,
        hourlyLimit: Number(hourlyLimit) || 50,
      });

      toast.success(result.message || 'Emails scheduled successfully');
      onScheduled();
      onBack();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to schedule emails');
    } finally {
      setLoading(false);
    }
  };

  const selectPresetTime = (hoursFromNow: number) => {
    const d = new Date();
    d.setHours(d.getHours() + hoursFromNow);
    setScheduledTime(d.toISOString().slice(0, 16));
    setShowSendLater(false);
    toast.success(`Scheduled for ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
  };

  return (
    <div className="flex-1 bg-white h-screen overflow-y-auto flex flex-col relative">
      {/* Top Header matching Figma Screen 4 */}
      <div className="border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 bg-white z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Compose New Email
          </h2>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 cursor-pointer rounded-lg hover:bg-gray-50">
            <Paperclip className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-semibold">1</span>
          </button>

          <button
            onClick={() => setShowSendLater(!showSendLater)}
            className="p-2 text-gray-600 hover:text-[#00A859] hover:bg-[#EBF7EE] rounded-full transition-colors cursor-pointer relative"
            title="Send Later options"
          >
            <Clock className="w-5 h-5" />
          </button>

          {/* Green Send Later Button */}
          <button
            onClick={handleScheduleSubmit}
            disabled={loading}
            className="px-6 py-2 rounded-full border-2 border-[#00A859] text-[#00A859] hover:bg-[#EBF7EE] font-bold text-sm transition-all cursor-pointer disabled:opacity-50 active:scale-98 shadow-xs"
          >
            {loading ? 'Scheduling...' : 'Send Later'}
          </button>
        </div>
      </div>

      {/* Send Later Popover Modal matching Figma Screen 4 */}
      {showSendLater && (
        <div className="absolute top-20 right-8 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl p-5 z-30 animate-fade-in space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <span className="text-sm font-bold text-gray-900">Send Later</span>
            <button
              onClick={() => setShowSendLater(false)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">
              Pick date &amp; time
            </label>
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-[#F9FAFB] border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00A859]"
            />
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5 pt-1">
            <button
              onClick={() => selectPresetTime(1)}
              className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-[#F3F4F6] rounded-lg transition-colors cursor-pointer"
            >
              In 1 Hour
            </button>
            <button
              onClick={() => selectPresetTime(3)}
              className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-[#F3F4F6] rounded-lg transition-colors cursor-pointer"
            >
              Tomorrow, 10:00 AM
            </button>
            <button
              onClick={() => selectPresetTime(4)}
              className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-[#F3F4F6] rounded-lg transition-colors cursor-pointer"
            >
              Tomorrow, 11:00 AM
            </button>
            <button
              onClick={() => selectPresetTime(8)}
              className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-[#F3F4F6] rounded-lg transition-colors cursor-pointer"
            >
              Tomorrow, 3:00 PM
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              onClick={() => setShowSendLater(false)}
              className="px-4 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowSendLater(false)}
              className="px-5 py-1.5 text-xs rounded-full border-2 border-[#00A859] text-[#00A859] hover:bg-[#EBF7EE] font-bold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Main Form Fields with comfortable spacing & font size */}
      <div className="p-8 max-w-5xl space-y-6">
        {/* From Field */}
        <div className="flex items-center gap-4 text-sm">
          <span className="w-16 font-semibold text-gray-500 text-sm">From</span>
          <div className="flex items-center gap-3 flex-1">
            <select
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              className="px-4 py-2 bg-[#F3F4F6] border-0 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00A859] cursor-pointer"
            >
              {senders.length === 0 && (
                <option value="">oliver.brown@domain.io (Default)</option>
              )}
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.email}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleGenerateSender}
              disabled={generatingSender}
              className="px-3.5 py-1.5 text-xs text-[#00A859] hover:bg-[#EBF7EE] rounded-xl border border-[#BCE8C9] font-semibold transition-colors cursor-pointer"
            >
              {generatingSender ? 'Creating...' : '+ Add Test Sender'}
            </button>
          </div>
        </div>

        {/* To Field with green pill tags & Upload List button */}
        <div className="flex items-center gap-4 text-sm">
          <span className="w-16 font-semibold text-gray-500 text-sm">To</span>
          <div className="flex items-center gap-2.5 flex-wrap flex-1 min-h-[42px]">
            {recipients.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#00A859] bg-[#EBF7EE] text-[#00A859] text-sm font-semibold"
              >
                {email}
                <button
                  type="button"
                  onClick={() => handleRemoveRecipient(email)}
                  className="hover:text-red-500 cursor-pointer p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}

            <input
              type="text"
              placeholder={recipients.length === 0 ? 'Type recipient email and hit enter...' : 'Add another...'}
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              onKeyDown={handleAddRecipient}
              className="px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none min-w-[180px]"
            />
          </div>

          {/* Upload List matching Figma */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-[#00A859] hover:text-[#008f4c] hover:bg-[#EBF7EE] rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>Upload List</span>
          </button>
        </div>

        {/* Subject */}
        <div className="flex items-center gap-4 text-sm">
          <span className="w-16 font-semibold text-gray-500 text-sm">Subject</span>
          <input
            type="text"
            placeholder="Enter subject here..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 py-2 text-sm font-medium text-gray-900 placeholder-gray-400 border-b border-gray-200 focus:outline-none focus:border-[#00A859]"
          />
        </div>

        {/* Throttling controls matching Figma */}
        <div className="flex items-center gap-8 text-sm text-gray-600 pt-1">
          <div className="flex items-center gap-2.5">
            <span className="font-medium text-gray-700">Delay between 2 emails</span>
            <input
              type="number"
              min={1}
              value={delayBetweenEmails}
              onChange={(e) => setDelayBetweenEmails(Number(e.target.value))}
              className="w-16 px-2.5 py-1.5 bg-[#F9FAFB] border border-gray-200 rounded-xl text-center text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00A859]"
            />
            <span className="text-xs text-gray-400 font-medium">sec</span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="font-medium text-gray-700">Hourly Limit</span>
            <input
              type="number"
              min={1}
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Number(e.target.value))}
              className="w-16 px-2.5 py-1.5 bg-[#F9FAFB] border border-gray-200 rounded-xl text-center text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00A859]"
            />
            <span className="text-xs text-gray-400 font-medium">emails</span>
          </div>
        </div>

        {/* Rich Email Body Area matching Figma */}
        <div className="bg-[#F8F9FA] rounded-2xl p-6 border border-gray-200/80 space-y-4 shadow-xs">
          {/* Toolbar */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-200/80 text-gray-500 flex-wrap">
            <button className="p-1.5 hover:text-gray-900 transition-colors"><Undo className="w-4 h-4" /></button>
            <button className="p-1.5 hover:text-gray-900 transition-colors"><Redo className="w-4 h-4" /></button>
            <div className="h-4 w-px bg-gray-300 mx-1" />
            <span className="text-sm font-bold px-2 py-0.5 hover:text-gray-900 cursor-pointer">Tt ▾</span>
            <button className="p-1.5 hover:text-gray-900 transition-colors"><Bold className="w-4 h-4" /></button>
            <button className="p-1.5 hover:text-gray-900 transition-colors"><Italic className="w-4 h-4" /></button>
            <button className="p-1.5 hover:text-gray-900 transition-colors"><UnderlineIcon className="w-4 h-4" /></button>
            <div className="h-4 w-px bg-gray-300 mx-1" />
            <button className="p-1.5 hover:text-gray-900 transition-colors"><AlignLeft className="w-4 h-4" /></button>
            <button className="p-1.5 hover:text-gray-900 transition-colors"><List className="w-4 h-4" /></button>
            <button className="p-1.5 hover:text-gray-900 transition-colors"><ListOrdered className="w-4 h-4" /></button>
            <button className="p-1.5 hover:text-gray-900 transition-colors"><Quote className="w-4 h-4" /></button>
            <button className="p-1.5 hover:text-gray-900 transition-colors"><LinkIcon className="w-4 h-4" /></button>
          </div>

          {/* Text Area */}
          <textarea
            placeholder="Type Your Reply..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="w-full bg-transparent border-0 text-base text-gray-900 placeholder-gray-400 focus:outline-none resize-none leading-relaxed min-h-[220px]"
          />

          {/* Image Attachment Card Preview (from Figma Screen 6) */}
          <div className="pt-2">
            <div className="w-28 h-24 rounded-2xl overflow-hidden border-2 border-gray-200 shadow-xs relative">
              <img
                src="https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=300&auto=format&fit=crop&q=80"
                alt="Attachment preview"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
