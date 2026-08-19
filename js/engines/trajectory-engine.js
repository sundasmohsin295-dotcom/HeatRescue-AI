import { CONFIG } from '../config/config.js';

export class TrajectoryEngine {
  /**
   * Generates a 4-hour forward decision-support risk trajectory.
   */
  static projectTrajectory(zone, trendVelocity) {
    const baselineRisk = zone.risk || 50;
    const rate = trendVelocity.ratePerHour || 0.5;
    
    // Scale rate to risk impact
    const riskFactorPerHour = rate * 3.2;

    const projections = [
      { offsetHours: 1, projectedRisk: Math.min(100, Math.max(0, Math.round(baselineRisk + (riskFactorPerHour * 1)))) },
      { offsetHours: 2, projectedRisk: Math.min(100, Math.max(0, Math.round(baselineRisk + (riskFactorPerHour * 2)))) },
      { offsetHours: 3, projectedRisk: Math.min(100, Math.max(0, Math.round(baselineRisk + (riskFactorPerHour * 2.8)))) },
      { offsetHours: 4, projectedRisk: Math.min(100, Math.max(0, Math.round(baselineRisk + (riskFactorPerHour * 2.2)))) }
    ];

    const peakProjection = projections.reduce((prev, curr) => (curr.projectedRisk > prev.projectedRisk ? curr : prev), projections[0]);

    return {
      projections,
      peakHourOffset: peakProjection.offsetHours,
      peakEstimatedRisk: peakProjection.projectedRisk,
      advisory: peakProjection.projectedRisk >= CONFIG.THRESHOLDS.CRITICAL_RISK_SCORE 
        ? `Thermal peak expected in ~${peakProjection.offsetHours}h (Projected Risk: ${peakProjection.projectedRisk}/100)`
        : `Stable thermal curve expected over next 4 hours.`
    };
  }
}
