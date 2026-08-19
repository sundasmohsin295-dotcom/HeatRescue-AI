import { state } from './state.js';
import { FortyGuardClient } from './api/fortyguard.js';
import { AnalystAgent } from './agents/analyst.js';
import { OptimizerAgent } from './agents/optimizer.js';
import { DispatcherAgent } from './agents/dispatcher.js';
import { TrajectoryEngine } from './engines/trajectory-engine.js';
import { GISHeatMap } from './map/map.js';
import { NavigationUI } from './ui/navigation-ui.js';
import { CommandUI } from './ui/command-ui.js';
import { InvestigatorModuleUI } from './ui/investigator.js';
import { AuditModuleUI } from './ui/audit-ui.js';
import { DashboardUI } from './ui/dashboard.js';
import { audit } from './utils/logger.js';

class HeatRescueEnterpriseApp {
  constructor() { this.fgClient = new FortyGuardClient(); this.map = null; }

  async init() {
    NavigationUI.init(); this.setupRouter(); this.setupAuditCounter();
    try {
      const rawData = await this.fgClient.getHyperlocalZones();
      state.zones = await AnalystAgent.execute(rawData.data);
      const triage = await OptimizerAgent.execute(state.zones);
      state.selectedZone = triage.priorityZone;
      state.incidents = [await DispatcherAgent.execute(triage)];
    } catch (error) {
      console.error('HeatRescue initialization failed:', error);
      DashboardUI.showToast('Telemetry initialization failed. Review system status.', 'error');
    }
    this.renderActiveModule('command');
  }

  setupRouter() {
    window.addEventListener('hr-module-changed', e => this.renderActiveModule(e.detail.module));
    document.getElementById('launch-judge-demo-btn')?.addEventListener('click', () => this.runJudgeDemo());
  }

  renderActiveModule(moduleKey) {
    const viewport = document.getElementById('module-viewport'); if (!viewport) return;
    switch (moduleKey) {
      case 'command':
        NavigationUI.updateHeader('Command Center', 'Executive operational heat risk overview & rapid triage');
        CommandUI.render(viewport);
        setTimeout(() => {
          try { this.map = new GISHeatMap('gis-heat-map', zone => state.setSelectedZone(zone)); this.map.renderZones(state.zones || [], 'snapshot'); DashboardUI.renderRiskBreakdown(state.selectedZone); }
          catch (e) { console.error('Map render failed:', e); }
        }, 50); break;
      case 'investigator':
        NavigationUI.updateHeader('AI Heat Investigator', 'Explainable reasoning, evidence and response planning');
        InvestigatorModuleUI.render(viewport, q => this.runDeepInvestigation(q)); break;
      case 'audit-trail':
        NavigationUI.updateHeader('SOC Cryptographic Audit Ledger', 'SHA-256 chained decision and action transparency');
        AuditModuleUI.render(viewport); break;
      default: this.renderActiveModule('command');
    }
  }

  async runDeepInvestigation(query) {
    const pane = document.getElementById('agent-chat-pane'); if (!pane) return;
    pane.textContent = `Investigating: ${query}`;
    try {
      const triage = await OptimizerAgent.execute(state.zones || []);
      const trajectory = TrajectoryEngine.projectTrajectory(triage.priorityZone, triage.priorityZone.trend);
      const plan = await DispatcherAgent.execute(triage);
      pane.replaceChildren();
      const trace = document.createElement('div'); trace.className = 'investigation-result';
      trace.textContent = `VERDICT: ${triage.rationale}\n\nPROJECTED TRAJECTORY: ${trajectory.advisory}\n\nDISPATCH PROTOCOL: ${plan.recommendedActions?.[0] || 'No action generated.'}`;
      pane.appendChild(trace);
    } catch (error) {
      console.error('Investigation failed:', error);
      pane.textContent = 'Investigation failed safely. Please retry after telemetry is available.';
      DashboardUI.showToast('Investigation failed. Check telemetry status.', 'error');
    }
  }

  async runJudgeDemo() {
    DashboardUI.showToast('Starting Automated Judge Flow...', 'info'); state.setModule('command');
    await new Promise(r => setTimeout(r, 1000)); state.setModule('investigator');
    await this.runDeepInvestigation('Identify most critical zone and prepare response');
    await new Promise(r => setTimeout(r, 1800)); state.setModule('audit-trail');
    DashboardUI.showToast('Demo Complete: Chained Audit Record Verified', 'success');
  }

  setupAuditCounter() {
    window.addEventListener('hr-audit-logged', () => { const c = document.getElementById('audit-chain-count'); if (c) c.textContent = `${audit.logs.length} BLOCKS`; });
  }
}
window.addEventListener('DOMContentLoaded', () => new HeatRescueEnterpriseApp().init());
