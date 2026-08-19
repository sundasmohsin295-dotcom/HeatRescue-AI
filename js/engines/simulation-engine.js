import { RiskEngine } from './risk-engine.js';

/**
 * Counterfactual What-If Intervention Engine.
 */
export class SimulationEngine {
  static simulateIntervention(zone, deltaTemp, deltaCanopyPct, interventionKey) {
    // Clone zone safely
    const simulatedZone = JSON.parse(JSON.stringify(zone));
    
    simulatedZone.temp_c += deltaTemp;
    
    // Canopy reduces solar radiation and micro-temperature
    const canopyFraction = (deltaCanopyPct / 100);
    simulatedZone.solar_wm2 = Math.max(200, simulatedZone.solar_wm2 * (1 - (canopyFraction * 0.4)));
    simulatedZone.temp_c = Math.max(20, simulatedZone.temp_c - (canopyFraction * 2.2));

    let directRiskDeduction = 0;
    if (interventionKey === 'misting_buses') directRiskDeduction = 4.2;
    if (interventionKey === 'shelter_network') directRiskDeduction = 8.5;
    if (interventionKey === 'full_contingency') directRiskDeduction = 14.0;

    const baseResult = RiskEngine.calculateRisk(zone);
    const simulatedResult = RiskEngine.calculateRisk(simulatedZone);

    const finalSimulatedRisk = Math.max(0, Math.round(simulatedResult.compositeRisk - directRiskDeduction));
    const deltaRisk = finalSimulatedRisk - baseResult.compositeRisk;

    return {
      baselineRisk: baseResult.compositeRisk,
      simulatedRisk: finalSimulatedRisk,
      deltaRisk,
      simulatedTemp: parseFloat(simulatedZone.temp_c.toFixed(1)),
      interventionEffectiveness: deltaRisk < 0 ? 'HIGH_REDUCTION' : 'NEGLIGIBLE'
    };
  }
}
