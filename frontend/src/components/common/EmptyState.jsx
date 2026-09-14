import React from 'react';
import { Inbox } from 'lucide-react';

const EmptyState = ({ title = 'No records found', message = 'There are no items to display at this time.', action }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center glass-card border border-dashed border-slate-800">
    <div className="p-4 rounded-full bg-slate-900/80 border border-slate-800 text-slate-500 mb-3">
      <Inbox size={32} />
    </div>
    <h4 className="text-base font-semibold text-slate-200 mb-1">{title}</h4>
    <p className="text-xs text-slate-400 max-w-sm mb-4">{message}</p>
    {action}
  </div>
);

export default EmptyState;
