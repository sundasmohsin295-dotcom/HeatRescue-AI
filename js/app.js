import { FortyGuardClient } from './api/fortyguard.js';
import { AnalystAgent } from './agents/analyst.js';
import { OptimizerAgent } from './agents/optimizer.js';
import { DispatcherAgent } from './agents/dispatcher.js';
import { SimulationEngine } from './engines/simulation-engine.js';
import { GISHeatMap } from './map/map.js';
import { DashboardUI } from './ui/dashboard.js';
import { audit } from './utils/logger.js';
import { Validation } from './utils/validation.js';

class HeatRescueApplication {
  constructor() {
    this.client = new FortyGuardClient();
    this.zones = [];
    this.selectedZone = null;
    this.incidents = [];
    this.map = null;
  }

  async initialize() {
    this.map = new GISHeatMap('gis-heat-map', (zone) => this.handleZoneSelection(zone));
    this.setupEventListeners();
    this.setupAuditStream();

    // Initial Telemetry Cycle
    await this.runFullAgentPipeline();
  }

  async runFullAgentPipeline() {
    // Stage 1: Ingest
    const rawData = await this.client.getHyperlocalZones();
    
    // Stage 2: Analyst Agent
    this.setStepStatus('analyst', 'running');
    this.zones = await AnalystAgent.execute(rawData.data);
    this.setStepStatus('analyst', 'done');

    // Stage 3: Optimizer Agent
    this.setStepStatus('optimizer', 'running');
    const triage = await OptimizerAgent.execute(this.zones);
    this.setStepStatus('optimizer', 'done');

    // Stage 4: Dispatcher Agent
    this.setStepStatus('dispatcher', 'running');
    const dispatchPlan = await DispatcherAgent.execute(triage);
    this.setStepStatus('dispatcher', 'done');

    // State sync
    this.incidents = [dispatchPlan];
    this.selectedZone = triage.priorityZone;

    // Refresh UI
    this.map.renderZones(this.zones, 'snapshot');
    DashboardUI.renderRiskBreakdown(this.selectedZone);
    DashboardUI.renderIncidents(this.incidents, (id, act) => this.handleIncidentAction(id, act));
    
    DashboardUI.updateMetrics({
      maxRisk: triage.priorityZone.risk,
      maxRiskLocation: triage.priorityZone.name,
      criticalCount: triage.criticalHotspots.length,
      activeIncidents: this.incidents.length
    });

    // Populate Natural Language Investigation Box
    document.getElementById('investigation-output-box').innerHTML = `
      <div style="color: var(--accent-cyan); font-weight:700;">[EXPLAINABLE REASONING]</div>
      <div>${triage.rationale}</div>
      <div style="margin-top:6px; color: var(--accent-amber);">[DISPATCH RECOMMENDED]: ${dispatchPlan.incidentId} (${dispatchPlan.severity})</div>
    `;
  }

  handleZoneSelection(zone) {
    this.selectedZone = zone;
    DashboardUI.renderRiskBreakdown(zone);
  }

  setStepStatus(step, status) {
    const el = document.getElementById(`step-${step}`);
    if (el) el.className = `step ${status}`;
  }

