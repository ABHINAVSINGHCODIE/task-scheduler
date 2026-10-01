import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Clock, Send, ChevronDown, LogOut, MessageSquare } from 'lucide-react';
import { slackApi } from '../../services/api';
import toast from 'react-hot-toast';

interface SidebarProps {
  activeTab: 'scheduled' | 'sent';
  onTabChange: (tab: 'scheduled' | 'sent') => void;
  onComposeClick: () => void;
  scheduledCount: number;
  sentCount: number;
}

export function Sidebar({
  activeTab,
  onTabChange,
  onComposeClick,
  scheduledCount,
  sentCount,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);
  const [slackTeam, setSlackTeam] = useState<string | null>(null);

  useEffect(() => {
    slackApi.getStatus().then((status) => {
      setSlackConnected(status.connected);
      setSlackTeam(status.teamName);
    }).catch(() => {});
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
      toast.error('Failed to disconnect');
    }
  };

  return (
    <aside className="w-64 bg-white flex flex-col h-screen shrink-0 p-5 select-none border-r border-gray-100">
      {/* Brand Logo matching Figma exactly */}
      <div className="mb-6 pl-1 pt-1">
        <span className="text-2xl font-black tracking-tight text-black font-sans">
          ONG
        </span>
      </div>

      {/* User Profile Card (Soft gray rounded-2xl pill from Figma) */}
      <div className="relative mb-5">
        <button
          type="button"
          onClick={() => setProfileDropdown(!profileDropdown)}
          className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-[#F4F5F7] hover:bg-[#EBEEF2] transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={
                user?.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
              }
              alt={user?.name || 'Oliver Brown'}
              className="w-9 h-9 rounded-full object-cover shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate leading-tight">
                {user?.name || 'Oliver Brown'}
              </p>
              <p className="text-[11px] text-gray-400 truncate leading-tight mt-0.5">
                {user?.email || 'oliver.brown@domain.io'}
              </p>
            </div>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${profileDropdown ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {profileDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl p-2 z-50 animate-fade-in space-y-1">
            {slackConnected ? (
              <button
                onClick={handleSlackDisconnect}
                className="w-full text-left px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-50 rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-green-600" />
                <span>Slack: {slackTeam || 'Connected'}</span>
              </button>
            ) : (
              <button
                onClick={handleSlackConnect}
                className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                <span>Connect Slack</span>
              </button>
            )}

            <button
              onClick={logout}
              className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-red-500" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>

      {/* Compose Button matching Figma */}
      <button
        type="button"
        onClick={onComposeClick}
        className="w-full py-2.5 px-4 rounded-full border border-[#00A859] text-[#00A859] hover:bg-[#EBF7EE] font-semibold text-xs tracking-wide transition-colors cursor-pointer mb-6 text-center"
      >
        Compose
      </button>

      {/* Section Header: CORE */}
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 pl-2">
        CORE
      </div>

      {/* Navigation List matching Figma */}
      <nav className="space-y-1">
        {/* Scheduled Tab */}
        <button
          type="button"
          onClick={() => onTabChange('scheduled')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors cursor-pointer ${
            activeTab === 'scheduled'
              ? 'bg-[#EBF7EE] text-gray-900 font-bold'
              : 'text-gray-600 hover:bg-gray-50 font-medium'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-gray-700" />
            <span>Scheduled</span>
          </div>
          <span className="text-xs text-gray-400 font-normal">
            {scheduledCount}
          </span>
        </button>

        {/* Sent Tab */}
        <button
          type="button"
          onClick={() => onTabChange('sent')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors cursor-pointer ${
            activeTab === 'sent'
              ? 'bg-[#EBF7EE] text-gray-900 font-bold'
              : 'text-gray-600 hover:bg-gray-50 font-medium'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Send className="w-4 h-4 text-gray-600" />
            <span>Sent</span>
          </div>
          <span className="text-xs text-gray-400 font-normal">
            {sentCount}
          </span>
        </button>
      </nav>
    </aside>
  );
}
