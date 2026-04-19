import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { UserPlus, Trash2, Loader2, Phone, BadgeCheck, Camera, Image, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function EmployeeManager() {
  const [employees, setEmployees] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Worker');
  const [fathersName, setFathersName] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/employees`);
      setEmployees(data);
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        alert("OFFLINE: Cannot fetch worker list. Check internet.");
      }
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    try {
      await axios.post(`${API_URL}/employees`, { name, phone, role, profilePhoto, fathersName, aadhaarNumber });
      setName('');
      setPhone('');
      setFathersName('');
      setAadhaarNumber('');
      setProfilePhoto(null);
      fetchEmployees();
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        alert("NETWORK ERROR: Could not send worker data to cloud.");
      } else {
        alert("Failed to add worker: " + (err.response?.data?.message || "Internal Server Error"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this employee?")) return;
    try {
      await axios.delete(`${API_URL}/employees/${id}`);
      fetchEmployees();
    } catch (err) {
      alert("Failed to delete");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
          Manage Workers
        </h1>
        <p className="text-slate-400 text-sm">Add or remove staff. Photos help in quick identification.</p>
      </header>

      {/* Add Form */}
      <form onSubmit={handleAdd} className="bg-slate-900/50 p-6 rounded-[2rem] border border-slate-800 space-y-6 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="flex flex-col items-center gap-4 relative">
          <div className="relative group/photo">
            <div className="w-24 h-24 rounded-3xl bg-slate-950 border-2 border-dashed border-slate-800 overflow-hidden flex items-center justify-center relative transition-all group-hover/photo:border-emerald-500/50">
              {profilePhoto ? (
                <img src={profilePhoto} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <UserPlus size={32} className="text-slate-700 group-hover/photo:scale-110 transition-transform" />
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoUpload} 
                className="hidden" 
                accept="image/*" 
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center text-white"
              >
                <Camera size={20} />
              </button>
            </div>
            {profilePhoto && (
              <button 
                type="button"
                onClick={() => setProfilePhoto(null)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-xl"
              >
                <X size={14} />
              </button>
            )}
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2 text-center pointer-events-none">Worker Photo (Opt)</p>
          </div>

          <div className="w-full space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <input
                type="text"
                placeholder="Worker Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 px-4 bg-slate-950/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all font-medium"
                required
              />
              <input
                type="tel"
                placeholder="Phone (WhatsApp Number)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-12 px-4 bg-slate-950/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all font-medium"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Father's/Husband Name"
                  value={fathersName}
                  onChange={(e) => setFathersName(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-950/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all font-medium"
                />
                <input
                  type="text"
                  placeholder="Aadhaar / ID No."
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-950/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all font-medium"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Add to System'}
            </button>
          </div>
        </div>
      </form>

      {/* List */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Registered Workers ({employees.length})</h3>
        
        {fetching ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-slate-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {employees.length === 0 ? (
              <div className="text-center p-12 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                <p className="text-slate-500 text-sm">No workers yet. Use the form above.</p>
              </div>
            ) : (
              employees.map(emp => (
                <div key={emp._id} className="flex items-center justify-between p-3 bg-slate-900/40 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all group">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                      {emp.profilePhoto ? (
                        <img src={emp.profilePhoto} className="w-full h-full object-cover" alt={emp.name} />
                      ) : (
                        <span className="text-emerald-400 font-bold">{emp.name.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-100">{emp.name}</p>
                      <p className="text-[9px] sm:text-[10px] text-slate-500 flex flex-wrap items-center gap-1 font-medium italic">
                        S/O: {emp.fathersName || 'N/A'} | ID: {emp.aadhaarNumber || 'N/A'}
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 font-medium mt-0.5">
                        <Phone size={10} className="text-emerald-500" /> {emp.phone || 'No Contact'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <BadgeCheck size={18} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <button 
                      onClick={() => handleDelete(emp._id)}
                      className="p-2 text-slate-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
