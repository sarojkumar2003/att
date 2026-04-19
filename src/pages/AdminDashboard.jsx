import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Loader2, AlertCircle, RefreshCw, UserPlus, Clock, X, MapPin, Download, Stamp } from 'lucide-react';
import AttendanceTable from '../components/AttendanceTable';
import html2canvas from 'html2canvas';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function AdminDashboard() {
  const [history, setHistory] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [searchWorkerId, setSearchWorkerId] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [error, setError] = useState(null);

  // Manual Entry Form State
  const [manualForm, setManualForm] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    status: 'Present'
  });
  const [manualLoading, setManualLoading] = useState(false);

  // Card Generator State
  const [showCardGenerator, setShowCardGenerator] = useState(false);
  const [selectedCardWorkerId, setSelectedCardWorkerId] = useState('');
  const [selectedCardMonth, setSelectedCardMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM

  useEffect(() => {
    fetchHistory();
    fetchEmployees();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/attendance/history`);
      setHistory(data);
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        setError("NETWORK ERROR: Management dashboard cannot connect to the system. Check internet.");
      } else if (err.response?.status >= 500) {
        setError("DATABASE ERROR: The cloud cluster is having difficulty and responding slowly.");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/employees`);
      setEmployees(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setManualLoading(true);
    try {
      const timestamp = new Date(`${manualForm.date}T${manualForm.time}`);
      await axios.post(`${API_URL}/attendance`, {
        employeeId: manualForm.employeeId,
        status: manualForm.status,
        timestamp: timestamp,
        location: { lat: 0, lng: 0, address: 'Manual Entry by Admin' },
        photo: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&q=80&w=400'
      });
      setShowManual(false);
      fetchHistory();
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        alert("NETWORK FAILURE: Manual entry could not be saved to the cloud.");
      } else {
        alert("Manual entry failed: " + (err.response?.data?.message || "Internal Server Error"));
      }
    } finally {
      setManualLoading(false);
    }
  };

  const handleAction = async (id, status, record) => {
    try {
      let note = '';
      let dihadi = 0;

      if (status === 'Rejected') {
        note = prompt('Reason for rejection:');
        if (note === null) return;
      }
      
      if (status === 'Approved') {
        const hasClockOut = record && record.clockOutTime;
        
        // Always prompt for Dihadi during approval, but default to 1 if no auto-calculation exists
        const currentDihadi = record && record.dihadi > 0 ? record.dihadi.toString() : (hasClockOut ? '1' : '1');
        const amount = prompt(hasClockOut ? 'Shift complete. Enter Dihadi count:' : 'Clock-In only. Manually enter Dihadi?', currentDihadi);
        
        if (amount === null) return;
        dihadi = Number(amount) || 0;
      }
      
      const recordId = id || (record && record._id);
      if (!recordId) throw new Error("Missing Record ID");
      
      await axios.put(`${API_URL}/attendance/approve/${id}`, {
        status,
        adminNote: note || '',
        dihadi
      });
      fetchHistory();
    } catch (err) {
      alert("Failed to update status. Please try again.");
    }
  };

  const filteredHistory = history.filter(r => {
    const matchesStatus = filter === 'All' || 
                         (filter === 'Pending' && (r.status === 'Pending' || r.status === 'Regularized'));
    const recEmpId = typeof r.employeeId === 'object' ? r.employeeId?._id : r.employeeId;
    const matchesWorker = !searchWorkerId || recEmpId === searchWorkerId;
    return matchesStatus && matchesWorker;
  });

  const pendingCount = history.filter(r => r.status === 'Pending' || r.status === 'Regularized').length;

  const allWorkersForDropdown = [...employees];

  const cardWorker = allWorkersForDropdown.find(e => e._id === selectedCardWorkerId);

  const getAdminMonthlyTally = () => {
    // Determine records for the time range
    const timeRangeRecords = history.filter(rec => {
      if (!selectedCardMonth) return true;
      const d = new Date(rec.timestamp);
      const [y, m] = selectedCardMonth.split('-');
      const targetYear = parseInt(y, 10);
      const targetMonth = parseInt(m, 10) - 1;
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    if (selectedCardWorkerId === 'ALL') {
      // TEAM MODE: Return all approved records for ACTIVE workers for the month, sorted by date
      const activeIds = new Set(employees.map(e => e._id.toString()));
      
      const allApproved = timeRangeRecords
        .filter(r => {
          if (r.status !== 'Approved' && r.status !== 'Present') return false;
          const eId = typeof r.employeeId === 'object' ? r.employeeId?._id?.toString() : r.employeeId?.toString();
          return activeIds.has(eId);
        })
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      const totalTeamDihadi = allApproved.reduce((sum, rec) => sum + (rec.dihadi || 0), 0);

      return {
        isTeam: true,
        present: allApproved.length,
        pending: timeRangeRecords.filter(r => r.status === 'Pending' || r.status === 'Regularized').length,
        earnings: totalTeamDihadi,
        records: allApproved
      };
    }

    // INDIVIDUAL MODE
    const workerRecords = timeRangeRecords.filter(rec => {
      const recEmpId = typeof rec.employeeId === 'object' ? rec.employeeId?._id?.toString() : rec.employeeId?.toString();
      const targetEmpId = selectedCardWorkerId?.toString();
      return recEmpId === targetEmpId;
    });

    const presentRecords = workerRecords.filter(r => r.status === 'Present' || r.status === 'Approved');
    const totalDihadi = presentRecords.reduce((sum, rec) => sum + (rec.dihadi || 0), 0);

    return {
      isTeam: false,
      present: presentRecords.length,
      pending: workerRecords.filter(r => r.status === 'Pending' || r.status === 'Regularized').length,
      earnings: totalDihadi,
      records: workerRecords
    };
  };

  const handleDownloadAdminCard = async () => {
    const cardElement = document.getElementById('admin-report-card-capture');
    if (!cardElement) return;
    try {
      const canvas = await html2canvas(cardElement, {
        scale: 3, 
        useCORS: true,
        backgroundColor: '#0f172a'
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      const fileName = selectedCardWorkerId === 'ALL' ? 'TeamMasterReport' : `ReportCard_${cardWorker?.name || 'Worker'}`;
      link.download = `${fileName}.png`;
      link.click();
    } catch (err) {
      alert("Failed to save picture.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
        <p className="text-slate-400">Loading Master Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* High-Fidelity System Alerts */}
      {error && (
        <div className="bg-rose-500/10 border-2 border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 shadow-lg mb-4">
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

      {/* Stats Cards Section */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Panel Master
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-tighter">Forensic Ledger & Intelligence</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative group">
            <select 
              className="h-10 bg-slate-900 border border-slate-800 rounded-xl px-4 text-[11px] font-black text-slate-300 outline-none focus:border-indigo-500 transition-all appearance-none pr-8 min-w-[140px]"
              value={searchWorkerId}
              onChange={(e) => setSearchWorkerId(e.target.value)}
            >
              <option value="">Filter by Worker...</option>
              {allWorkersForDropdown.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-hover:text-indigo-400 transition-colors">
              <RefreshCw size={12} className={searchWorkerId ? 'rotate-45' : ''}/>
            </div>
          </div>

          <button 
            onClick={() => setShowCardGenerator(true)}
            className="flex items-center gap-2 px-4 h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xl shadow-emerald-600/20 active:scale-95"
          >
            <Stamp size={16} /> Print Cards
          </button>
          <button 
            onClick={() => setShowManual(true)}
            className="flex items-center gap-2 px-4 h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xl shadow-indigo-600/10 active:scale-95"
          >
            <UserPlus size={16} /> Manual
          </button>
          <button 
            onClick={fetchHistory}
            className="w-10 h-10 flex items-center justify-center bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-indigo-400 active:scale-95 transition-all"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {showManual && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6 shadow-3xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Clock className="text-indigo-400" /> Manual Entry
              </h3>
              <button onClick={() => setShowManual(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Select Worker</label>
                <select 
                  className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-sm font-medium outline-none focus:border-indigo-500 transition-colors appearance-none"
                  value={manualForm.employeeId}
                  onChange={(e) => setManualForm({...manualForm, employeeId: e.target.value})}
                  required
                >
                  <option value="">Choose Worker...</option>
                  {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Date</label>
                  <input 
                    type="date" 
                    className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-sm font-medium outline-none focus:border-indigo-500 transition-colors"
                    value={manualForm.date}
                    onChange={(e) => setManualForm({...manualForm, date: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Time</label>
                  <input 
                    type="time" 
                    className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-sm font-medium outline-none focus:border-indigo-500 transition-colors"
                    value={manualForm.time}
                    onChange={(e) => setManualForm({...manualForm, time: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Attendance Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setManualForm({...manualForm, status: 'Present'})}
                    className={`h-11 rounded-xl text-xs font-bold transition-all ${manualForm.status === 'Present' ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}
                  >
                    PRESENT
                  </button>
                  <button 
                    type="button"
                    onClick={() => setManualForm({...manualForm, status: 'Regularized'})}
                    className={`h-11 rounded-xl text-xs font-bold transition-all ${manualForm.status === 'Regularized' ? 'bg-amber-600 text-white' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}
                  >
                    REGULARIZED
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={manualLoading}
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold mt-4 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center"
              >
                {manualLoading ? <Loader2 className="animate-spin text-white" /> : 'Log Manual Record'}
              </button>
            </form>
          </div>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-[1.5rem] p-4 flex items-center justify-between shadow-lg shadow-amber-500/5 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="font-bold text-amber-400 text-sm">Action Required</p>
              <p className="text-xs text-slate-400">{pendingCount} pending entries found.</p>
            </div>
          </div>
          <button 
            onClick={() => setFilter(filter === 'Pending' ? 'All' : 'Pending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === 'Pending' ? 'bg-amber-500 text-black' : 'bg-slate-800 text-amber-400 border border-amber-500/30'}`}
          >
            {filter === 'Pending' ? 'Show All' : 'Review Now'}
          </button>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Calendar size={14} /> Historical Ledger ({filteredHistory.length})
          </h3>
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button 
              onClick={() => setFilter('All')}
              className={`px-4 py-1 text-[10px] font-bold rounded-lg transition-all ${filter === 'All' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500'}`}
            >
              ALL
            </button>
            <button 
              onClick={() => setFilter('Pending')}
              className={`px-4 py-1 text-[10px] font-bold rounded-lg transition-all ${filter === 'Pending' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500'}`}
            >
              PENDING
            </button>
          </div>
        </div>
        
        <div className="animate-in fade-in zoom-in-95 duration-500">
          <AttendanceTable records={filteredHistory} onAction={handleAction} />
        </div>
      </div>

      {showCardGenerator && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-start py-8 px-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto custom-scrollbar">
          
          <div className="w-full max-w-sm bg-slate-950 p-4 rounded-3xl border border-slate-800 flex flex-col gap-3 shrink-0 shadow-2xl relative z-20 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-sm flex items-center gap-2"><Stamp size={14} className="text-emerald-500" /> Select Worker Card</h3>
              <button onClick={() => setShowCardGenerator(false)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select 
                className="w-full h-12 bg-slate-900 border border-slate-800 rounded-xl px-4 text-sm font-medium text-white outline-none focus:border-indigo-500 transition-all appearance-none pr-8 min-w-[140px]"
                value={selectedCardWorkerId}
                onChange={(e) => setSelectedCardWorkerId(e.target.value)}
              >
                <option value="">Choose worker...</option>
                <option value="ALL" className="font-bold text-emerald-400">📊 ALL WORKERS (Team Summary)</option>
                <hr className="my-1 border-slate-800" />
                {allWorkersForDropdown.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
              </select>
              
              <input 
                type="month"
                className="w-full h-12 bg-slate-900 border border-slate-800 rounded-xl px-4 text-sm font-medium text-white outline-none focus:border-indigo-500 transition-colors"
                value={selectedCardMonth}
                onChange={(e) => setSelectedCardMonth(e.target.value)}
              />
            </div>

            {selectedCardWorkerId && (
               <button 
                 onClick={handleDownloadAdminCard}
                 className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
               >
                 <Download size={16} /> Save Picture
               </button>
            )}
          </div>

          {/* Individual Worker Error State */}
          {selectedCardWorkerId && !cardWorker && selectedCardWorkerId !== 'ALL' && (
             <div className="p-8 text-center text-slate-500 font-bold animate-pulse shrink-0">Select a valid worker...</div>
          )}

          {/* Corrected: Authentic Dihadi Card UI (Traditional Labour Card Style) */}
          {((selectedCardWorkerId === 'ALL') || (selectedCardWorkerId && cardWorker)) && (
             <div className="w-full overflow-visible flex justify-center origin-top scale-[0.85] xs:scale-[0.9] sm:scale-100 transition-transform duration-300">
                <div 
                  id="admin-report-card-capture"
                  className={`w-full max-w-sm rounded-[1rem] border-4 border-slate-900 p-0 flex flex-col shadow-2xl relative overflow-hidden shrink-0 mb-8 mt-6 bg-white`}
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
                        {selectedCardWorkerId === 'ALL' ? (
                           <div className="flex -space-x-4">
                              <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-white font-black text-xs">1</div>
                              <div className="w-10 h-10 rounded-full bg-slate-700 border-2 border-white flex items-center justify-center text-white font-black text-xs z-10">2</div>
                           </div>
                        ) : cardWorker?.profilePhoto ? (
                          <img src={cardWorker.profilePhoto} alt="Profile" className="w-full h-full object-cover grayscale contrast-125" crossOrigin="anonymous" />
                        ) : (
                           <span className="text-4xl font-black text-slate-300">{cardWorker?.name?.charAt(0)}</span>
                        )}
                        <div className="absolute inset-0 border-[0.5px] border-black/10 pointer-events-none"></div>
                      </div>

                      <div className="flex-1 space-y-1.5 pt-1">
                         <div className="border-b border-slate-300 pb-0.5">
                            <span className="text-[9px] font-black uppercase text-slate-400 block leading-none mb-0.5">Worker Name</span>
                            <h1 className="text-lg font-black uppercase leading-none truncate">{selectedCardWorkerId === 'ALL' ? 'ALL WORKERS' : cardWorker?.name}</h1>
                         </div>
                         <div className="border-b border-slate-300 pb-0.5">
                            <span className="text-[9px] font-black uppercase text-slate-400 block leading-none mb-0.5">Father's Name</span>
                            <span className="text-[12px] font-bold uppercase block leading-none truncate">{cardWorker?.fathersName || '________________'}</span>
                         </div>
                         <div className="border-b border-slate-300 pb-0.5">
                            <span className="text-[9px] font-black uppercase text-slate-400 block leading-none mb-0.5">Worker ID / Aadhaar</span>
                            <span className="text-[12px] font-bold uppercase block leading-none truncate tracking-wider">{cardWorker?.aadhaarNumber || '________________'}</span>
                         </div>
                         <div className="border-b border-slate-300 pb-0.5">
                            <span className="text-[9px] font-black uppercase text-slate-400 block leading-none mb-0.5">Mobile</span>
                            <span className="text-[12px] font-bold block leading-none">{cardWorker?.phone || 'N/A'}</span>
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
                         <span className="text-[14px] font-black">{getAdminMonthlyTally().present}</span>
                      </div>
                      <div className="border-2 border-slate-900 p-2 flex flex-col items-center bg-slate-900 text-white">
                         <span className="text-[8px] font-black uppercase opacity-60">Dihadi</span>
                         <span className="text-[16px] font-black">{getAdminMonthlyTally().earnings}</span>
                      </div>
                   </div>

                   {/* The 1-31 Grid for Individual View */}
                   {!getAdminMonthlyTally().isTeam && (
                      <div className="space-y-2">
                         <div className="flex items-center gap-2">
                            <div className="h-px bg-slate-300 flex-1"></div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Monthly Attendance Ledger</span>
                            <div className="h-px bg-slate-300 flex-1"></div>
                         </div>
                         <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: 31 }, (_, i) => {
                               const day = i + 1;
                               const recordsForDay = getAdminMonthlyTally().records.filter(r => new Date(r.timestamp).getDate() === day);
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
                   )}

                   {/* Detailed Ledger / Team Table Area */}
                   <div className="w-full border-t-2 border-slate-900 pt-4">
                     <h3 className="text-[10px] font-black uppercase tracking-widest text-center mb-3">
                        {getAdminMonthlyTally().isTeam ? 'Consolidated Team Log' : 'Verified Entry History'}
                     </h3>
                     
                     {getAdminMonthlyTally().isTeam ? (
                        // TEAM MASTER TABLE
                        <table className="w-full text-left border-collapse border border-slate-900">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-900">
                              <th className="py-1.5 px-2 text-[8px] font-black uppercase border-r border-slate-900">Worker</th>
                              <th className="py-1.5 px-2 text-[8px] font-black uppercase text-center border-r border-slate-900">In Date</th>
                              <th className="py-1.5 px-2 text-[8px] font-black uppercase text-center border-r border-slate-900">Out Date</th>
                              <th className="py-1.5 px-2 text-[8px] font-black uppercase text-center border-r border-slate-900">In Time</th>
                              <th className="py-1.5 px-2 text-[8px] font-black uppercase text-center border-r border-slate-900">Out Time</th>
                              <th className="py-1.5 px-2 text-[8px] font-black uppercase text-right">Dihadi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getAdminMonthlyTally().records.map((rec, i) => (
                              <tr key={i} className="border-b border-slate-300 text-[9px] font-bold">
                                <td className="py-1.5 px-2 border-r border-slate-300 uppercase truncate max-w-[70px]">{rec.employeeId?.name || rec.workerName}</td>
                                <td className="py-1.5 px-2 text-center border-r border-slate-300 whitespace-nowrap">{new Date(rec.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                                <td className="py-1.5 px-2 text-center border-r border-slate-300 whitespace-nowrap">{rec.clockOutTime ? new Date(rec.clockOutTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '---'}</td>
                                <td className="py-1.5 px-2 text-center border-r border-slate-300 text-emerald-600">
                                   {new Date(rec.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </td>
                                <td className="py-1.5 px-2 text-center border-r border-slate-300 text-amber-600">
                                   {rec.clockOutTime ? new Date(rec.clockOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '---'}
                                </td>
                                <td className="py-1.5 px-2 text-right font-black">{rec.dihadi || 0}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                     ) : (
                        // INDIVIDUAL LOG
                        <div className="space-y-1">
                           {getAdminMonthlyTally().records.slice(0, 15).map((rec, i) => (
                              <div key={i} className="flex items-center justify-between text-[10px] font-bold border-b border-slate-100 pb-1">
                                 <div className="flex flex-col">
                                    <span className="uppercase text-[8px] leading-none opacity-40">In: {new Date(rec.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                    {rec.clockOutTime && <span className="uppercase text-[8px] leading-none opacity-40">Out: {new Date(rec.clockOutTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>}
                                 </div>
                                 <span className="opacity-60">{new Date(rec.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} → {rec.clockOutTime ? new Date(rec.clockOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Working'}</span>
                                 <span className="font-black">D: {rec.dihadi}</span>
                              </div>
                           ))}
                           {getAdminMonthlyTally().records.length === 0 && <div className="text-center py-4 text-xs opacity-40 italic">No attendance records documented.</div>}
                        </div>
                     )}
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
       )}

        </div>
      )}

    </div>
  );
}
