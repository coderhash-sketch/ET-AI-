import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Leaf, Sliders, RefreshCw, Info, CheckCircle2, TrendingUp, Activity, 
  Target, Users, ArrowRight, ShieldCheck, Flame, Car, Building, HardHat,
  Cpu, Compass, Database, Zap, BrainCircuit, Globe, Sparkles, Filter, ChevronRight,
  TrendingDown, Map, Wind
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, AreaChart, Area, PieChart, Pie
} from 'recharts';
import { CITIES, getRealisticAqi } from '../constants';
import { 
  CarbonCaptureResponse, CarbonCaptureRecommendation, getCarbonCaptureRecommendations 
} from '../src/services/carbonCaptureService';
import { AeronicxOrchestrator } from '../src/services/dataOrchestrator';

interface CarbonCaptureIntelligenceProps {
  activeEnforcementInput?: {
    id: string;
    cellName: string;
    cellType: string;
    priority: string;
    suggestedAction: string;
    evidenceSummary: string;
    estimatedImprovement?: string;
    estimatedImpact?: string;
    recommendationConfidence: number;
    primarySource: string;
    sourceConfidence: number;
    historicalTrend: string;
    isAIRefined?: boolean;
  } | null;
}

export const CarbonCaptureIntelligence: React.FC<CarbonCaptureIntelligenceProps> = ({ activeEnforcementInput }) => {
  const cities = useMemo(() => CITIES, []);
  
  // Selection States
  const [selectedCityName, setSelectedCityName] = useState<string>(() => AeronicxOrchestrator.getSelectedCity());
  const [forecastPeriod, setForecastPeriod] = useState<'1 Hour' | '6 Hour' | '24 Hour' | '72 Hour'>(() => AeronicxOrchestrator.getForecastPeriod());

  // Environmental parameters (inherited from previous agents)
  const [trafficMultiplier, setTrafficMultiplier] = useState<number>(() => AeronicxOrchestrator.getTrafficMultiplier());
  const [industrialMultiplier, setIndustrialMultiplier] = useState<number>(() => AeronicxOrchestrator.getIndustrialMultiplier());
  const [constructionActivity, setConstructionActivity] = useState<number>(() => AeronicxOrchestrator.getConstructionActivity());
  const [windSpeed, setWindSpeed] = useState<number>(() => AeronicxOrchestrator.getWindSpeed());
  const [windDirection, setWindDirection] = useState<string>(() => AeronicxOrchestrator.getWindDirection());

  // Selection & Filter States
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<'All' | 'Critical' | 'High' | 'Medium' | 'Low'>('All');
  const [strategyFilter, setStrategyFilter] = useState<string>('All');

  // Backend response state
  const [ccData, setCcData] = useState<CarbonCaptureResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Quantum-inspired optimization states
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [optimizationProgress, setOptimizationProgress] = useState<number>(0);
  const [optimizationLogs, setOptimizationLogs] = useState<{ time: string; msg: string; type: 'info' | 'success' | 'quantum' }[]>([]);
  const [optimizationCompleted, setOptimizationCompleted] = useState<boolean>(false);

  const prevCityRef = useRef<string>(selectedCityName);

  // Fetch Carbon Capture data
  const fetchCarbonCaptureData = async (
    cityName = selectedCityName,
    period = forecastPeriod,
    tMult = trafficMultiplier,
    iMult = industrialMultiplier,
    cAct = constructionActivity,
    wSpeed = windSpeed,
    wDir = windDirection
  ) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch('/api/carbon-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: cityName,
          forecastPeriod: period,
          envParams: {
            trafficVolumeMultiplier: tMult,
            industrialOutputMultiplier: iMult,
            constructionActivityLevel: cAct,
            windSpeed: wSpeed,
            windDirection: wDir
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned error status: ${response.status}`);
      }

      const data: CarbonCaptureResponse = await response.json();
      setCcData(data);

      if (data.recommendations && data.recommendations.length > 0) {
        // Prioritize: 1. Passed active input 2. Stored cell ID 3. Current select ID 4. First item
        const storedCellId = AeronicxOrchestrator.getSelectedCellId();
        const activeInputId = activeEnforcementInput?.id;
        const targetRecId = activeInputId || (storedCellId ? `rec-${storedCellId}` : null) || selectedRecId;
        
        const found = targetRecId ? data.recommendations.find(r => r.id === targetRecId) : null;
        setSelectedRecId(found ? found.id : data.recommendations[0].id);
      } else {
        setSelectedRecId(null);
      }
    } catch (err: any) {
      console.warn("API Server offline or error. Using modular local simulation layer:", err.message);
      // Fallback to offline local evaluation engine
      const localResult = getCarbonCaptureRecommendations(cityName, period, {
        trafficVolumeMultiplier: tMult,
        industrialOutputMultiplier: iMult,
        constructionActivityLevel: cAct,
        windSpeed: wSpeed,
        windDirection: wDir
      });
      setCcData(localResult);
      if (localResult.recommendations && localResult.recommendations.length > 0) {
        const storedCellId = AeronicxOrchestrator.getSelectedCellId();
        const activeInputId = activeEnforcementInput?.id;
        const targetRecId = activeInputId || (storedCellId ? `rec-${storedCellId}` : null) || selectedRecId;
        
        const found = targetRecId ? localResult.recommendations.find(r => r.id === targetRecId) : null;
        setSelectedRecId(found ? found.id : localResult.recommendations[0].id);
      } else {
        setSelectedRecId(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isInitialMount = useRef(true);

  // Sync state values to localStorage and Orchestrator on change
  useEffect(() => {
    AeronicxOrchestrator.setSelectedCity(selectedCityName);
  }, [selectedCityName]);

  useEffect(() => {
    AeronicxOrchestrator.setForecastPeriod(forecastPeriod);
  }, [forecastPeriod]);

  useEffect(() => {
    AeronicxOrchestrator.setTrafficMultiplier(trafficMultiplier);
  }, [trafficMultiplier]);

  useEffect(() => {
    AeronicxOrchestrator.setIndustrialMultiplier(industrialMultiplier);
  }, [industrialMultiplier]);

  useEffect(() => {
    AeronicxOrchestrator.setConstructionActivity(constructionActivity);
  }, [constructionActivity]);

  useEffect(() => {
    AeronicxOrchestrator.setWindSpeed(windSpeed);
  }, [windSpeed]);

  useEffect(() => {
    AeronicxOrchestrator.setWindDirection(windDirection);
  }, [windDirection]);

  // Track selection and sync to orchestrator
  useEffect(() => {
    if (selectedRecId) {
      const cellId = selectedRecId.replace(/^rec-/, '');
      AeronicxOrchestrator.setSelectedCellId(cellId);
    }
  }, [selectedRecId]);

  // Trigger loading & reactive updates on state dependencies
  useEffect(() => {
    const isCityChanged = prevCityRef.current !== selectedCityName;
    if (isCityChanged) {
      prevCityRef.current = selectedCityName;

      // Check if this is initial mount and use stored wind values to avoid resetting
      if (isInitialMount.current) {
        isInitialMount.current = false;
        const storedWind = localStorage.getItem('aeronicx_windSpeed');
        if (storedWind) {
          fetchCarbonCaptureData(
            selectedCityName,
            forecastPeriod,
            trafficMultiplier,
            industrialMultiplier,
            constructionActivity,
            windSpeed,
            windDirection
          );
          return;
        }
      }

      const defaults = AeronicxOrchestrator.getCityDefaults(selectedCityName);
      const defWindSpeed = defaults.windSpeed;
      const defWindDirection = defaults.windDirection;
      const defTraffic = defaults.trafficMultiplier;
      const defIndustrial = defaults.industrialMultiplier;
      const defConstruction = defaults.constructionActivity;

      setWindSpeed(defWindSpeed);
      setWindDirection(defWindDirection);
      setTrafficMultiplier(defTraffic);
      setIndustrialMultiplier(defIndustrial);
      setConstructionActivity(defConstruction);

      // Reset quantum simulation states on region change
      setOptimizationLogs([]);
      setOptimizationCompleted(false);
      setOptimizationProgress(0);

      fetchCarbonCaptureData(
        selectedCityName,
        forecastPeriod,
        defTraffic,
        defIndustrial,
        defConstruction,
        defWindSpeed,
        defWindDirection
      );
    } else {
      if (isInitialMount.current) {
        isInitialMount.current = false;
      }
      fetchCarbonCaptureData(
        selectedCityName,
        forecastPeriod,
        trafficMultiplier,
        industrialMultiplier,
        constructionActivity,
        windSpeed,
        windDirection
      );
    }
  }, [selectedCityName, forecastPeriod, trafficMultiplier, industrialMultiplier, constructionActivity, windSpeed, windDirection]);

  // Selected Recommendation Object
  const selectedRec = useMemo(() => {
    if (!ccData || !selectedRecId) return null;
    return ccData.recommendations.find(r => r.id === selectedRecId) || null;
  }, [ccData, selectedRecId]);

  // Filtered recommendations list
  const filteredRecs = useMemo(() => {
    if (!ccData) return [];
    let list = ccData.recommendations;

    if (priorityFilter !== 'All') {
      list = list.filter(r => r.priority === priorityFilter);
    }

    if (strategyFilter !== 'All') {
      list = list.filter(r => r.strategy === strategyFilter);
    }

    return list;
  }, [ccData, priorityFilter, strategyFilter]);

  // Unique strategies for filtration dropdown
  const uniqueStrategies = useMemo(() => {
    if (!ccData) return [];
    const set = new Set(ccData.recommendations.map(r => r.strategy));
    return Array.from(set);
  }, [ccData]);

  // Recharts Data: CO2 Reduction per Strategy
  const strategyReductionData = useMemo(() => {
    if (!ccData) return [];
    const map: Record<string, number> = {};
    ccData.recommendations.forEach(r => {
      map[r.strategy] = (map[r.strategy] || 0) + r.co2ReductionValue;
    });
    return Object.keys(map).map(strategy => ({
      name: strategy,
      value: map[strategy],
      color: 
        strategy.includes('Industrial') ? '#fb923c' : // orange
        strategy.includes('Green Buffer') ? '#4ade80' : // green
        strategy.includes('Mineralisation') ? '#a78bfa' : // purple
        strategy.includes('Biochar') ? '#38bdf8' : // cyan
        strategy.includes('Infrastructure') ? '#22c55e' : // dark green
        '#60a5fa' // blue (DAC)
    }));
  }, [ccData]);

  // Recharts Data: Priority vs Average Confidence
  const priorityConfidenceData = useMemo(() => {
    if (!ccData) return [];
    const countMap: Record<string, { total: number; count: number }> = {
      Critical: { total: 0, count: 0 },
      High: { total: 0, count: 0 },
      Medium: { total: 0, count: 0 },
      Low: { total: 0, count: 0 }
    };
    ccData.recommendations.forEach(r => {
      if (countMap[r.priority]) {
        countMap[r.priority].total += r.confidence;
        countMap[r.priority].count += 1;
      }
    });
    return Object.keys(countMap)
      .map(prio => ({
        priority: prio,
        confidence: countMap[prio].count > 0 ? Math.round(countMap[prio].total / countMap[prio].count) : 0
      }))
      .filter(d => d.confidence > 0);
  }, [ccData]);

  // Helpers
  const getPriorityBadgeStyles = (priority: 'Critical' | 'High' | 'Medium' | 'Low') => {
    switch (priority) {
      case 'Critical':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)] animate-pulse';
      case 'High':
        return 'bg-orange-500/15 text-orange-400 border border-orange-500/30';
      case 'Medium':
        return 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30';
      case 'Low':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
    }
  };

  const getSourceIcon = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes('industrial') || s.includes('emissions')) return <Building className="w-3.5 h-3.5 text-rose-400" />;
    if (s.includes('construction') || s.includes('dust')) return <HardHat className="w-3.5 h-3.5 text-orange-400" />;
    if (s.includes('waste') || s.includes('burning')) return <Flame className="w-3.5 h-3.5 text-yellow-400" />;
    if (s.includes('traffic') || s.includes('vehic')) return <Car className="w-3.5 h-3.5 text-cyan-400" />;
    return <Activity className="w-3.5 h-3.5 text-slate-400" />;
  };

  const getStrategyIcon = (strategy: string) => {
    const s = strategy.toLowerCase();
    if (s.includes('industrial')) return <Cpu className="w-4 h-4 text-orange-400" />;
    if (s.includes('buffer')) return <Leaf className="w-4 h-4 text-emerald-400" />;
    if (s.includes('mineral')) return <Database className="w-4 h-4 text-purple-400" />;
    if (s.includes('biochar')) return <Flame className="w-4 h-4 text-cyan-400" />;
    if (s.includes('infra')) return <Sparkles className="w-4 h-4 text-green-400" />;
    return <Globe className="w-4 h-4 text-sky-400" />; // DAC
  };

  // Convert 36-cell sequential list into a 6x6 grid mapping
  const gridCellsMap = useMemo(() => {
    if (!ccData) return [];
    const grid: CarbonCaptureRecommendation[][] = Array(6).fill(null).map(() => Array(6).fill(null));
    
    ccData.recommendations.forEach((rec, idx) => {
      // Deterministically map coordinates into 6x6 based on cell index
      const row = Math.floor(idx / 6) % 6;
      const col = idx % 6;
      grid[row][col] = rec;
    });
    return grid;
  }, [ccData]);

  // Simulated Quantum Annealing trigger
  const runQuantumOptimization = () => {
    if (isOptimizing) return;
    setIsOptimizing(true);
    setOptimizationProgress(0);
    setOptimizationCompleted(false);
    setOptimizationLogs([]);

    const nowStr = () => new Date().toLocaleTimeString();
    const logTimeline = [
      { delay: 400, msg: `Initializing simulated quantum annealing Hamiltonian for ${selectedCityName}...`, type: 'info' as const },
      { delay: 1000, msg: `Spin configuration mapped to ${ccData?.summary.optimizedSinksCount} carbon absorption nodes.`, type: 'info' as const },
      { delay: 1800, msg: `Applying quantum tunneling fluctuations at initial temp: T_init = 100K`, type: 'quantum' as const },
      { delay: 2600, msg: `Sweeping transverse magnetic fields over 1,024 Monte Carlo steps...`, type: 'info' as const },
      { delay: 3500, msg: `Optimization: Matching QuantumMOF materials to maximum point-source flue-gases...`, type: 'quantum' as const },
      { delay: 4200, msg: `G GNN Screening verified: Convergence reached at minimized energy level: ${ccData?.summary.quantumAnnealingEnergyState} eV.`, type: 'success' as const },
      { delay: 5000, msg: `Quantum-inspired sink placement finalized. Sequestration efficiency boosted by +14.2%.`, type: 'success' as const }
    ];

    logTimeline.forEach(step => {
      setTimeout(() => {
        setOptimizationLogs(prev => [...prev, { time: nowStr(), msg: step.msg, type: step.type }]);
        setOptimizationProgress(prev => Math.min(100, prev + 15));
        
        if (step.delay === 5000) {
          setIsOptimizing(false);
          setOptimizationCompleted(true);
          setOptimizationProgress(100);
        }
      }, step.delay);
    });
  };

  return (
    <div className="space-y-8 pb-12" id="carbon-capture-intelligence">
      {/* Upper Module Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 glass border border-slate-200/50 dark:border-slate-800/50 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.08)]">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <Leaf className="w-6 h-6 text-emerald-400 animate-pulse" />
            </span>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">Catalyst</h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Sinks Recommendation &amp; Material Decision Support</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* City Selection */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Target Region</label>
            <select
              value={selectedCityName}
              onChange={(e) => setSelectedCityName(e.target.value)}
              className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {cities.map((city) => (
                <option key={city.id} value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          {/* Period Selection */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Forecast Horizon</label>
            <select
              value={forecastPeriod}
              onChange={(e) => setForecastPeriod(e.target.value as any)}
              className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="1 Hour">1 Hour Horizon</option>
              <option value="6 Hour">6 Hour Horizon</option>
              <option value="24 Hour">24 Hour Horizon</option>
              <option value="72 Hour">72 Hour Horizon</option>
            </select>
          </div>

          {/* Force Refresh Button */}
          <div className="flex flex-col gap-1 justify-end pt-5">
            <button
              onClick={() => fetchCarbonCaptureData()}
              disabled={isLoading}
              className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-400 border border-emerald-500/20 rounded-xl transition-all cursor-pointer"
              title="Recalculate Carbon Capture Strategy"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Controls & Sinks (Left) vs. Interactive Grid & Details (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (Span 4) - Inputs & Charts */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Controls & Environmental Parameters */}
          <div className="p-6 glass border border-slate-200/50 dark:border-slate-800/50 rounded-3xl space-y-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Environmental Constraints</h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Dynamically inherits current meteorological conditions. Altering these parameters re-attributes carbon sink placement priorities.
            </p>

            <div className="space-y-4 pt-2">
              {/* Traffic Vol */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Traffic Emission Volume</span>
                  <span className="text-cyan-400 font-mono">{(trafficMultiplier * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={trafficMultiplier}
                  onChange={(e) => setTrafficMultiplier(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Industrial Vol */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Industrial Plant Stack Load</span>
                  <span className="text-rose-400 font-mono">{(industrialMultiplier * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={industrialMultiplier}
                  onChange={(e) => setIndustrialMultiplier(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Construction Act */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Construction Ground Dust</span>
                  <span className="text-orange-400 font-mono">{(constructionActivity * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={constructionActivity}
                  onChange={(e) => setConstructionActivity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Meteorological Readouts */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/50">
                <div className="p-3 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/20 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Wind Speed</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-emerald-400" />
                    {windSpeed} km/h
                  </p>
                </div>
                <div className="p-3 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/20 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Wind Vector</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
                    Vector {windDirection}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sinks Strategy Distribution Charts */}
          <div className="p-6 glass border border-slate-200/50 dark:border-slate-800/50 rounded-3xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Mitigation Breakdown</h3>
              </div>
              <span className="text-[10px] font-black tracking-wider uppercase text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 rounded">CO₂ Sinks</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Aggregate estimated carbon sequestration load distributed by capture strategy.
            </p>

            <div className="h-44 flex items-center justify-center">
              {strategyReductionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={strategyReductionData} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
                    <XAxis type="number" stroke="#94a3b8" fontSize={10} hide />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={85} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#10b981', fontSize: '11px', fontWeight: 'bold' }}
                      formatter={(val: number) => [`${val} tons/yr`, 'CO₂ Reduction']}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={12}>
                      {strategyReductionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <span className="text-xs text-slate-500">Generating analytics...</span>
              )}
            </div>
          </div>

          {/* Vanguard Pipeline Status Monitor */}
          <div className="p-6 glass border border-slate-200/50 dark:border-slate-800/50 rounded-3xl space-y-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <ShieldCheck className="w-24 h-24 text-emerald-500" />
            </div>

            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Enforcement Override</h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              AeronicX environmental protocols dictate that carbon capture systems must be direct-coupled to upwind Vanguard containment metrics without independent sequestration optimization.
            </p>

            <div className="p-3 bg-emerald-500/15 border border-emerald-500/20 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between text-[11px] border-b border-emerald-500/10 pb-1.5 font-mono">
                <span className="text-slate-400 uppercase font-bold">Vanguard Stream</span>
                <span className={`font-black uppercase px-2 py-0.5 rounded text-[10px] ${
                  activeEnforcementInput ? 'bg-emerald-500/20 text-emerald-300 animate-pulse' : 'bg-slate-500/20 text-slate-400'
                }`}>
                  {activeEnforcementInput ? '● Live Input' : 'Standby'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] border-b border-emerald-500/10 pb-1.5 font-mono">
                <span className="text-slate-400 uppercase font-bold">Optimization Mode</span>
                <span className="text-rose-400 font-black uppercase bg-rose-500/10 px-2 py-0.5 rounded text-[10px]">Bypassed</span>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400 uppercase font-bold">Action Control</span>
                <span className="text-cyan-400 font-black uppercase">Direct Pass-Through</span>
              </div>
            </div>

            {activeEnforcementInput ? (
              <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl space-y-1.5">
                <span className="text-[10px] font-mono font-black text-emerald-400 uppercase">Incoming Telemetry:</span>
                <p className="text-xs font-bold text-slate-200">Zone: {activeEnforcementInput.cellName}</p>
                <p className="text-[11px] text-slate-400 font-medium">Action: {activeEnforcementInput.suggestedAction}</p>
                <div className="text-[10px] text-slate-500 font-mono">ID: VGD-{activeEnforcementInput.id.toUpperCase()}</div>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-900/30 border border-slate-800/40 rounded-2xl text-center">
                <p className="text-[11px] text-slate-500 italic">Waiting for Vanguard tactical transmission...</p>
              </div>
            )}
          </div>

        </div>

        {/* Right Column (Span 8) - Interactive Grid & Summary Cards */}
        <div className="lg:col-span-8 space-y-8">
          
          {activeEnforcementInput && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                <BrainCircuit className="w-24 h-24 text-emerald-400" />
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/25 rounded-2xl text-emerald-400 shrink-0">
                  <ShieldCheck className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[9px] font-black tracking-widest uppercase rounded">Vanguard Active</span>
                    <span className="text-[10px] font-mono font-bold text-slate-500">ID: VGD-{activeEnforcementInput.id.toUpperCase()}</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-100 uppercase tracking-wide">
                    Locked Sequestration for {activeEnforcementInput.cellName}
                  </h4>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-xl">
                    Vanguard's AI-refined order of <strong className="text-emerald-300">"{activeEnforcementInput.suggestedAction}"</strong> is active. Downwind carbon sinks have been pre-allocated to intercept localized emissions up to <strong className="text-emerald-300">{activeEnforcementInput.estimatedImprovement || 'maximum capacity'}</strong>.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Carbon Sequestration Overview Dashboard Card */}
          {ccData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Box 1 */}
              <div className="p-5 glass border border-slate-200/50 dark:border-slate-800/50 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-3 right-3 opacity-20">
                  <Leaf className="w-8 h-8 text-emerald-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Sequestration Target</span>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100 font-sans">
                  {ccData.summary.totalEstimatedCo2Reduction.toLocaleString()}
                </p>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-tight mt-1 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-emerald-400" />
                  tons CO₂ / Year
                </p>
              </div>

              {/* Box 2 */}
              <div className="p-5 glass border border-slate-200/50 dark:border-slate-800/50 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-3 right-3 opacity-20">
                  <Target className="w-8 h-8 text-cyan-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Confidence Rating</span>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100 font-sans">
                  {ccData.summary.averageConfidence}%
                </p>
                <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-tight mt-1">
                  Average Sink Stability
                </p>
              </div>

              {/* Box 3 */}
              <div className="p-5 glass border border-slate-200/50 dark:border-slate-800/50 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-3 right-3 opacity-20">
                  <Users className="w-8 h-8 text-teal-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Optimized Sinks</span>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100 font-sans">
                  {ccData.summary.optimizedSinksCount} / 36
                </p>
                <p className="text-[10px] font-bold text-teal-400 uppercase tracking-tight mt-1">
                  Active Grid Cells
                </p>
              </div>

              {/* Box 4 */}
              <div className="p-5 glass border border-slate-200/50 dark:border-slate-800/50 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-3 right-3 opacity-20">
                  <BrainCircuit className="w-8 h-8 text-purple-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">High Risk Sinks</span>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100 font-sans">
                  {ccData.summary.criticalZonesCount + ccData.summary.highZonesCount}
                </p>
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-tight mt-1">
                  Critical Interventions
                </p>
              </div>
            </div>
          )}

          {/* City Interactive Grid Mapping Card */}
          <div className="p-6 glass border border-slate-200/50 dark:border-slate-800/50 rounded-3xl space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">Interactive City Grid Sequestration Mapping</h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Select any grid cell to load detailed structural recommendations</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Priority filter */}
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as any)}
                  className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="All">All Priorities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>

                {/* Strategy filter */}
                <select
                  value={strategyFilter}
                  onChange={(e) => setStrategyFilter(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="All">All Strategies</option>
                  {uniqueStrategies.map(strat => (
                    <option key={strat} value={strat}>{strat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* City Grid View */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              
              {/* Left Column: The Interactive 6x6 Grid (Span 7) */}
              <div className="lg:col-span-7 flex justify-center">
                <div className="p-4 bg-slate-950/60 rounded-3xl border border-slate-200/10 dark:border-slate-800/10 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
                  {/* Grid Header Labels */}
                  <div className="grid grid-cols-6 gap-2 mb-2 text-center text-[10px] font-mono text-slate-500 font-black">
                    <span>C1</span>
                    <span>C2</span>
                    <span>C3</span>
                    <span>C4</span>
                    <span>C5</span>
                    <span>C6</span>
                  </div>

                  <div className="grid grid-rows-6 gap-2">
                    {gridCellsMap.map((row, rIdx) => (
                      <div key={rIdx} className="grid grid-cols-6 gap-2">
                        {row.map((cell, cIdx) => {
                          if (!cell) return <div key={cIdx} className="w-11 h-11 bg-slate-900 rounded-lg"></div>;
                          
                          const isSelected = selectedRecId === cell.id;
                          
                          // Determine fill color by carbon capture priority level
                          let cellBgColor = 'bg-slate-900 border-slate-800 hover:border-slate-700';
                          if (cell.priority === 'Critical') cellBgColor = 'bg-rose-500/20 hover:bg-rose-500/35 border-rose-500/30';
                          else if (cell.priority === 'High') cellBgColor = 'bg-orange-500/20 hover:bg-orange-500/35 border-orange-500/30';
                          else if (cell.priority === 'Medium') cellBgColor = 'bg-yellow-500/20 hover:bg-yellow-500/35 border-yellow-500/30';
                          else if (cell.priority === 'Low') cellBgColor = 'bg-emerald-500/20 hover:bg-emerald-500/35 border-emerald-500/30';

                          return (
                            <button
                              key={cell.id}
                              onClick={() => setSelectedRecId(cell.id)}
                              className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center border transition-all duration-300 relative group cursor-pointer ${cellBgColor} ${
                                isSelected ? 'ring-2 ring-emerald-400 scale-110 shadow-[0_0_15px_rgba(16,185,129,0.3)] z-10' : ''
                              }`}
                              title={`${cell.name} (${cell.priority})`}
                            >
                              <span className="text-[10px] font-mono font-black text-slate-300">
                                {cell.id}
                              </span>
                              <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {getSourceIcon(cell.primarySource)}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Row Indicator labels */}
                  <div className="mt-3 flex justify-between text-[9px] font-mono text-slate-500 px-1 font-bold uppercase">
                    <span>ROW 1-6</span>
                    <span className="text-emerald-400">● Sequestration Ready</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Mini List of Filtered High-Risk Zone Recommendations (Span 5) */}
              <div className="lg:col-span-5 h-[340px] overflow-y-auto pr-2 space-y-3 scrollbar-thin">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block pb-1 border-b border-slate-200/15 dark:border-slate-800/15">
                  Priority Action List ({filteredRecs.length})
                </span>

                {filteredRecs.length > 0 ? (
                  filteredRecs.map((rec) => (
                    <button
                      key={rec.id}
                      onClick={() => setSelectedRecId(rec.id)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between cursor-pointer ${
                        selectedRecId === rec.id
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-[0_4px_16px_rgba(16,185,129,0.06)]'
                          : 'bg-slate-100/40 dark:bg-slate-900/40 hover:bg-slate-100/70 dark:hover:bg-slate-900/70 border-slate-200/50 dark:border-slate-800/50 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="space-y-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-black px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {rec.id}
                          </span>
                          <span className="text-xs font-black leading-none truncate max-w-[130px]">{rec.name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${getPriorityBadgeStyles(rec.priority)}`}>
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 truncate max-w-[190px] flex items-center gap-1">
                          {getStrategyIcon(rec.strategy)}
                          {rec.strategy}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">REDUCTION</span>
                        <span className="text-xs font-black text-emerald-400 font-mono">-{rec.co2ReductionValue} t/y</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
                    <Filter className="w-8 h-8 text-slate-700 mb-2 animate-bounce" />
                    <p className="text-xs font-bold uppercase">No matching zones found</p>
                    <p className="text-[10px] text-slate-400 mt-1">Try relaxing priority or strategy filter thresholds.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dynamic Strategy Details / Recommendation Panel */}
          <AnimatePresence mode="wait">
            {selectedRec ? (
              <motion.div
                key={selectedRec.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="p-6 glass border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent rounded-3xl space-y-6 shadow-sm"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/10 dark:border-slate-800/10">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
                      {getStrategyIcon(selectedRec.strategy)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          Cell {selectedRec.id}
                        </span>
                        <h4 className="text-lg font-black text-slate-900 dark:text-slate-100">{selectedRec.name}</h4>
                        <span className="text-xs text-slate-500 italic">({selectedRec.type})</span>
                      </div>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-widest flex items-center gap-1.5">
                        Primary Source: 
                        {getSourceIcon(selectedRec.primarySource)}
                        <span className="text-slate-800 dark:text-slate-200">{selectedRec.primarySource}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${getPriorityBadgeStyles(selectedRec.priority)}`}>
                      Deployment Priority: {selectedRec.priority}
                    </span>
                    <span className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl text-[10px] font-mono font-black">
                      CONFIDENCE: {selectedRec.confidence}%
                    </span>
                  </div>
                </div>

                {/* Strategy Details Blocks */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Strategy Box */}
                  <div className="p-4 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/10 dark:border-slate-800/10 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Recommended Strategy</span>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                      {selectedRec.strategy}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-500">Long-term carbon mitigation</p>
                  </div>

                  {/* Suitable Capture Method Box */}
                  <div className="p-4 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/10 dark:border-slate-800/10 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Suitable Capture Method</span>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-orange-400" />
                      {selectedRec.suitableCaptureMethod}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-500">Validated engineering standard</p>
                  </div>

                  {/* Material Box */}
                  <div className="p-4 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/10 dark:border-slate-800/10 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Capture Material</span>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      {selectedRec.materialName}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[8px] font-mono font-bold text-slate-500 truncate max-w-full">
                        {selectedRec.materialFormula}
                      </span>
                    </div>
                  </div>

                  {/* CO2 Reduction Box */}
                  <div className="p-4 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/10 dark:border-slate-800/10 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Estimated CO₂ Reduction</span>
                    <p className="text-sm font-black text-emerald-400 font-mono">
                      {selectedRec.co2ReductionDisplay}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-500">Sequestration yield / year</p>
                  </div>

                  {/* AQI Improvement Box */}
                  <div className="p-4 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/10 dark:border-slate-800/10 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Estimated AQI Improvement</span>
                    <p className="text-sm font-black text-cyan-400 font-mono">
                      -{selectedRec.aqiImprovementValue} AQI Points
                    </p>
                    <span className="text-[10px] text-slate-500 font-semibold block">
                      {selectedRec.aqiImprovementDisplay}
                    </span>
                  </div>

                  {/* Confidence Box */}
                  <div className="p-4 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/10 dark:border-slate-800/10 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Recommendation Confidence</span>
                    <p className="text-sm font-black text-purple-400 font-mono">
                      {selectedRec.confidence}%
                    </p>
                    <p className="text-[10px] font-semibold text-slate-500">Quantum sink-stability score</p>
                  </div>

                </div>

                {/* Expected Intervention Outcome Alert Card */}
                <div className="p-5 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
                    <Target className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>Expected Sequestration Outcome</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Left Column */}
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Deployment Material Target</span>
                        <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          {selectedRec.materialName} ({selectedRec.materialFormula})
                        </p>
                      </div>
                      
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Estimated Local AQI Improvement</span>
                        <p className="text-xs font-black text-emerald-400">
                          {selectedRec.aqiImprovementDisplay}
                        </p>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Affected Local Population</span>
                        <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                          ~{selectedRec.affectedPopulation.toLocaleString()} citizens
                        </p>
                      </div>

                      <div className="flex gap-4">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Current AQI baseline</span>
                          <span className="text-xs font-black text-slate-100 font-mono">
                            {selectedRec.aqiValue} AQI
                          </span>
                        </div>
                        
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Historical Trend</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase font-mono ${
                            selectedRec.historicalTrend === 'Worsening' ? 'bg-rose-500/10 text-rose-400' :
                            selectedRec.historicalTrend === 'Improving' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'
                          }`}>
                            {selectedRec.historicalTrend}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sequestration Justification */}
                <div className="pt-4 border-t border-slate-200/10 dark:border-slate-800/10 space-y-2">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Explainable AI Sequestration Rationale</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-950/45 p-4 border border-slate-900 rounded-2xl italic">
                    "{selectedRec.reason}"
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="p-8 text-center bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-500">
                Please select a grid cell above to view detailed sequestration strategies.
              </div>
            )}
          </AnimatePresence>

        </div>

      </div>
    </div>
  );
};
