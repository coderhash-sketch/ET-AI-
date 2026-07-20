import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Radar, Car, Factory, HardHat, Trash2, Globe, Wind, 
  Thermometer, Droplets, Compass, Info, ShieldAlert, 
  Sparkles, TrendingUp, Search, Building, Home, Trees, 
  RefreshCw, AlertTriangle, Gauge, Clock, Eye, Download, ShieldCheck, Sliders, ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend
} from 'recharts';
import { CITIES, getRealisticAqi } from '../constants';
import { getWindAngle } from '../src/services/airsightPredictionService';
import { calculateGeospatialAttribution, AttributionCellResult, AttributionGridResponse } from '../src/services/originXService';
import { WorkflowState } from '../types';
import { AeronicxOrchestrator } from '../src/services/dataOrchestrator';

// Supported overlays
type OverlayMode = 'overall' | 'traffic' | 'industrial' | 'construction' | 'waste' | 'background';
type ForecastPeriod = '1 Hour' | '6 Hour' | '24 Hour' | '72 Hour';

interface OriginXProps {
  setWorkflow?: (state: WorkflowState) => void;
}

export const OriginX: React.FC<OriginXProps> = ({ setWorkflow }) => {
  const cities = useMemo(() => CITIES, []);
  
  // Selection States
  const [selectedCity, setSelectedCity] = useState<string>(() => AeronicxOrchestrator.getSelectedCity());
  const [forecastPeriod, setForecastPeriod] = useState<ForecastPeriod>(() => AeronicxOrchestrator.getForecastPeriod() as ForecastPeriod);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('overall');
  
  // Slide Overrides
  const [trafficMultiplier, setTrafficMultiplier] = useState<number>(() => AeronicxOrchestrator.getTrafficMultiplier());
  const [industrialMultiplier, setIndustrialMultiplier] = useState<number>(() => AeronicxOrchestrator.getIndustrialMultiplier());
  const [constructionActivity, setConstructionActivity] = useState<number>(() => AeronicxOrchestrator.getConstructionActivity());
  const [temperature, setTemperature] = useState<number>(() => AeronicxOrchestrator.getTemperature());
  const [humidity, setHumidity] = useState<number>(() => AeronicxOrchestrator.getHumidity());
  const [windSpeed, setWindSpeed] = useState<number>(() => AeronicxOrchestrator.getWindSpeed());
  const [windDirection, setWindDirection] = useState<string>(() => AeronicxOrchestrator.getWindDirection());

  // Interactive UI Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Loaded Data State
  const [attributionData, setAttributionData] = useState<AttributionGridResponse | null>(null);
  const [selectedCell, setSelectedCell] = useState<AttributionCellResult | null>(null);

  const isInitialMount = React.useRef(true);

  // Sync state defaults when city changes via deterministic defaults
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
    setTrafficMultiplier(defaults.trafficMultiplier);
    setIndustrialMultiplier(defaults.industrialMultiplier);
    setConstructionActivity(defaults.constructionActivity);
  }, [selectedCity]);

  // Sync state values to localStorage and Orchestrator on change
  useEffect(() => {
    AeronicxOrchestrator.setSelectedCity(selectedCity);
  }, [selectedCity]);

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

  // Track cell selections deterministically
  useEffect(() => {
    if (selectedCell) {
      AeronicxOrchestrator.setSelectedCellId(selectedCell.id);
    }
  }, [selectedCell]);

  // Fetch attribution data
  const fetchAttribution = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const url = `/api/origin-x-attribution?city=${encodeURIComponent(selectedCity)}` +
                  `&period=${encodeURIComponent(forecastPeriod)}` +
                  `&temperature=${temperature}` +
                  `&humidity=${humidity}` +
                  `&windSpeed=${windSpeed}` +
                  `&windDirection=${encodeURIComponent(windDirection)}` +
                  `&trafficVolumeMultiplier=${trafficMultiplier}` +
                  `&industrialOutputMultiplier=${industrialMultiplier}` +
                  `&constructionActivityLevel=${constructionActivity}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data: AttributionGridResponse = await res.json();
      setAttributionData(data);
      
      // Keep selection synced, prioritize orchestrator selection
      if (data.cells && data.cells.length > 0) {
        const storedCellId = AeronicxOrchestrator.getSelectedCellId();
        const targetId = storedCellId || (selectedCell ? selectedCell.id : null);
        const matched = targetId ? data.cells.find(c => c.id === targetId) : null;
        setSelectedCell(matched || data.cells[0]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Dynamic database offline. Utilizing localized micro-sensory calculation engine.');
      // Direct offline backup calculation so the UI never breaks!
      const backupData = calculateGeospatialAttribution(selectedCity, forecastPeriod, {
        temperature,
        humidity,
        windSpeed,
        windDirection,
        trafficVolumeMultiplier: trafficMultiplier,
        industrialOutputMultiplier: industrialMultiplier,
        constructionActivityLevel: constructionActivity
      });
      setAttributionData(backupData);
      if (backupData.cells && backupData.cells.length > 0) {
        const storedCellId = AeronicxOrchestrator.getSelectedCellId();
        const targetId = storedCellId || (selectedCell ? selectedCell.id : null);
        const matched = targetId ? backupData.cells.find(c => c.id === targetId) : null;
        setSelectedCell(matched || backupData.cells[0]);
      }
    } finally {
      setIsLoading(false);
    }
  };



  // Trigger fetch when inputs change
  useEffect(() => {
    fetchAttribution();
  }, [selectedCity, forecastPeriod, trafficMultiplier, industrialMultiplier, constructionActivity, temperature, humidity, windSpeed, windDirection]);

  // Autocomplete city selection
  const filteredCities = useMemo(() => {
    if (!searchQuery) return [];
    return cities.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.country.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 6);
  }, [cities, searchQuery]);

  // Color mappings for overall cell AQIs - enhanced with ultra-vibrant glows
  const getCellAqiColors = (aqi: number) => {
    if (aqi <= 50) return {
      bg: 'bg-emerald-950/20 hover:bg-emerald-500/20 text-emerald-300',
      border: 'border-emerald-500/40 hover:border-emerald-500/70 shadow-[0_0_15px_rgba(16,185,129,0.08)]',
      text: 'text-emerald-400 font-bold',
      glow: 'shadow-[inset_0_0_15px_rgba(16,185,129,0.15)]',
      accent: 'bg-emerald-400'
    };
    if (aqi <= 100) return {
      bg: 'bg-lime-950/20 hover:bg-lime-500/20 text-lime-300',
      border: 'border-lime-500/40 hover:border-lime-500/70 shadow-[0_0_15px_rgba(163,230,71,0.08)]',
      text: 'text-lime-400 font-bold',
      glow: 'shadow-[inset_0_0_15px_rgba(163,230,71,0.15)]',
      accent: 'bg-lime-400'
    };
    if (aqi <= 150) return {
      bg: 'bg-yellow-950/20 hover:bg-yellow-500/20 text-yellow-300',
      border: 'border-yellow-500/40 hover:border-yellow-500/70 shadow-[0_0_15px_rgba(234,179,8,0.08)]',
      text: 'text-yellow-400 font-bold',
      glow: 'shadow-[inset_0_0_15px_rgba(234,179,8,0.15)]',
      accent: 'bg-yellow-400'
    };
    if (aqi <= 200) return {
      bg: 'bg-orange-950/20 hover:bg-orange-500/20 text-orange-300',
      border: 'border-orange-500/40 hover:border-orange-500/70 shadow-[0_0_15px_rgba(249,115,22,0.1)]',
      text: 'text-orange-400 font-bold',
      glow: 'shadow-[inset_0_0_15px_rgba(249,115,22,0.15)]',
      accent: 'bg-orange-400'
    };
    if (aqi <= 300) return {
      bg: 'bg-rose-950/20 hover:bg-rose-500/25 text-rose-300',
      border: 'border-rose-500/50 hover:border-rose-500/85 shadow-[0_0_20px_rgba(244,63,94,0.18)] animate-pulse',
      text: 'text-rose-400 font-bold',
      glow: 'shadow-[inset_0_0_20px_rgba(244,63,94,0.25)]',
      accent: 'bg-rose-500'
    };
    return {
      bg: 'bg-fuchsia-950/30 hover:bg-fuchsia-500/30 text-fuchsia-300',
      border: 'border-fuchsia-500/60 hover:border-fuchsia-500/90 shadow-[0_0_25px_rgba(217,70,239,0.28)]',
      text: 'text-fuchsia-400 font-black',
      glow: 'shadow-[inset_0_0_25px_rgba(217,70,239,0.35)]',
      accent: 'bg-fuchsia-500'
    };
  };

  // Get dynamic coloring based on selected overlay percentage
  const getOverlayColors = (cell: AttributionCellResult) => {
    let percentage = 0;
    let baseColor = 'text-slate-400';
    let label = '';
    
    switch (overlayMode) {
      case 'traffic':
        percentage = cell.contributions.traffic;
        baseColor = 'text-cyan-400';
        label = 'Vehicular';
        break;
      case 'industrial':
        percentage = cell.contributions.industrial;
        baseColor = 'text-rose-400';
        label = 'Industrial';
        break;
      case 'construction':
        percentage = cell.contributions.construction;
        baseColor = 'text-amber-400';
        label = 'Excavation';
        break;
      case 'waste':
        percentage = cell.contributions.wasteBurning;
        baseColor = 'text-violet-400';
        label = 'Waste Burn';
        break;
      case 'background':
        percentage = cell.contributions.background;
        baseColor = 'text-emerald-400';
        label = 'Aerosol';
        break;
      default:
        // Use standard AQI coloring
        return getCellAqiColors(cell.aqiValue);
    }

    // Custom gradient shading based on the percentage contribution of the filtered source
    let bgOpacity = 'bg-slate-900/40';
    let borderColor = 'border-slate-800/60';
    let extraShadow = '';
    
    if (percentage > 60) {
      bgOpacity = overlayMode === 'traffic' ? 'bg-cyan-500/45 shadow-[0_0_20px_rgba(34,211,238,0.35)]' :
                  overlayMode === 'industrial' ? 'bg-rose-500/45 shadow-[0_0_20px_rgba(244,63,94,0.35)]' :
                  overlayMode === 'construction' ? 'bg-amber-500/45 shadow-[0_0_20px_rgba(245,158,11,0.35)]' :
                  overlayMode === 'waste' ? 'bg-violet-500/45 shadow-[0_0_20px_rgba(139,92,246,0.35)]' : 'bg-emerald-500/45 shadow-[0_0_20px_rgba(16,185,129,0.35)]';
      borderColor = overlayMode === 'traffic' ? 'border-cyan-400/90' :
                    overlayMode === 'industrial' ? 'border-rose-400/90' :
                    overlayMode === 'construction' ? 'border-amber-400/90' :
                    overlayMode === 'waste' ? 'border-violet-400/90' : 'border-emerald-400/90';
      extraShadow = 'shadow-[inset_0_0_15px_rgba(255,255,255,0.15)] animate-pulse';
    } else if (percentage > 35) {
      bgOpacity = overlayMode === 'traffic' ? 'bg-cyan-500/25' :
                  overlayMode === 'industrial' ? 'bg-rose-500/25' :
                  overlayMode === 'construction' ? 'bg-amber-500/25' :
                  overlayMode === 'waste' ? 'bg-violet-500/25' : 'bg-emerald-500/25';
      borderColor = overlayMode === 'traffic' ? 'border-cyan-500/50' :
                    overlayMode === 'industrial' ? 'border-rose-500/50' :
                    overlayMode === 'construction' ? 'border-amber-500/50' :
                    overlayMode === 'waste' ? 'border-violet-500/50' : 'border-emerald-500/50';
    } else if (percentage > 15) {
      bgOpacity = overlayMode === 'traffic' ? 'bg-cyan-500/10' :
                  overlayMode === 'industrial' ? 'bg-rose-500/10' :
                  overlayMode === 'construction' ? 'bg-amber-500/10' :
                  overlayMode === 'waste' ? 'bg-violet-500/10' : 'bg-emerald-500/10';
      borderColor = overlayMode === 'traffic' ? 'border-cyan-500/30' :
                    overlayMode === 'industrial' ? 'border-rose-500/30' :
                    overlayMode === 'construction' ? 'border-amber-500/30' :
                    overlayMode === 'waste' ? 'border-violet-500/30' : 'border-emerald-500/30';
    }

    return {
      bg: `${bgOpacity} hover:bg-opacity-40 transition-all ${extraShadow}`,
      border: `border ${borderColor}`,
      text: baseColor,
      glow: `shadow-[inset_0_0_15px_currentColor]`,
      accent: overlayMode === 'traffic' ? 'bg-cyan-500' :
              overlayMode === 'industrial' ? 'bg-rose-500' :
              overlayMode === 'construction' ? 'bg-amber-500' :
              overlayMode === 'waste' ? 'bg-violet-500' : 'bg-emerald-500'
    };
  };

  // Render proper icon for cell types
  const getCellTypeIcon = (type: string, sizeClass = "w-4 h-4") => {
    switch (type) {
      case 'industrial': return <Factory className={sizeClass} />;
      case 'highway': return <Car className={sizeClass} />;
      case 'park': return <Trees className={sizeClass} />;
      case 'commercial': return <Building className={sizeClass} />;
      default: return <Home className={sizeClass} />;
    }
  };

  // Render proper icon for source names
  const getSourceIcon = (source: string, sizeClass = "w-5 h-5") => {
    switch (source) {
      case 'Traffic': return <Car className={sizeClass} />;
      case 'Industrial Emissions': return <Factory className={sizeClass} />;
      case 'Construction': return <HardHat className={sizeClass} />;
      case 'Waste Burning': return <Trash2 className={sizeClass} />;
      default: return <Globe className={sizeClass} />;
    }
  };

  // Prepare Recharts donut chart data
  const chartData = useMemo(() => {
    if (!selectedCell) return [];
    return [
      { name: 'Traffic exhaust (CO/NO₂)', value: selectedCell.contributions.traffic, color: '#38bdf8' },
      { name: 'Industrial stack (SO₂)', value: selectedCell.contributions.industrial, color: '#f87171' },
      { name: 'Construction dust (PM10)', value: selectedCell.contributions.construction, color: '#fbbf24' },
      { name: 'Refuse waste burning', value: selectedCell.contributions.wasteBurning, color: '#c084fc' },
      { name: 'Background aerosols', value: selectedCell.contributions.background, color: '#2dd4bf' }
    ];
  }, [selectedCell]);

  return (
    <div id="origin-x-page" className="flex flex-col gap-8 w-full">
      
      {/* Upper Information Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-gradient-to-br from-fuchsia-950/20 via-slate-900/90 to-cyan-950/10 border border-fuchsia-500/20 p-8 rounded-3xl relative overflow-hidden backdrop-blur-md shadow-[0_0_25px_rgba(217,70,239,0.05)]">
        <div className="absolute top-0 right-0 p-3 opacity-20">
          <Radar className="w-48 h-48 text-fuchsia-500 animate-pulse" />
        </div>
        <div className="flex flex-col gap-2 relative z-10">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-gradient-to-br from-fuchsia-500/10 to-cyan-500/10 border border-fuchsia-500/30 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.2)]">
              <Radar className="w-6 h-6 animate-pulse" />
            </span>
            <h1 className="text-3xl font-black tracking-tighter uppercase font-sans text-slate-100 flex items-center flex-wrap gap-2">
              ORIGIN - X <span className="bg-gradient-to-r from-fuchsia-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent font-black text-lg">PROBABILISTIC PLUME ATTRIBUTION</span>
            </h1>
          </div>
          <p className="text-sm text-slate-400 font-mono tracking-tight max-w-2xl leading-relaxed">
            Geospatial source attribution engine analyzing the 1km x 1km micro-sensory grids. 
            Determines exact atmospheric contributions from point sources, vehicle tunnels, and regional soil excavations.
          </p>
        </div>

        {/* Global Summary Cards */}
        {attributionData && (
          <div className="flex flex-wrap gap-4 relative z-10 w-full md:w-auto">
            <div className="px-5 py-4 bg-slate-950/60 border-t-2 border-t-fuchsia-500 border-x border-b border-slate-800/80 rounded-2xl flex flex-col gap-1 min-w-[130px] shadow-[0_4px_20px_rgba(217,70,239,0.05)]">
              <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase">Average AQI</span>
              <span className="text-2xl font-black text-slate-100">{attributionData.summary.averageAqi}</span>
            </div>
            <div className="px-5 py-4 bg-slate-950/60 border-t-2 border-t-cyan-400 border-x border-b border-slate-800/80 rounded-2xl flex flex-col gap-1 min-w-[210px] shadow-[0_4px_20px_rgba(34,211,238,0.05)]">
              <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase">Primary City Contributor</span>
              <span className="text-sm font-black text-cyan-400 truncate max-w-[200px]">{attributionData.summary.primaryCitySource}</span>
            </div>
            <div className="px-5 py-4 bg-slate-950/60 border-t-2 border-t-emerald-400 border-x border-b border-slate-800/80 rounded-2xl flex flex-col gap-1 min-w-[140px] shadow-[0_4px_20px_rgba(16,185,129,0.05)]">
              <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase">Attribution Confidence</span>
              <span className="text-2xl font-black text-emerald-400">{attributionData.summary.averageConfidence}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Grid Controls and Display Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Side Controls Column (4 cols) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          
          {/* Section: City Search & Quick Select */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono font-black tracking-wider text-slate-500 uppercase">Region Analysis Target</label>
              <div className="relative">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search over 120+ Indian & Global cities..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800/80 rounded-xl font-medium text-slate-200 placeholder-slate-600 focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/20 transition-all text-sm"
                />
                
                {/* Autocomplete Dropdown */}
                {showDropdown && searchQuery && (
                  <div className="absolute left-0 right-0 mt-2 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {filteredCities.length > 0 ? (
                      filteredCities.map((city) => (
                        <button
                          key={city.id}
                          onClick={() => {
                            setSelectedCity(city.name);
                            setSearchQuery('');
                            setShowDropdown(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-white/5 flex justify-between items-center transition-colors border-b border-white/5 last:border-b-0 cursor-pointer"
                        >
                          <span className="font-bold text-slate-200">{city.name}</span>
                          <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded">{city.country}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-slate-600 text-sm font-mono">No matching locations found.</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick-select cities list */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Key Metropolitan Grids</span>
              <div className="flex flex-wrap gap-2">
                {['New Delhi', 'Mumbai', 'Hyderabad', 'Goa', 'Ladakh', 'London'].map(cityName => (
                  <button
                    key={cityName}
                    onClick={() => setSelectedCity(cityName)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
                      selectedCity === cityName 
                        ? 'bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-400 font-extrabold shadow-[0_0_12px_rgba(217,70,239,0.15)]' 
                        : 'bg-slate-950/40 border-slate-800/50 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {cityName}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Forecast Period Selectors */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 flex flex-col gap-3">
            <label className="text-xs font-mono font-black tracking-wider text-slate-500 uppercase">Forecast Temporal Domain</label>
            <div className="grid grid-cols-4 gap-2">
              {(['1 Hour', '6 Hour', '24 Hour', '72 Hour'] as ForecastPeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setForecastPeriod(period)}
                  className={`py-2 px-1 rounded-xl text-center text-xs font-mono font-bold border transition-all cursor-pointer ${
                    forecastPeriod === period 
                      ? 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400 font-extrabold shadow-[inset_0_0_10px_rgba(217,70,239,0.15)]' 
                      : 'bg-slate-950/40 border-slate-800/50 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {/* Section: Interactive Source Isolation Filter */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 flex flex-col gap-3">
            <span className="text-xs font-mono font-black tracking-wider text-slate-500 uppercase flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-fuchsia-400" /> Isolate Pollution Source Overlay
            </span>
            <div className="flex flex-col gap-1.5">
              {[
                { id: 'overall', label: 'Show Overall AQI Heatmap', color: 'border-fuchsia-500/40 text-fuchsia-400', glow: 'shadow-[0_0_15px_rgba(217,70,239,0.12)] bg-fuchsia-950/20', desc: 'Standard color mapping of aggregate particulate load.' },
                { id: 'traffic', label: 'Isolate Vehicle Exhaust (CO/NO₂)', color: 'border-sky-500/40 text-sky-400', glow: 'shadow-[0_0_15px_rgba(56,189,248,0.12)] bg-sky-950/20', desc: 'Highlights traffic loops & urban freeway congestion links.' },
                { id: 'industrial', label: 'Isolate Industrial Plumes (SO₂)', color: 'border-rose-500/40 text-rose-400', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.12)] bg-rose-950/20', desc: 'Isolates coal stacks & heavy industrial kiln emissions.' },
                { id: 'construction', label: 'Isolate Construction Dust (PM10)', color: 'border-amber-500/40 text-amber-400', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.12)] bg-amber-950/20', desc: 'Tracks concrete dust dispersion from urban rail work.' },
                { id: 'waste', label: 'Isolate Waste Burning (Soot)', color: 'border-purple-500/40 text-purple-400', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.12)] bg-purple-950/20', desc: 'Tracks municipal refuse incineration and organic soot.' },
                { id: 'background', label: 'Isolate Natural Background', color: 'border-teal-500/40 text-teal-400', glow: 'shadow-[0_0_15px_rgba(45,212,191,0.12)] bg-teal-950/20', desc: 'Renders biogenic organic aerosols and salt particles.' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setOverlayMode(item.id as OverlayMode)}
                  className={`px-4 py-3.5 text-left rounded-xl border transition-all cursor-pointer flex flex-col gap-1 group ${
                    overlayMode === item.id 
                      ? `${item.color} ${item.glow}` 
                      : 'bg-slate-950/20 border-slate-800/50 text-slate-500 hover:bg-slate-900/40 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs font-black tracking-tight group-hover:text-slate-200 transition-colors">{item.label}</span>
                  <span className="text-[10px] text-slate-600 font-sans leading-normal">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Emission Sliders */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 flex flex-col gap-4">
            <span className="text-xs font-mono font-black tracking-wider text-slate-500 uppercase flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-fuchsia-400" /> Adjust Grid Source Intensity
            </span>

            <div className="flex flex-col gap-4">
              {/* Traffic Multiplier */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-sky-400" /> Vehicular Volume
                  </span>
                  <span className="font-mono text-sky-400 font-bold">{trafficMultiplier.toFixed(1)}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2.0" 
                  step="0.1"
                  value={trafficMultiplier}
                  onChange={(e) => setTrafficMultiplier(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-400 focus:outline-none"
                />
              </div>

              {/* Industrial Multiplier */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                    <Factory className="w-3.5 h-3.5 text-rose-400" /> Industrial Output
                  </span>
                  <span className="font-mono text-rose-400 font-bold">{industrialMultiplier.toFixed(1)}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2.0" 
                  step="0.1"
                  value={industrialMultiplier}
                  onChange={(e) => setIndustrialMultiplier(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-rose-500 focus:outline-none"
                />
              </div>

              {/* Construction Level */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                    <HardHat className="w-3.5 h-3.5 text-amber-400" /> Infrastructure Excavation
                  </span>
                  <span className="font-mono text-amber-400 font-bold">{constructionActivity.toFixed(1)}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.0" 
                  max="2.0" 
                  step="0.2"
                  value={constructionActivity}
                  onChange={(e) => setConstructionActivity(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
          
        </div>

        {/* Center Panel Interactive Map Grid (5 cols) */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 flex flex-col gap-5 relative">
            
            {/* Overlay Selector Indicator */}
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-xs font-mono font-black tracking-wider text-slate-500 uppercase">Micro Sensory Overlay Map</span>
                <span className={`text-xs font-mono capitalize font-extrabold ${
                  overlayMode === 'traffic' ? 'text-sky-400' :
                  overlayMode === 'industrial' ? 'text-rose-400' :
                  overlayMode === 'construction' ? 'text-amber-400' :
                  overlayMode === 'waste' ? 'text-purple-400' :
                  overlayMode === 'background' ? 'text-teal-400' : 'text-fuchsia-400'
                }`}>{overlayMode} Mode</span>
              </div>
              <div className="flex items-center gap-2 bg-cyan-950/40 px-3 py-1.5 rounded-full border border-cyan-500/20 text-[10px] font-mono text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                <Compass className="w-3 h-3 text-cyan-400 animate-spin-slow" /> Wind: {windSpeed} km/h {windDirection}
              </div>
            </div>

            {/* Simulated 6x6 grid mapping */}
            <div className="grid grid-cols-6 gap-2 w-full aspect-square bg-slate-950/60 p-4 rounded-2xl border border-slate-800/50 relative overflow-hidden">
              
              {/* Subtle grid backing guides */}
              <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-5 pointer-events-none">
                {Array.from({ length: 36 }).map((_, i) => (
                  <div key={i} className="border border-white"></div>
                ))}
              </div>

              {/* Wind particle flow representations */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
                <div className="absolute w-full h-full flex flex-wrap gap-4" style={{
                  transform: `rotate(${getWindAngle(windDirection)}deg)`,
                  transition: 'transform 1s ease-in-out'
                }}>
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <motion.div 
                      key={idx}
                      animate={{ x: [-200, 400] }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 3 + idx * 0.4, 
                        ease: "linear",
                        delay: idx * 0.3
                      }}
                      className="h-[1px] w-12 bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent"
                    />
                  ))}
                </div>
              </div>

              {/* Render each grid cell */}
              {attributionData && attributionData.cells.map((cell) => {
                const colors = getOverlayColors(cell);
                const isSelected = selectedCell?.id === cell.id;
                
                // Overlay active percentage display helper
                let overlayValue = '';
                if (overlayMode === 'traffic') overlayValue = `${cell.contributions.traffic}%`;
                else if (overlayMode === 'industrial') overlayValue = `${cell.contributions.industrial}%`;
                else if (overlayMode === 'construction') overlayValue = `${cell.contributions.construction}%`;
                else if (overlayMode === 'waste') overlayValue = `${cell.contributions.wasteBurning}%`;
                else if (overlayMode === 'background') overlayValue = `${cell.contributions.background}%`;
                else overlayValue = `AQI ${cell.aqiValue}`;

                return (
                  <button
                    key={cell.id}
                    onClick={() => setSelectedCell(cell)}
                    className={`flex flex-col justify-between p-2 rounded-xl transition-all outline-none text-left relative group/cell cursor-pointer ${colors.bg} ${colors.border} ${
                      isSelected ? 'ring-2 ring-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.35)] scale-[1.03] z-10' : ''
                    }`}
                  >
                    {/* Top corner cell marker */}
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[8px] font-mono opacity-50 font-black text-slate-400 group-hover/cell:opacity-100 transition-opacity">
                        {cell.id}
                      </span>
                      <span className="text-[10px] text-slate-300">
                        {getCellTypeIcon(cell.type, "w-3 h-3 opacity-60 group-hover/cell:opacity-100 transition-opacity")}
                      </span>
                    </div>

                    {/* Value text display */}
                    <div className="flex flex-col gap-0.5 mt-auto">
                      <span className="text-[9px] text-slate-500 font-sans truncate font-medium group-hover/cell:text-slate-300 transition-colors">
                        {cell.name.split(' ')[1] || cell.name.split(' ')[0]}
                      </span>
                      <span className={`text-[11px] font-mono font-black ${colors.text} tracking-tighter`}>
                        {overlayValue}
                      </span>
                    </div>

                    {/* Left edge selection color bar */}
                    {isSelected && (
                      <div className="absolute left-0.5 top-2 bottom-2 w-1 rounded-full bg-gradient-to-b from-fuchsia-400 to-pink-500 shadow-[0_0_8px_rgba(217,70,239,0.8)]"></div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Map Legend */}
            <div className="flex flex-wrap items-center justify-between gap-4 mt-2 bg-slate-950/60 p-4 border border-slate-800/60 rounded-xl text-xs font-mono">
              <span className="text-slate-500">LEGEND:</span>
              <div className="flex flex-wrap gap-4">
                {overlayMode === 'overall' ? (
                  <>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500/25 border border-emerald-500 text-emerald-400"></span> <span className="text-slate-400">Good</span></div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-lime-500/25 border border-lime-500 text-lime-400"></span> <span className="text-slate-400">Mod</span></div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-yellow-500/25 border border-yellow-500 text-yellow-400"></span> <span className="text-slate-400">Sens</span></div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500/25 border border-amber-500 text-amber-400"></span> <span className="text-slate-400">UnH</span></div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500/25 border border-rose-500 text-rose-400"></span> <span className="text-slate-400">Haz</span></div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-white/5 border border-white/10"></span> <span className="text-slate-500">Low (&lt;15%)</span></div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded ${
                        overlayMode === 'traffic' ? 'bg-sky-500/25 border border-sky-400' :
                        overlayMode === 'industrial' ? 'bg-rose-500/25 border border-rose-400' :
                        overlayMode === 'construction' ? 'bg-amber-500/25 border border-amber-400' :
                        overlayMode === 'waste' ? 'bg-purple-500/25 border border-purple-400' : 'bg-teal-500/25 border border-teal-400'
                      }`}></span> 
                      <span className="text-slate-400">Moderate</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded animate-pulse ${
                        overlayMode === 'traffic' ? 'bg-sky-500/50 border border-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.4)]' :
                        overlayMode === 'industrial' ? 'bg-rose-500/50 border border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]' :
                        overlayMode === 'construction' ? 'bg-amber-500/50 border border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]' :
                        overlayMode === 'waste' ? 'bg-purple-500/50 border border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.4)]' : 'bg-teal-500/50 border border-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.4)]'
                      }`}></span> 
                      <span className="text-slate-300 font-bold">Dominant (&gt;60%)</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Real-time sync feedback message */}
            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Synchronized with Agent 1 1km x 1km forecast matrices.
            </div>

          </div>
        </div>

        {/* Right Side Detail Panel (3 cols) */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {selectedCell && (
              <motion.div
                key={selectedCell.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 flex flex-col gap-6"
              >
                {/* Cell Header and Type Badge */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black tracking-widest text-slate-500 uppercase">Sector Analyzer</span>
                    <span className="px-3 py-1 rounded-full bg-fuchsia-500/5 border border-fuchsia-500/20 font-mono text-[10px] text-fuchsia-400 font-bold flex items-center gap-1.5 shadow-[0_0_8px_rgba(217,70,239,0.1)]">
                      {getCellTypeIcon(selectedCell.type)} {selectedCell.type.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-100 tracking-tighter leading-tight">
                    {selectedCell.name}
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">
                    LAT: {selectedCell.latitude} | LON: {selectedCell.longitude}
                  </span>
                </div>

                {/* Local cell AQI circle panel */}
                <div className="flex items-center justify-between p-4 bg-slate-950/40 rounded-2xl border-l-4 border-l-fuchsia-500 border-y border-r border-slate-800/80 shadow-[0_4px_15px_rgba(217,70,239,0.03)]">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase">Localized AQI</span>
                    <span className="text-3xl font-black text-slate-100">{selectedCell.aqiValue}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase">Classification</span>
                    <span className={`text-xs font-mono font-bold px-3 py-1 rounded-lg ${
                      getCellAqiColors(selectedCell.aqiValue).text
                    } bg-slate-950 border border-slate-800`}>
                      {selectedCell.aqiCategory}
                    </span>
                  </div>
                </div>

                {/* Contribution Breakdown */}
                <div className="flex flex-col gap-4">
                  <span className="text-[10px] font-mono font-black tracking-widest text-slate-500 uppercase flex items-center justify-between">
                    <span>Source Attribution payload</span>
                    <span className="text-fuchsia-400 font-bold">100% TOTAL</span>
                  </span>

                  <div className="flex flex-col gap-3">
                    {/* Traffic Exhaust */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-semibold flex items-center gap-2">
                          <Car className="w-3.5 h-3.5 text-sky-400" /> Vehicular (CO, NO₂)
                        </span>
                        <span className="font-mono text-sky-400 font-bold">{selectedCell.contributions.traffic}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                        <div className="h-full bg-sky-400 rounded-full" style={{ width: `${selectedCell.contributions.traffic}%` }}></div>
                      </div>
                    </div>

                    {/* Industrial Stack */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-semibold flex items-center gap-2">
                          <Factory className="w-3.5 h-3.5 text-rose-400" /> Industrial (SO₂, PM2.5)
                        </span>
                        <span className="font-mono text-rose-400 font-bold">{selectedCell.contributions.industrial}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                        <div className="h-full bg-rose-400 rounded-full" style={{ width: `${selectedCell.contributions.industrial}%` }}></div>
                      </div>
                    </div>

                    {/* Construction Excavation */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-semibold flex items-center gap-2">
                          <HardHat className="w-3.5 h-3.5 text-amber-400" /> Construction (Silicate PM10)
                        </span>
                        <span className="font-mono text-amber-400 font-bold">{selectedCell.contributions.construction}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${selectedCell.contributions.construction}%` }}></div>
                      </div>
                    </div>

                    {/* Refuse waste burning */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-semibold flex items-center gap-2">
                          <Trash2 className="w-3.5 h-3.5 text-purple-400" /> Waste Burn (Organic Soot)
                        </span>
                        <span className="font-mono text-purple-400 font-bold">{selectedCell.contributions.wasteBurning}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                        <div className="h-full bg-purple-400 rounded-full" style={{ width: `${selectedCell.contributions.wasteBurning}%` }}></div>
                      </div>
                    </div>

                    {/* Background Organic aerosols */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-semibold flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 text-teal-400" /> Background Aerosols / Pollen
                        </span>
                        <span className="font-mono text-teal-400 font-bold">{selectedCell.contributions.background}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                        <div className="h-full bg-teal-400 rounded-full" style={{ width: `${selectedCell.contributions.background}%` }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Recharts Donut Pie Chart for Source Distribution */}
                  <div className="h-44 w-full relative mt-2 bg-slate-950/30 rounded-2xl border border-slate-800/40 p-2 flex flex-col justify-center items-center" id="originx-pie-chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#020617', 
                            borderColor: '#1e293b', 
                            borderRadius: '8px',
                            fontSize: '11px',
                            color: '#cbd5e1',
                            fontFamily: 'monospace'
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                      <span className="text-lg font-black text-slate-100">100%</span>
                      <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Payload</span>
                    </div>
                  </div>

                </div>

                {/* Primary Contributor Showcase */}
                {(() => {
                  let borderStyle = 'border-amber-400/20 bg-amber-500/5 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.03)]';
                  const mainSource = selectedCell.primarySource.toLowerCase();
                  if (mainSource.includes('traffic') || mainSource.includes('vehic')) {
                    borderStyle = 'border-sky-500/20 bg-sky-500/5 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.03)]';
                  } else if (mainSource.includes('industr') || mainSource.includes('stack')) {
                    borderStyle = 'border-rose-500/20 bg-rose-500/5 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.03)]';
                  } else if (mainSource.includes('waste') || mainSource.includes('burn')) {
                    borderStyle = 'border-purple-500/20 bg-purple-500/5 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.03)]';
                  } else if (mainSource.includes('background') || mainSource.includes('natural')) {
                    borderStyle = 'border-teal-500/20 bg-teal-500/5 text-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.03)]';
                  }
                  
                  return (
                    <div className={`p-4 rounded-2xl flex flex-col gap-2 border ${borderStyle}`}>
                      <div className="flex items-center gap-2 text-xs font-mono font-bold">
                        {getSourceIcon(selectedCell.primarySource)} Dominant: {selectedCell.primarySource.toUpperCase()}
                      </div>
                      <p className="text-xs text-slate-400 font-sans leading-relaxed">
                        {selectedCell.evidenceSummary}
                      </p>
                    </div>
                  );
                })()}

                {/* Outflow Pipeline Integration Panel */}
                <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 flex flex-col gap-3" id="vanguard-pipeline-block">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400">
                      <Compass className="w-4 h-4 text-cyan-400 animate-spin-slow" /> DATA OUTFLOW PIPELINE
                    </div>
                    <span className="text-[9px] font-mono bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 px-1.5 py-0.5 rounded uppercase font-black">
                      FEED READY
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-sans leading-relaxed text-left">
                    The source attribution and chemical plume distribution calculated for sector <strong className="text-cyan-400">{selectedCell.id}</strong> are actively serialized. This payload serves as the live, primary telemetry input for VanGuard's tactical containment simulation algorithms.
                  </p>

                  {setWorkflow ? (
                    <button
                      onClick={() => setWorkflow(WorkflowState.ENFORCEMENT_INTEL)}
                      className="w-full py-2.5 px-4 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-400 font-mono text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.08)] group"
                    >
                      <span>TRANSMIT FEED TO VANGUARD</span>
                      <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform animate-pulse" />
                    </button>
                  ) : (
                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 bg-slate-950/40 p-2 rounded-lg border border-slate-900">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Directly routed to VanGuard tactical engine.
                    </div>
                  )}
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

export default OriginX;
