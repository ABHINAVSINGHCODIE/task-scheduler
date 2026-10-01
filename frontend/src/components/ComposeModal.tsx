import { useState, useEffect, useRef } from 'react';
import { Modal } from './ui/Modal';
import { Input, Textarea } from './ui/Input';
import { Button } from './ui/Button';
import { senderApi, emailApi } from '../services/api';
import type { SenderRecord } from '../types';
import { Upload, FileText, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduled: () => void;
}

export function ComposeModal({ isOpen, onClose, onScheduled }: ComposeModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [senderId, setSenderId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [delayBetweenEmails, setDelayBetweenEmails] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(50);
  const [senders, setSenders] = useState<SenderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingSender, setGeneratingSender] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadSenders();
      // Set default start time to now + 1 minute
      const now = new Date();
      now.setMinutes(now.getMinutes() + 1);
      setStartTime(now.toISOString().slice(0, 16));
    }
  }, [isOpen]);

  const loadSenders = async () => {
    try {
      const data = await senderApi.list();
      setSenders(data);
      if (data.length > 0 && !senderId) {
        setSenderId(data[0].id);
      }
    } catch {
      toast.error('Failed to load senders');
    }
  };

  const handleGenerateSender = async () => {
    setGeneratingSender(true);
    try {
      const result = await senderApi.generate();
      toast.success('Ethereal Email sender created');
      setSenders((prev) => [result.sender, ...prev]);
      setSenderId(result.sender.id);
    } catch {
      toast.error('Failed to generate sender');
    } finally {
      setGeneratingSender(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      // Parse emails from CSV/text file
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const found = text.match(emailRegex) || [];
      const unique = [...new Set(found)];
      setRecipients(unique);
      setManualInput(unique.join(', '));
      toast.success(`Found ${unique.length} unique email addresses`);
    };

    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    if (!body.trim()) {
      toast.error('Body is required');
      return;
    }

    // Collect all emails
    let allRecipients = [...recipients];
    if (manualInput.trim()) {
      const parsed = manualInput
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.includes('@'));
      allRecipients = [...new Set([...allRecipients, ...parsed])];
    }

    if (allRecipients.length === 0) {
      toast.error('Please add at least one recipient email address');
      return;
    }
    if (!senderId) {
      toast.error('Please select or create a sender');
      return;
    }
    if (!startTime) {
      toast.error('Start time is required');
      return;
    }

    setLoading(true);
    try {
      const result = await emailApi.schedule({
        subject,
        body,
        recipients: allRecipients,
        senderId,
        startTime: new Date(startTime).toISOString(),
        delayBetweenEmails,
        hourlyLimit,
      });

      toast.success(result.message);
      onScheduled();
      resetForm();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to schedule emails');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSubject('');
    setBody('');
    setRecipients([]);
    setManualInput('');
    setFileName('');
    setDelayBetweenEmails(2);
    setHourlyLimit(50);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compose New Email" size="lg">
      <div className="space-y-5">
        {/* Subject */}
        <Input
          label="Subject"
          placeholder="Enter email subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />

        {/* Body */}
        <Textarea
          label="Body"
          placeholder="Enter email body (HTML supported)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
        />

        {/* Recipients input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            Email Recipients (CSV Upload or Type Manually)
          </label>
          <div
            className="border-2 border-dashed border-[var(--border-color)] rounded-lg p-3 text-center cursor-pointer hover:border-[var(--primary)] transition-colors mb-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.text"
              onChange={handleFileUpload}
              className="hidden"
            />
            {fileName ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-[var(--primary)]" />
                <span className="text-sm text-[var(--text-primary)]">{fileName}</span>
                <span className="text-xs text-[var(--success)] font-medium">
                  ({recipients.length} emails loaded from file)
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-secondary)]">
                <Upload className="w-4 h-4 text-[var(--text-muted)]" />
                <span>Click here to upload CSV or text file</span>
              </div>
            )}
          </div>
          <Input
            placeholder="Or type emails: lead1@example.com, lead2@corp.com"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
          />
        </div>

        {/* Sender Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            Sender (SMTP Account)
          </label>
          <div className="flex gap-2">
            <select
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              className="flex-1 px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              {senders.length === 0 && (
                <option value="">No sender configured — click "Generate Test Account"</option>
              )}
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.email} ({s.smtpHost})
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              size="md"
              onClick={handleGenerateSender}
              loading={generatingSender}
              title="Auto-generate a free Ethereal Email test SMTP sender"
            >
              <Plus className="w-4 h-4 mr-1" />
              Generate Test Account
            </Button>
          </div>
        </div>

        {/* Scheduling Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Start Time"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <Input
            label="Delay Between Emails (sec)"
            type="number"
            min={1}
            value={delayBetweenEmails}
            onChange={(e) => setDelayBetweenEmails(Number(e.target.value))}
          />
          <Input
            label="Hourly Limit"
            type="number"
            min={1}
            value={hourlyLimit}
            onChange={(e) => setHourlyLimit(Number(e.target.value))}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            Schedule Emails
          </Button>
        </div>
      </div>
    </Modal>
  );
}
