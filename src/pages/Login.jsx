import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';

const API_URL = import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:5000/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await axios.post(`${API_URL}/admin/login`, { username, password });
      if (data.success) {
        localStorage.setItem('adminToken', data.token);
        navigate('/admin');
      }
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        setError('NETWORK ERROR: Connection to Thakadar server failed.');
      } else if (err.response?.status >= 500) {
        setError('DATABASE ERROR: Cloud system is temporarily unresponsive.');
      } else {
        setError(err.response?.data?.message || 'Invalid username or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl mx-auto flex items-center justify-center border border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
            <Lock size={40} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Thakadar Login
            </h1>
            <p className="text-slate-500 text-sm mt-2 font-medium">Access your management dashboard</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="space-y-4 relative">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <User size={12} className="text-indigo-400" /> Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-14 px-5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700 font-medium"
                placeholder="Manager ID"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <ShieldCheck size={12} className="text-indigo-400" /> Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 px-5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700 font-medium"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-rose-400 text-xs font-bold text-center bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 animate-in shake duration-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all active:scale-[0.98] shadow-xl shadow-indigo-600/20 relative group/btn overflow-hidden"
            >
              {loading ? (
                <Loader2 className="animate-spin mx-auto" />
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>Sign In</span>
                  <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                </div>
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-slate-600 text-[10px] font-bold uppercase tracking-widest px-8">
          Authorized personnel only. Secure 90-day forensic attendance tracking active.
        </p>
      </div>
    </div>
  );
}
