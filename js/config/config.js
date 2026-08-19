export const CONFIG = Object.freeze({
  APP_NAME: 'HeatRescue AI',
  VERSION: '2.4.0-PROD',
  ENV: 'production',
  
  // Endpoints: Defaults to null/self for zero-trust fallback
  FORTYGUARD_API_URL: 'https://api.fortyguard.com/v1',
  N8N_WEBHOOK_URL: '', // Insert user webhook URL here if configured
  
  THRESHOLDS: {
    CRITICAL_TEMP_C: 43.0,
    CRITICAL_RISK_SCORE: 80,
    PERSISTENCE_LIMIT_HOURS: 3.5,
    EXCEEDANCE_LIMIT_HOURS: 4.0
  },

  RISK_WEIGHTS: {
    TEMP: 0.25,
    HEAT_INDEX: 0.15,
    PERSISTENCE: 0.20,
    EXCEEDANCE: 0.15,
    SOLAR_EXPOSURE: 0.10,
    VULNERABILITY: 0.10,
    TREND_RATE: 0.05
  },

  DEFAULT_CENTER: [33.4484, -112.0740], // Phoenix, AZ
  DEFAULT_ZOOM: 12
});
