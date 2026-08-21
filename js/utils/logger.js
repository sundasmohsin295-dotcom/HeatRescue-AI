/**
 * SOC-style Cryptographic Audit Trail Logger.
 * Uses Web Crypto SHA-256 for deterministic, immutable event chaining.
 */
export class AuditLogger {
  constructor() {
    this.logs = [];
    this.previousHash = "0000000000000000000000000000000000000000000000000000000000000000";
  }

  async log(agent, action, details) {
    const timestamp = new Date().toISOString();
    const payload = JSON.stringify({ timestamp, agent, action, details, prev: this.previousHash });
    
    // Web Crypto API SHA-256
    const msgUint8 = new TextEncoder().encode(payload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const currentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const entry = {
      timestamp,
      agent,
      action,
      details,
      hash: currentHash.substring(0, 16)
    };

    this.logs.unshift(entry);
    this.previousHash = currentHash;
    
    // Dispatch system event for UI listener
    window.dispatchEvent(new CustomEvent('hr-audit-logged', { detail: entry }));
    return entry;
  }

  exportJSON() {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const audit = new AuditLogger();