  setupEventListeners() {
    // Natural Language Investigation Trigger
    document.getElementById('run-investigation-btn').addEventListener('click', () => {
      const q = Validation.sanitizeText(document.getElementById('agent-query-input').value);
      this.runFullAgentPipeline();
    });

    // Layer Controls
    document.querySelectorAll('.layer-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const layer = e.target.dataset.layer;
        
        if (layer === 'coolroute') {
          this.map.toggleCoolRoutes(true);
        } else {
          this.map.toggleCoolRoutes(false);
          this.map.renderZones(this.zones, layer);
        }
      });
    });

    // What-If Simulation Event
    document.getElementById('run-simulation-btn').addEventListener('click', () => {
      const deltaTemp = parseFloat(document.getElementById('sim-temp-delta').value);
      const deltaCanopy = parseFloat(document.getElementById('sim-canopy-delta').value);
      const intervention = document.getElementById('sim-intervention-type').value;

      const outcome = SimulationEngine.simulateIntervention(this.selectedZone, deltaTemp, deltaCanopy, intervention);
      
      document.getElementById('sim-outcome-box').innerHTML = `
        <strong>Simulated Risk: ${outcome.simulatedRisk}/100</strong> (Baseline: ${outcome.baselineRisk})<br/>
        Net Delta: <b style="color:${outcome.deltaRisk <= 0 ? 'var(--accent-green)':'var(--accent-red)'}">${outcome.deltaRisk} pts</b><br/>
        Projected Temp: ${outcome.simulatedTemp}°C
      `;
    });

    // Time Machine Slider
    document.getElementById('heat-timeline-slider').addEventListener('input', (e) => {
      const hr = e.target.value;
      document.getElementById('timeline-display-time').textContent = `${hr}:00`;
      
      // Mutate zone temperatures according to hourly curve
      const timeTravelZones = this.zones.map(z => ({
        ...z,
        temp_c: z.timeline && z.timeline[hr] ? z.timeline[hr] : z.temp_c
      }));
      this.map.renderZones(timeTravelZones, 'snapshot');
    });

    // Emergency Scenario Sim
    document.getElementById('emergency-sim-btn').addEventListener('click', async () => {
      await audit.log('COMMAND_SYSTEM', 'INJECT_EMERGENCY_SIMULATION', { scenario: 'RAPID_SPIKE_48C' });
      this.zones[1].temp_c = 48.2;
      this.zones[1].persistence_hours = 6.0;
      await this.runFullAgentPipeline();
    });

    // Audit Export
    document.getElementById('export-audit-btn').addEventListener('click', () => {
      const blob = new Blob([audit.exportJSON()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HeatRescue-Audit-${Date.now()}.json`;
      a.click();
    });

    // Modal close
    document.getElementById('close-report-modal').addEventListener('click', () => {
      document.getElementById('report-modal').classList.add('hidden');
    });
  }

  handleIncidentAction(incidentId, action) {
    const inc = this.incidents.find(i => i.incidentId === incidentId);
    if (action === 'review') {
      document.getElementById('report-modal-content').innerHTML = `
        <h2>INCIDENT: ${inc.incidentId}</h2>
        <p><b>Target:</b> ${inc.targetZone}</p>
        <p><b>Severity:</b> ${inc.severity}</p>
        <hr style="margin:8px 0; border-color:var(--border-color);"/>
        <p><b>Action Plan:</b></p>
        <ul>${inc.recommendedActions.map(a => `<li>${a}</li>`).join('')}</ul>
        <br/>
        <p><b>Broadcast Draft:</b> ${inc.publicAlertDraft}</p>
      `;
      document.getElementById('report-modal').classList.remove('hidden');
    } else if (action === 'approve') {
      audit.log('HUMAN_OPERATOR', 'APPROVED_DISPATCH', { incidentId });
      inc.status = 'DISPATCHED_TO_FIELD';
      DashboardUI.renderIncidents(this.incidents, (id, act) => this.handleIncidentAction(id, act));
    }
  }

  setupAuditStream() {
    window.addEventListener('hr-audit-logged', (e) => {
      const container = document.getElementById('audit-log-container');
      const entry = e.detail;
      const el = document.createElement('div');
      el.className = 'audit-entry';
      el.innerHTML = `
        <span class="time">${entry.timestamp.substring(11, 19)} [${entry.agent}]</span>
        <span>${entry.action}</span>
        <span class="hash">SHA: ${entry.hash}</span>
      `;
      container.prepend(el);
    });
  }
}

// Bootstrap on DOM Loaded
window.addEventListener('DOMContentLoaded', () => {
  const app = new HeatRescueApplication();
  app.initialize();
});
