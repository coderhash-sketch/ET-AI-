
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Atom, 
  Zap, 
  Wind, 
  FlaskConical, 
  ChevronRight,
  Sun,
  Moon,
  Info,
  RefreshCcw,
  Globe,
  BarChart3,
  Leaf,
  BrainCircuit,
  Circle,
  Activity,
  Trees,
  Droplets,
  Earth,
  Flower,
  Bike,
  Waves,
  Sprout,
  Recycle
} from 'lucide-react';
import { WorkflowState, SimulationLog, MaterialCandidate } from './types';
import Sidebar from './components/Sidebar';
import AIFilteringEngine from './components/AIFilteringEngine';
import AethelQ from './components/AethelQ';
import TechnicalModal from './components/TechnicalModal';
import LabConfig from './components/LabConfig';
import LogHistory from './components/LogHistory';
import SDGModal from './components/SDGModal';
import MyClimateImpact from './components/MyClimateImpact';
import GreenCityAdvisor from './components/GreenCityAdvisor';
import StratoSim from './components/StratoSim';
import ExplainableAIPanel from './components/ExplainableAIPanel';
import CleanAirScenarioLab from './components/CleanAirScenarioLab';
import QuantumDecisionEngine from './components/QuantumDecisionEngine';
import DigitalTwinEngine from './components/DigitalTwinEngine';
import { CitizenAdvisoryCenter } from './components/CitizenAdvisoryCenter';
import { EnvironmentalCommandCenter } from './components/EnvironmentalCommandCenter';
import OriginX from './components/OriginX';
import VanGuard from './components/VanGuard';
import { CarbonCaptureIntelligence } from './components/CarbonCaptureIntelligence';
import SkyWeave from './components/SkyWeave';

const DISCOVERY_DATABASE: MaterialCandidate[] = [
  {
    id: 'X1',
    name: 'QuantumMOF-X1',
    metal: 'Zr',
    metalColor: '#22d3ee',
    adsorption: '18.4 mmol/g',
    surfaceArea: '4,520 m²/g',
    synthesisTime: '4.2 hrs',
    cost: '$12/kg',
    highlightLabel: 'Affinity Leader',
    highlightMetric: 'Highest CO₂ Binding Enthalpy',
    formula: 'Zr₆O₄(OH)₄(BDC-NH₂)₆',
    entryX: -200, 
    entryY: -200,
    entryRotation: -45,
    velocity: 32.5
  },
  {
    id: 'X2',
    name: 'QuantumMOF-X2',
    metal: 'Cu',
    metalColor: '#fb923c',
    adsorption: '12.1 mmol/g',
    surfaceArea: '2,100 m²/g',
    synthesisTime: '0.8 hrs',
    cost: '$4/kg',
    highlightLabel: 'Economic Leader',
    highlightMetric: 'Lowest Production Overhead',
    formula: 'Cu₂(BTC)₃',
    entryX: 200, 
    entryY: 200,
    entryRotation: 135,
    velocity: 58.2
  },
  {
    id: 'X3',
    name: 'QuantumMOF-X3',
    metal: 'Zn',
    metalColor: '#a3e635',
    adsorption: '14.5 mmol/g',
    surfaceArea: '6200 m²/g',
    synthesisTime: '6.5 hrs',
    cost: '$18/kg',
    highlightLabel: 'Storage Leader',
    highlightMetric: 'Maximal Internal Porosity',
    formula: 'Zn₄O(BDC)₃',
    entryX: 200, 
    entryY: -200,
    entryRotation: 45,
    velocity: 44.1
  },
  {
    id: 'X4',
    name: 'QuantumMOF-X4',
    metal: 'Cr',
    metalColor: '#f472b6',
    adsorption: '16.2 mmol/g',
    surfaceArea: '3,800 m²/g',
    synthesisTime: '12.0 hrs',
    cost: '$24/kg',
    highlightLabel: 'Stability Leader',
    highlightMetric: 'Industrial Flue-Gas Ready',
    formula: 'Cr₃O(OH)(BDC)₃',
    entryX: 0, 
    entryY: -250,
    entryRotation: 90,
    velocity: 21.9
  },
  {
    id: 'X5',
    name: 'QuantumMOF-X5',
    metal: 'Fe',
    metalColor: '#60a5fa',
    adsorption: '11.8 mmol/g',
    surfaceArea: '2,900 m²/g',
    synthesisTime: '3.5 hrs',
    cost: '$7/kg',
    highlightLabel: 'Eco Leader',
    highlightMetric: 'Lowest Lifecycle Carbon',
    formula: 'Fe₃O(F)(BDC)₃',
    entryX: 250, 
    entryY: 0,
    entryRotation: 180,
    velocity: 39.4
  }
];

