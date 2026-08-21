import { RiskEngine } from '../engines/risk-engine.js';
import { TrendEngine } from '../engines/trend-engine.js';
import { audit } from '../utils/logger.js';

/**
 * AGENT 1: ANALYST
 * Mission: Ingest ground reality, compute mathematical indicators, verify integrity.
 */
export class AnalystAgent {
  static async execute(zones) {
    await audit.log('ANALYST_AGENT', 'START_TELEMETRY_INGESTION', { zoneCount: zones.length });

    const analyzedZones = zones.map(zone => {
      const riskAssessment = RiskEngine.calculateRisk(zone);
      const trendAssessment = TrendEngine.analyzeVelocity(zone.timeline);
      
      return {
        ...zone,
        risk: riskAssessment.compositeRisk,
        riskDetails: riskAssessment,
        trend: trendAssessment
      };
    });

    await audit.log('ANALYST_AGENT', 'INGESTION_COMPLETED', {
      meanRisk: Math.round(analyzedZones.reduce((acc, z) => acc + z.risk, 0) / analyzedZones.length)
    });

    return analyzedZones;
  }
}
