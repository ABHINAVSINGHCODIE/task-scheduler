import { useAuth } from '../../context/AuthContext';
import { LogOut, Mail, MessageSquare } from 'lucide-react';
import { Button } from '../ui/Button';
import { useState, useEffect } from 'react';
import { slackApi } from '../../services/api';
import toast from 'react-hot-toast';

export function Header() {
  const { user, logout } = useAuth();
  const [slackConnected, setSlackConnected] = useState(false);
  const [slackTeam, setSlackTeam] = useState<string | null>(null);

  useEffect(() => {
    const checkSlack = async () => {
      try {
        const status = await slackApi.getStatus();
        setSlackConnected(status.connected);
        setSlackTeam(status.teamName);
      } catch {
        // Ignore errors — just show as disconnected
      }
    };
    checkSlack();

    // Check for Slack callback params in URL
    const params = new URLSearchParams(window.location.search);
    const slackParam = params.get('slack');
    if (slackParam === 'connected') {
      toast.success('Slack connected successfully!');
      setSlackConnected(true);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (slackParam === 'error') {
      toast.error(`Slack connection failed: ${params.get('reason') || 'Unknown error'}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleSlackConnect = async () => {
    try {
      const { url } = await slackApi.getConnectUrl();
      window.location.href = url;
    } catch {
      toast.error('Failed to initiate Slack connection');
    }
  };

  const handleSlackDisconnect = async () => {
    try {
      await slackApi.disconnect();
      setSlackConnected(false);
      setSlackTeam(null);
      toast.success('Slack disconnected');
    } catch {
      toast.error('Failed to disconnect Slack');
    }
  };

  return (
    <header className="h-16 border-b border-[var(--border-color)] bg-[var(--bg-card)] px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
          <Mail className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-bold text-[var(--text-primary)]">
          ReachInbox
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Slack integration */}
        {slackConnected ? (
          <Button variant="ghost" size="sm" onClick={handleSlackDisconnect}>
            <MessageSquare className="w-4 h-4 mr-2 text-[var(--success)]" />
            <span className="text-[var(--success)]">Slack: {slackTeam || 'Connected'}</span>
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={handleSlackConnect}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Connect Slack
          </Button>
        )}

        {/* User info */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-[var(--text-primary)]">{user.name}</p>
              <p className="text-xs text-[var(--text-secondary)]">{user.email}</p>
            </div>
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full border border-[var(--border-color)]"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-sm font-medium">
                {user.name.charAt(0)}
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