const BackgroundMolecule = ({ color, size }: { color: string, size: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className="opacity-70">
    <circle cx="50" cy="50" r="8" fill={color} />
    <path d="M50 20 L50 80 M20 50 L80 50 M28 28 L72 72 M28 72 L72 28" stroke={color} strokeWidth="2" strokeOpacity="0.5" />
    <circle cx="50" cy="20" r="4" fill={color} fillOpacity="0.6" />
    <circle cx="50" cy="80" r="4" fill={color} fillOpacity="0.6" />
    <circle cx="20" cy="50" r="4" fill={color} fillOpacity="0.6" />
    <circle cx="80" cy="50" r="4" fill={color} fillOpacity="0.6" />
  </svg>
);

const QubitVisual = ({ color, size }: { color: string, size: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className="opacity-70 animate-spin-slow">
    <circle cx="50" cy="50" r="30" stroke={color} strokeWidth="1" strokeDasharray="5 5" />
    <circle cx="50" cy="20" r="6" fill={color} />
    <circle cx="50" cy="80" r="6" fill={color} fillOpacity="0.3" />
    <circle cx="20" cy="50" r="4" fill={color} fillOpacity="0.2" />
    <circle cx="80" cy="50" r="4" fill={color} fillOpacity="0.2" />
  </svg>
);

const AtomParticle = ({ color, size }: { color: string, size: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className="opacity-70">
    <circle cx="50" cy="50" r="12" fill={color} />
    <ellipse cx="50" cy="50" rx="35" ry="12" stroke={color} strokeWidth="1.5" strokeOpacity="0.6" transform="rotate(45 50 50)" />
    <ellipse cx="50" cy="50" rx="35" ry="12" stroke={color} strokeWidth="1.5" strokeOpacity="0.6" transform="rotate(-45 50 50)" />
    <circle cx="15" cy="50" r="3" fill={color} fillOpacity="0.8">
      <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="3s" repeatCount="indefinite" />
    </circle>
  </svg>
);

const FloatingBackground = () => {
  const particles = useMemo(() => {
    return [...Array(150)].map((_, i) => {
      const rand = Math.random();
      let type = 0;
      if (rand < 0.1) type = 0; // Molecule
      else if (rand < 0.2) type = 1; // Qubit
      else if (rand < 0.3) type = 4; // AtomParticle
      else if (rand < 0.35) type = 2; // Binary
      else if (rand < 0.4) type = 3; // Atom
      else if (rand < 0.45) type = 5; // Trees
      else if (rand < 0.5) type = 6; // Droplets
      else if (rand < 0.55) type = 7; // Earth
      else if (rand < 0.6) type = 8; // Flower
      else if (rand < 0.65) type = 9; // Bike
      else if (rand < 0.7) type = 10; // Sun
      else if (rand < 0.75) type = 11; // Waves
      else if (rand < 0.8) type = 12; // Sprout
      else if (rand < 0.85) type = 13; // Recycle
      else if (rand < 0.9) type = 14; // Leaf
      else type = 15; // Globe

      return {
        id: i,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * -60}s`,
        speed: i % 3 === 0 ? 'animate-float-slow' : i % 3 === 1 ? 'animate-float-medium' : 'animate-float-fast',
        type,
        size: Math.random() * 20 + 12,
        color: [
          '#22c55e', // green
          '#14532d', // dark green
          '#3b82f6', // bluish
          '#dc2626', // crimson red
          '#a855f7', // purple
          '#f472b6', // pink
          '#fef08a', // lemon yellow
          '#ca8a04', // dark yellow
          '#f97316', // orangish
          '#16a34a', // another green
          '#064e3b'  // another dark green
        ][i % 11]
      };
    });
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-[0.12] dark:opacity-[0.2]">
      {particles.map((p) => (
        <div 
          key={p.id} 
          className={`absolute ${p.speed}`}
          style={{ 
            top: p.top, 
            left: p.left,
            animationDelay: p.delay,
          }}
        >
          {p.type === 0 && <BackgroundMolecule color={p.color} size={p.size} />}
          {p.type === 1 && <QubitVisual color={p.color} size={p.size} />}
          {p.type === 4 && <AtomParticle color={p.color} size={p.size} />}
          {p.type === 2 && <div className="font-mono font-black select-none" style={{ color: p.color, fontSize: p.size / 2.2 }}>|{Math.random() > 0.5 ? '01' : '10'}⟩</div>}
          {p.type === 3 && <Atom size={p.size} style={{ color: p.color }} className="animate-spin-slow" />}
          {p.type === 5 && <Trees size={p.size} style={{ color: p.color }} />}
          {p.type === 6 && <Droplets size={p.size} style={{ color: p.color }} />}
          {p.type === 7 && <Earth size={p.size} style={{ color: p.color }} />}
          {p.type === 8 && <Flower size={p.size} style={{ color: p.color }} />}
          {p.type === 9 && <Bike size={p.size} style={{ color: p.color }} />}
          {p.type === 10 && <Sun size={p.size} style={{ color: p.color }} />}
          {p.type === 11 && <Waves size={p.size} style={{ color: p.color }} />}
          {p.type === 12 && <Sprout size={p.size} style={{ color: p.color }} />}
          {p.type === 13 && <Recycle size={p.size} style={{ color: p.color }} />}
          {p.type === 14 && <Leaf size={p.size} style={{ color: p.color }} />}
          {p.type === 15 && <Globe size={p.size} style={{ color: p.color }} />}
        </div>
      ))}
    </div>
  );
};

const App: React.FC = () => {
  const [workflow, setWorkflow] = useState<WorkflowState>(WorkflowState.IDLE);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showSDGModal, setShowSDGModal] = useState(false);
  const [logs, setLogs] = useState<SimulationLog[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialCandidate>(DISCOVERY_DATABASE[0]);
  const [activeEnforcementInput, setActiveEnforcementInput] = useState<any | null>(null);

  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setLogs(prev => [{
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }, ...prev].slice(0, 50));
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleSetWorkflow = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const targetState = customEvent.detail;
      const validStates = Object.values(WorkflowState) as string[];
      if (validStates.includes(targetState)) {
        setWorkflow(targetState as WorkflowState);
        addLog(`Transitioned view to ${targetState.toUpperCase()}`, "info");
      }
    };
    window.addEventListener('set-workflow', handleSetWorkflow);
    return () => {
      window.removeEventListener('set-workflow', handleSetWorkflow);
    };
  }, []);

  const getStatusLabel = (state: WorkflowState) => {
    switch (state) {
      case WorkflowState.IDLE: return { text: "COMMAND CENTER LIVE", color: "text-emerald-400 font-bold" };
      case WorkflowState.AIRSIGHT_AI: return { text: "SKY VECTOR HYPERLOCAL ENGINE", color: "text-cyan-400 font-bold" };
      case WorkflowState.ORIGIN_X: return { text: "ORIGIN-X SOURCE ATTRIBUTION ENGINE", color: "text-amber-400 font-bold" };
      case WorkflowState.AI_FILTERING: return { text: "NEURAL GNN SCREENING...", color: "text-magenta-400" };
      case WorkflowState.AETHEL_Q: return { text: "AETHEL QUANTUM SUITE", color: "text-lime-400" };
      case WorkflowState.CONFIG: return { text: "INFRASTRUCTURE OPTIMIZATION", color: "text-cyan-400" };
      case WorkflowState.LOGS: return { text: "HISTORICAL EXPERIMENT ARCHIVE", color: "text-magenta-400" };
      case WorkflowState.SUSTAINABILITY: return { text: "PERSONAL FOOTPRINT ANALYTICS", color: "text-blue-400" };
      case WorkflowState.CITY_ADVISOR: return { text: "URBAN INTERVENTION PLANNER", color: "text-magenta-500" };
      case WorkflowState.STRATO_SIM: return { text: "STRATO ATMOSPHERIC SUITE", color: "text-purple-400" };
      case WorkflowState.EXPLAINABLE_AI: return { text: "NEURAL PREDICTION EXPLAINER", color: "text-cyan-400" };
      case WorkflowState.SCENARIO_LAB: return { text: "CLEAN AIR SCENARIO LAB", color: "text-cyan-400" };
      case WorkflowState.PREDICTION: return { text: "HYBRID QUANTUM-AI FORECASTING", color: "text-cyan-400" };
      case WorkflowState.DECISION_ENGINE: return { text: "QUANTUM STRATEGY OPTIMIZATION", color: "text-emerald-400" };
      case WorkflowState.DIGITAL_TWIN: return { text: "CLIMATE DIGITAL TWIN ENGINE", color: "text-cyan-400" };
      case WorkflowState.CITIZEN_ADVISORY: return { text: "CITIZEN ADVISORY INTELLIGENCE", color: "text-magenta-400" };
      case WorkflowState.ENFORCEMENT_INTEL: return { text: "VANGUARD TACTICAL COMMAND", color: "text-rose-400" };
      case WorkflowState.CARBON_CAPTURE: return { text: "CATALYST SEQUESTRATION SINKS", color: "text-emerald-400" };
      case WorkflowState.SKY_WEAVE: return { text: "SKY WEAVE PREDICTION SUITE", color: "text-cyan-400" };
      default: return { text: "SYSTEM ACTIVE", color: "text-slate-400" };
    }
  };

  const status = getStatusLabel(workflow);

  return (
    <div className={`min-h-screen flex transition-colors duration-500 relative eco-gradient ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <FloatingBackground />
      <Sidebar workflow={workflow} setWorkflow={setWorkflow} />
      
      <main className="flex-1 flex flex-col relative overflow-hidden z-10">
        <header className="h-40 flex items-center justify-between px-10 border-b border-slate-200 dark:border-slate-800 glass z-20 py-4">
          <div className="flex items-center gap-5">
            <div className="relative group cursor-pointer">
              <div className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-full animate-pulse group-hover:bg-cyan-400/40 transition-colors"></div>
              <div className="relative z-10 w-12 h-12 flex items-center justify-center">
                <Atom className="w-12 h-12 text-cyan-400 animate-spin-slow group-hover:animate-spin transition-all" />
                <div className="absolute w-full h-full animate-orbit">
                  <div className="w-2 h-2 rounded-full bg-magenta-500 shadow-[0_0_10px_rgba(217,70,239,0.8)]"></div>
                </div>
                <div className="absolute w-full h-full animate-reverse-orbit">
                  <div className="w-1.5 h-1.5 rounded-full bg-lime-400 shadow-[0_0_10px_rgba(163,230,71,0.8)]"></div>
                </div>
              </div>
            </div>
            <div className="group">
              <h1 className="font-black tracking-tighter leading-none flex items-center" style={{ fontSize: 'calc(3rem + 0.4cm)' }}>
                <span className="neonic-logo transition-transform group-hover:scale-105 duration-500">Aeronic</span>
                <span className="neonic-text relative">
                  X
                  <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400 to-purple-500 blur-md opacity-0 group-hover:opacity-30 animate-spin-slow rounded-full -z-10"></div>
                </span>
              </h1>
              <div className="mt-2 ml-1 space-y-2">
                <p className="text-[11px] text-slate-700 font-black uppercase tracking-[0.4em] opacity-70 group-hover:opacity-100 transition-opacity">FUTURISTIC CLIMATE INTELLIGENCE</p>
                <p className="font-black tracking-wider transition-opacity italic neonic-green" style={{ fontSize: 'calc(9px + 0.25cm)', lineHeight: '1.2' }}>Evolution of AtomoraCQ</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-4">
              <button onClick={() => setShowInfo(true)} className="p-3 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-slate-800">
                <Info className="w-6 h-6 text-slate-500 hover:text-white" />
              </button>
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-slate-400 dark:hover:border-slate-800">
                {isDarkMode ? <Sun className="w-6 h-6 text-yellow-400" /> : <Moon className="w-6 h-6 text-indigo-400" />}
              </button>
              
              <button 
                className="group flex items-center gap-3 px-5 py-3 border border-gold-500 bg-gold-500/10 rounded-2xl hover:bg-gold-500/20 transition-all shadow-[0_0_20px_rgba(251,191,36,0.15)]"
                onClick={() => {
                  setShowSDGModal(true);
                  addLog("SDG-13 Policy Alignment Verified", "success");
                }}
              >
                <Globe className="w-5 h-5 text-gold-500 group-hover:rotate-12 transition-transform" />
                <span className="gold-text text-sm font-black tracking-tight uppercase">SDG-13 Action</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col p-10 overflow-y-auto relative z-10">
          {workflow === WorkflowState.IDLE && (
            <EnvironmentalCommandCenter setWorkflow={setWorkflow} addLog={addLog} />
          )}

          {workflow === WorkflowState.SKY_WEAVE && <SkyWeave />}
          {workflow === WorkflowState.ORIGIN_X && <OriginX setWorkflow={setWorkflow} />}
          {workflow === WorkflowState.AI_FILTERING && <AIFilteringEngine />}
          {workflow === WorkflowState.AETHEL_Q && <AethelQ selectedMaterial={selectedMaterial} />}
          {workflow === WorkflowState.CONFIG && <LabConfig />}
          {workflow === WorkflowState.LOGS && <LogHistory />}
          {workflow === WorkflowState.SUSTAINABILITY && <MyClimateImpact />}
          {workflow === WorkflowState.CITY_ADVISOR && <GreenCityAdvisor />}
          {workflow === WorkflowState.STRATO_SIM && <StratoSim />}
          {workflow === WorkflowState.EXPLAINABLE_AI && <ExplainableAIPanel />}
          {workflow === WorkflowState.SCENARIO_LAB && <CleanAirScenarioLab setWorkflow={setWorkflow} />}
          {workflow === WorkflowState.DECISION_ENGINE && <QuantumDecisionEngine />}
          {workflow === WorkflowState.DIGITAL_TWIN && <DigitalTwinEngine />}
          {workflow === WorkflowState.CITIZEN_ADVISORY && <CitizenAdvisoryCenter />}
          {workflow === WorkflowState.ENFORCEMENT_INTEL && (
            <VanGuard 
              setWorkflow={setWorkflow} 
              onDeployEnforcement={(rec) => {
                setActiveEnforcementInput(rec);
                addLog(`Enforcement payload for ${rec.cellName} locked as CATALYST input`, 'success');
              }} 
            />
          )}
          {workflow === WorkflowState.CARBON_CAPTURE && (
            <CarbonCaptureIntelligence activeEnforcementInput={activeEnforcementInput} />
          )}
        </div>

        <div className="h-14 glass border-t border-slate-200 dark:border-slate-800 flex items-center px-6 gap-6 overflow-hidden z-20">
          <div className="flex items-center gap-3 whitespace-nowrap text-xs font-mono font-bold tracking-tighter">
            <span className={`w-3 h-3 rounded-full animate-pulse ${workflow === WorkflowState.IDLE ? 'bg-slate-700' : 'bg-cyan-400'}`}></span>
            <span className="opacity-40 text-slate-500 uppercase">SYS_LOG:</span> 
            <span className={`${status.color} uppercase drop-shadow-[0_0_8px_currentColor] tracking-widest`}>
              {status.text}
            </span>
          </div>
          <div className="flex-1 flex gap-8 overflow-hidden items-center">
            {logs.slice(0, 3).map((log, i) => (
              <div key={i} className={`text-[11px] font-mono whitespace-nowrap transition-all flex items-center gap-3 ${
                log.type === 'success' ? 'text-lime-400' : 
                log.type === 'warning' ? 'text-orange-400' :
                log.type === 'error' ? 'text-rose-400' : (isDarkMode ? 'text-slate-500' : 'text-slate-700')
              }`}>
                <span className="opacity-30">[{log.timestamp}]</span>
                {log.message}
              </div>
            ))}
          </div>
        </div>

        {showInfo && <TechnicalModal onClose={() => setShowInfo(false)} />}
        {showSDGModal && <SDGModal onClose={() => setShowSDGModal(false)} />}
      </main>
    </div>
  );
};

export default App;
