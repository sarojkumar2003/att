import React, { useState } from 'react';
import { MapPin, Camera, Clock, User, AlertTriangle, X } from 'lucide-react';

export default function AttendanceTable({ records, showEmployeeName = true, onAction = null, onWorkerCancel = null }) {
  const [fullscreenImage, setFullscreenImage] = useState(null);

  if (!records || records.length === 0) {
    return (
      <div className="text-center p-8 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
        <p className="text-slate-500 text-sm italic">No entries found in the forensic ledger.</p>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  const isCancelable = (record) => {
    if (record.status !== 'Pending' && record.status !== 'Regularized') return false;
    const now = Date.now();
    const recordTime = new Date(record.timestamp).getTime();
    return (now - recordTime) < (60 * 60 * 1000); // 1 hour window
  };

  return (
    <div className="w-full overflow-x-auto rounded-[1.5rem] border border-slate-800 bg-slate-900/30 shadow-2xl">
      <table className="w-full text-left border-collapse min-w-[650px]">
        <thead>
          <tr className="bg-slate-950/50 border-b border-slate-800">
            {showEmployeeName && <th className="p-2.5 sm:p-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Identity</th>}
            <th className="p-2.5 sm:p-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chronology</th>
            <th className="p-2.5 sm:p-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Visual</th>
            <th className="p-2.5 sm:p-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Metadata</th>
            <th className="p-2.5 sm:p-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
            {onAction && <th className="p-2.5 sm:p-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Action</th>}
            {onWorkerCancel && <th className="p-2.5 sm:p-4 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Manage</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {records.map((record) => (
            <tr key={record._id} className="hover:bg-white/[0.02] transition-colors group">
              {showEmployeeName && (
                <td className="p-2.5 sm:p-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center relative">
                      {record.employeeId?.profilePhoto ? (
                        <img src={record.employeeId.profilePhoto} className="w-full h-full object-cover" alt="Profile" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-indigo-400 font-black text-sm">
                          {record.employeeId?.name?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-[11px] text-slate-200 tracking-tight text-center truncate max-w-[80px]">
                      {record.employeeId?.name || record.workerName || 'Deleted Worker'}
                    </span>
                  </div>
                </td>
              )}
              <td className="p-2.5 sm:p-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    <span className="text-sm font-bold text-slate-100">{formatDate(record.timestamp)}</span>
                  </div>
                  {record.clockOutTime ? (
                    <div className="flex items-center gap-1.5 opacity-80">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                      <span className="text-xs font-bold text-slate-300">{formatDate(record.clockOutTime)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 ml-3 opacity-50">
                      <Clock size={10} className="text-slate-500" />
                      <span className="text-[10px] text-slate-500 font-medium tracking-wide italic">Shift Active</span>
                    </div>
                  )}
                </div>
              </td>
              <td className="p-2.5 sm:p-4">
                <div className="flex justify-center">
                  <div 
                    className="relative group/img cursor-zoom-in"
                    onClick={() => setFullscreenImage(record.photo)}
                  >
                    <img 
                      src={record.photo} 
                      alt="Att" 
                      className="w-14 h-14 rounded-xl object-cover border-2 border-slate-800 shadow-lg group-hover:border-emerald-500/50 group-hover:scale-105 transition-all"
                    />
                    <div className="absolute inset-0 bg-emerald-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center rounded-xl backdrop-blur-[1px]">
                      <Camera size={14} className="text-white drop-shadow-[0_0_5px_rgba(0,0,0,0.8)]" />
                    </div>
                  </div>
                </div>
              </td>
              <td className="p-2.5 sm:p-4">
                <div className="flex flex-col gap-2">
                  {/* Punch IN Location */}
                  <div className="space-y-1">
                    <a 
                      href={`https://www.google.com/maps?q=${(record.locationIn || record.location)?.lat},${(record.locationIn || record.location)?.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[10px] text-emerald-400 hover:text-emerald-300 font-black tracking-tight transition-all p-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl w-fit group/map"
                    >
                      <MapPin size={12} className="text-emerald-500 group-hover/map:scale-110 transition-transform" />
                      PUNCH IN GPS
                    </a>
                    <span className="text-[9px] text-slate-600 font-bold truncate max-w-[120px] ml-1 block">
                      {(record.locationIn || record.location)?.address}
                    </span>
                  </div>

                  {/* Punch OUT Location */}
                  {record.locationOut && record.locationOut.lat !== 0 && (
                    <div className="space-y-1 pt-1 border-t border-slate-800/50">
                      <a 
                        href={`https://www.google.com/maps?q=${record.locationOut.lat},${record.locationOut.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[10px] text-amber-400 hover:text-amber-300 font-black tracking-tight transition-all p-2 bg-amber-500/5 border border-amber-500/10 rounded-xl w-fit group/map-out"
                      >
                        <MapPin size={12} className="text-amber-500 group-hover/map-out:scale-110 transition-transform" />
                        PUNCH OUT GPS
                      </a>
                      <span className="text-[9px] text-slate-600 font-bold truncate max-w-[120px] ml-1 block">
                        {record.locationOut.address}
                      </span>
                    </div>
                  )}
                </div>
              </td>
              <td className="p-2.5 sm:p-4">
                <div className="flex flex-col items-center gap-1.5">
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border-2 ${
                    record.status === 'Present' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10' : 
                    record.status === 'Approved' ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]' :
                    record.status === 'Pending' ? 'bg-amber-500/5 text-amber-400 border-amber-500/10 animate-pulse' :
                    record.status === 'Rejected' ? 'bg-rose-500/5 text-rose-400 border-rose-500/10' :
                    'bg-slate-500/5 text-slate-400 border-slate-500/10'
                  }`}>
                    {record.status}
                  </span>
                  {(record.status === 'Pending' || record.status === 'Regularized') && (
                    <div className="flex items-center gap-1 text-[8px] text-amber-500/70 font-bold italic">
                      <AlertTriangle size={8} /> Needs Action
                    </div>
                  )}
                  {record.adminNote && (
                    <div className="text-[8px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md truncate max-w-[100px] text-center w-full" title={record.adminNote}>
                      {record.adminNote}
                    </div>
                  )}
                  {record.dihadi ? (
                    <div className="text-[8px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-bold text-center w-full mt-0.5 shadow-sm">
                      {record.dihadi} Dihadi
                    </div>
                  ) : null}
                </div>
              </td>
              {onAction && (
                <td className="p-2.5 sm:p-4">
                  {(record.status === 'Pending' || record.status === 'Regularized') ? (
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => onAction(record._id, 'Approved', record)}
                        className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => onAction(record._id, 'Rejected', record)}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                       <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mr-2">
                         Resolved
                       </div>
                       <button 
                        onClick={() => onAction(record._id, 'Approved', record)}
                        className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/10 rounded-md text-[9px] font-bold uppercase transition-all"
                        title="Edit Dihadi or Note"
                      >
                        Update
                      </button>
                    </div>
                  )}
                </td>
              )}
              {onWorkerCancel && (
                <td className="p-2.5 sm:p-4">
                  {isCancelable(record) ? (
                    <div className="flex justify-center">
                      <button 
                        onClick={() => {
                          if (window.confirm("Are you sure you want to cancel this entry? You will have to mark attendance again.")) {
                            onWorkerCancel(record._id);
                          }
                        }}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all"
                      >
                        Cancel Mistake
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                      Locked
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative max-w-4xl w-full h-full flex flex-col items-center justify-center">
            <button 
              onClick={(e) => { e.stopPropagation(); setFullscreenImage(null); }}
              className="absolute top-4 right-4 p-3 bg-slate-900/50 hover:bg-rose-500/80 text-white rounded-full backdrop-blur-xl transition-all shadow-2xl"
            >
              <X size={24} />
            </button>
            <img 
              src={fullscreenImage} 
              alt="Fullscreen Verification" 
              className="max-w-full max-h-[85vh] rounded-3xl object-contain shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-800/50 animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()} // Prevent closing on image click
            />
            <p className="mt-6 text-slate-400 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <Camera size={16} className="text-emerald-500" />
              High Resolution Forensic Capture
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
