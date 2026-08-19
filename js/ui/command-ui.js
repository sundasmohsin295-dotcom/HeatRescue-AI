import { state } from '../state.js';

export class CommandUI {
  static render(container) {
    const topZone = state.selectedZone || state.zones[1];

    container.innerHTML = `
      <div class="module-container">
        
        <!-- KPI Ribbon -->
        <div class="grid-kpis">
          <div class="kpi-card border-critical">
            <span class="kpi-label">MAX HEAT RISK</span>
            <span class="kpi-value">${topZone.risk || 91}/100</span>
            <span class="kpi-sub">${topZone.name}</span>
          </div>
          <div class="kpi-card border-warning">
            <span class="kpi-label">CRITICAL HOTSPOTS</span>
            <span class="kpi-value">3</span>
            <span class="kpi-sub">Persistence &gt; 4.5h</span>
          </div>
          <div class="kpi-card border-cyan">
            <span class="kpi-label">EXPOSED WORKERS</span>
            <span class="kpi-value">~1,420</span>
            <span class="kpi-sub">Industrial & Logistics</span>
          </div>
          <div class="kpi-card border-cyan">
            <span class="kpi-label">ACTIVE INCIDENTS</span>
            <span class="kpi-value">${state.incidents.length}</span>
            <span class="kpi-sub">1 Pending Approval</span>
          </div>
          <div class="kpi-card border-warning">
            <span class="kpi-label">PEAK WINDOW</span>
            <span class="kpi-value">15:00 - 17:30</span>
            <span class="kpi-sub">Solar Load Peak</span>
          </div>
          <div class="kpi-card border-cyan">
            <span class="kpi-label">COOLING CAPACITY</span>
            <span class="kpi-value">800 Pax</span>
            <span class="kpi-sub">3 Mobile Stations</span>
          </div>
        </div>

        <!-- Dual Command Workspace -->
        <div class="module-dual-workspace">
          
          <!-- Left: Main Unified Map -->
          <div class="workspace-main">
            <div class="panel-card" style="height: 480px; position:relative; padding:0; overflow:hidden;">
              <div class="map-controls-bar">
                <div class="layer-toggles">
                  <button class="layer-btn active" data-layer="snapshot">Snapshot (2m AGL)</button>
                  <button class="layer-btn" data-layer="persistence">Persistence Index</button>
                  <button class="layer-btn" data-layer="coolroute">Safe Cool-Route</button>
                </div>
                <div class="time-machine-controls">
                  <span class="time-label" id="timeline-display-time">15:00 (Current Peak)</span>
                  <input type="range" id="heat-timeline-slider" min="8" max="20" step="1" value="15">
                </div>
              </div>
              <div id="gis-heat-map" class="map-render-target"></div>
            </div>
          </div>

          <!-- Right: Triage & Priority Action Stream -->
          <div class="workspace-side">
            <div class="panel-card">
              <div class="panel-card-header">
                <h3>🚨 Highest Priority Hotspot</h3>
                <span class="badge badge-critical">LEVEL 4 EMERGENCY</span>
              </div>
              <div style="font-size:11px;">
                <strong>${topZone.name}</strong><br/>
                <span class="subtext">Coordinates: ${topZone.coords.join(', ')}</span>
                <p style="margin: 8px 0;">Ground air temperature at 2m is currently <b>${topZone.temp_c}°C</b> with <b>${topZone.persistence_hours}h</b> sustained heat persistence.</p>
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-primary" id="cmd-investigate-btn">Run Deep Investigation</button>
                  <button class="btn btn-secondary" id="cmd-dispatch-btn">Deploy Cooling Units</button>
                </div>
              </div>
            </div>

            <!-- Explainable Metric Drivers -->
            <div class="panel-card">
              <div class="panel-card-header">
                <h3>🔬 Primary Forcing Drivers</h3>
              </div>
              <div class="breakdown-bars" id="command-risk-meters">
                <!-- Populated by app -->
              </div>
            </div>
          </div>

        </div>

      </div>
    `;

    document.getElementById('cmd-investigate-btn')?.addEventListener('click', () => state.setModule('investigator'));
    document.getElementById('cmd-dispatch-btn')?.addEventListener('click', () => state.setModule('incident-triage'));
  }
}
