/**
 * Analyzes multi-hour temperature velocity and detects inflection anomalies.
 */
export class TrendEngine {
  static analyzeVelocity(timeline) {
    if (!timeline) return { trend: 'STABLE', ratePerHour: 0.0 };
    const hours = Object.keys(timeline).map(Number).sort((a, b) => a - b);
    if (hours.length < 2) return { trend: 'STABLE', ratePerHour: 0.0 };

    const firstHour = hours[0];
    const lastHour = hours[hours.length - 1];
    const deltaTemp = timeline[lastHour] - timeline[firstHour];
    const deltaHours = lastHour - firstHour;
    const ratePerHour = parseFloat((deltaTemp / deltaHours).toFixed(2));

    let trend = 'STABLE';
    if (ratePerHour > 1.2) trend = 'RAPID_DETERIORATION';
    else if (ratePerHour > 0.4) trend = 'RISING';
    else if (ratePerHour < -0.4) trend = 'COOLING';

    return { trend, ratePerHour };
  }
}
