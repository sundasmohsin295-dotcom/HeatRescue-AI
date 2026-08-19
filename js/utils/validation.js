/**
 * Zero-trust runtime input sanitizer and JSON schema validator.
 */
export class Validation {
  static sanitizeText(input) {
    if (typeof input !== 'string') return '';
    return input.replace(/[<>'"`;()&]/g, '').trim();
  }

  static validateZone(zone) {
    const required = ['id', 'name', 'temp_c', 'persistence_hours', 'exceedance_hours'];
    for (const key of required) {
      if (zone[key] === undefined || zone[key] === null) {
        throw new Error(`Integrity Fault: Missing required zone attribute [${key}]`);
      }
    }
    if (typeof zone.temp_c !== 'number' || zone.temp_c < -20 || zone.temp_c > 65) {
      throw new Error(`Sanity Fault: Physical temperature reading out of range (${zone.temp_c}°C)`);
    }
    return true;
  }
}
