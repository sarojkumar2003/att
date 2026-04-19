import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Loader2, Check, Shield } from 'lucide-react';

export default function PhotoCapture({ onCapture }) {
  const [stream, setStream] = useState(null);
  const [captured, setCaptured] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = async () => {
    setIsReady(false);
    setError(null);
    try {
      // Try with high quality first
      const constraints = { 
        video: { 
          facingMode: 'user', 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        }, 
        audio: false 
      };
      
      let s;
      try {
        s = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        console.warn("High-res camera failed, trying fallback...", e);
        // Fallback to basic video
        s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      setStream(s);
    } catch (err) {
      console.error("Camera Error:", err);
      setError("Camera access blocked. Please check permissions.");
    }
  };

  useEffect(() => {
    if (stream && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handlePlay = () => {
    // Ensuring the video actually has dimensions
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      setIsReady(true);
    } else {
      // Re-check after 500ms if not ready
      setTimeout(handlePlay, 500);
    }
  };

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw frame
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      if (dataUrl && dataUrl.length > 1000) {
        setCaptured(dataUrl);
        onCapture(dataUrl);
        stopCamera();
      }
    } catch (err) {
      console.error("Capture failure", err);
      alert("Please wait for the video to load before clicking.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const reset = () => {
    setCaptured(null);
    onCapture(null);
    startCamera();
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 animate-in shake duration-300">
          <Shield size={20} />
          <p className="text-xs font-bold uppercase tracking-tight">{error}</p>
        </div>
      )}

      {!stream && !captured && (
        <button
          onClick={startCamera}
          className="w-full h-48 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-800 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-indigo-400 hover:border-indigo-400/50 transition-all group"
        >
          <Camera size={32} />
          <span className="text-xs font-bold uppercase tracking-widest">Enable Camera</span>
        </button>
      )}

      {stream && !captured && (
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video shadow-2xl border border-white/10 ring-1 ring-white/5">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onPlaying={handlePlay}
            className="w-full h-full object-cover scale-x-[-1]"
          />
          
          <div className="absolute top-4 left-4">
            {!isReady ? (
              <div className="flex items-center gap-2 p-2 bg-black/60 backdrop-blur-xl rounded-lg border border-white/10 text-[10px] font-bold text-white uppercase tracking-widest">
                <Loader2 size={12} className="animate-spin text-indigo-400" />
                Stream Loading...
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 bg-emerald-500/80 backdrop-blur-xl rounded-lg text-[10px] font-bold text-white uppercase tracking-widest animate-in fade-in zoom-in">
                <Check size={12} />
                Live Feed
              </div>
            )}
          </div>

          <button
            onClick={capture}
            disabled={!isReady}
            className={`absolute bottom-6 left-1/2 -translate-x-1/2 p-5 rounded-full shadow-2xl transition-all active:scale-95 flex items-center justify-center ${
              isReady 
                ? 'bg-white text-slate-900 hover:scale-110 active:bg-indigo-50' 
                : 'bg-slate-800 text-slate-600 scale-90 cursor-not-allowed'
            }`}
          >
            <Camera size={28} />
          </button>
        </div>
      )}

      {captured && (
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-indigo-500/30 aspect-video group animate-in zoom-in duration-300">
          <img src={captured} className="w-full h-full object-cover" alt="Captured" />
          <div className="absolute inset-0 bg-indigo-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={reset}
              className="p-4 bg-white/20 backdrop-blur-xl rounded-full text-white hover:bg-white/30 transition-all border border-white/20 active:scale-95 shadow-xl"
            >
              <RefreshCw size={28} />
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
      <style>{`
        .mirror { transform: scaleX(-1); }
      `}</style>
    </div>
  );
}
