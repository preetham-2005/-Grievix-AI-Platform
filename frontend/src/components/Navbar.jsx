import React from 'react';
import { LogOut, User, Bell, Sparkles } from 'lucide-react';

export default function Navbar({ currentUser, onLogout }) {
  if (!currentUser) return null;

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'ROLE_CITIZEN': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'ROLE_OFFICER': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'ROLE_DEPT_HEAD': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'ROLE_ADMIN':
      case 'ROLE_SUPER_ADMIN': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  const formatRole = (role) => {
    return role ? role.replace('ROLE_', '').replace('_', ' ') : '';
  };

  return (
    <nav className="glass-panel sticky top-0 z-40 w-full px-6 py-4 flex items-center justify-between shadow-lg">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Sparkles className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <span className="text-xl font-bold tracking-tight text-white font-outfit">
            Grievix<span className="text-blue-500">AI</span>
          </span>
          <p className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">Smart Governance</p>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        {/* User Info */}
        <div className="flex items-center space-x-3 border-r border-slate-800 pr-6">
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 border border-slate-700">
            <User className="w-4.5 h-4.5" />
          </div>
          <div className="text-right">
            <h4 className="text-sm font-semibold text-slate-200 capitalize leading-tight">
              {currentUser.username}
            </h4>
            <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block mt-0.5 font-bold uppercase tracking-wider ${getRoleBadgeColor(currentUser.role)}`}>
              {formatRole(currentUser.role)}
            </span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center space-x-4">
          <button className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white transition-colors duration-200 text-slate-400 group">
            <Bell className="w-4.5 h-4.5 group-hover:scale-105 transition-transform" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-slate-950"></span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-rose-600/10 border border-rose-500/20 hover:bg-rose-650 hover:text-white transition-all text-rose-450 text-sm font-medium hover:scale-[1.02] active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
