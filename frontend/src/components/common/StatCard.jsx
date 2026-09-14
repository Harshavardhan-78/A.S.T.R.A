import React from 'react';

const StatCard = ({ title, value, icon: Icon, description, trend, color = 'blue' }) => {
  const colorGradients = {
    blue: 'from-blue-500/10 to-indigo-500/5 text-blue-400 border-blue-500/20',
    emerald: 'from-emerald-500/10 to-teal-500/5 text-emerald-400 border-emerald-500/20',
    amber: 'from-amber-500/10 to-orange-500/5 text-amber-400 border-amber-500/20',
    rose: 'from-rose-500/10 to-red-500/5 text-rose-400 border-rose-500/20',
    purple: 'from-purple-500/10 to-violet-500/5 text-purple-400 border-purple-500/20',
  };

  const style = colorGradients[color] || colorGradients.blue;

  return (
    <div className={`glass-card p-5 border bg-gradient-to-br ${style} animate-fade-in`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        {Icon && (
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <Icon size={20} />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-100 mb-1">{value}</div>
      {description && <div className="text-xs text-slate-400">{description}</div>}
    </div>
  );
};

export default StatCard;
