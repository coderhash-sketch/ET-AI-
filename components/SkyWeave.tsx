import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wind, Thermometer, Droplets, Compass, Cpu, Zap, 
  TrendingUp, TrendingDown, RefreshCw, AlertTriangle, 
  Gauge, Info, ShieldCheck, Map, Clock, Search, Sparkles,
  Sliders, CalendarDays
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import { CITIES, getRealisticAqi } from '../constants';
import { GridCell, GridForecastResponse, CellTimelinePoint, getWindAngle } from '../src/services/airsightPredictionService';
import { AeronicxOrchestrator } from '../src/services/dataOrchestrator';

type ForecastTimePeriod = '1 Hour' | '6 Hour' | '24 Hour' | '72 Hour';

const SkyWeave: React.FC = () => {
  // Cities list from constants
  const cities = useMemo(() => CITIES, []);
  const [selectedCity, setSelectedCity] = useState<string>(() => AeronicxOrchestrator.getSelectedCity());
  const [forecastPeriod, setForecastPeriod] = useState<ForecastTimePeriod>(() => AeronicxOrchestrator.getForecastPeriod());
  
  // Custom climate / weather overrides
  const [temperature, setTemperature] = useState<number>(() => AeronicxOrchestrator.getTemperature());
  const [humidity, setHumidity] = useState<number>(() => AeronicxOrchestrator.getHumidity());
  const [windSpeed, setWindSpeed] = useState<number>(() => AeronicxOrchestrator.getWindSpeed());
  const [windDirection, setWindDirection] = useState<string>(() => AeronicxOrchestrator.getWindDirection());
  const [weatherPreset, setWeatherPreset] = useState<string>('Standard');

  // Selected city object helper
  const activeCityObject = useMemo(() => {
    return cities.find(c => c.name.toLowerCase() === selectedCity.toLowerCase()) || cities[2];
  }, [cities, selectedCity]);

  const isInitialMount = React.useRef(true);

  // Sync state defaults when city changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      const storedTemp = localStorage.getItem('aeronicx_temperature');
      if (storedTemp) return;
    }
    const defaults = AeronicxOrchestrator.getCityDefaults(selectedCity);
    setTemperature(defaults.temperature);
    setHumidity(defaults.humidity);
    setWindSpeed(defaults.windSpeed);
    setWindDirection(defaults.windDirection);
    setWeatherPreset('Standard');
  }, [selectedCity]);

  // Sync state values to localStorage on change via Orchestrator
  useEffect(() => {
    AeronicxOrchestrator.setSelectedCity(selectedCity);
  }, [selectedCity]);

  useEffect(() => {
    AeronicxOrchestrator.setForecastPeriod(forecastPeriod);
  }, [forecastPeriod]);

  useEffect(() => {
    AeronicxOrchestrator.setTemperature(temperature);
  }, [temperature]);

  useEffect(() => {
    AeronicxOrchestrator.setHumidity(humidity);
  }, [humidity]);

  useEffect(() => {
    AeronicxOrchestrator.setWindSpeed(windSpeed);
  }, [windSpeed]);

  useEffect(() => {
    AeronicxOrchestrator.setWindDirection(windDirection);
  }, [windDirection]);

  // Weather Preset Handlers
  const applyWeatherPreset = (preset: string) => {
    setWeatherPreset(preset);
    const baseAqi = getRealisticAqi(selectedCity);
    if (preset === 'Stagnant Heat') {
      setTemperature(Math.min(50, baseAqi > 120 ? 42 : 36));
      setHumidity(75);
      setWindSpeed(2);
      setWindDirection('S');
    } else if (preset === 'Windy Dispersion') {
      setTemperature(baseAqi > 120 ? 28 : 20);
      setHumidity(35);
      setWindSpeed(22);
      setWindDirection('NE');
    } else if (preset === 'Monsoon Washout') {
      setTemperature(26);
      setHumidity(90);
      setWindSpeed(14);
      setWindDirection('SW');
    } else {
      // Standard Reset
      setTemperature(baseAqi > 120 ? 35 : 24);
      setHumidity(baseAqi > 120 ? 65 : 45);
      setWindSpeed(baseAqi > 120 ? 5 : 12);
      setWindDirection(baseAqi > 120 ? 'W' : 'NE');
    }
  };

  // Grid state
  const [forecastData, setForecastData] = useState<GridForecastResponse | null>(null);
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [cellTimeline, setCellTimeline] = useState<CellTimelinePoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTimelineLoading, setIsTimelineLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Fetch forecast data
  const fetchForecast = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const url = `/api/airsight-forecast?city=${encodeURIComponent(selectedCity)}` +
                  `&period=${encodeURIComponent(forecastPeriod)}` +
                  `&temperature=${temperature}` +
                  `&humidity=${humidity}` +
                  `&windSpeed=${windSpeed}` +
                  `&windDirection=${encodeURIComponent(windDirection)}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data: GridForecastResponse = await res.json();
      setForecastData(data);
      
      // Auto-select or update selected cell
      if (data.grid && data.grid.length > 0) {
        const matchingCell = selectedCell ? data.grid.find(c => c.id === selectedCell.id) : null;
        const nextCell = matchingCell || data.grid[0];
        setSelectedCell(nextCell);
        fetchCellTimeline(nextCell);
      } else {
        setSelectedCell(null);
        setCellTimeline([]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Could not fetch real-time forecast. Running high-fidelity local calculation fallback.');
      
      // Local fallback simulation (ensuring empty, success & error transitions are robust)
      setTimeout(() => {
        // Fallback calculation using custom formula logic locally
        const baseAqiVal = getRealisticAqi(selectedCity);
        const dummyGrid: GridCell[] = Array.from({ length: 36 }).map((_, i) => {
          const row = Math.floor(i / 6);
          const col = i % 6;
          const cellId = `${String.fromCharCode(65 + row)}${col + 1}`;
          
          // Deterministic cell-specific factors
          const cellFactor = (row * 13 + col * 7) % 25;
          const cellType = cellFactor % 5 === 0 ? 'industrial' : cellFactor % 5 === 1 ? 'highway' : cellFactor % 5 === 2 ? 'park' : 'residential';
          
          // AQI modifiers
          let cellAqi = baseAqiVal + (cellType === 'industrial' ? 35 : cellType === 'highway' ? 20 : cellType === 'park' ? -25 : 5);
          cellAqi += (temperature > 30 ? (temperature - 30) * 1.5 : 0);
          cellAqi += (humidity > 60 ? (humidity - 60) * 0.8 : 0);
          cellAqi -= (windSpeed * 1.2);
          cellAqi = Math.max(15, Math.round(cellAqi));

          const aqiCategory = cellAqi <= 50 ? 'Good' : cellAqi <= 100 ? 'Moderate' : cellAqi <= 150 ? 'Sensitive' : cellAqi <= 200 ? 'Unhealthy' : cellAqi <= 300 ? 'Very Unhealthy' : 'Hazardous';
          const confidenceScore = Math.max(70, Math.min(99, 95 - (windSpeed > 15 ? 5 : 0) - (row * 2)));
          const trend = cellAqi > baseAqiVal + 10 ? 'Worsening' : cellAqi < baseAqiVal - 10 ? 'Improving' : 'Stable';

          return {
            id: cellId,
            row,
            col,
            name: `${cellType.toUpperCase()} SECTOR ${cellId}`,
            type: cellType as any,
            aqiValue: cellAqi,
            aqiCategory,
            confidenceScore,
            trend,
            temperature,
            humidity,
            windSpeed,
            windDirection,
            historicalAqi: Math.round(baseAqiVal * 0.95),
            latitude: activeCityObject.latitude + (row - 2.5) * 0.009,
            longitude: activeCityObject.longitude + (col - 2.5) * 0.009
          };
        });

        const fallbackResponse: GridForecastResponse = {
          city: selectedCity,
          forecastTime: forecastPeriod,
          grid: dummyGrid,
          summary: {
            averageAqi: Math.round(dummyGrid.reduce((sum, c) => sum + c.aqiValue, 0) / 36),
            highestAqiCell: dummyGrid.reduce((prev, curr) => prev.aqiValue > curr.aqiValue ? prev : curr).id,
            lowestAqiCell: dummyGrid.reduce((prev, curr) => prev.aqiValue < curr.aqiValue ? prev : curr).id,
            dominantTrend: 'Stable',
            overallConfidence: 89
          },
          environmentalConditions: {
            temperature,
            humidity,
            windSpeed,
            windDirection,
            generalVibe: 'Computed offline via neural-fallback matrix model'
          }
        };

        setForecastData(fallbackResponse);
        if (fallbackResponse.grid.length > 0) {
          const nextCell = fallbackResponse.grid[0];
          setSelectedCell(nextCell);
          fetchCellTimeline(nextCell);
        }
      }, 500);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch single cell forecast timeline
  const fetchCellTimeline = async (cell: GridCell) => {
    setIsTimelineLoading(true);
    try {
      const url = `/api/airsight-cell-timeline?city=${encodeURIComponent(selectedCity)}` +
                  `&cellId=${cell.id}` +
                  `&baseCellAqi=${cell.aqiValue}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setCellTimeline(data.timeline);
    } catch (err) {
      console.error(err);
      // Fallback timeline
      const points = Array.from({ length: 12 }).map((_, i) => {
        const timeVal = i * 6;
        const trendFactor = cell.trend === 'Worsening' ? 4 : cell.trend === 'Improving' ? -3 : 0.5;
        const cycle = Math.sin(i / 2) * 15;
        return {
          time: `+${timeVal}h`,
          aqi: Math.max(15, Math.round(cell.aqiValue + (i * trendFactor) + cycle)),
          confidence: Math.max(65, Math.round(cell.confidenceScore - (i * 1.5)))
        };
      });
      setCellTimeline(points);
    } finally {
      setIsTimelineLoading(false);
    }
  };

  // Trigger forecast on dependency change
  useEffect(() => {
    fetchForecast();
  }, [selectedCity, forecastPeriod, temperature, humidity, windSpeed, windDirection]);

  // Handle autocomplete matching
  const filteredCities = useMemo(() => {
    if (!searchQuery) return [];
    return cities.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.country.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5);
  }, [cities, searchQuery]);

  // Grid Cell Colors & Styling mapper
  const getCellColorClass = (aqi: number) => {
    if (aqi <= 50) return {
      bg: 'bg-emerald-500/10 dark:bg-emerald-950/20',
      border: 'border-emerald-500/30',
      text: 'text-emerald-500 dark:text-emerald-400',
      textBg: 'bg-emerald-500/10 text-emerald-400',
      solid: 'bg-emerald-500',
      shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
      glow: 'shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]'
    };
    if (aqi <= 100) return {
      bg: 'bg-lime-500/10 dark:bg-lime-950/20',
      border: 'border-lime-500/30',
      text: 'text-lime-500 dark:text-lime-400',
      textBg: 'bg-lime-500/10 text-lime-400',
      solid: 'bg-lime-500',
      shadow: 'shadow-[0_0_15px_rgba(163,230,71,0.15)]',
      glow: 'shadow-[inset_0_0_20px_rgba(163,230,71,0.1)]'
    };
    if (aqi <= 150) return {
      bg: 'bg-amber-500/10 dark:bg-amber-950/20',
      border: 'border-amber-500/30',
      text: 'text-amber-500 dark:text-amber-400',
      textBg: 'bg-amber-500/10 text-amber-400',
      solid: 'bg-amber-500',
      shadow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
      glow: 'shadow-[inset_0_0_20px_rgba(245,158,11,0.1)]'
    };
    if (aqi <= 200) return {
      bg: 'bg-orange-500/10 dark:bg-orange-950/20',
      border: 'border-orange-500/30',
      text: 'text-orange-500 dark:text-orange-400',
      textBg: 'bg-orange-500/10 text-orange-400',
      solid: 'bg-orange-500',
      shadow: 'shadow-[0_0_15px_rgba(249,115,22,0.15)]',
      glow: 'shadow-[inset_0_0_20px_rgba(249,115,22,0.1)]'
    };
    if (aqi <= 300) return {
      bg: 'bg-rose-500/10 dark:bg-rose-950/20',
      border: 'border-rose-500/30',
      text: 'text-rose-500 dark:text-rose-400',
      textBg: 'bg-rose-500/10 text-rose-400',
      solid: 'bg-rose-500',
      shadow: 'shadow-[0_0_15px_rgba(239,68,68,0.15)]',
      glow: 'shadow-[inset_0_0_20px_rgba(239,68,68,0.1)]'
    };
    return {
      bg: 'bg-fuchsia-500/10 dark:bg-fuchsia-950/20',
      border: 'border-fuchsia-500/30',
      text: 'text-fuchsia-500 dark:text-fuchsia-400',
      textBg: 'bg-fuchsia-500/10 text-fuchsia-400',
      solid: 'bg-fuchsia-500',
      shadow: 'shadow-[0_0_15px_rgba(217,70,239,0.15)]',
      glow: 'shadow-[inset_0_0_20px_rgba(217,70,239,0.1)]'
    };
  };

  const selectedCellColor = selectedCell ? getCellColorClass(selectedCell.aqiValue) : null;

  // Empty State Checker
  const isEmptyState = cities.length === 0 || !selectedCity;

  return (
    <div className="flex-1 flex flex-col space-y-6 pb-12 animate-in fade-in duration-500" id="skyweave-main-container">
      {/* Dynamic Upper Banner */}
      <div className="glass p-6 rounded-3xl border border-slate-200/40 dark:border-slate-800/40 flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden bg-slate-950/25 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-teal-500/5 to-emerald-500/5 pointer-events-none" />
        
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span className="text-xs font-mono font-black tracking-widest text-cyan-400 uppercase">SKY WEAVE PREDICTIVE AI ENGINE</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
            Sky Weave <span className="text-slate-400 dark:text-slate-500 text-lg font-normal">| Hyperlocal AQI Forecast</span>
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Predict future air quality for every 1 km × 1 km city grid before pollution occurs. Simulate real-time environmental vectors and inspect telemetry grids dynamically.
          </p>
        </div>

        {/* City Lookup and Selection Panel */}
        <div className="flex flex-col sm:flex-row gap-3 relative z-10" id="skyweave-search-panel">
          <div className="relative">
            <div className="flex items-center bg-slate-100 dark:bg-slate-950/60 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-900">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Lookup city..."
                value={searchQuery}
                id="skyweave-city-input"
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none placeholder-slate-500 w-44"
              />
            </div>
            {filteredCities.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 bg-slate-950 border border-slate-900 rounded-xl shadow-2xl overflow-hidden z-30" id="skyweave-autocomplete">
                {filteredCities.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCity(c.name);
                      setSearchQuery('');
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white font-medium transition-colors border-b border-slate-850 last:border-0 cursor-pointer"
                  >
                    <span className="font-bold">{c.name}</span>, <span className="opacity-60">{c.country}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <select
            value={selectedCity}
            id="skyweave-city-selector"
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-900 text-xs font-black text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none"
          >
            {cities.map((c) => (
              <option key={c.id} value={c.name} className="bg-slate-950 text-slate-300">
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={fetchForecast}
            id="skyweave-refresh"
            className="p-2.5 bg-slate-100 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-900 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center cursor-pointer"
            title="Recalculate Grid Model"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ERROR STATE ALERT BLOCK */}
      {errorMsg && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 relative z-10 animate-in slide-in-from-top-4" id="skyweave-error-state">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">Predictive Server Notice</h4>
            <p className="text-[11px] font-mono text-slate-400 leading-normal mt-0.5">{errorMsg}</p>
          </div>
          <button 
            onClick={fetchForecast}
            className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-[10px] font-mono font-black uppercase text-amber-400 rounded-lg border border-amber-500/30 cursor-pointer"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* EMPTY STATE */}
      {isEmptyState ? (
        <div className="glass-panel p-16 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center py-24" id="skyweave-empty-state">
          <Map className="w-16 h-16 text-slate-600 mb-4 animate-pulse" />
          <h2 className="text-xl font-black text-white tracking-tight uppercase">No Climate Vectors Loaded</h2>
          <p className="text-xs text-slate-500 mt-2 max-w-sm">Please select a valid metropolitan center above to begin high-fidelity geospatial forecast simulations.</p>
        </div>
      ) : (
        /* SUCCESS / LOADING STATES CONTAINER */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="skyweave-content-layout">
          
          {/* LEFT COLUMN: Controls & Spatial Grid (Heatmap) */}
          <div className="lg:col-span-8 flex flex-col space-y-6" id="skyweave-left-col">
            
            {/* Horizon and Quick Stats Bar */}
            <div className="glass p-5 rounded-3xl border border-slate-200/40 dark:border-slate-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-950/20" id="skyweave-stats-bar">
              {/* Forecast Periods */}
              <div className="flex bg-slate-100 dark:bg-slate-950/60 p-1 rounded-2xl border border-slate-200 dark:border-slate-900" id="skyweave-forecast-period">
                {(['1 Hour', '6 Hour', '24 Hour', '72 Hour'] as ForecastTimePeriod[]).map((period) => (
                  <button
                    key={period}
                    id={`skyweave-period-${period.replace(' ', '-')}`}
                    onClick={() => setForecastPeriod(period)}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                      forecastPeriod === period
                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 shadow-[0_0_12px_rgba(34,211,238,0.12)]'
                        : 'text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>

              {/* Overall grid metrics */}
              <div className="flex items-center gap-6" id="skyweave-metrics">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-[11px] font-mono text-slate-500 uppercase">Horizon:</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">{forecastPeriod} Forecast</span>
                </div>
                <div className="w-px h-6 bg-slate-800 hidden md:block" />
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-cyan-400" />
                  <span className="text-[11px] font-mono text-slate-500 uppercase">Avg AQI:</span>
                  <span className="text-xs font-bold text-cyan-400">
                    {forecastData?.summary.averageAqi ?? '--'}
                  </span>
                </div>
                <div className="w-px h-6 bg-slate-800 hidden md:block" />
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] font-mono text-slate-500 uppercase">Confidence:</span>
                  <span className="text-xs font-bold text-emerald-400">
                    {forecastData?.summary.overallConfidence ?? 89}%
                  </span>
                </div>
              </div>
            </div>

            {/* Spatial 1km x 1km Grid Heatmap Card */}
            <div className="glass p-6 rounded-3xl border border-slate-200/40 dark:border-slate-800/40 relative bg-slate-950/20" id="skyweave-spatial-card">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/10 pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3 relative z-10">
                <div className="flex items-center gap-2">
                  <Map className="w-5 h-5 text-cyan-400 animate-pulse" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Spatial 1km × 1km Micro-Sensory Grid</h3>
                </div>
                <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-900 px-2.5 py-1 text-slate-400 rounded-lg">
                  GRID SCALE: 6 × 6 SECTORS (36 sq. km)
                </span>
              </div>

              {isLoading ? (
                <div className="h-[360px] flex flex-col items-center justify-center gap-3" id="skyweave-grid-loading">
                  <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                  <p className="text-xs font-mono text-slate-500 uppercase tracking-widest animate-pulse">Running Neural Forecast Models...</p>
                </div>
              ) : (
                <div className="flex flex-col space-y-5" id="skyweave-grid-body">
                  {/* Heatmap Grid Layout */}
                  <div className="grid grid-cols-6 gap-2 max-w-[500px] mx-auto aspect-square w-full" id="skyweave-heatmap">
                    {forecastData?.grid.map((cell) => {
                      const colors = getCellColorClass(cell.aqiValue);
                      const isSelected = selectedCell?.id === cell.id;

                      return (
                        <button
                          key={cell.id}
                          id={`skyweave-cell-${cell.id}`}
                          onClick={() => {
                            setSelectedCell(cell);
                            fetchCellTimeline(cell);
                          }}
                          className={`aspect-square rounded-2xl border transition-all cursor-pointer flex flex-col justify-between p-2 relative group overflow-hidden ${
                            colors.bg
                          } ${
                            isSelected 
                              ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.25)] ring-1 ring-cyan-400 scale-[1.02]' 
                              : `${colors.border} hover:scale-[1.03] hover:border-cyan-500/40`
                          }`}
                          title={`Grid Sector ${cell.id} | Predicted AQI: ${cell.aqiValue}`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                          {/* Grid coordinates & node category */}
                          <div className="flex justify-between items-center w-full">
                            <span className="text-[8px] font-mono font-bold text-slate-400 tracking-tighter uppercase">
                              {cell.id}
                            </span>
                            <span className={`w-1.5 h-1.5 rounded-full ${colors.solid}`} />
                          </div>

                          {/* Main metric display */}
                          <div className="flex flex-col items-center justify-center py-0.5">
                            <span className={`text-sm md:text-lg font-black ${colors.text} tracking-tight leading-tight`}>
                              {cell.aqiValue}
                            </span>
                            <span className="text-[6.5px] font-mono uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                              {cell.type}
                            </span>
                          </div>

                          {/* Tiny cell outputs */}
                          <div className="flex justify-between items-center w-full text-[6px] font-mono font-bold text-slate-500">
                            <span>{cell.confidenceScore}%</span>
                            <span>
                              {cell.trend === 'Worsening' ? (
                                <TrendingUp className="w-2 h-2 text-rose-400" />
                              ) : cell.trend === 'Improving' ? (
                                <TrendingDown className="w-2 h-2 text-emerald-400" />
                              ) : (
                                <span className="text-slate-500">--</span>
                              )}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Heatmap Spectrum Legend */}
                  <div className="border-t border-slate-200 dark:border-slate-800/60 pt-4 mt-2" id="skyweave-legend-spectrum">
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-[9px] font-mono font-black uppercase tracking-wider">
                      <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-2 rounded-xl flex items-center justify-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Good (0-50)
                      </div>
                      <div className="bg-lime-500/10 text-lime-400 border border-lime-500/20 p-2 rounded-xl flex items-center justify-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-lime-500" /> Moderate (51-100)
                      </div>
                      <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 p-2 rounded-xl flex items-center justify-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> Sensitive (101-150)
                      </div>
                      <div className="bg-orange-500/10 text-orange-400 border border-orange-500/20 p-2 rounded-xl flex items-center justify-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-orange-500" /> Unhealthy (151-200)
                      </div>
                      <div className="bg-rose-500/10 text-rose-400 border border-rose-500/20 p-2 rounded-xl flex items-center justify-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> V. Unhealthy (201-300)
                      </div>
                      <div className="bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 p-2 rounded-xl flex items-center justify-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-fuchsia-500" /> Hazardous (300+)
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Micro-Climate Atmospheric Input Parameters Card */}
            <div className="glass p-6 rounded-3xl border border-slate-200/40 dark:border-slate-800/40 relative bg-slate-950/20" id="skyweave-inputs-card">
              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-cyan-400 animate-pulse" />
                    <h3 className="text-xs font-mono font-black text-slate-400 uppercase tracking-widest">Environmental Drivers (Inputs)</h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 rounded px-2 py-0.5">
                    HISTORICAL BASE AQI: {activeCityObject.pollution}
                  </span>
                </div>

                {/* Overrides Selection Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
                  {/* Preset Buttons */}
                  <div className="md:col-span-4 flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] text-slate-500 uppercase font-black mr-2">Weather Presets:</span>
                    {['Standard', 'Stagnant Heat', 'Windy Dispersion', 'Monsoon Washout'].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => applyWeatherPreset(preset)}
                        className={`px-3 py-1.5 text-[9px] font-mono font-black border rounded-lg transition-all cursor-pointer ${
                          weatherPreset === preset
                            ? 'bg-cyan-500/25 text-cyan-400 border-cyan-500/50 shadow-[0_0_12px_rgba(34,211,238,0.2)]'
                            : 'bg-slate-900/40 text-slate-400 border-slate-850 hover:bg-slate-800'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  {/* Temperature Override */}
                  <div className="bg-slate-950/40 border border-slate-900/80 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wide flex items-center gap-1">
                        <Thermometer className="w-3.5 h-3.5 text-orange-400" /> Temp
                      </span>
                      <span className="text-xs font-black text-white">{temperature}°C</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      value={temperature}
                      onChange={(e) => {
                        setTemperature(parseInt(e.target.value));
                        setWeatherPreset('Custom');
                      }}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <span className="text-[8px] text-slate-500 block">Atmospheric thermal scale</span>
                  </div>

                  {/* Humidity Override */}
                  <div className="bg-slate-950/40 border border-slate-900/80 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wide flex items-center gap-1">
                        <Droplets className="w-3.5 h-3.5 text-sky-400" /> Humidity
                      </span>
                      <span className="text-xs font-black text-white">{humidity}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={humidity}
                      onChange={(e) => {
                        setHumidity(parseInt(e.target.value));
                        setWeatherPreset('Custom');
                      }}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <span className="text-[8px] text-slate-500 block">Moisture holding ratio</span>
                  </div>

                  {/* Wind Speed Override */}
                  <div className="bg-slate-950/40 border border-slate-900/80 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wide flex items-center gap-1">
                        <Wind className="w-3.5 h-3.5 text-teal-400" /> Wind Speed
                      </span>
                      <span className="text-xs font-black text-white">{windSpeed} km/h</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={windSpeed}
                      onChange={(e) => {
                        setWindSpeed(parseInt(e.target.value));
                        setWeatherPreset('Custom');
                      }}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <span className="text-[8px] text-slate-500 block">Advection rate factor</span>
                  </div>

                  {/* Wind Direction Compass Override */}
                  <div className="bg-slate-950/40 border border-slate-900/80 p-4 rounded-2xl space-y-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wide flex items-center gap-1">
                        <Compass className="w-3.5 h-3.5 text-cyan-400" /> Direction
                      </span>
                      <span className="text-xs font-black text-cyan-400">{windDirection}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map((dir) => (
                        <button
                          key={dir}
                          onClick={() => {
                            setWindDirection(dir);
                            setWeatherPreset('Custom');
                          }}
                          className={`py-1 text-[8px] font-mono font-black border rounded transition-all cursor-pointer ${
                            windDirection === dir
                              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_8px_rgba(34,211,238,0.15)]'
                              : 'bg-slate-900/60 text-slate-500 border-transparent hover:bg-slate-800'
                          }`}
                        >
                          {dir}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Active Cell inspector Telemetry & Recharts Predictive Curve */}
          <div className="lg:col-span-4 flex flex-col space-y-6" id="skyweave-right-col">
            
            {/* Grid Cell Inspector */}
            <div className="glass p-6 rounded-3xl border border-slate-200/40 dark:border-slate-800/40 flex flex-col space-y-6 relative overflow-hidden bg-slate-950/20" id="skyweave-inspector-card">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950/80 to-slate-950 pointer-events-none" />
              
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Info className="w-5 h-5 text-cyan-400 animate-pulse" />
                  <h3 className="text-xs font-mono font-black text-slate-400 uppercase tracking-widest">Active Sector Telemetry</h3>
                </div>

                {selectedCell ? (
                  <div className="space-y-5" id="skyweave-cell-detail">
                    {/* Grid Name and Coordinate IDs */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{selectedCell.name}</h4>
                        <p className="text-[10px] font-mono text-slate-500 uppercase">GRID ID: <span className="text-cyan-400 font-bold">{selectedCell.id}</span></p>
                      </div>
                      {selectedCellColor && (
                        <div className={`px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider ${selectedCellColor.textBg}`}>
                          {selectedCell.type}
                        </div>
                      )}
                    </div>

                    {/* Predicted AQI Display */}
                    <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-mono text-slate-500 uppercase block">Predicted AQI</span>
                        <span className={`text-4xl font-black tracking-tighter ${selectedCellColor?.text}`}>
                          {selectedCell.aqiValue}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-mono text-slate-500 uppercase block">Category</span>
                        <span className={`text-xs font-bold ${selectedCellColor?.text} block`}>
                          {selectedCell.aqiCategory}
                        </span>
                      </div>
                    </div>

                    {/* Output indicators matching details */}
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="bg-slate-950/20 p-2.5 rounded-xl border border-slate-850">
                        <span className="text-[9px] text-slate-500 uppercase block">Confidence</span>
                        <div className="flex items-center gap-1 mt-1 font-bold text-slate-800 dark:text-slate-200">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          {selectedCell.confidenceScore}%
                        </div>
                      </div>
                      <div className="bg-slate-950/20 p-2.5 rounded-xl border border-slate-850">
                        <span className="text-[9px] text-slate-500 uppercase block">Forecast Trend</span>
                        <div className="flex items-center gap-1 mt-1 font-bold text-slate-800 dark:text-slate-200">
                          {selectedCell.trend === 'Worsening' ? (
                            <>
                              <TrendingUp className="w-4 h-4 text-rose-400 animate-bounce" />
                              <span className="text-rose-400">Worsening</span>
                            </>
                          ) : selectedCell.trend === 'Improving' ? (
                            <>
                              <TrendingDown className="w-4 h-4 text-emerald-400 animate-bounce" />
                              <span className="text-emerald-400">Improving</span>
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 rounded-full bg-slate-500 mr-1 animate-pulse" />
                              <span className="text-slate-400">Stable</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="bg-slate-950/20 p-2.5 rounded-xl border border-slate-850">
                        <span className="text-[9px] text-slate-500 uppercase block">Coordinates</span>
                        <span className="text-[10px] text-slate-400 block mt-1 font-bold">
                          {selectedCell.latitude.toFixed(4)}°N, {selectedCell.longitude.toFixed(4)}°E
                        </span>
                      </div>
                      <div className="bg-slate-950/20 p-2.5 rounded-xl border border-slate-850">
                        <span className="text-[9px] text-slate-500 uppercase block">Scale Area</span>
                        <span className="text-[10px] text-slate-400 block mt-1 font-bold">
                          1.0 km² Micro-grid
                        </span>
                      </div>
                    </div>

                    <div className="bg-cyan-500/5 border border-cyan-500/10 p-3 rounded-xl flex gap-2">
                      <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] font-mono text-slate-400 leading-normal">
                        This micro-level forecast maps advection dynamics for grid <span className="text-cyan-400 font-bold">{selectedCell.id}</span>. This predictive calculation serves as the direct primary spatial feed for Origin-X emission modeling.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-44 flex flex-col items-center justify-center text-center text-slate-500 text-xs py-12">
                    <Map className="w-8 h-8 text-slate-600 mb-2 animate-bounce" />
                    <p className="font-mono uppercase tracking-wider">TAP A HEATMAP CELL TO SIMULATE TELEMETRY</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recharts Curve Visualization */}
            <div className="glass p-6 rounded-3xl border border-slate-200/40 dark:border-slate-800/40 relative overflow-hidden bg-slate-950/20" id="skyweave-curve-card">
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-xs font-mono font-black text-slate-400 uppercase tracking-widest">72-Hour Forecast Curve</h3>
                  </div>
                  <span className="text-[8px] font-mono font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-850">
                    RECHARTS MATRIX MODEL
                  </span>
                </div>

                {isTimelineLoading ? (
                  <div className="h-48 flex flex-col items-center justify-center gap-2" id="skyweave-curve-loading">
                    <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest animate-pulse">Running Temporal Model...</span>
                  </div>
                ) : cellTimeline.length > 0 ? (
                  <div className="space-y-4" id="skyweave-curve-body">
                    <p className="text-[10px] font-mono text-slate-500">
                      Simulated hourly AQI propagation curve for sector <span className="text-white font-bold">{selectedCell?.id} ({selectedCell?.type})</span>:
                    </p>

                    <div className="h-44 w-full" id="skyweave-recharts-container">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={cellTimeline} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="skyweaveGlow" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} vertical={false} />
                          <XAxis 
                            dataKey="time" 
                            stroke="#475569" 
                            fontSize={9} 
                            tickLine={false} 
                            axisLine={false} 
                          />
                          <YAxis 
                            stroke="#475569" 
                            fontSize={9} 
                            tickLine={false} 
                            axisLine={false} 
                            domain={['auto', 'auto']}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#090d16', 
                              borderColor: '#1e293b', 
                              borderRadius: '12px', 
                              fontSize: '10px',
                              fontFamily: 'monospace'
                            }} 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="aqi" 
                            stroke="#22d3ee" 
                            strokeWidth={2} 
                            fillOpacity={1} 
                            fill="url(#skyweaveGlow)" 
                            name="Predicted AQI" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 bg-slate-950/40 p-2.5 rounded-xl border border-slate-900/60">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-cyan-400" /> Hourly progression curve</span>
                      <span>Confidence bound ±4.5%</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-44 flex flex-col items-center justify-center text-center text-slate-500 text-xs py-12">
                    <Clock className="w-8 h-8 text-slate-600 mb-2 animate-pulse" />
                    <p className="font-mono">Timeline unavailable</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkyWeave;
