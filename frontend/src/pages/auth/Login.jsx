import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Lock, Mail, UserCheck, AlertCircle, ArrowRight, ChevronDown } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('RESIDENT');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const user = await login(email, password, role);
      switch (user.role) {
        case 'ADMIN':
          navigate('/admin');
          break;
        case 'SECURITY':
          navigate('/security');
          break;
        case 'VALET':
          navigate('/valet');
          break;
        case 'RESIDENT':
        default:
          navigate('/resident');
          break;
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      let msg = 'Invalid email or password';
      if (Array.isArray(detail)) {
        msg = detail.map((item) => (typeof item === 'object' && item?.msg ? item.msg : String(item))).join('. ');
      } else if (typeof detail === 'string') {
        msg = detail;
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-card p-8 border border-slate-800 shadow-2xl relative overflow-hidden animate-fade-in">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl"></div>

        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3.5 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 mb-3 shadow-lg shadow-blue-500/10">
            <Shield size={36} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">A.S.T.R.A Access Portal</h2>
          <p className="text-xs text-slate-400 mt-1">Sign in to manage transportation, access & smart parking</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@society.com"
                className="input-field pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              System Role / Portal
            </label>
            <div className="relative">
              <UserCheck size={18} className="absolute left-3.5 top-3.5 text-slate-500" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="input-field pl-10 pr-10 appearance-none w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl focus:border-blue-500 focus:outline-none"
              >
                <option value="RESIDENT">RESIDENT</option>
                <option value="SECURITY">SECURITY</option>
                <option value="VALET">VALET</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <ChevronDown size={18} className="absolute right-3.5 top-3.5 text-slate-500 pointer-events-none" />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 mt-2">
            {isSubmitting ? (
              'Authenticating...'
            ) : (
              <>
                Sign In to System <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-400">
          New Resident?{' '}
          <Link to="/register" className="text-blue-400 font-semibold hover:underline">
            Register Resident Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
