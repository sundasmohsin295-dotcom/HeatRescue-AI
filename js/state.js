import { PHOENIX_ZONES } from './data/demo-data.js';

/**
 * Enterprise Reactive State Container
 */
class AppState {
  constructor() {
    this.currentUser = {
      name: 'Demo Operations Director',
      org: 'Municipal Heat Operations Command',
      role: 'emergency',
      authenticated: true
    };

    this.activeModule = 'command';
    this.zones = PHOENIX_ZONES;
    this.selectedZone = PHOENIX_ZONES[1]; // South Mountain Hub
    this.incidents = [];
    this.auditLogs = [];
    this.isDemoMode = true;
    this.coolingResources = [
      { id: 'CR-01', name: 'Downtown Mobile Misters', capacity: 200, status: 'AVAILABLE', lat: 33.4484, lng: -112.0740 },
      { id: 'CR-02', name: 'South Mountain Chilled Pavilion', capacity: 450, status: 'DEPLOYED', lat: 33.4010, lng: -112.0710 },
      { id: 'CR-03', name: 'West Valley Water Station', capacity: 150, status: 'AVAILABLE', lat: 33.4550, lng: -112.1300 }
    ];
  }

  setModule(moduleKey) {
    this.activeModule = moduleKey;
    window.dispatchEvent(new CustomEvent('hr-module-changed', { detail: { module: moduleKey } }));
  }

  setSelectedZone(zone) {
    this.selectedZone = zone;
    window.dispatchEvent(new CustomEvent('hr-zone-selected', { detail: { zone } }));
  }
}

export const state = new AppState();
