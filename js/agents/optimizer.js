import { audit } from '../utils/logger.js';

/**
 * AGENT 2: OPTIMIZER
 * Mission: Prioritize operational hotspots and detect compounding stress factors.
 */
export class OptimizerAgent {
  static async execute(analyzedZones) {
    await audit.log('OPTIMIZER_AGENT', 'START_HOTSPOT_TRIAGE', {});

    // Rank descending by composite risk
    const ranked = [...analyzedZones].sort((a, b) => b.risk - a.risk);
    const criticalHotspots = ranked.filter(z => z.riskDetails.isCritical);

    const priorityZone = ranked[0];

    const rationale = `Zone [${priorityZone.name}] ranked #1 Priority with composite score ${priorityZone.risk}/100. Primary forcing: Ground Temp ${priorityZone.temp_c}°C with ${priorityZone.persistence_hours}h sustained persistence.`;

    await audit.log('OPTIMIZER_AGENT', 'TRIAGE_COMPLETE', {
      topZoneId: priorityZone.id,
      criticalCount: criticalHotspots.length
    });

    return {
      rankedZones: ranked,
      criticalHotspots,
      priorityZone,
      rationale
    };
  }
}
