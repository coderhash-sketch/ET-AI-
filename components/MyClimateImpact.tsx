
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Car, 
  Bus, 
  Train, 
  Bike, 
  Footprints, 
  Zap, 
  Fuel, 
  Leaf, 
  TrendingDown, 
  AlertCircle,
  ArrowRight,
  Activity,
  BarChart3
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const TRANSPORT_TYPES = [
  { id: 'car', label: 'Car', icon: Car, factor: 0.2, color: '#f43f5e' },
  { id: 'bus', label: 'Bus', icon: Bus, factor: 0.1, color: '#fb923c' },
  { id: 'metro', label: 'Metro', icon: Train, factor: 0.05, color: '#3b82f6' },
  { id: 'bike', label: 'Bike', icon: Bike, factor: 0.01, color: '#84cc16' },
  { id: 'walking', label: 'Walking', icon: Footprints, factor: 0, color: '#22d3ee' },
];

const ParticleCloud = ({ score }: { score: number }) => {
  const particleCount = Math.max(5, Math.floor((100 - score) / 2));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
      {[...Array(particleCount)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-slate-400 rounded-full"
          animate={{
            x: [Math.random() * 100 + '%', Math.random() * 100 + '%'],
            y: [Math.random() * 100 + '%', Math.random() * 100 + '%'],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 5 + Math.random() * 5,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      ))}
    </div>
  );
};

