import { CONFIG } from '../config/config.js';

/**
 * Transparent, Explainable Microclimate Risk Engine.
 * Implements mathematically continuous weight normalization with zero black-box heuristics.
 */
export class RiskEngine {
  
  static computeHeatIndex(tempC, relativeHumidity) {
    // Steadman formula adaptation for Celsius
    const T = (tempC * 9/5) + 32;
    const R = relativeHumidity;
    let HI = -42.379 + 2.04901523*T + 10.14333127*R - 0.22475541*T*R 
             - 0.00683783*T*T - 0.05481717*R*R + 0.00122874*T*T*R 
             + 0.00085282*T*R*R - 0.00000199*T*T*R*R;
    return ((HI - 32) * 5/9);
  }

  static calculateRisk(zone) {
    const heatIndexC = this.computeHeatIndex(zone.temp_c, zone.humidity || 20);

    // Component Scalers (Normalized 0 - 100)
    const tempScore = Math.min(100, Math.max(0, ((zone.temp_c - 30) / (50 - 30)) * 100));
    const heatIndexScore = Math.min(100, Math.max(0, ((heatIndexC - 30) / (52 - 30)) * 100));
    const persistenceScore = Math.min(100, (zone.persistence_hours / 6.0) * 100);
    const exceedanceScore = Math.min(100, (zone.exceedance_hours / 6.0) * 100);
    const solarScore = Math.min(100, ((zone.solar_wm2 || 800) / 1100) * 100);
    const vulnerabilityScore = zone.vulnerability_score || 50;

    const weights = CONFIG.RISK_WEIGHTS;

    const compositeRisk = Math.round(
      (tempScore * weights.TEMP) +
      (heatIndexScore * weights.HEAT_INDEX) +
      (persistenceScore * weights.PERSISTENCE) +
      (exceedanceScore * weights.EXCEEDANCE) +
      (solarScore * weights.SOLAR_EXPOSURE) +
      (vulnerabilityScore * weights.VULNERABILITY)
    );

    return {
      compositeRisk,
      breakdown: {
        tempScore: Math.round(tempScore),
        heatIndexScore: Math.round(heatIndexScore),
        persistenceScore: Math.round(persistenceScore),
        exceedanceScore: Math.round(exceedanceScore),
        solarScore: Math.round(solarScore),
        vulnerabilityScore: Math.round(vulnerabilityScore)
      },
      heatIndexC: parseFloat(heatIndexC.toFixed(1)),
      isCritical: compositeRisk >= CONFIG.THRESHOLDS.CRITICAL_RISK_SCORE
    };
  }
}
