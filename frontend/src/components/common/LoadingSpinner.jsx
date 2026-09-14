import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ label = 'Loading...', size = 24 }) => (
  <div className="flex flex-col items-center justify-center p-8 gap-3 text-slate-400">
    <Loader2 className="animate-spin text-blue-500" size={size} />
    <span className="text-sm font-medium">{label}</span>
  </div>
);

export default LoadingSpinner;
