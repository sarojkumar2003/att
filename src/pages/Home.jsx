import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, MapPin, CheckCircle2, AlertCircle, Loader2, Camera, History, CalendarDays, Download, Stamp, X } from 'lucide-react';
import PhotoCapture from '../components/PhotoCapture';
import AttendanceTable from '../components/AttendanceTable';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';

const API_URL = (import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'production' ? '' : 'http://localhost:5000')).replace(/\/api$/, '') + '/api';

export default function Home() {
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [photo, setPhoto] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingEmployees, setFetchingEmployees] = useState(true);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [showReportCard, setShowReportCard] = useState(false);
  const [selectedCardMonth, setSelectedCardMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [status, setStatus] = useState('Present');
  const [myHistory, setMyHistory] = useState([]);

  useEffect(() => {
    fetchEmployees();
    captureLocation();
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchMyHistory();
    } else {
      setMyHistory([]);
      setStatus('Present');
      setPhoto(null);
      setError(null);
    }
  }, [selectedId]);

  const fetchEmployees = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/employees`);
      setEmployees(data);
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        setError("Network Error: Cannot reach server. Check your internet connection or if the system is offline.");
      } else if (err.response?.status >= 500) {
        setError("Database Error: Cloud cluster is responding slowly or disconnected.");
      } else {
        setError("Failed to load employees. Please contact admin.");
      }
    } finally {
      setFetchingEmployees(false);
    }
  };

  const fetchMyHistory = async () => {
    setFetchingHistory(true);
    try {
      const { data } = await axios.get(`${API_URL}/attendance/employee/${selectedId}`);
      setMyHistory(data);
    } catch (err) {
      console.error("History fetch error", err);
    } finally {
      setFetchingHistory(false);
    }
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      (err) => {
        setError("Location access denied. Please enable GPS to mark attendance.");
      }
    );
  };

  // Determine current state based on today's records
  const getTodayRecord = () => {
    const now = new Date();
    return myHistory.find(rec => {
      const d = new Date(rec.timestamp);
      return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  };

  const latestToday = getTodayRecord();
  const isActiveShift = latestToday && !latestToday.clockOutTime;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedId || !photo || (!location && status !== 'Regularized')) {
      setError("Please select yourself, take a photo, and ensure GPS is on.");
      return;
    }

    setLoading(true);
    setError(null);

    const type = isActiveShift ? 'clockOut' : 'clockIn';

    try {
      await axios.post(`${API_URL}/attendance`, {
        employeeId: selectedId,
        photo,
        location: location || { lat: 0, lng: 0, address: 'GPS Failure/Regularized' },
        status: status,
        type: type
      });
      
      setSuccess(true);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#ec4899']
      });

      // Refresh history so the UI updates
      fetchMyHistory();

      // Reset
      setTimeout(() => {
        setSuccess(false);
        setPhoto(null);
      }, 3000);

    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        setError("NETWORK OFFLINE: Your attendance could not be uploaded. Check your internet.");
      } else if (err.response?.status >= 500) {
        setError("DATABASE ERROR: The cloud database is temporarily unavailable. Try again in 1 minute.");
      } else {
        setError(err.response?.data?.message || "Something went wrong. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getMonthlyTally = () => {
    if (!selectedCardMonth) return { present: 0, pending: 0, earnings: 0, records: [] };
    const [y, m] = selectedCardMonth.split('-');
    const targetYear = parseInt(y, 10);
    const targetMonth = parseInt(m, 10) - 1;

    const currentMonthRecords = myHistory.filter(rec => {
      const d = new Date(rec.timestamp);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    const presentRecords = currentMonthRecords.filter(r => r.status === 'Present' || r.status === 'Approved');
    const totalDihadi = presentRecords.reduce((sum, rec) => sum + (rec.dihadi || 0), 0);

    return {
      present: presentRecords.length,
      pending: currentMonthRecords.filter(r => r.status === 'Pending' || r.status === 'Regularized').length,
      earnings: totalDihadi,
      records: currentMonthRecords
    };
  };

  const handleCancelRecord = async (id) => {
    try {
      await axios.delete(`${API_URL}/attendance/cancel/${id}`);
      fetchMyHistory();
      // If we deleted today's clock In, reset state
      setStatus('Present');
      setPhoto(null);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel record. It may be too old or already processed.");
    }
  };

  const currentEmployee = employees.find(e => e._id === selectedId);

  const handleDownloadCard = async () => {
    const cardElement = document.getElementById('report-card-capture');
    if (!cardElement) return;
    
    try {
      const canvas = await html2canvas(cardElement, {
        scale: 3, // High resolution for mobile
        useCORS: true,
        backgroundColor: '#ffffff' // Pure white background for paper card 
      });
      
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `Attendance_${currentEmployee?.name || 'Worker'}.png`;
      link.click();
    } catch (err) {
      alert("Failed to save picture.");
    }
  };

  if (fetchingEmployees) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
        <p className="text-slate-400 animate-pulse">Initializing System...</p>
      </div>
    );
  }

  const tally = getMonthlyTally();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="space-y-1 text-center">
        <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
          Mark Attendance
        </h1>
      </header>
      
      {/* High-Fidelity System Alerts */}
      {error && (
        <div className="bg-rose-500/10 border-2 border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 shadow-lg">
          <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20">
            <AlertCircle className="text-white" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-rose-400 font-black text-xs uppercase tracking-widest">System Alert</h3>
            <p className="text-rose-500/80 text-[11px] font-bold leading-tight mt-0.5">{error}</p>
          </div>
          <button 
            onClick={() => setError(null)}
            className="p-2 hover:bg-rose-500/10 text-rose-500/50 hover:text-rose-500 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Visual Worker Selection Grid */}
      <div className="bg-slate-900/60 p-4 rounded-3xl border border-slate-800 shadow-xl">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
          {employees.map(emp => (
            <button
              key={emp._id}
              type="button"
              onClick={() => setSelectedId(emp._id)}
              className={`flex flex-col items-center gap-2 p-3 rounded-[1.5rem] border-2 transition-all active:scale-95 ${
                selectedId === emp._id 
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20' 
                  : 'border-slate-800 bg-slate-950/50 grayscale hover:grayscale-0 hover:border-slate-700'
              }`}
            >
              <div className="w-14 h-14 rounded-[1.1rem] overflow-hidden bg-slate-900 flex items-center justify-center shadow-inner">
                {emp.profilePhoto ? (
                  <img src={emp.profilePhoto} className="w-full h-full object-cover" alt={emp.name} />
                ) : (
                  <span className="text-2xl font-black text-indigo-500">{emp.name.charAt(0)}</span>
                )}
              </div>
              <span className={`text-[10px] font-bold text-center leading-tight truncate w-full ${selectedId === emp._id ? 'text-indigo-300' : 'text-slate-400'}`}>
                {emp.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {success ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center gap-4 animate-in zoom-in duration-300 shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/40">
            <CheckCircle2 size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-emerald-400">Success!</h2>
          <p className="text-emerald-500/70 text-sm font-bold">Your time has been recorded.</p>
        </div>
      ) : (
        selectedId && (
          <form onSubmit={handleSubmit} className="space-y-4 animate-in slide-in-from-top-4 duration-300">
            
            {/* Action State Indicator */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between text-sm shadow-inner">
              <span className="font-bold text-slate-400">Action:</span>
              <span className={`px-3 py-1 rounded-lg font-black uppercase text-[10px] tracking-widest ${!isActiveShift ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-500'}`}>
                {!isActiveShift ? 'Clocking In' : 'Clocking Out'}
              </span>
            </div>

            <div className="space-y-2">
              <PhotoCapture onCapture={setPhoto} />
            </div>

            {/* Location Status */}
            <div className={`p-4 rounded-2xl border flex items-center gap-3 transition-colors ${location ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-400'}`}>
              <MapPin size={20} className={location ? 'animate-bounce' : ''} />
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest">GPS Sensor</p>
                <p className="text-xs font-bold mt-0.5">{location ? `Secure (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})` : 'Disconnected'}</p>
              </div>
              {location && <CheckCircle2 size={16} />}
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl flex items-start gap-3 animate-in shake duration-300">
                <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold leading-tight">{error}</p>
                  {!location && (
                    <button 
                      type="button"
                      onClick={() => { setStatus('Regularized'); setError(null); }}
                      className="text-[10px] font-black uppercase tracking-widest bg-rose-500 text-white px-3 py-1.5 rounded-lg mt-3 hover:bg-rose-600 active:scale-95 transition-all"
                    >
                      Send Manual Request
                    </button>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (!location && status !== 'Regularized') || !photo}
              className={`w-full h-16 rounded-2xl font-black text-lg shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${
                loading || (!location && status !== 'Regularized') || !photo 
                  ? 'bg-slate-900 text-slate-600 cursor-not-allowed border-2 border-slate-800' 
                  : !isActiveShift
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                    : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/30'
              }`}
            >
              {loading ? <Loader2 className="animate-spin" /> : status === 'Regularized' ? 'Send Manual Req' : (!isActiveShift ? 'CLOCK IN NOW' : 'CLOCK OUT NOW')}
            </button>
            
            {/* Private Summary Dashboard */}
            <div className="pt-6 border-t border-slate-800/50 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays size={16} className="text-indigo-400" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">Monthly Summary</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-emerald-400">{tally.present}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/50 mt-1">Days Present</span>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
                  <span className="text-2xl font-black text-amber-400">{tally.pending}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-amber-500/50 mt-1">Pending Admin</span>
                  {tally.pending > 0 && <div className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-full m-3 animate-ping" />}
                </div>
              </div>

              <div className="pt-4">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <History size={14} className="text-indigo-400" /> Timestamps
                  </h3>
                  <div className="flex items-center gap-3">
                    {fetchingHistory && <Loader2 size={12} className="animate-spin text-slate-600" />}
                    <button
                      type="button"
                      onClick={() => setShowReportCard(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg"
                    >
                      <Stamp size={12} /> My Card
                    </button>
                  </div>
                </div>
                <AttendanceTable records={myHistory} showEmployeeName={false} onWorkerCancel={handleCancelRecord} />
              </div>
            </div>
          </form>
        )
      )}

      {/* Visual Report Card Modal */}
      {showReportCard && currentEmployee && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-start py-10 px-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto custom-scrollbar">
          
          {/* Corrected: Authentic Dihadi Card UI (Traditional Labour Card Style) for Worker */}
          <div className="w-full overflow-visible flex justify-center origin-top scale-[0.85] xs:scale-[0.9] sm:scale-100 transition-transform duration-300">
            <div 
              id="report-card-capture"
              className={`w-full max-w-sm rounded-[1rem] border-4 border-slate-900 p-0 flex flex-col shadow-2xl relative overflow-hidden shrink-0 mb-8 mt-10 bg-white`}
              style={{ color: '#000' }}
            >
             {/* Header Section */}
             <div className="bg-slate-900 text-white p-4 text-center">
                <h2 className="text-xl font-black uppercase tracking-widest leading-none">Attendance Card</h2>
                <p className="text-[10px] font-bold opacity-70 tracking-[0.2em] mt-1 uppercase">Official Labour Ledger</p>
             </div>

             <div className="p-6 space-y-6">
                {/* Worker Info & Photo */}
                <div className="flex gap-4 items-start">
                   <div className="w-24 h-28 border-2 border-slate-900 rounded-sm bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative group">
                     {currentEmployee.profilePhoto ? (
                       <img src={currentEmployee.profilePhoto} alt="Profile" className="w-full h-full object-cover grayscale contrast-125" crossOrigin="anonymous" />
                     ) : (
                        <span className="text-4xl font-black text-slate-300">{currentEmployee.name.charAt(0)}</span>
                     )}
                     <div className="absolute inset-0 border-[0.5px] border-black/10 pointer-events-none"></div>
                   </div>

                   <div className="flex-1 space-y-1.5 pt-1">
                      <div className="border-b border-slate-300 pb-0.5">
                         <span className="text-[9px] font-black uppercase text-slate-400 block leading-none mb-0.5">Worker Name</span>
                         <h1 className="text-lg font-black uppercase leading-none truncate">{currentEmployee.name}</h1>
                      </div>
                      <div className="border-b border-slate-300 pb-0.5">
                         <span className="text-[9px] font-black uppercase text-slate-400 block leading-none mb-0.5">Father's Name</span>
                         <span className="text-[12px] font-bold uppercase block leading-none truncate">{currentEmployee.fathersName || '________________'}</span>
                      </div>
                      <div className="border-b border-slate-300 pb-0.5">
                         <span className="text-[9px] font-black uppercase text-slate-400 block leading-none mb-0.5">Worker ID / Aadhaar</span>
                         <span className="text-[12px] font-bold uppercase block leading-none truncate tracking-wider">{currentEmployee.aadhaarNumber || '________________'}</span>
                      </div>
                      <div className="border-b border-slate-300 pb-0.5">
                         <span className="text-[9px] font-black uppercase text-slate-400 block leading-none mb-0.5">Mobile</span>
                         <span className="text-[12px] font-bold block leading-none">{currentEmployee.phone || 'N/A'}</span>
                      </div>
                   </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2">
                   <div className="border-2 border-slate-900 p-2 flex flex-col items-center">
                      <span className="text-[8px] font-black uppercase">Month</span>
                      <span className="text-[11px] font-black uppercase">
                         {selectedCardMonth ? new Date(selectedCardMonth).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Total'}
                      </span>
                   </div>
                   <div className="border-2 border-slate-900 p-2 flex flex-col items-center">
                      <span className="text-[8px] font-black uppercase">Present</span>
                      <span className="text-[14px] font-black">{tally.present}</span>
                   </div>
                   <div className="border-2 border-slate-900 p-2 flex flex-col items-center bg-slate-900 text-white">
                      <span className="text-[8px] font-black uppercase opacity-60">Dihadi</span>
                      <span className="text-[16px] font-black">{tally.earnings}</span>
                   </div>
                </div>

                {/* The 1-31 Grid */}
                <div className="space-y-2">
                   <div className="flex items-center gap-2">
                      <div className="h-px bg-slate-300 flex-1"></div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Monthly Attendance Ledger</span>
                      <div className="h-px bg-slate-300 flex-1"></div>
                   </div>
                   <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 31 }, (_, i) => {
                         const day = i + 1;
                         const recordsForDay = tally.records.filter(r => new Date(r.timestamp).getDate() === day);
                         const dihadiCount = recordsForDay.reduce((sum, r) => sum + (r.dihadi || 0), 0);
                         const isPresent = recordsForDay.length > 0;
                         
                         return (
                            <div key={day} className={`aspect-square border border-slate-400 flex flex-col items-center justify-center relative ${isPresent ? 'bg-emerald-50' : ''}`}>
                               <span className={`text-[8px] font-bold absolute top-0.5 right-1 ${isPresent ? 'text-emerald-600' : 'text-slate-400'}`}>{day}</span>
                               {isPresent && (
                                  <div className="flex flex-col items-center">
                                     <span className="text-[11px] font-black leading-none text-emerald-700">P</span>
                                     <span className="text-[7px] font-bold text-slate-500 leading-none mt-0.5">{dihadiCount > 0 ? `(${dihadiCount})` : ''}</span>
                                  </div>
                               )}
                            </div>
                         );
                      })}
                   </div>
                </div>

                {/* Detailed Verified History */}
                <div className="w-full border-t-2 border-slate-900 pt-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-center mb-3">Verified Entry History</h3>
                  <div className="space-y-1">
                     {tally.records.slice(0, 15).map((rec, i) => (
                        <div key={i} className="flex items-center justify-between text-[10px] font-bold border-b border-slate-100 pb-1">
                           <div className="flex flex-col">
                              <span className="uppercase text-[8px] leading-none opacity-40">In: {new Date(rec.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                              {rec.clockOutTime && <span className="uppercase text-[8px] leading-none opacity-40">Out: {new Date(rec.clockOutTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>}
                           </div>
                           <span className="opacity-60">{new Date(rec.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} → {rec.clockOutTime ? new Date(rec.clockOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Working'}</span>
                           <span className="font-black">D: {rec.dihadi}</span>
                        </div>
                     ))}
                     {tally.records.length === 0 && <div className="text-center py-4 text-xs opacity-40 italic">No attendance records documented.</div>}
                  </div>
                </div>

                {/* Footer: Signatures */}
                <div className="grid grid-cols-2 gap-8 pt-8 px-2">
                   <div className="border-t border-slate-900 pt-1 text-center">
                      <span className="text-[8px] font-black uppercase block">Worker's Thumb/Sign</span>
                   </div>
                   <div className="border-t border-slate-900 pt-1 text-center relative">
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-16 h-16 border-2 border-indigo-600/30 rounded-full flex items-center justify-center text-indigo-600/30 font-black text-[8px] rotate-12 bg-white/50">
                         STAMP HERE
                      </div>
                      <span className="text-[8px] font-black uppercase block">Authorised Thakadar</span>
                   </div>
                </div>
                
                <p className="text-[7px] font-black uppercase text-center opacity-40 mt-4 tracking-tighter">
                   Computer Generated Document. Verified by Forensic Thakadar System {new Date().toLocaleDateString()}
                </p>
             </div>
          </div>
       </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col items-center gap-4 w-full max-w-sm">
            <div className="flex items-center gap-4 w-full">
              <button 
                onClick={handleDownloadCard}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(99,102,241,0.4)] active:scale-95 transition-all flex-1"
              >
                <Download size={20} /> Save Picture
              </button>
              <button 
                onClick={() => setShowReportCard(false)}
                className="p-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl shadow-xl active:scale-95 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="w-full flex flex-col items-center gap-1.5 mt-2 bg-slate-900 border border-slate-800 p-4 rounded-[2rem]">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Historical Month</span>
              <input 
                type="month"
                className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-sm font-medium text-white outline-none focus:border-indigo-500 transition-colors"
                value={selectedCardMonth}
                onChange={(e) => setSelectedCardMonth(e.target.value)}
              />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
