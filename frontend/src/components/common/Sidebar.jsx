import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Car,
  CheckSquare,
  Compass,
  FileText,
  HelpCircle,
  Home,
  LayoutDashboard,
  Layers,
  QrCode,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';

const Sidebar = () => {
  const { role } = useAuth();

  const getNavLinks = () => {
    switch (role) {
      case 'RESIDENT':
        return [
          { to: '/resident', label: 'Dashboard', icon: Home },
          { to: '/resident/vehicles', label: 'My Vehicles', icon: Car },
          { to: '/resident/visitors', label: 'Visitors & Requests', icon: Users },
          { to: '/resident/passes', label: 'QR Access Passes', icon: QrCode },
          { to: '/resident/disputes', label: 'My Disputes', icon: HelpCircle },
          { to: '/resident/chatbot', label: 'AI Rules Assistant', icon: Bot },
        ];
      case 'SECURITY':
        return [
          { to: '/security', label: 'Gate Control Panel', icon: ShieldCheck },
          { to: '/security/history', label: 'Gate Audit History', icon: CheckSquare },
          { to: '/shared/ai-utilities', label: 'AI Security Tools', icon: Sparkles },
          { to: '/shared/digital-twin', label: '2D Digital Twin', icon: Layers },
        ];
      case 'VALET':
        return [
          { to: '/valet', label: 'Parking Operations', icon: LayoutDashboard },
          { to: '/valet/assignments', label: 'Assignments Log', icon: CheckSquare },
          { to: '/shared/digital-twin', label: '2D Digital Twin', icon: Layers },
        ];
      case 'ADMIN':
        return [
          { to: '/admin', label: 'System Analytics', icon: BarChart3 },
          { to: '/admin/users', label: 'User & Role Mgmt', icon: UserCheck },
          { to: '/admin/parking', label: 'Parking Setup', icon: Compass },
          { to: '/admin/anomalies', label: 'Anomalies', icon: AlertTriangle },
          { to: '/admin/documents', label: 'RAG Knowledge Docs', icon: FileText },
          { to: '/shared/digital-twin', label: '2D Digital Twin', icon: Layers },
          { to: '/shared/ai-utilities', label: 'AI Inspection Tools', icon: Sparkles },
          { to: '/resident/chatbot', label: 'AI Rules Assistant', icon: Bot },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  return (
    <aside className="w-64 border-r border-slate-800 bg-[#090d16] flex flex-col justify-between py-6 px-4 shrink-0 hidden md:flex">
      <div className="space-y-6">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Navigation Menu
        </div>
        <nav className="space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/resident' || link.to === '/security' || link.to === '/valet' || link.to === '/admin'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/5'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`
                }
              >
                <Icon size={18} />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-3.5 rounded-xl glass-card border-slate-800 text-xs text-slate-400 space-y-1">
        <div className="font-semibold text-slate-200">A.S.T.R.A Platform</div>
        <div>v1.0.0 • Production Build</div>
      </div>
    </aside>
  );
};

export default Sidebar;
