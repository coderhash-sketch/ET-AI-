import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CloudSun, Wind, HelpCircle, Compass, Layers, Milestone } from 'lucide-react';
import AirStoryMode from './AirStoryMode';
import PollutionJourneySimulator from './PollutionJourneySimulator';

type TabType = 'air-story' | 'journey-sim';

export const StratoSim: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('air-story');

  return (
    <div className="flex-1 flex flex-col space-y-6 animate-in fade-in duration-500" id="strato-sim-container">
      {/* Top Controller Bar */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden" id="strato-sim-header">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-cyan-500/5 to-emerald-500/5 pointer-events-none" />
        
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Strato Sim</h2>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xl">
            Integrated atmospheric dynamics suite. Explore simulated particle trajectories and experience chronological atmospheric stories.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-950/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-900 self-start md:self-center relative z-10" id="strato-sim-tabs">
          <button
            onClick={() => setActiveTab('air-story')}
            id="tab-air-story"
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              activeTab === 'air-story'
                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <CloudSun className="w-4 h-4" />
            Air Story
          </button>
          <button
            onClick={() => setActiveTab('journey-sim')}
            id="tab-journey-sim"
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              activeTab === 'journey-sim'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Wind className="w-4 h-4" />
            Journey Sim
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 relative" id="strato-sim-content">
        <AnimatePresence mode="wait">
          {activeTab === 'air-story' ? (
            <motion.div
              key="air-story"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full"
            >
              <AirStoryMode />
            </motion.div>
          ) : (
            <motion.div
              key="journey-sim"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full"
            >
              <PollutionJourneySimulator />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StratoSim;
