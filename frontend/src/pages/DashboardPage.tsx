import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { EmailListView } from '../components/EmailListView';
import { EmailDetailView } from '../components/EmailDetailView';
import { ComposeEmailView } from '../components/ComposeEmailView';
import { emailApi } from '../services/api';
import type { EmailRecord } from '../types';
import toast from 'react-hot-toast';

type ActiveTab = 'scheduled' | 'sent';
type ViewMode = 'list' | 'detail' | 'compose';

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('scheduled');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);

  // Scheduled & Sent states
  const [scheduledEmails, setScheduledEmails] = useState<EmailRecord[]>([]);
  const [scheduledTotal, setScheduledTotal] = useState(0);
  const [scheduledLoading, setScheduledLoading] = useState(true);

  const [sentEmails, setSentEmails] = useState<EmailRecord[]>([]);
  const [sentTotal, setSentTotal] = useState(0);
  const [sentLoading, setSentLoading] = useState(true);

  // Search
  const [searchResults, setSearchResults] = useState<EmailRecord[] | null>(null);

  const fetchScheduled = useCallback(async () => {
    setScheduledLoading(true);
    try {
      const data = await emailApi.getScheduled(1, 100);
      setScheduledEmails(data.emails);
      setScheduledTotal(data.total);
    } catch {
      // ignore
    } finally {
      setScheduledLoading(false);
    }
  }, []);

  const fetchSent = useCallback(async () => {
    setSentLoading(true);
    try {
      const data = await emailApi.getSent(1, 100);
      setSentEmails(data.emails);
      setSentTotal(data.total);
    } catch {
      // ignore
    } finally {
      setSentLoading(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchScheduled();
    fetchSent();
  }, [fetchScheduled, fetchSent]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Polling every 6s for real-time background worker updates
  useEffect(() => {
    const timer = setInterval(() => {
      refreshAll();
    }, 6000);
    return () => clearInterval(timer);
  }, [refreshAll]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const res = await emailApi.search(query, activeTab);
      setSearchResults(res.results);
    } catch {
      toast.error('Search failed');
    }
  };

  const handleSelectEmail = (email: EmailRecord) => {
    setSelectedEmail(email);
    setViewMode('detail');
  };

  const handleComposeClick = () => {
    setViewMode('compose');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedEmail(null);
  };

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setViewMode('list');
    setSelectedEmail(null);
    setSearchResults(null);
  };

  const currentEmails = searchResults !== null
    ? searchResults
    : activeTab === 'scheduled'
    ? scheduledEmails
    : sentEmails;

  const currentLoading = activeTab === 'scheduled' ? scheduledLoading : sentLoading;

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar matching Figma */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onComposeClick={handleComposeClick}
        scheduledCount={scheduledTotal}
        sentCount={sentTotal}
      />

      {/* Main View Area */}
      {viewMode === 'compose' ? (
        <ComposeEmailView
          onBack={handleBackToList}
          onScheduled={() => {
            refreshAll();
            handleTabChange('scheduled');
          }}
        />
      ) : viewMode === 'detail' && selectedEmail ? (
        <EmailDetailView
          email={selectedEmail}
          onBack={handleBackToList}
        />
      ) : (
        <EmailListView
          emails={currentEmails}
          loading={currentLoading}
          type={activeTab}
          onSelectEmail={handleSelectEmail}
          onRefresh={refreshAll}
          onSearch={handleSearch}
        />
      )}
    </div>
  );
}
