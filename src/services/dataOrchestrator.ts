import { getRealisticAqi } from '../../constants';

export interface EnvironmentalState {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  trafficMultiplier: number;
  industrialMultiplier: number;
  constructionActivity: number;
}

export class AeronicxOrchestrator {
  // Key names
  private static KEYS = {
    selectedCity: 'aeronicx_selectedCity',
    forecastPeriod: 'aeronicx_forecastPeriod',
    temperature: 'aeronicx_temperature',
    humidity: 'aeronicx_humidity',
    windSpeed: 'aeronicx_windSpeed',
    windDirection: 'aeronicx_windDirection',
    trafficMultiplier: 'aeronicx_trafficMultiplier',
    industrialMultiplier: 'aeronicx_industrialMultiplier',
    constructionActivity: 'aeronicx_constructionActivity',
    selectedCellId: 'aeronicx_selectedCellId',
    activeEnforcementInput: 'aeronicx_activeEnforcementInput',
  };

  /**
   * Safely gets a value from localStorage with a fallback.
   */
  public static getItem<T>(key: string, fallback: T, parser?: (val: string) => T): T {
    try {
      const val = localStorage.getItem(key);
      if (val === null || val === undefined) return fallback;
      if (parser) return parser(val);
      return val as unknown as T;
    } catch (e) {
      console.warn(`[Orchestrator] Error reading key "${key}":`, e);
      return fallback;
    }
  }

  /**
   * Safely sets a value to localStorage.
   */
  public static setItem(key: string, value: any): void {
    try {
      localStorage.setItem(key, String(value));
    } catch (e) {
      console.warn(`[Orchestrator] Error writing key "${key}":`, e);
    }
  }

  /**
   * Returns deterministic, validated default climate parameters for any city.
   */
  public static getCityDefaults(cityName: string): EnvironmentalState {
    const baseAqi = getRealisticAqi(cityName);
    const isHighPollution = baseAqi > 120;

    return {
      temperature: isHighPollution ? 35 : 24,
      humidity: isHighPollution ? 65 : 45,
      windSpeed: isHighPollution ? 8 : 14,
      windDirection: isHighPollution ? 'NW' : 'NE',
      trafficMultiplier: 1.0,
      industrialMultiplier: 1.0,
      constructionActivity: 1.0,
    };
  }

  /**
   * Updates a city and resets its meteorological and activity defaults deterministically.
   */
  public static setCityAndApplyDefaults(cityName: string): EnvironmentalState {
    const defaults = this.getCityDefaults(cityName);
    
    this.setItem(this.KEYS.selectedCity, cityName);
    this.setItem(this.KEYS.temperature, defaults.temperature);
    this.setItem(this.KEYS.humidity, defaults.humidity);
    this.setItem(this.KEYS.windSpeed, defaults.windSpeed);
    this.setItem(this.KEYS.windDirection, defaults.windDirection);
    this.setItem(this.KEYS.trafficMultiplier, defaults.trafficMultiplier);
    this.setItem(this.KEYS.industrialMultiplier, defaults.industrialMultiplier);
    this.setItem(this.KEYS.constructionActivity, defaults.constructionActivity);

    // Dispatch custom event to notify components about global sync update
    this.dispatchSyncEvent();

    return defaults;
  }

  /**
   * Dispatches a synchronization event for mounted reactive listeners.
   */
  public static dispatchSyncEvent(): void {
    try {
      const event = new CustomEvent('aeronicx-data-sync');
      window.dispatchEvent(event);
    } catch (e) {
      console.warn('[Orchestrator] Failed to dispatch sync event:', e);
    }
  }

  // Getters
  public static getSelectedCity(): string {
    return this.getItem(this.KEYS.selectedCity, 'New Delhi');
  }

  public static getForecastPeriod(): '1 Hour' | '6 Hour' | '24 Hour' | '72 Hour' {
    return this.getItem(this.KEYS.forecastPeriod, '24 Hour') as any;
  }

  public static getTemperature(): number {
    return this.getItem(this.KEYS.temperature, 24, Number);
  }

  public static getHumidity(): number {
    return this.getItem(this.KEYS.humidity, 45, Number);
  }

  public static getWindSpeed(): number {
    return this.getItem(this.KEYS.windSpeed, 14, Number);
  }

  public static getWindDirection(): string {
    return this.getItem(this.KEYS.windDirection, 'NE');
  }

  public static getTrafficMultiplier(): number {
    return this.getItem(this.KEYS.trafficMultiplier, 1.2, Number);
  }

  public static getIndustrialMultiplier(): number {
    return this.getItem(this.KEYS.industrialMultiplier, 1.1, Number);
  }

  public static getConstructionActivity(): number {
    return this.getItem(this.KEYS.constructionActivity, 1.3, Number);
  }

  public static getSelectedCellId(): string | null {
    return this.getItem<string | null>(this.KEYS.selectedCellId, null);
  }

  public static getActiveEnforcementInput(): any | null {
    const val = this.getItem<string | null>(this.KEYS.activeEnforcementInput, null);
    if (!val) return null;
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  }

  // Setters
  public static setSelectedCity(city: string): void {
    this.setItem(this.KEYS.selectedCity, city);
    this.dispatchSyncEvent();
  }

  public static setForecastPeriod(period: string): void {
    this.setItem(this.KEYS.forecastPeriod, period);
    this.dispatchSyncEvent();
  }

  public static setTemperature(temp: number): void {
    // Clamp values to realistic ranges
    const clamped = Math.max(-10, Math.min(55, temp));
    this.setItem(this.KEYS.temperature, clamped);
    this.dispatchSyncEvent();
  }

  public static setHumidity(hum: number): void {
    const clamped = Math.max(0, Math.min(100, hum));
    this.setItem(this.KEYS.humidity, clamped);
    this.dispatchSyncEvent();
  }

  public static setWindSpeed(speed: number): void {
    const clamped = Math.max(0, Math.min(60, speed));
    this.setItem(this.KEYS.windSpeed, clamped);
    this.dispatchSyncEvent();
  }

  public static setWindDirection(dir: string): void {
    const upperDir = dir.toUpperCase();
    const valid = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    if (valid.includes(upperDir)) {
      this.setItem(this.KEYS.windDirection, upperDir);
      this.dispatchSyncEvent();
    }
  }

  public static setTrafficMultiplier(mult: number): void {
    const clamped = Math.max(0.1, Math.min(3.0, mult));
    this.setItem(this.KEYS.trafficMultiplier, clamped);
    this.dispatchSyncEvent();
  }

  public static setIndustrialMultiplier(mult: number): void {
    const clamped = Math.max(0.1, Math.min(3.0, mult));
    this.setItem(this.KEYS.industrialMultiplier, clamped);
    this.dispatchSyncEvent();
  }

  public static setConstructionActivity(mult: number): void {
    const clamped = Math.max(0.1, Math.min(3.0, mult));
    this.setItem(this.KEYS.constructionActivity, clamped);
    this.dispatchSyncEvent();
  }

  public static setSelectedCellId(cellId: string | null): void {
    if (cellId === null) {
      try {
        localStorage.removeItem(this.KEYS.selectedCellId);
      } catch {}
    } else {
      this.setItem(this.KEYS.selectedCellId, cellId);
    }
    this.dispatchSyncEvent();
  }

  public static setActiveEnforcementInput(input: any | null): void {
    if (input === null) {
      try {
        localStorage.removeItem(this.KEYS.activeEnforcementInput);
      } catch {}
    } else {
      this.setItem(this.KEYS.activeEnforcementInput, JSON.stringify(input));
    }
    this.dispatchSyncEvent();
  }
}
