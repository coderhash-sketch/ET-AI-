import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Zap, Activity, Layers, Sparkles } from 'lucide-react';
import QuantumSimulator from './QuantumSimulator';
import QuantumOptimizationEngine from './QuantumOptimizationEngine';
import { MaterialCandidate } from '../types';

type TabType = 'forge' | 'engine';

interface AethelQProps {
  selectedMaterial?: MaterialCandidate;
}

export const AethelQ: React.FC<AethelQProps> = ({ selectedMaterial }) => {
  const [activeTab, setActiveTab] = useState<TabType>('forge');

  return (
    <div className="flex-1 flex flex-col space-y-6 animate-in fade-in duration-500" id="aethel-q-container">
      {/* Top Controller Bar */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden" id="aethel-q-header">
        <div className="absolute inset-0 bg-gradient-to-r from-lime-500/5 via-cyan-500/5 to-emerald-500/5 pointer-events-none" />
        
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-lime-400" />
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Aethel Q</h2>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xl">
            Unified quantum analytics suite. Experience high-fidelity VQE molecular simulations and QAOA-optimized emission reduction algorithms.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-950/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-900 self-start md:self-center relative z-10" id="aethel-q-tabs">
          <button
            onClick={() => setActiveTab('forge')}
            id="tab-quantum-forge"
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              activeTab === 'forge'
                ? 'bg-lime-500/15 text-lime-400 border border-lime-500/20 shadow-[0_0_15px_rgba(163,230,71,0.15)]'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Activity className="w-4 h-4" />
            Quantum Forge
          </button>
          <button
            onClick={() => setActiveTab('engine')}
            id="tab-quantum-engine"
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              activeTab === 'engine'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Zap className="w-4 h-4" />
            Quantum Engine
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 relative" id="aethel-q-content">
        <AnimatePresence mode="wait">
          {activeTab === 'forge' ? (
            <motion.div
              key="quantum-forge"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full"
            >
              <QuantumSimulator selectedMaterial={selectedMaterial} />
            </motion.div>
          ) : (
            <motion.div
              key="quantum-engine"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full"
            >
              <QuantumOptimizationEngine />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AethelQ;
