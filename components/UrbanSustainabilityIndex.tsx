
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, 
  TrendingUp, 
  Wind, 
  Leaf, 
  Zap, 
  ShieldCheck, 
  ChevronRight,
  Award,
  BarChart3
} from 'lucide-react';
import { CITIES, CityData } from '../constants';

const UrbanSustainabilityIndex: React.FC = () => {
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);

  const sortedCities = useMemo(() => {
    return [...CITIES].sort((a, b) => {
      const scoreA = (100 - a.pollution + a.greenCoverage + a.renewableEnergy + a.policyScore) / 4;
      const scoreB = (100 - b.pollution + b.greenCoverage + b.renewableEnergy + b.policyScore) / 4;
      return scoreB - scoreA;
    });
  }, []);

  const selectedCity = useMemo(() => 
    CITIES.find(c => c.id === selectedCityId), 
  [selectedCityId]);

  const getOverallScore = (city: CityData) => {
    return Math.round((100 - city.pollution + city.greenCoverage + city.renewableEnergy + city.policyScore) / 4);
  };

  const getScoreColor = (score: number) => {
    if (score > 80) return '#84cc16'; // Green
    if (score > 50) return '#fb923c'; // Yellow
    return '#f43f5e'; // Red
  };

  return (
    <div className="flex-1 flex flex-col gap-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end border-b border-slate-200 dark:border-slate-800 pb-8">
        <div>
          <h2 className="text-5xl font-black text-white tracking-tighter mb-2">Urban Sustainability Index</h2>
          <p className="text-slate-500 text-lg font-medium">Global benchmarking of environmental intelligence and urban resilience.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Global Map View */}
        <div className="lg:col-span-7">
          <div className="glass rounded-[40px] border border-slate-800 p-8 relative overflow-hidden h-[500px] flex items-center justify-center">
            <div className="absolute inset-0 opacity-5 pointer-events-none">
               <div className="absolute inset-0 bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:30px_30px]"></div>
            </div>

            <svg viewBox="0 0 100 100" className="w-full h-full opacity-40">
              {/* Abstract World Map Contours */}
              <path 
                d="M10,40 Q20,30 30,35 T50,40 T70,30 T90,45 M15,60 Q25,70 40,65 T60,75 T85,60" 
                stroke="#1e293b" 
                strokeWidth="0.5" 
                fill="none" 
              />
              
              {/* City Nodes */}
              {CITIES.map((city) => {
                const score = getOverallScore(city);
                const color = getScoreColor(score);
                return (
                  <g key={city.id} className="cursor-pointer" onClick={() => setSelectedCityId(city.id)}>
                    <motion.circle
                      cx={city.lng}
                      cy={city.lat}
                      r="1.5"
                      fill={color}
                      initial={{ scale: 1 }}
                      animate={{ 
                        scale: selectedCityId === city.id ? [1, 1.5, 1] : 1,
                        opacity: selectedCityId === city.id ? 1 : 0.6
                      }}
                      transition={{ repeat: selectedCityId === city.id ? Infinity : 0, duration: 2 }}
                    />
                    <motion.circle
                      cx={city.lng}
                      cy={city.lat}
                      r="4"
                      stroke={color}
                      strokeWidth="0.2"
                      fill="none"
                      animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                  </g>
                );
              })}
            </svg>

            <div className="absolute top-8 left-8 flex items-center gap-3 glass px-4 py-2 rounded-xl border border-slate-800">
              <Globe className="w-4 h-4 text-cyan-400 animate-spin-slow" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Global Network Active</span>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="mt-8 space-y-4">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <Award className="w-4 h-4" /> Global Leaderboard
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {sortedCities.map((city, index) => (
                <motion.div 
                  key={city.id}
                  onClick={() => setSelectedCityId(city.id)}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                    selectedCityId === city.id 
                      ? 'border-cyan-400 bg-cyan-400/10 shadow-[0_0_20px_rgba(34,211,238,0.1)]' 
                      : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono font-bold text-slate-500">0{index + 1}</span>
                    <div>
                      <h4 className="font-bold text-white">{city.name}</h4>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{city.country}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Index</div>
                      <div className="font-mono font-bold" style={{ color: getScoreColor(getOverallScore(city)) }}>
                        {getOverallScore(city)}
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 transition-transform ${selectedCityId === city.id ? 'rotate-90 text-cyan-400' : 'text-slate-700'}`} />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Details Panel */}
        <div className="lg:col-span-5">
          <AnimatePresence mode="wait">
            {selectedCity ? (
              <motion.div 
                key={selectedCity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass p-8 rounded-[40px] border border-slate-800 space-y-10 sticky top-10"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-4xl font-black text-white tracking-tighter">{selectedCity.name}</h3>
                      <p className="text-cyan-400 font-bold uppercase tracking-[0.2em] text-xs">{selectedCity.country}</p>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col items-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Score</span>
                      <span className="text-3xl font-black" style={{ color: getScoreColor(getOverallScore(selectedCity)) }}>
                        {getOverallScore(selectedCity)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <MetricRow label="Air Pollution" value={selectedCity.pollution} inverse icon={Wind} color="#f43f5e" />
                  <MetricRow label="Green Coverage" value={selectedCity.greenCoverage} icon={Leaf} color="#84cc16" />
                  <MetricRow label="Renewable Energy" value={selectedCity.renewableEnergy} icon={Zap} color="#3b82f6" />
                  <MetricRow label="Climate Policy" value={selectedCity.policyScore} icon={ShieldCheck} color="#a855f7" />
                </div>

                <div className="p-6 bg-slate-950/50 rounded-3xl border border-slate-800 space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Trend Analysis
                  </h4>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {selectedCity.name} shows a {getOverallScore(selectedCity) > 70 ? 'positive' : 'mixed'} trajectory in urban resilience. 
                    {selectedCity.renewableEnergy > 80 ? ' High renewable adoption is driving the index.' : ' Further policy integration required for optimal sustainability.'}
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="glass p-8 rounded-[40px] border border-slate-800 h-full flex flex-col items-center justify-center text-center space-y-6 min-h-[500px]">
                <div className="relative">
                   <div className="absolute inset-0 bg-cyan-400/20 blur-2xl rounded-full animate-pulse"></div>
                   <Globe className="w-20 h-20 text-slate-800 relative z-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-300 uppercase tracking-widest">Select a Node</h3>
                  <p className="text-slate-500 text-sm max-w-[250px] mx-auto">Explore global sustainability metrics by selecting a city from the map or leaderboard.</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const MetricRow = ({ label, value, icon: Icon, color, inverse = false }: { label: string, value: number, icon: any, color: string, inverse?: boolean }) => {
  const displayValue = inverse ? 100 - value : value;
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">{label}</span>
        </div>
        <span className="font-mono font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          className="h-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
};

export default UrbanSustainabilityIndex;
