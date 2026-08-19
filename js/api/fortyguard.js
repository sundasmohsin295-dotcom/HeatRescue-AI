import { CONFIG } from '../config/config.js';
import { PHOENIX_ZONES } from '../data/demo-data.js';
import { audit } from '../utils/logger.js';

/**
 * 40Guard Temperature API Driver with Fallback Circuit Breaker.
 */
export class FortyGuardClient {
  constructor(apiKey = null) {
    this.apiKey = apiKey;
    this.baseUrl = CONFIG.FORTYGUARD_API_URL;
  }

  async getHyperlocalZones() {
    if (!this.apiKey) {
      await audit.log('FORTYGUARD_CLIENT', 'FALLBACK_DEMO_LOAD', { reason: 'No API key provided' });
      return { success: true, source: 'VALIDATED_DEMO_SET', data: PHOENIX_ZONES };
    }

    try {
      const response = await fetch(`${this.baseUrl}/heat-intelligence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ bounds: 'phoenix_metro', resolution: '2m' })
      });

      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      const payload = await response.json();
      await audit.log('FORTYGUARD_CLIENT', 'LIVE_INGESTION', { count: payload.zones.length });
      return { success: true, source: 'LIVE_FORTYGUARD_API', data: payload.zones };
    } catch (err) {
      await audit.log('FORTYGUARD_CLIENT', 'API_FAILURE_RECOVERY', { err: err.message });
      return { success: true, source: 'FALLBACK_DEMO_SET', data: PHOENIX_ZONES };
    }
  }
}