const MyClimateImpact: React.FC = () => {
  const [transport, setTransport] = useState('car');
  const [distance, setDistance] = useState(20);
  const [electricity, setElectricity] = useState(10); // kWh
  const [fuel, setFuel] = useState(5); // Liters

  const calculations = useMemo(() => {
    const transportFactor = TRANSPORT_TYPES.find(t => t.id === transport)?.factor || 0;
    const dailyTransport = distance * transportFactor;
    const dailyElectricity = electricity * 0.4; // 0.4kg CO2 per kWh
    const dailyFuel = fuel * 2.3; // 2.3kg CO2 per liter

    const totalDaily = dailyTransport + dailyElectricity + dailyFuel;
    const totalMonthly = totalDaily * 30;
    
    // Sustainability score (0-100, higher is better)
    // Baseline: 20kg daily is "average/poor", 5kg is "excellent"
    const score = Math.max(0, Math.min(100, 100 - (totalDaily * 4)));

    return {
      daily: totalDaily.toFixed(2),
      monthly: totalMonthly.toFixed(2),
      score: Math.round(score),
      breakdown: [
        { name: 'Transport', value: dailyTransport, color: '#f43f5e' },
        { name: 'Energy', value: dailyElectricity, color: '#3b82f6' },
        { name: 'Fuel', value: dailyFuel, color: '#fb923c' },
      ]
    };
  }, [transport, distance, electricity, fuel]);

  const recommendations = useMemo(() => {
    const list = [];
    if (transport === 'car') list.push({ text: 'Switch to Metro or Bike to reduce transport emissions by up to 90%', icon: Bike });
    if (electricity > 15) list.push({ text: 'Optimize home insulation or switch to LED lighting', icon: Zap });
    if (fuel > 10) list.push({ text: 'Consider an electric vehicle or carpooling', icon: Car });
    if (list.length === 0) list.push({ text: 'You are doing great! Keep maintaining your low-carbon lifestyle.', icon: Leaf });
    return list;
  }, [transport, electricity, fuel]);

  return (
    <div className="flex-1 flex flex-col gap-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end border-b border-slate-200 dark:border-slate-800 pb-8">
        <div>
          <h2 className="text-5xl font-black text-white tracking-tighter mb-2">My Climate Impact</h2>
          <p className="text-slate-500 text-lg font-medium">Personal environmental footprint analytics & optimization.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass p-8 rounded-3xl border border-slate-800 space-y-8">
            <h3 className="text-xl font-bold text-cyan-400 flex items-center gap-3">
              <Activity className="w-5 h-5" /> Lifestyle Parameters
            </h3>

            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Transportation Mode</label>
              <div className="grid grid-cols-5 gap-2">
                {TRANSPORT_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTransport(t.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                      transport === t.id 
                        ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]' 
                        : 'border-slate-800 bg-slate-900/50 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <t.icon className="w-6 h-6 mb-2" />
                    <span className="text-[10px] font-black uppercase">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Daily Distance</label>
                <span className="text-cyan-400 font-mono font-bold">{distance} km</span>
              </div>
              <input 
                type="range" min="0" max="200" value={distance} 
                onChange={(e) => setDistance(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Electricity Usage</label>
                <span className="text-blue-400 font-mono font-bold">{electricity} kWh/day</span>
              </div>
              <input 
                type="range" min="0" max="50" value={electricity} 
                onChange={(e) => setElectricity(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-400"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Fuel Consumption</label>
                <span className="text-orange-400 font-mono font-bold">{fuel} L/day</span>
              </div>
              <input 
                type="range" min="0" max="30" value={fuel} 
                onChange={(e) => setFuel(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-400"
              />
            </div>
          </div>

          <div className="glass p-6 rounded-3xl border border-slate-800">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Eco-Interventions</h3>
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800 hover:border-lime-400/30 transition-colors group">
                  <div className="p-2 bg-lime-400/10 rounded-xl group-hover:bg-lime-400/20 transition-colors">
                    <rec.icon className="w-5 h-5 text-lime-400" />
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{rec.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Visualization Panel */}
        <div className="lg:col-span-7 space-y-8">
          <div className="grid grid-cols-2 gap-8">
            <div className="glass p-8 rounded-3xl border border-slate-800 relative overflow-hidden group">
              <ParticleCloud score={calculations.score} />
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingDown className="w-24 h-24 text-cyan-400" />
              </div>
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Daily CO₂ Output</h4>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-white tracking-tighter">{calculations.daily}</span>
                <span className="text-xl font-bold text-cyan-400">kg</span>
              </div>
              <p className="text-xs text-slate-500 mt-4 font-mono">ESTIMATED EMISSIONS BASED ON INPUTS</p>
            </div>

            <div className="glass p-8 rounded-3xl border border-slate-800 relative overflow-hidden group">
              <motion.div 
                animate={{ 
                  boxShadow: calculations.score > 70 ? '0 0 30px rgba(132, 204, 22, 0.2)' : '0 0 0px rgba(0,0,0,0)'
                }}
                className="absolute inset-0 pointer-events-none"
              />
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Sustainability Score</h4>
              <div className="flex items-baseline gap-2">
                <motion.span 
                  key={calculations.score}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`text-6xl font-black tracking-tighter ${
                    calculations.score > 70 ? 'text-lime-400 drop-shadow-[0_0_10px_rgba(163,230,71,0.5)]' : 
                    calculations.score > 40 ? 'text-yellow-400' : 'text-rose-400'
                  }`}
                >
                  {calculations.score}
                </motion.span>
                <span className="text-xl font-bold text-slate-500">/100</span>
              </div>
              <div className="mt-6 h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${calculations.score}%` }}
                  className={`h-full ${
                    calculations.score > 70 ? 'bg-lime-400' : 
                    calculations.score > 40 ? 'bg-yellow-400' : 'bg-rose-400'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="glass p-8 rounded-3xl border border-slate-800 h-[400px] flex flex-col">
            <h3 className="text-xl font-bold text-magenta-400 mb-8 flex items-center gap-3">
              <BarChart3 className="w-5 h-5" /> Emission Breakdown
            </h3>
            <div className="flex-1 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={calculations.breakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {calculations.breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Monthly</span>
                <span className="text-3xl font-black text-white">{calculations.monthly}</span>
                <span className="text-xs font-bold text-slate-500">kg CO₂</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-8">
              {calculations.breakdown.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyClimateImpact;
