import React, { useState } from 'react';
import { LayoutDashboard, Users, LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import EmployeeManager from './EmployeeManager';

export default function AdminHub() {
  const [activeTab, setActiveTab] = useState('history');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/login');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Admin Header & Sub-Nav */}
      <div className="flex flex-col gap-6">
        <header className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Settings className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Admin Hub</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Master Control Panel</p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl text-xs font-bold transition-all border border-rose-500/10"
          >
            <LogOut size={16} /> Logout
          </button>
        </header>

        {/* Sub-Tabs */}
        <div className="flex p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner group">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-sm ${
              activeTab === 'history' 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <LayoutDashboard size={18} />
            History
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-sm ${
              activeTab === 'manage' 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Users size={18} />
            Workers
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[60vh] animate-in slide-in-from-bottom-2 duration-300">
        {activeTab === 'history' ? <AdminDashboard /> : <EmployeeManager />}
      </div>
    </div>
  );
}
