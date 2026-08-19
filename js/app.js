import { FortyGuardClient } from './api/fortyguard.js';
import { N8nClient } from './api/n8n.js';
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
    this.fgClient = new FortyGuardClient();
    this.n8nClient = new N8nClient();
    this.zones = [];
    this.selectedZone = null;
    this.incidents = [];
    this.map = null;
  }

  async initialize() {
    try {
      this.map = new GISHeatMap('gis-heat-map', (zone) => this.handleZoneSelection(zone));
      this.setupEventListeners();
      this.setupAuditStream();

      // Initial Ingestion and Render
      await this.runFullAgentPipeline();
      
      DashboardUI.showToast('HeatRescue AI initialized successfully', 'success');
    } catch (err) {
      console.error('Fatal initialization error:', err);
      DashboardUI.showToast(`System Error: ${err.message}`, 'error');
    }
  }

  async runFullAgentPipeline(customQuery = null) {
    DashboardUI.setInvestigatingState(true);

    try {
      // Step 1: Ingestion with Circuit-Breaker
      const rawData = await this.fgClient.getHyperlocalZones();
      DashboardUI.updateHealthStatus(this.fgClient.status, this.n8nClient.isConfigured);

      // Step 2: Analyst Agent (Validation + Math)
      this.setStepStatus('analyst', 'running');
      this.zones = await AnalystAgent.execute(rawData.data);
      this.setStepStatus('analyst', 'done');

      // Step 3: Optimizer Agent (Triage + Hotspots)
      this.setStepStatus('optimizer', 'running');
      const triage = await OptimizerAgent.execute(this.zones);
      this.setStepStatus('optimizer', 'done');

      // Optional remote n8n agent evaluation
      let externalAgentResult = null;
      if (customQuery && this.n8nClient.isConfigured) {
        externalAgentResult = await this.n8nClient.runAgentInvestigation(customQuery, this.zones);
      }

      // Step 4: Dispatcher Agent (Action Formulation)
      this.setStepStatus('dispatcher', 'running');
      const dispatchPlan = await DispatcherAgent.execute(triage);
      this.setStepStatus('dispatcher', 'done');

      // State Synchronization
      this.incidents = [dispatchPlan];
      this.selectedZone = triage.priorityZone;

      // Safe Map & UI Render
      this.map.renderZones(this.zones, this.map.activeLayerType || 'snapshot');
      DashboardUI.renderRiskBreakdown(this.selectedZone);
      DashboardUI.renderIncidents(this.incidents, (id, act) => this.handleIncidentAction(id, act));
      
      DashboardUI.updateMetrics({
        maxRisk: triage.priorityZone.risk,
        maxRiskLocation: triage.priorityZone.name,
        criticalCount: triage.criticalHotspots.length,
        activeIncidents: this.incidents.length
      });

      // Output Results to Investigator Box
      if (externalAgentResult && externalAgentResult.success) {
        DashboardUI.renderInvestigationOutput({
          source: 'LIVE_N8N_WORKFLOW',
          rationale: externalAgentResult.data.explanation || triage.rationale,
          recommendation: externalAgentResult.data.action || dispatchPlan.recommendedActions[0]
        });
      } else {
        DashboardUI.renderInvestigationOutput({
          source: rawData.isLive ? 'LOCAL_AGENT (40GUARD LIVE)' : 'LOCAL_AGENT (DEMO RUNTIME)',
          rationale: triage.rationale,
          recommendation: `Action Required: Deploy resources to ${triage.priorityZone.name} (Risk ${triage.priorityZone.risk}/100)`
        });
      }

    } catch (err) {
      console.error('Pipeline execution error:', err);
      DashboardUI.showToast(`Execution Error: ${err.message}`, 'error');
      await audit.log('SYSTEM', 'PIPELINE_ERROR', { error: err.message });
    } finally {
      DashboardUI.setInvestigatingState(false);
    }
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
    // Investigation Form Trigger
    document.getElementById('run-investigation-btn').addEventListener('click', () => {
      const q = Validation.sanitizeText(document.getElementById('agent-query-input').value);
      this.runFullAgentPipeline(q);
    });

    // Enter key submits investigation
    document.getElementById('agent-query-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = Validation.sanitizeText(e.target.value);
        this.runFullAgentPipeline(q);
      }
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

    // Simulation Engine Run
    document.getElementById('run-simulation-btn').addEventListener('click', () => {
      const deltaTemp = parseFloat(document.getElementById('sim-temp-delta').value);
      const deltaCanopy = parseFloat(document.getElementById('sim-canopy-delta').value);
      const intervention = document.getElementById('sim-intervention-type').value;

      if (!this.selectedZone) return;

      const outcome = SimulationEngine.simulateIntervention(this.selectedZone, deltaTemp, deltaCanopy, intervention);
      
      document.getElementById('sim-outcome-box').innerHTML = `
        <strong>Simulated Risk: ${outcome.simulatedRisk}/100</strong> (Baseline: ${outcome.baselineRisk})<br/>
        Net Delta: <b style="color:${outcome.deltaRisk <= 0 ? 'var(--accent-green)':'var(--accent-red)'}">${outcome.deltaRisk} pts</b><br/>
        Projected Temp: ${outcome.simulatedTemp}°C
      `;
    });

    // Timeline Slider
    document.getElementById('heat-timeline-slider').addEventListener('input', (e) => {
      const hr = e.target.value;
      document.getElementById('timeline-display-time').textContent = `${hr}:00`;
      
      const timeTravelZones = this.zones.map(z => ({
        ...z,
        temp_c: z.timeline && z.timeline[hr] ? z.timeline[hr] : z.temp_c
      }));
      this.map.renderZones(timeTravelZones, this.map.activeLayerType || 'snapshot');
    });

    // Emergency Scenario Sim
    document.getElementById('emergency-sim-btn').addEventListener('click', async () => {
      DashboardUI.showToast('Injecting +4.5°C Thermal Surge Scenario...', 'warning');
      await audit.log('COMMAND_SYSTEM', 'INJECT_EMERGENCY_SIMULATION', { scenario: 'RAPID_SPIKE_48C' });
      if (this.zones[1]) {
        this.zones[1].temp_c = 48.2;
        this.zones[1].persistence_hours = 6.0;
      }
      await this.runFullAgentPipeline();
    });

    // Audit Log Export
    document.getElementById('export-audit-btn').addEventListener('click', () => {
      const blob = new Blob([audit.exportJSON()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HeatRescue-SOC-Audit-${Date.now()}.json`;
      a.click();
      DashboardUI.showToast('Cryptographic audit trail exported', 'info');
    });

    // Report Modal Controls
    const modalCloseBtn = document.getElementById('close-report-modal');
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', () => {
        document.getElementById('report-modal').classList.add('hidden');
      });
    }

    const modalConfirmBtn = document.getElementById('confirm-modal-dispatch-btn');
    if (modalConfirmBtn) {
      modalConfirmBtn.addEventListener('click', () => {
        document.getElementById('report-modal').classList.add('hidden');
        if (this.incidents[0]) {
          this.handleIncidentAction(this.incidents[0].incidentId, 'approve');
        }
      });
    }
  }

  handleIncidentAction(incidentId, action) {
    const inc = this.incidents.find(i => i.incidentId === incidentId);
    if (!inc) return;

    if (action === 'review') {
      document.getElementById('report-modal-content').innerHTML = `
        <div style="line-height:1.6;">
          <p><b>INCIDENT ID:</b> ${inc.incidentId}</p>
          <p><b>LOCATION:</b> ${inc.targetZone}</p>
          <p><b>SEVERITY LEVEL:</b> ${inc.severity}</p>
          <hr style="margin:8px 0; border:none; border-top:1px solid var(--border-color);"/>
          <p><b>ACTION PLAN:</b></p>
          <ul style="padding-left:16px; margin: 6px 0;">
            ${inc.recommendedActions.map(a => `<li>${a}</li>`).join('')}
          </ul>
          <p><b>PUBLIC BROADCAST DRAFT:</b></p>
          <blockquote style="background:var(--bg-primary); padding:6px; border-left:2px solid var(--accent-cyan); margin-top:4px;">
            ${inc.publicAlertDraft}
          </blockquote>
        </div>
      `;
      document.getElementById('report-modal').classList.remove('hidden');
    } else if (action === 'approve') {
      audit.log('HUMAN_OPERATOR', 'APPROVED_DISPATCH', { incidentId });
      inc.status = 'DISPATCHED';
      DashboardUI.renderIncidents(this.incidents, (id, act) => this.handleIncidentAction(id, act));
      DashboardUI.showToast(`Incident ${incidentId} dispatched to field units`, 'success');
    }
  }

  setupAuditStream() {
    window.addEventListener('hr-audit-logged', (e) => {
      const container = document.getElementById('audit-log-container');
      if (!container) return;
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

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  const app = new HeatRescueApplication();
  app.initialize();
});
