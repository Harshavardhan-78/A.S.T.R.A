import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Bell, LogOut, Shield, Wifi, CheckCheck, Clock, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
    setShowDropdown(false);

    // If it's a registration pending notification and user is ADMIN -> navigate to Admin Users
    if (user?.role === 'ADMIN' && (notif.title?.includes('Registration') || notif.title?.includes('SECURITY') || notif.title?.includes('VALET'))) {
      navigate('/admin/users?status=PENDING');
    } else {
      navigate('/notifications');
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
          <Shield size={22} />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
            A.S.T.R.A
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold tracking-wide">
              SYSTEM ONLINE
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            AI-Powered Secure Transport Recognition & Access System
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* WebSocket / API Live indicator */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
          <Wifi size={14} className="text-emerald-400 animate-pulse" />
          <span>API Connected</span>
        </div>

        {/* Notifications Bell & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition"
            title="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Floating Dropdown Panel */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition"
                  >
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/50">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    No notifications available
                  </div>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3.5 transition cursor-pointer hover:bg-slate-850 flex items-start gap-3 ${
                        !n.is_read ? 'bg-blue-500/5 border-l-2 border-blue-500' : ''
                      }`}
                    >
                      <div className={`mt-0.5 p-1.5 rounded-full ${!n.is_read ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                        <Bell size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-200 truncate">{n.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{n.message}</div>
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                          <Clock size={10} /> {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-center">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/notifications');
                  }}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1.5 w-full py-1"
                >
                  View All Notifications <ExternalLink size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-slate-200">{user?.full_name}</div>
            <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">{user?.role}</div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
