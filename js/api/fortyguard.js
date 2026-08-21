import { CONFIG } from '../config/config.js';
import { PHOENIX_ZONES } from '../data/demo-data.js';
import { audit } from '../utils/logger.js';
import { Validation } from '../utils/validation.js';

export class FortyGuardClient {
  constructor(apiKey = CONFIG.FORTYGUARD_API_KEY) {
    this.apiKey = apiKey;
    this.baseUrl = CONFIG.FORTYGUARD_API_URL;
    this.status = {
      isLive: false,
      lastChecked: null,
      errorCount: 0
    };
  }

  get isConfigured() {
    return typeof this.apiKey === 'string' && this.apiKey.trim().length > 5;
  }

  async getHyperlocalZones() {
    if (!this.isConfigured) {
      this.status = { isLive: false, lastChecked: new Date(), errorCount: 0 };
      await audit.log('FORTYGUARD_CLIENT', 'DEMO_DATASET_LOADED', { source: 'phoenix_baseline' });
      return {
        success: true,
        source: 'VALIDATED_DEMO_SET',
        isLive: false,
        data: PHOENIX_ZONES
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.NETWORK_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl}/heat-intelligence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ bounds: 'phoenix_metro', resolution: '2m' }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
      const payload = await response.json();
      
      if (!Array.isArray(payload.zones) || payload.zones.length === 0) {
        throw new Error('Invalid schema: Missing zones array in 40Guard response');
      }

      // Validate integrity of each zone
      payload.zones.forEach(zone => Validation.validateZone(zone));

      this.status = { isLive: true, lastChecked: new Date(), errorCount: 0 };
      await audit.log('FORTYGUARD_CLIENT', 'LIVE_API_INGESTION', { count: payload.zones.length });

      return {
        success: true,
        source: 'LIVE_FORTYGUARD_API',
        isLive: true,
        data: payload.zones
      };
    } catch (err) {
      clearTimeout(timeoutId);
      this.status = { isLive: false, lastChecked: new Date(), errorCount: this.status.errorCount + 1 };
      
      await audit.log('FORTYGUARD_CLIENT', 'CIRCUIT_BREAKER_ACTIVATED', { 
        error: err.message, 
        fallback: 'PHOENIX_DEMO_DATA' 
      });

      return {
        success: true, // App continues seamlessly
        source: 'FALLBACK_DEMO_SET',
        isLive: false,
        error: err.message,
        data: PHOENIX_ZONES
      };
    }
  }
}
