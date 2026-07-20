import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, ShieldCheck, AlertTriangle, Wind, Sliders, RefreshCw, 
  Building, Flame, Car, HardHat, Info, CheckCircle2, Play, ArrowRight,
  TrendingUp, Activity, Crosshair, ChevronRight, Map, Heart, Compass,
  Target, Users, BrainCircuit
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell 
} from 'recharts';
import { CITIES, getRealisticAqi } from '../constants';
import { EnforcementResponse, EnforcementRecommendation, getEnforcementIntelligence } from '../src/services/enforcementService';
import { WorkflowState } from '../types';
import { AeronicxOrchestrator } from '../src/services/dataOrchestrator';

interface VanGuardProps {
  setWorkflow?: (state: WorkflowState) => void;
  onDeployEnforcement?: (recommendation: EnforcementRecommendation) => void;
}

export const VanGuard: React.FC<VanGuardProps> = ({ setWorkflow, onDeployEnforcement }) => {
  // Cities list from constants
  const cities = useMemo(() => CITIES, []);
  
  // Selection States
  const [selectedCityName, setSelectedCityName] = useState<string>(() => AeronicxOrchestrator.getSelectedCity());
  const [forecastPeriod, setForecastPeriod] = useState<'1 Hour' | '6 Hour' | '24 Hour' | '72 Hour'>(() => AeronicxOrchestrator.getForecastPeriod());
  
  // Environmental States (Multipliers / Meteorological parameters)
  const [trafficMultiplier, setTrafficMultiplier] = useState<number>(() => AeronicxOrchestrator.getTrafficMultiplier());
  const [industrialMultiplier, setIndustrialMultiplier] = useState<number>(() => AeronicxOrchestrator.getIndustrialMultiplier());
  const [constructionActivity, setConstructionActivity] = useState<number>(() => AeronicxOrchestrator.getConstructionActivity());
  const [windSpeed, setWindSpeed] = useState<number>(() => AeronicxOrchestrator.getWindSpeed());
  const [windDirection, setWindDirection] = useState<string>(() => AeronicxOrchestrator.getWindDirection());

  // Filter States
  const [priorityFilter, setPriorityFilter] = useState<'All' | 'Critical' | 'High' | 'Medium' | 'Low'>('All');
  
  // App States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [enforcementData, setEnforcementData] = useState<EnforcementResponse | null>(null);
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);

  // Command Console & Dispatch Log States
  const [dispatchLogs, setDispatchLogs] = useState<{ time: string; msg: string; type: 'info' | 'success' | 'warn' }[]>([]);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchProgress, setDispatchProgress] = useState<number>(0);
  const [dispatchCompleted, setDispatchCompleted] = useState<boolean>(false);

  const prevCityRef = React.useRef<string>(selectedCityName);
  const timeoutsRef = React.useRef<number[]>([]);
  const isInitialMount = React.useRef(true);

  // Sync state values to Orchestrator and localStorage on change
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

  // Track selectedRecId and sync back to Orchestrator
  useEffect(() => {
    if (selectedRecId) {
      const cellId = selectedRecId.replace(/^rec-/, '');
      AeronicxOrchestrator.setSelectedCellId(cellId);
    }
  }, [selectedRecId]);

  // Fetch enforcement data with optional override parameters to avoid React batch state race conditions
  const fetchEnforcementData = async (
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
      const response = await fetch('/api/enforcement-intel', {
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

      const data: EnforcementResponse = await response.json();
      setEnforcementData(data);
      
      // Auto-select stored cell from Orchestrator or fallback to first
      const storedCellId = AeronicxOrchestrator.getSelectedCellId();
      const targetRecId = storedCellId ? `rec-${storedCellId}` : null;
      if (targetRecId && data.recommendations.some(r => r.id === targetRecId)) {
        setSelectedRecId(targetRecId);
      } else if (data.recommendations && data.recommendations.length > 0) {
        setSelectedRecId(data.recommendations[0].id);
      } else {
        setSelectedRecId(null);
      }
    } catch (err: any) {
      console.warn("API Server offline or error. Using client-side evaluation engine:", err.message);
      // Fallback to offline local evaluation engine so it ALWAYS works perfectly
      const localResult = getEnforcementIntelligence(cityName, period, {
        trafficVolumeMultiplier: tMult,
        industrialOutputMultiplier: iMult,
        constructionActivityLevel: cAct,
        windSpeed: wSpeed,
        windDirection: wDir
      });
      setEnforcementData(localResult);
      
      // Auto-select stored cell or fallback to first
      const storedCellId = AeronicxOrchestrator.getSelectedCellId();
      const targetRecId = storedCellId ? `rec-${storedCellId}` : null;
      if (targetRecId && localResult.recommendations.some(r => r.id === targetRecId)) {
        setSelectedRecId(targetRecId);
      } else if (localResult.recommendations && localResult.recommendations.length > 0) {
        setSelectedRecId(localResult.recommendations[0].id);
      } else {
        setSelectedRecId(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Consolidated state & fetch controller
  useEffect(() => {
    const isCityChanged = prevCityRef.current !== selectedCityName;
    if (isCityChanged) {
      prevCityRef.current = selectedCityName;
      
      // If it is initial mount, let's see if we have stored wind values to avoid overwriting them
      if (isInitialMount.current) {
        isInitialMount.current = false;
        const storedWind = localStorage.getItem('aeronicx_windSpeed');
        if (storedWind) {
          fetchEnforcementData(
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
      setDispatchLogs([]);
      setDispatchCompleted(false);
      setDispatchProgress(0);

      // Fetch immediately using the fresh default values to avoid race conditions!
      fetchEnforcementData(
        selectedCityName,
        forecastPeriod,
        defTraffic,
        defIndustrial,
        defConstruction,
        defWindSpeed,
        defWindDirection
      );
    } else {
      // Slider or period change only: fetch using current state values
      fetchEnforcementData(
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

  // Reset dispatch states when selected recommendation changes to keep action buttons functional
  useEffect(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    setDispatchLogs([]);
    setDispatchCompleted(false);
    setDispatchProgress(0);
    setIsDispatching(false);
  }, [selectedRecId]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  // AI Refinement & Deep Analysis States
  const [refinedRecs, setRefinedRecs] = useState<Record<string, any>>({});
  const [isRefining, setIsRefining] = useState<Record<string, boolean>>({});

  const runAiAnalysis = async () => {
    if (!selectedRecId || !enforcementData) return;
    const base = enforcementData.recommendations.find(r => r.id === selectedRecId);
    if (!base) return;
    
    const id = base.id;
    setIsRefining(prev => ({ ...prev, [id]: true }));
    try {
      const response = await fetch('/api/vanguard-ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation: {
            ...base,
            windSpeed,
            windDirection
          }
        })
      });
      if (response.ok) {
        const data = await response.json();
        setRefinedRecs(prev => ({ ...prev, [id]: data }));
      } else {
        console.warn("AI Analysis request failed.");
      }
    } catch (err) {
      console.error("Error refining with AI:", err);
    } finally {
      setIsRefining(prev => ({ ...prev, [id]: false }));
    }
  };

  // Selected Recommendation Object
  const selectedRecommendation = useMemo(() => {
    if (!enforcementData || !selectedRecId) return null;
    const base = enforcementData.recommendations.find(r => r.id === selectedRecId) || null;
    if (!base) return null;
    const refined = refinedRecs[base.id];
    if (refined) {
      return {
        ...base,
        priority: refined.priority,
        suggestedAction: refined.suggestedAction,
        evidenceSummary: refined.evidenceSummary,
        estimatedImprovement: refined.estimatedImprovement,
        recommendationConfidence: refined.recommendationConfidence,
        isAIRefined: true
      };
    }
    return base;
  }, [enforcementData, selectedRecId, refinedRecs]);

  // Filtered recommendations list
  const filteredRecommendations = useMemo(() => {
    if (!enforcementData) return [];
    if (priorityFilter === 'All') return enforcementData.recommendations;
    return enforcementData.recommendations.filter(r => r.priority === priorityFilter);
  }, [enforcementData, priorityFilter]);

  // Recharts Chart Data (priority counts)
  const chartData = useMemo(() => {
    if (!enforcementData) return [];
    return [
      { name: 'Critical', count: enforcementData.summary.criticalZonesCount, color: '#f43f5e' },
      { name: 'High', count: enforcementData.summary.highZonesCount, color: '#f97316' },
      { name: 'Medium', count: enforcementData.summary.mediumZonesCount, color: '#eab308' },
      { name: 'Low', count: enforcementData.summary.lowZonesCount, color: '#22c55e' }
    ];
  }, [enforcementData]);

  // Command Dispatch Process simulation
  const handleDeployContainment = () => {
    if (!selectedRecommendation || isDispatching) return;
    
    // Clear any existing dispatch timeouts
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    setIsDispatching(true);
    setDispatchProgress(0);
    setDispatchCompleted(false);
    setDispatchLogs([]);
    
    const nowStr = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    const logTimeline = [
      { delay: 0, msg: `[TACTICAL] Initializing command authority protocol...`, type: 'info' as const },
      { delay: 800, msg: `[METEOROLOGY] Confirming upwind dispersion coordinates: ${selectedRecommendation.recommendedZone}`, type: 'info' as const },
      { delay: 1800, msg: `[FLEET] Deploying localized mitigation containment drones (Sector: ${selectedRecommendation.cellName})...`, type: 'info' as const },
      { delay: 2800, msg: `[ENFORCEMENT] Directing inspect-and-suppress order for primary source: ${selectedRecommendation.primarySource}.`, type: 'warn' as const },
      { delay: 3800, msg: `[AEROSOL] Activating high-pressure dry-mist wet suppression screens...`, type: 'info' as const },
      { delay: 4800, msg: `[MONITORING] Local particulate containment verified. Forecasted impact: ${selectedRecommendation.estimatedImpact}.`, type: 'success' as const },
      { delay: 5800, msg: `[SYSTEM] Containment tactical execution completed successfully. Authority Log sealed.`, type: 'success' as const }
    ];

    logTimeline.forEach(step => {
      const timer = window.setTimeout(() => {
        setDispatchLogs(prev => [...prev, { time: nowStr(), msg: step.msg, type: step.type }]);
        setDispatchProgress(prev => Math.min(100, prev + 15));
        
        if (step.delay === 5800) {
          setIsDispatching(false);
          setDispatchCompleted(true);
          setDispatchProgress(100);
        }
      }, step.delay);
      timeoutsRef.current.push(timer);
    });
  };

  // Get color classes based on priority
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
    if (s.includes('industrial') || s.includes('emissions')) return <Building className="w-4 h-4 text-rose-400" />;
    if (s.includes('construction') || s.includes('dust')) return <HardHat className="w-4 h-4 text-orange-400" />;
    if (s.includes('waste') || s.includes('burning')) return <Flame className="w-4 h-4 text-yellow-400" />;
    if (s.includes('traffic') || s.includes('vehic')) return <Car className="w-4 h-4 text-cyan-400" />;
    return <Activity className="w-4 h-4 text-slate-400" />;
  };

  // Generate 6x6 grid mapping. Since we have 36 recommendations, we map them directly to row/col 0..5
  const gridCellsMap = useMemo(() => {
    if (!enforcementData) return [];
    // Arrange in a 2D array [row][col]
    const grid: EnforcementRecommendation[][] = Array(6).fill(null).map(() => Array(6).fill(null));
    enforcementData.recommendations.forEach(rec => {
      if (rec.row >= 0 && rec.row < 6 && rec.col >= 0 && rec.col < 6) {
        grid[rec.row][rec.col] = rec;
      }
    });
    return grid;
  }, [enforcementData]);

  return (
    <div className="space-y-8 pb-12" id="vanguard-tactical-command">
      {/* Upper Module Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 glass border border-slate-200/50 dark:border-slate-800/50 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.08)]">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </span>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">VanGuard Tactical Command</h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Municipal Containment &amp; Active Air Inspection Agent</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 max-w-3xl leading-relaxed">
            Sprint 3 Active Command Module. Consumes multi-spectral prediction models (Sky Vector) and geospatial chemical source attribution (Origin - X) to evaluate localized AQI breach risks, classify priority zones, and formulate tactical containment command recommendations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* City Selection */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Target Region</label>
            <select
              value={selectedCityName}
              onChange={(e) => setSelectedCityName(e.target.value)}
              className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
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
              className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
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
              onClick={() => fetchEnforcementData()}
              disabled={isLoading}
              className="p-3 bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-400 border border-rose-500/20 rounded-xl transition-all"
              title="Recalculate Intelligence Recommendations"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Multipliers & Distribution (Left) vs. Dynamic Dashboard Metrics (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (Span 4) - Inputs & Charts */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Controls & Environmental Parameters */}
          <div className="p-6 glass border border-slate-200/50 dark:border-slate-800/50 rounded-3xl space-y-6 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200/30 dark:border-slate-800/30 pb-3">
              <Sliders className="w-5 h-5 text-rose-400" />
              <h3 className="text-base font-black tracking-tight">Environmental Modifiers</h3>
            </div>
            
            <div className="space-y-4">
              {/* Traffic Multiplier */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Traffic Density Factor</span>
                  <span className="font-mono font-bold text-rose-400">{trafficMultiplier.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={trafficMultiplier}
                  onChange={(e) => setTrafficMultiplier(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>

              {/* Industrial Multiplier */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Industrial Output Level</span>
                  <span className="font-mono font-bold text-rose-400">{industrialMultiplier.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={industrialMultiplier}
                  onChange={(e) => setIndustrialMultiplier(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>

              {/* Construction Activity Level */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Construction &amp; Dust Multiplier</span>
                  <span className="font-mono font-bold text-rose-400">{constructionActivity.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={constructionActivity}
                  onChange={(e) => setConstructionActivity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>

              {/* Wind Speed and Direction row */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-600 dark:text-slate-400">Wind Velocity</span>
                    <span className="font-mono font-bold text-rose-400">{windSpeed} km/h</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="40"
                    step="1"
                    value={windSpeed}
                    onChange={(e) => setWindSpeed(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Wind Direction</label>
                  <select
                    value={windDirection}
                    onChange={(e) => setWindDirection(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => (
                      <option key={dir} value={dir}>{dir} Vector</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Priority Risk Distribution Chart */}
          <div className="p-6 glass border border-slate-200/50 dark:border-slate-800/50 rounded-3xl space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200/30 dark:border-slate-800/30 pb-3">
              <TrendingUp className="w-5 h-5 text-rose-400" />
              <h3 className="text-base font-black tracking-tight">Risk Priority Distribution</h3>
            </div>
            
            <div className="h-44 w-full">
              {enforcementData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis 
                      dataKey="name" 
                      stroke="#888888" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#888888" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                      allowDecimals={false}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                      contentStyle={{ 
                        background: '#1e293b', 
                        borderColor: '#334155', 
                        borderRadius: '12px', 
                        color: '#f8fafc',
                        fontSize: '11px',
                        fontFamily: 'monospace'
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Awaiting analysis...
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column (Span 8) - Interactive Grid & Recommendations */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Priority Action Dashboard (Stats) */}
          {enforcementData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              
              {/* Critical Zones */}
              <div className="p-4 glass border border-rose-500/20 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-rose-500/40 transition-colors">
                <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-bl-full -mr-4 -mt-4"></div>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">Critical Priority</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-rose-500">{enforcementData.summary.criticalZonesCount}</span>
                  <span className="text-xs text-slate-400 font-bold">sectors</span>
                </div>
              </div>

              {/* High Risk Zones */}
              <div className="p-4 glass border border-orange-500/20 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-orange-500/40 transition-colors">
                <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/5 rounded-bl-full -mr-4 -mt-4"></div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">High Risk</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-orange-500">{enforcementData.summary.highZonesCount}</span>
                  <span className="text-xs text-slate-400 font-bold">sectors</span>
                </div>
              </div>

              {/* Recommendation Confidence Gauge */}
              <div className="p-4 glass border border-cyan-500/20 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-cyan-500/40 transition-colors">
                <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-bl-full -mr-4 -mt-4"></div>
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">Rec. Confidence</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-cyan-400">{enforcementData.summary.averageRecommendationConfidence}%</span>
                  <span className="text-xs text-slate-400 font-bold">mean</span>
                </div>
              </div>

              {/* Top Source */}
              <div className="p-4 glass border border-emerald-500/20 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full -mr-4 -mt-4"></div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Primary Source</span>
                <span className="text-base font-black text-emerald-400 truncate mt-3 pr-2 block" title={enforcementData.summary.primarySourceContributor}>
                  {enforcementData.summary.primarySourceContributor}
                </span>
              </div>

            </div>
          )}

          {/* Interactive City Grid */}
          <div className="p-6 glass border border-slate-200/50 dark:border-slate-800/50 rounded-3xl space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200/30 dark:border-slate-800/30 pb-3">
              <div className="flex items-center gap-2">
                <Map className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-black tracking-tight">Interactive Local Grid Command</h3>
              </div>
              {/* Wind Vector Indicator */}
              <div className="flex items-center gap-2 text-xs font-mono bg-slate-100 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 px-3 py-1.5 rounded-xl">
                <Compass className="w-3.5 h-3.5 text-rose-400 animate-spin-slow" />
                <span className="text-slate-400 uppercase">Wind Vector:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{windSpeed} km/h {windDirection}</span>
              </div>
            </div>

            {/* Grid Container */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              
              {/* Actual 6x6 Visual Grid */}
              <div className="md:col-span-7 flex flex-col items-center justify-center p-4 bg-slate-100/50 dark:bg-slate-950/30 border border-slate-200/20 dark:border-slate-800/30 rounded-2xl relative">
                {/* Wind direction background arrow */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5">
                  <Wind className="w-56 h-56 text-white rotate-[45deg]" />
                </div>

                <div className="grid grid-cols-6 gap-2 w-full max-w-[340px] aspect-square relative z-10">
                  {gridCellsMap.map((rowCells, rIdx) => 
                    rowCells.map((cell, cIdx) => {
                      if (!cell) return <div key={`empty-${rIdx}-${cIdx}`} className="bg-slate-200/10 rounded-lg"></div>;
                      
                      const isSelected = selectedRecId === cell.id;
                      
                      // Background coloring based on priority
                      let bgClass = 'bg-slate-800';
                      let borderClass = 'border-slate-700/50';
                      if (cell.priority === 'Critical') {
                        bgClass = isSelected ? 'bg-rose-500' : 'bg-rose-500/30 hover:bg-rose-500/40';
                        borderClass = 'border-rose-500/50';
                      } else if (cell.priority === 'High') {
                        bgClass = isSelected ? 'bg-orange-500' : 'bg-orange-500/30 hover:bg-orange-500/40';
                        borderClass = 'border-orange-500/50';
                      } else if (cell.priority === 'Medium') {
                        bgClass = isSelected ? 'bg-yellow-500' : 'bg-yellow-500/30 hover:bg-yellow-500/40';
                        borderClass = 'border-yellow-500/50';
                      } else {
                        bgClass = isSelected ? 'bg-emerald-500' : 'bg-emerald-500/20 hover:bg-emerald-500/30';
                        borderClass = 'border-emerald-500/30';
                      }

                      return (
                        <button
                          key={cell.id}
                          onClick={() => setSelectedRecId(cell.id)}
                          className={`w-full h-full rounded-lg ${bgClass} border ${borderClass} ${
                            isSelected ? 'ring-2 ring-white scale-[1.05] shadow-lg' : 'hover:scale-[1.03]'
                          } transition-all duration-200 flex flex-col items-center justify-center relative group p-1`}
                          title={`Zone ${cell.row+1}-${cell.col+1}: AQI ${cell.aqiValue}`}
                        >
                          <span className={`text-[10px] font-black ${isSelected ? 'text-slate-950' : 'text-slate-200'} font-mono`}>
                            {cell.row + 1}-{cell.col + 1}
                          </span>
                          <span className={`text-[8px] font-bold ${isSelected ? 'text-slate-900' : 'text-slate-400'} mt-0.5`}>
                            {cell.aqiValue}
                          </span>
                          
                          {/* Mini pulse ring for Criticals */}
                          {cell.priority === 'Critical' && !isSelected && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="flex justify-between w-full max-w-[340px] mt-4 text-[10px] font-mono font-bold text-slate-500">
                  <span>Col 1 (West)</span>
                  <span>Col 6 (East)</span>
                </div>
              </div>

              {/* Grid Legends and Details */}
              <div className="md:col-span-5 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Command Grid Legend</h4>
                  
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded bg-rose-500/30 border border-rose-500/50 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                      </span>
                      <div className="text-xs">
                        <p className="font-bold text-slate-200">Critical Priority Breach</p>
                        <p className="text-[10px] text-slate-500">AQI &gt; 160 + Worsening Trend</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded bg-orange-500/30 border border-orange-500/50 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                      </span>
                      <div className="text-xs">
                        <p className="font-bold text-slate-200">High Priority Action</p>
                        <p className="text-[10px] text-slate-500">AQI &gt; 100 + Worsening Trend</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded bg-yellow-500/30 border border-yellow-500/50 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                      </span>
                      <div className="text-xs">
                        <p className="font-bold text-slate-200">Medium Priority Action</p>
                        <p className="text-[10px] text-slate-500">AQI &gt; 100, Stable/Improving</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      </span>
                      <div className="text-xs">
                        <p className="font-bold text-slate-200">Low Priority / Safe Zone</p>
                        <p className="text-[10px] text-slate-500">AQI &lt; 100, Stable Air Quality</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-300">
                    <Info className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Tactical Grid Mapping</span>
                  </div>
                  <p className="text-slate-500 leading-normal text-[11px]">
                    The 6x6 grid aligns to a 1km² micro-grid layout. The spatial grid integrates meteorological upwind containment strategies to suppress particulate plumes before they drift to adjacent residential areas.
                  </p>
                </div>

              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Section 2: Recommendation List Filter and Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Part: Recommendation scroll list (Span 5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black tracking-tight text-slate-800 dark:text-slate-200">Action Recommendations</h3>
            
            {/* Filter Pills */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200/50 dark:border-slate-800/50 rounded-xl">
              {['All', 'Critical', 'High', 'Medium'].map((f) => (
                <button
                  key={f}
                  onClick={() => setPriorityFilter(f as any)}
                  className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                    priorityFilter === f 
                      ? 'bg-rose-500 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Recommendations Scroll Container */}
          <div className="max-h-[460px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {filteredRecommendations.length > 0 ? (
              filteredRecommendations.map((rec) => {
                const isSelected = selectedRecId === rec.id;
                return (
                  <button
                    key={rec.id}
                    onClick={() => setSelectedRecId(rec.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-3 relative ${
                      isSelected 
                        ? 'bg-rose-500/10 border-rose-500/60 shadow-[0_4px_20px_rgba(244,63,94,0.1)]' 
                        : 'bg-slate-900/30 hover:bg-slate-900/50 border-slate-200/15 dark:border-slate-800/15'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${getPriorityBadgeStyles(rec.priority)}`}>
                          {rec.priority}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-400">Zone {rec.row+1}-{rec.col+1}</span>
                      </div>
                      <span className="font-mono font-bold text-xs text-rose-400">{rec.aqiValue} AQI</span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-black text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        {getSourceIcon(rec.primarySource)}
                        {rec.suggestedAction}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate w-full">
                        Primary Source: {rec.primarySource} ({rec.sourceConfidence}% confidence)
                      </p>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-200/10 dark:border-slate-800/10 pt-2.5 text-[10px] font-mono text-slate-400">
                      <span>Reduction: <strong className="text-emerald-400">{rec.estimatedImpact}</strong></span>
                      <span className="flex items-center gap-1">
                        View Command Command <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-12 text-center border border-dashed border-slate-800 rounded-3xl text-slate-500 text-xs">
                No active containment recommendations for filter level: {priorityFilter}.
              </div>
            )}
          </div>
        </div>

        {/* Right Part: Comprehensive Evidence Panel & Command Console (Span 7) */}
        <div className="lg:col-span-7 space-y-6">
          <AnimatePresence mode="wait">
            {selectedRecommendation ? (
              <motion.div
                key={selectedRecommendation.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="glass border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 space-y-6 shadow-sm"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/30 dark:border-slate-800/30 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase ${getPriorityBadgeStyles(selectedRecommendation.priority)}`}>
                        {selectedRecommendation.priority} Action Priority
                      </span>
                      <span className="font-mono font-bold text-xs text-slate-400">Sector: {selectedRecommendation.cellName}</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      {selectedRecommendation.suggestedAction}
                    </h3>
                  </div>

                  <div className="flex gap-2 text-center">
                    <div className="bg-slate-100 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/50 rounded-xl px-3 py-1.5">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">AQI Level</p>
                      <p className="font-mono text-base font-black text-rose-400">{selectedRecommendation.aqiValue}</p>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/50 rounded-xl px-3 py-1.5">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Rec. Confidence</p>
                      <p className="font-mono text-base font-black text-cyan-400">{selectedRecommendation.recommendationConfidence}%</p>
                    </div>
                  </div>
                </div>

                {/* Grid analytics breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Source analysis */}
                  <div className="p-4 bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200/20 dark:border-slate-800/20 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Chemical Source</span>
                    <p className="text-xs font-bold text-slate-200 truncate">{selectedRecommendation.primarySource}</p>
                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                      <span>Source confidence: {selectedRecommendation.sourceConfidence}%</span>
                    </div>
                  </div>

                  {/* Trend */}
                  <div className="p-4 bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200/20 dark:border-slate-800/20 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Historical Trend</span>
                    <p className={`text-xs font-bold truncate flex items-center gap-1.5 ${
                      selectedRecommendation.historicalTrend === 'Worsening' ? 'text-rose-400' :
                      selectedRecommendation.historicalTrend === 'Improving' ? 'text-emerald-400' : 'text-yellow-400'
                    }`}>
                      <Activity className="w-3.5 h-3.5 animate-pulse" />
                      {selectedRecommendation.historicalTrend}
                    </p>
                    <span className="text-[10px] text-slate-500 block font-mono">From micro-sensor arrays</span>
                  </div>

                  {/* Impact */}
                  <div className="p-4 bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200/20 dark:border-slate-800/20 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Est. Mitigation Impact</span>
                    <p className="text-xs font-bold text-emerald-400 truncate">{selectedRecommendation.estimatedImpact}</p>
                    <span className="text-[10px] text-slate-500 block font-mono">Net reduction projection</span>
                  </div>

                </div>

                {/* Evidence summary paragraph */}
                <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-500/10 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-400">
                      <Crosshair className="w-4 h-4" />
                      <span>Evidence Summary &amp; Decision Base</span>
                    </div>
                    
                    {selectedRecommendation.isAIRefined ? (
                      <span className="px-2 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[9px] font-black uppercase tracking-wider rounded-md animate-pulse">
                        ✨ AI OPTIMIZED DECISION
                      </span>
                    ) : (
                      <button
                        onClick={() => runAiAnalysis()}
                        disabled={isRefining[selectedRecommendation.id]}
                        className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-all self-start cursor-pointer"
                      >
                        {isRefining[selectedRecommendation.id] ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Refining Decision...</span>
                          </>
                        ) : (
                          <>
                            <BrainCircuit className="w-3.5 h-3.5 animate-pulse" />
                            <span>Run AI Refinement</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {selectedRecommendation.evidenceSummary}
                  </p>
                </div>

                {/* Expected Outcome Card */}
                <div className="p-5 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
                    <Target className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>Expected Intervention Outcome</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Left Column */}
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Intervention Action</span>
                        <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          {selectedRecommendation.suggestedAction}
                        </p>
                      </div>
                      
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Estimated AQI Improvement</span>
                        <p className="text-xs font-black text-emerald-400">
                          {selectedRecommendation.estimatedImprovement}
                        </p>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Affected Population</span>
                        <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                          ~{selectedRecommendation.affectedPopulation.toLocaleString()} residents
                        </p>
                      </div>

                      <div className="flex gap-4">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Priority</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${getPriorityBadgeStyles(selectedRecommendation.priority)}`}>
                            {selectedRecommendation.priority}
                          </span>
                        </div>
                        
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Confidence Score</span>
                          <p className="text-xs font-bold text-cyan-400 font-mono">
                            {selectedRecommendation.recommendationConfidence}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tactical Dispatch Command Center Console */}
                <div className="border-t border-slate-200/10 dark:border-slate-800/10 pt-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Containment Dispatch Fleet</h4>
                      <p className="text-[11px] text-slate-500 leading-normal">Authorize localized deployment of mitigation protocol systems</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={handleDeployContainment}
                        disabled={isDispatching || dispatchCompleted}
                        className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 ${
                          dispatchCompleted 
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                            : isDispatching 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                              : 'bg-rose-500 hover:bg-rose-600 text-white border border-rose-500 shadow-[0_4px_16px_rgba(244,63,94,0.25)]'
                        }`}
                      >
                        {dispatchCompleted ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" /> Deployed Complete
                          </>
                        ) : isDispatching ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> Dispatching... {dispatchProgress}%
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-current" /> Deploy Containment Fleet
                          </>
                        )}
                      </button>

                      {dispatchCompleted && setWorkflow && (
                        <button
                          onClick={() => {
                            if (onDeployEnforcement && selectedRecommendation) {
                              onDeployEnforcement(selectedRecommendation);
                            }
                            setWorkflow(WorkflowState.CARBON_CAPTURE);
                          }}
                          className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer animate-bounce"
                        >
                          <span>Transmit to Catalyst</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Command Console Output Logs */}
                  {(dispatchLogs.length > 0 || isDispatching) && (
                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/60 font-mono text-[10px] space-y-1.5 h-36 overflow-y-auto">
                      <div className="flex items-center justify-between text-slate-500 border-b border-slate-900 pb-1.5 mb-2">
                        <span>COMMAND TACTICAL OUTPUT PROTOCOL</span>
                        <span className="animate-pulse text-rose-500 font-bold">● ONLINE</span>
                      </div>
                      
                      {dispatchLogs.map((log, index) => (
                        <div key={index} className="flex gap-2.5 items-start">
                          <span className="text-slate-600">[{log.time}]</span>
                          <span className={
                            log.type === 'success' ? 'text-emerald-400 font-bold' :
                            log.type === 'warn' ? 'text-rose-400' : 'text-cyan-400'
                          }>
                            {log.msg}
                          </span>
                        </div>
                      ))}
                      
                      {isDispatching && (
                        <div className="flex gap-1.5 items-center text-slate-500 animate-pulse pt-1">
                          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
                          <span>Executing active tactical sequence...</span>
                        </div>
                      )}
                    </div>
                  )}

                </div>

              </motion.div>
            ) : (
              <div className="glass border border-dashed border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-xs">
                Select an inspection recommendation or tactical grid cell to visualize containment evidence details.
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
};

export default VanGuard;
