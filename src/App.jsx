import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { UserCheck, Shield } from 'lucide-react';
import Home from './pages/Home';
import AdminHub from './pages/AdminHub';
import Login from './pages/Login';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const Navigation = () => {
  const location = useLocation();
  const isAdmin = !!localStorage.getItem('adminToken');

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-fit z-50">
      <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 bg-slate-900/80 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] shadow-2xl">
        <Link 
          to="/" 
          className={`flex items-center gap-2 px-5 sm:px-8 py-3 rounded-[2rem] transition-all hover:bg-white/[0.03] active:scale-95 ${
            location.pathname === '/' 
              ? 'text-indigo-400 bg-indigo-500/10 shadow-[inset_0_0_20px_rgba(99,102,241,0.1)]' 
              : 'text-slate-500 hover:text-slate-400'
          }`}
        >
          <UserCheck size={18} className="sm:w-5 sm:h-5 shrink-0" />
          <span className="text-[12px] sm:text-xs font-black uppercase tracking-widest whitespace-nowrap">Attendance</span>
        </Link>
        <Link 
          to="/admin" 
          className={`flex items-center gap-2 px-5 sm:px-8 py-3 rounded-[2rem] transition-all hover:bg-white/[0.03] active:scale-95 ${
            location.pathname.startsWith('/admin') || location.pathname === '/login'
              ? 'text-indigo-400 bg-indigo-500/10 shadow-[inset_0_0_20px_rgba(99,102,241,0.1)]' 
              : 'text-slate-500 hover:text-slate-400'
          }`}
        >
          <Shield size={18} className="sm:w-5 sm:h-5 shrink-0" />
          <span className="text-[12px] sm:text-xs font-black uppercase tracking-widest whitespace-nowrap">Admin Hub</span>
        </Link>
      </div>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
        <Navigation />

        {/* Page Content */}
        <main className="pb-32 pt-10 px-4 max-w-2xl mx-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminHub />
              </ProtectedRoute>
            } />
            
            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
