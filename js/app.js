import { FortyGuardClient } from './api/fortyguard.js';
import { N8nClient } from './api/n8n.js';
import { AnalystAgent } from './agents/analyst.js';
import { OptimizerAgent } from './agents/optimizer.js';
import { DispatcherAgent } from './agents/dispatcher.js';
import { AgentToolRegistry } from './agents/registry.js';
import { TrajectoryEngine } from './engines/trajectory-engine.js';
import { SimulationEngine } from './engines/simulation-engine.js';
import { GISHeatMap } from './map/map.js';
import { DashboardUI } from './ui/dashboard.js';
import { InvestigatorUI } from './ui/investigator.js';
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
    this.isJudgeModeRunning = false;
  }

  async initialize() {
    try {
      this.map = new GISHeatMap('gis-heat-map', (zone) => this.handleZoneSelection(zone));
      this.setupEventListeners();
      this.setupAuditStream();

      // Initial Ingestion Cycle
      await this.runFullAgentPipeline();
      DashboardUI.showToast('HeatRescue Decision Engine Online', 'success');
    } catch (err) {
      console.error('System init fault:', err);
      DashboardUI.showToast(`Initialization Error: ${err.message}`, 'error');
    }
  }

  async runFullAgentPipeline(customQuery = null) {
    DashboardUI.setInvestigatingState(true);

    try {
      // Tool 1 & 2: Analyst Ingest
      await AgentToolRegistry.callTool('get_heatmap', 'ANALYST', {});
      const rawData = await this.fgClient.getHyperlocalZones();
      DashboardUI.updateHealthStatus(this.fgClient.status, this.n8nClient.isConfigured);

      this.setStepStatus('analyst', 'running');
      InvestigatorUI.renderToolExecutionProgress('investigation-output-box', 1);
      this.zones = await AnalystAgent.execute(rawData.data);
      this.setStepStatus('analyst', 'done');

      // Tool 3 & 4: Optimizer Triage
      this.setStepStatus('optimizer', 'running');
      InvestigatorUI.renderToolExecutionProgress('investigation-output-box', 3);
      const triage = await OptimizerAgent.execute(this.zones);
      
      // Tool 5: Risk Trajectory Projection
      await AgentToolRegistry.callTool('forecast_trajectory', 'OPTIMIZER', { zoneId: triage.priorityZone.id });
      const trajectory = TrajectoryEngine.projectTrajectory(triage.priorityZone, triage.priorityZone.trend);
      this.setStepStatus('optimizer', 'done');

      // Optional remote n8n agent investigation
      let externalResult = null;
      if (customQuery && this.n8nClient.isConfigured) {
        externalResult = await this.n8nClient.runAgentInvestigation(customQuery, this.zones);
      }

      // Tool 6: Dispatcher Action Formulation
      this.setStepStatus('dispatcher', 'running');
      InvestigatorUI.renderToolExecutionProgress('investigation-output-box', 5);
      const dispatchPlan = await DispatcherAgent.execute(triage);
      this.setStepStatus('dispatcher', 'done');

      // State Synchronization
      this.incidents = [dispatchPlan];
      this.selectedZone = triage.priorityZone;

      // Render GIS & Metrics
      this.map.renderZones(this.zones, this.map.activeLayerType || 'snapshot');
      DashboardUI.renderRiskBreakdown(this.selectedZone);
      DashboardUI.renderIncidents(this.incidents, (id, act) => this.handleIncidentAction(id, act));
      
      DashboardUI.updateMetrics({
        maxRisk: triage.priorityZone.risk,
        maxRiskLocation: triage.priorityZone.name,
        criticalCount: triage.criticalHotspots.length,
        activeIncidents: this.incidents.length
      });

      // Render Investigation 2.0 Explanations
      InvestigatorUI.renderInvestigation2(triage.priorityZone, triage.rationale, dispatchPlan, trajectory);

    } catch (err) {
      console.error('Pipeline error:', err);
      DashboardUI.showToast(`Error: ${err.message}`, 'error');
    } finally {
      DashboardUI.setInvestigatingState(false);
    }
  }

  async runJudgeDemonstration() {
    if (this.isJudgeModeRunning) return;
    this.isJudgeModeRunning = true;
    
    DashboardUI.showToast('🎬 Starting Automated 60s Judge Demonstration...', 'info');

    // 1. Initial Investigation
    await this.runFullAgentPipeline();
    await new Promise(r => setTimeout(r, 2000));

    // 2. Switch to Persistence Layer
    document.querySelector('.layer-btn[data-layer="persistence"]').click();
    DashboardUI.showToast('Visualizing FortyGuard Persistence Layer (Heat Retention)...', 'info');
    await new Promise(r => setTimeout(r, 2500));

    // 3. Inject Emergency Thermal Spike
    DashboardUI.showToast('Injecting Emergency Spike: South Mountain Hub (+48°C)...', 'warning');
    this.zones[1].temp_c = 48.5;
    this.zones[1].persistence_hours = 6.0;
    await this.runFullAgentPipeline();
    await new Promise(r => setTimeout(r, 2500));

    // 4. Human-in-the-Loop Dispatch Approval
    DashboardUI.showToast('Human Operator Approving Incident Dispatch...', 'success');
    if (this.incidents[0]) {
      this.handleIncidentAction(this.incidents[0].incidentId, 'approve');
    }
    await new Promise(r => setTimeout(r, 2000));

    // 5. Run Verification Loop
    await this.verifyInterventionImpact(this.selectedZone);

    // 6. Safe Cool Route
    document.querySelector('.layer-btn[data-layer="coolroute"]').click();
    DashboardUI.showToast('Evaluating Safe Microclimate Cool-Route...', 'info');
    await new Promise(r => setTimeout(r, 2000));

    DashboardUI.showToast('🎬 Demo Complete: Closed-Loop Decision Verified.', 'success');
    this.isJudgeModeRunning = false;
  }

  async verifyInterventionImpact(zone) {
    const preRisk = zone.risk;
    const outcome = SimulationEngine.simulateIntervention(zone, -1.5, 20, 'misting_buses');
    
    await audit.log('DISPATCHER_AGENT', 'VERIFY_INTERVENTION_EFFECTIVENESS', {
      preRisk,
      postRisk: outcome.simulatedRisk,
      delta: outcome.deltaRisk
    });

    DashboardUI.showToast(`Verification: Intervention lowered risk by ${Math.abs(outcome.deltaRisk)} pts (Now: ${outcome.simulatedRisk}/100)`, 'success');
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
    document.getElementById('run-investigation-btn').addEventListener('click', () => {
      const q = Validation.sanitizeText(document.getElementById('agent-query-input').value);
      this.runFullAgentPipeline(q);
    });

    // Judge Mode Button
    const simBtn = document.getElementById('emergency-sim-btn');
    if (simBtn) {
      simBtn.textContent = '🎬 Run Judge Demo';
      simBtn.addEventListener('click', () => this.runJudgeDemonstration());
    }

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

    // Simulator
    document.getElementById('run-simulation-btn').addEventListener('click', () => {
      const deltaTemp = parseFloat(document.getElementById('sim-temp-delta').value);
      const deltaCanopy = parseFloat(document.getElementById('sim-canopy-delta').value);
      const intervention = document.getElementById('sim-intervention-type').value;

      if (!this.selectedZone) return;

      const outcome = SimulationEngine.simulateIntervention(this.selectedZone, deltaTemp, deltaCanopy, intervention);
      
      document.getElementById('sim-outcome-box').innerHTML = `
        <strong>Simulated Risk: ${outcome.simulatedRisk}/100</strong> (Baseline: ${outcome.baselineRisk})<br/>
        Net Delta: <b style="color:${outcome.deltaRisk <= 0 ? 'var(--accent-green)':'var(--accent-red)'}">${outcome.deltaRisk} pts</b><br/>
        Projected Temp: ${outcome.simulatedTemp}°C (${outcome.interventionEffectiveness})
      `;
    });

    // Time Machine Slider
    document.getElementById('heat-timeline-slider').addEventListener('input', (e) => {
      const hr = e.target.value;
      document.getElementById('timeline-display-time').textContent = `${hr}:00`;
      
      const timeTravelZones = this.zones.map(z => ({
        ...z,
        temp_c: z.timeline && z.timeline[hr] ? z.timeline[hr] : z.temp_c
      }));
      this.map.renderZones(timeTravelZones, this.map.activeLayerType || 'snapshot');
    });

    // Audit Log Export
    document.getElementById('export-audit-btn').addEventListener('click', () => {
      const blob = new Blob([audit.exportJSON()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HeatRescue-Audit-Chained-${Date.now()}.json`;
      a.click();
      DashboardUI.showToast('Cryptographic audit trail exported', 'info');
    });

    // Modals
    const modalClose = document.getElementById('close-report-modal');
    if (modalClose) modalClose.addEventListener('click', () => document.getElementById('report-modal').classList.add('hidden'));
    
    const modalConfirm = document.getElementById('confirm-modal-dispatch-btn');
    if (modalConfirm) {
      modalConfirm.addEventListener('click', () => {
        document.getElementById('report-modal').classList.add('hidden');
        if (this.incidents[0]) this.handleIncidentAction(this.incidents[0].incidentId, 'approve');
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
          <p><b>TARGET ZONE:</b> ${inc.targetZone}</p>
          <p><b>SEVERITY:</b> ${inc.severity}</p>
          <hr style="margin:8px 0; border:none; border-top:1px solid var(--border-color);"/>
          <p><b>DISPATCH PROTOCOL:</b></p>
          <ul style="padding-left:16px; margin: 6px 0;">
            ${inc.recommendedActions.map(a => `<li>${a}</li>`).join('')}
          </ul>
          <p><b>PUBLIC BROADCAST:</b></p>
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
      DashboardUI.showToast(`Incident ${incidentId} dispatched to field teams`, 'success');
      
      // Auto-trigger verification measurement
      this.verifyInterventionImpact(this.selectedZone);
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

window.addEventListener('DOMContentLoaded', () => {
  const app = new HeatRescueApplication();
  app.initialize();
});
