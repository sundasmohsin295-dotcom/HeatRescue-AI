import { CONFIG } from '../config/config.js';
import { audit } from '../utils/logger.js';

export class N8nClient {
  constructor() {
    this.webhookUrl = CONFIG.N8N_WEBHOOK_URL;
  }

  get isConfigured() {
    return typeof this.webhookUrl === 'string' && this.webhookUrl.trim().length > 10;
  }

  async runAgentInvestigation(query, currentZones) {
    if (!this.isConfigured) {
      await audit.log('N8N_BRIDGE', 'BYPASS_LOCAL_FALLBACK', { reason: 'Webhook URL not configured' });
      return { success: false, reason: 'NOT_CONFIGURED' };
    }

    await audit.log('N8N_BRIDGE', 'DISPATCHING_REQUEST', { query, endpoint: this.webhookUrl });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.NETWORK_TIMEOUT_MS);

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          query,
          timestamp: new Date().toISOString(),
          zones_context: currentZones.map(z => ({
            id: z.id,
            name: z.name,
            temp_c: z.temp_c,
            persistence_hours: z.persistence_hours,
            exceedance_hours: z.exceedance_hours
          }))
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`n8n HTTP ${response.status}: ${response.statusText}`);
      }

      const payload = await response.json();
      await audit.log('N8N_BRIDGE', 'EXECUTION_SUCCESS', { payloadSize: JSON.stringify(payload).length });
      
      return {
        success: true,
        source: 'LIVE_N8N_AGENT',
        data: payload
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      const errMsg = isTimeout ? `Request timed out after ${CONFIG.NETWORK_TIMEOUT_MS}ms` : err.message;

      await audit.log('N8N_BRIDGE', 'EXECUTION_FAILED', { error: errMsg, fallingBack: true });

      return {
        success: false,
        reason: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
        error: errMsg
      };
    }
  }
}
