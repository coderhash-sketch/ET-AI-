
import React, { useState, useEffect, useRef } from 'react';
import { Beaker, Search } from 'lucide-react';

interface MoleculeViewerProps {
  showBinding?: boolean;
  metalSymbol?: string;
  metalColor?: string;
  materialName?: string;
  entryX?: number;
  entryY?: number;
  entryRotation?: number;
  velocity?: number;
}

const MoleculeViewer: React.FC<MoleculeViewerProps> = ({ 
  showBinding = false, 
  metalSymbol = 'Zr', 
  metalColor = '#22d3ee',
  materialName = 'QuantumMOF-X1',
  entryX = -200,
  entryY = -200,
  entryRotation = -45,
  velocity = 32.5
}) => {
  const [bound, setBound] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [currentVelocity, setCurrentVelocity] = useState(velocity);
  const velocityIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    setBound(false);
    setCalibrating(true);
    setCurrentVelocity(velocity);
    
    if (velocityIntervalRef.current) clearInterval(velocityIntervalRef.current);

    const scanTimer = setTimeout(() => {
      setCalibrating(false);
      
      if (showBinding) {
        const bindTimer = setTimeout(() => {
          setBound(true);
          
          let speed = velocity;
          velocityIntervalRef.current = window.setInterval(() => {
            speed = Math.max(0, speed - (velocity / 15));
            setCurrentVelocity(speed);
            if (speed === 0) {
              if (velocityIntervalRef.current) clearInterval(velocityIntervalRef.current);
            }
          }, 150);
        }, 1800); 
        return () => clearTimeout(bindTimer);
      }
    }, 600);

    return () => {
      clearTimeout(scanTimer);
      if (velocityIntervalRef.current) clearInterval(velocityIntervalRef.current);
    };
  }, [materialName, showBinding, velocity]);

  return (
    <div className="glass rounded-[2.5rem] p-8 h-[550px] relative overflow-hidden flex items-center justify-center border border-slate-800 shadow-2xl group transition-all duration-700">
      <div 
        className="absolute inset-0 opacity-10 blur-[120px] transition-all duration-1000"
        style={{ backgroundColor: metalColor }}
      ></div>

      <div className="absolute top-6 left-8 flex items-center gap-3 z-10">
        <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
          <Beaker className="w-5 h-5" style={{ color: metalColor }} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 font-black">
            Lattice Probe: {bound ? 'Bound' : 'Targeting'} Mode
          </span>
          <span className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            {materialName} <span className="text-[10px] font-normal text-slate-500">({metalSymbol} Node)</span>
          </span>
        </div>
      </div>

      <div className="absolute top-6 right-8 z-10">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all ${calibrating ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-slate-800 bg-slate-900'}`}>
          <Search className={`w-3 h-3 ${calibrating ? 'text-yellow-400 animate-spin' : 'text-slate-500'}`} />
          <span className={`text-[10px] font-mono font-bold ${calibrating ? 'text-yellow-400' : 'text-slate-500'}`}>
            {calibrating ? 'RECALIBRATING...' : 'SCAN: STABLE'}
          </span>
        </div>
      </div>

      <svg width="100%" height="100%" viewBox="0 0 400 300" className={`drop-shadow-2xl relative z-10 transition-opacity duration-300 ${calibrating ? 'opacity-20' : 'opacity-100'}`}>
        <g opacity="0.3">
          {[...Array(20)].map((_, i) => {
            const cx = 20 + (i % 5) * 90;
            const cy = 20 + Math.floor(i / 5) * 80;
            return (
              <g key={i}>
                <circle 
                  cx={cx} 
                  cy={cy} 
                  r="6" 
                  className={`fill-slate-800 transition-all duration-1000 ${bound ? 'fill-cyan-400/20' : ''}`}
                />
                {bound && (
                   <circle cx={cx} cy={cy} r="12" className="fill-cyan-400/5 animate-pulse" />
                )}
              </g>
            );
          })}
        </g>

        <g transform="translate(200, 150)">
          <circle r="40" fill="none" stroke={metalColor} strokeWidth="0.5" strokeDasharray="4 4" className="animate-spin-slow opacity-40" />
          <circle r="55" fill="none" stroke={metalColor} strokeWidth="1" className="animate-ping opacity-10" />
          
          <circle r="26" fill={`url(#metalGradient-${metalSymbol})`} className="shadow-lg" />
          <text y="6" textAnchor="middle" fill="white" fontSize="16" className="font-mono font-black tracking-tighter">
            {metalSymbol}
          </text>
        </g>

        <g 
          className="transition-all duration-[1800ms] ease-out"
          style={{ 
            transform: bound 
              ? 'translate(200px, 150px)' 
              : `translate(${200 + entryX}px, ${150 + entryY}px)` 
          }}
        >
          <g style={{ transform: `rotate(${bound ? 0 : entryRotation}deg)`, transition: 'transform 1800ms ease-out' }}>
            <line x1="-22" y1="0" x2="22" y2="0" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="4" />
            <circle cx="-25" cy="0" r="10" fill="#ef4444" stroke="white" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="13" fill="#334155" stroke="white" strokeWidth="1.5" />
            <circle cx="25" cy="0" r="10" fill="#ef4444" stroke="white" strokeWidth="1.5" />
            
            {bound && (
              <g className="animate-pulse">
                <circle cx="0" cy="0" r="42" fill="none" stroke="#84cc16" strokeWidth="2" strokeDasharray="5 5" />
                <path d="M-45,0 L-55,-10 M-45,0 L-55,10" stroke="#84cc16" strokeWidth="3" fill="none" />
                <path d="M45,0 L55,-10 M45,0 L55,10" stroke="#84cc16" strokeWidth="3" fill="none" transform="rotate(180)" />
              </g>
            )}
          </g>
        </g>

        <defs>
          <linearGradient id={`metalGradient-${metalSymbol}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={metalColor} />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute bottom-8 left-8 flex flex-col gap-1">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-black">Molecular Velocity</span>
        <span className={`text-xl font-mono font-black transition-colors duration-500 ${currentVelocity === 0 ? 'text-cyan-400' : 'text-slate-200'}`}>
          {currentVelocity.toFixed(2)} <span className="text-[10px] font-bold opacity-60">m/s</span>
        </span>
      </div>

      {/* Enhanced Legend - Increased text size to text-[13px] */}
      <div className="absolute bottom-8 right-8 flex flex-col gap-3 items-end glass p-5 rounded-3xl border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
          <span className="text-[13px] text-slate-100 font-mono font-bold uppercase tracking-widest">Oxygen</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 rounded-full bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.5)]"></div>
          <span className="text-[13px] text-slate-100 font-mono font-bold uppercase tracking-widest">Carbon</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)]" style={{ backgroundColor: metalColor }}></div>
          <span className="text-[13px] text-slate-100 font-mono font-bold uppercase tracking-widest">{metalSymbol} Site</span>
        </div>
      </div>

      {bound && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-[350px] h-[350px] bg-cyan-400/5 blur-[90px] rounded-full animate-pulse"></div>
          <div className="mt-80 flex flex-col items-center gap-3 animate-in zoom-in duration-700">
             {/* Changed text color to white and added higher impact glow */}
             <div className="bg-cyan-600/20 border-2 border-cyan-400/50 text-white px-10 py-5 rounded-3xl text-sm font-black uppercase tracking-[0.5em] backdrop-blur-md shadow-[0_0_50px_rgba(34,211,238,0.4)]">
               BINDING IS <span className="text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,1)]">CONFIRMED</span>
             </div>
             <div className="bg-lime-500/10 border border-lime-500/30 text-lime-400 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] backdrop-blur-md">
               Adsorption Event: Stable
             </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
      `}} />
    </div>
  );
};

export default MoleculeViewer;
