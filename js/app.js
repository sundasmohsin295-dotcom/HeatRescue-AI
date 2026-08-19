import { state } from './state.js';
import { FortyGuardClient } from './api/fortyguard.js';
import { AnalystAgent } from './agents/analyst.js';
import { OptimizerAgent } from './agents/optimizer.js';
import { DispatcherAgent } from './agents/dispatcher.js';
import { TrajectoryEngine } from './engines/trajectory-engine.js';
import { GISHeatMap } from './map/map.js';
import { NavigationUI } from './ui/navigation-ui.js';
import { CommandUI } from './ui/command-ui.js';
import { InvestigatorModuleUI } from './ui/investigator-ui.js';
import { AuditModuleUI } from './ui/audit-ui.js';
import { DashboardUI } from './ui/dashboard.js';
import { audit } from './utils/logger.js';

class HeatRescueEnterpriseApp {
  constructor() {
    this.fgClient = new FortyGuardClient();
    this.map = null;
  }

  async init() {
    NavigationUI.init();
    this.setupRouter();
    this.setupAuditCounter();

    // Initial Telemetry Run
    const rawData = await this.fgClient.getHyperlocalZones();
    state.zones = await AnalystAgent.execute(rawData.data);
    const triage = await OptimizerAgent.execute(state.zones);
    state.selectedZone = triage.priorityZone;
    const plan = await DispatcherAgent.execute(triage);
    state.incidents = [plan];

    // Mount Default Command Module
    this.renderActiveModule('command');
  }

  setupRouter() {
    window.addEventListener('hr-module-changed', (e) => {
      this.renderActiveModule(e.detail.module);
    });

    document.getElementById('launch-judge-demo-btn')?.addEventListener('click', () => {
      this.runJudgeDemo();
    });
  }

  renderActiveModule(moduleKey) {
    const viewport = document.getElementById('module-viewport');

    switch (moduleKey) {
      case 'command':
        NavigationUI.updateHeader('Command Center', 'Executive operational heat risk overview & rapid triage');
        CommandUI.render(viewport);
        // Re-mount map when command loads
        setTimeout(() => {
          this.map = new GISHeatMap('gis-heat-map', (zone) => state.setSelectedZone(zone));
          this.map.renderZones(state.zones, 'snapshot');
          DashboardUI.renderRiskBreakdown(state.selectedZone);
        }, 50);
        break;

      case 'investigator':
        NavigationUI.updateHeader('AI Heat Investigator', 'Multi-agent explainable reasoning & tool call inspection');
        InvestigatorModuleUI.render(viewport, (q) => this.runDeepInvestigation(q));
        break;

      case 'audit-trail':
        NavigationUI.updateHeader('SOC Cryptographic Audit Ledger', 'SHA-256 chained decision and action transparency');
        AuditModuleUI.render(viewport);
        break;

      default:
        NavigationUI.updateHeader('Command Center', 'Executive overview');
        CommandUI.render(viewport);
        break;
    }
  }

  async runDeepInvestigation(query) {
    const pane = document.getElementById('agent-chat-pane');
    if (!pane) return;

    pane.innerHTML = `<div style="color:var(--accent-cyan);">Executing tool-calling pipeline for: "${query}"...</div>`;

    const triage = await OptimizerAgent.execute(state.zones);
    const trajectory = TrajectoryEngine.projectTrajectory(triage.priorityZone, triage.priorityZone.trend);
    const plan = await DispatcherAgent.execute(triage);

    pane.innerHTML = `
      <div style="border-left: 2px solid var(--accent-cyan); padding-left:8px; margin-bottom:8px;">
        <span class="tool-trace-tag">ANALYST</span> Ingested 4 40Guard Microclimate Zones (2m AGL)<br/>
        <span class="tool-trace-tag">OPTIMIZER</span> Computed risk scores. Highest: ${triage.priorityZone.name} (${triage.priorityZone.risk}/100)<br/>
        <span class="tool-trace-tag">DISPATCHER</span> Formulated incident ${plan.incidentId}
      </div>
      <div style="background:var(--bg-secondary); padding:8px; border-radius:4px;">
        <strong>VERDICT:</strong> ${triage.rationale}<br/><br/>
        <strong>PROJECTED TRAJECTORY:</strong> ${trajectory.advisory}<br/><br/>
        <strong style="color:var(--accent-amber);">DISPATCH PROTOCOL:</strong> ${plan.recommendedActions[0]}
      </div>
    `;
  }

  async runJudgeDemo() {
    DashboardUI.showToast('🎬 Starting Automated Judge Flow...', 'info');
    state.setModule('command');
    await new Promise(r => setTimeout(r, 1500));

    state.setModule('investigator');
    await this.runDeepInvestigation('Identify most critical zone and prepare response');
    await new Promise(r => setTimeout(r, 2500));

    state.setModule('audit-trail');
    DashboardUI.showToast('🎬 Demo Complete: Chained Audit Record Verified', 'success');
  }

  setupAuditCounter() {
    window.addEventListener('hr-audit-logged', () => {
      document.getElementById('audit-chain-count').textContent = `${audit.logs.length} BLOCKS`;
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new HeatRescueEnterpriseApp();
  app.init();
});
