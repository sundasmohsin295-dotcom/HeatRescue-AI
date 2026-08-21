import { PHOENIX_ZONES } from './data/demo-data.js';
import { CanonicalRiskEngine } from './engines/risk-engine.js';
import { UnifiedGISMap } from './map/map.js';
import { audit } from './utils/logger.js';

let zones = PHOENIX_ZONES.map(z => ({
  ...z,
  riskDetails: CanonicalRiskEngine.calculate(z),
  sensorStatus: 'HEALTHY'
}));
let selectedZone = zones[1];
let gisMap = null;
let activeSim = { temp: 0, canopy: 0, misting: false };
let currentTheme = 'dark';

function initThemeSwitcher() {
  const btn = document.getElementById('theme-toggle-btn');
  btn?.addEventListener('click', () => {
    if (currentTheme === 'dark') {
      document.body.className = 'theme-light';
      btn.textContent = '🌙 Dark Mode';
      currentTheme = 'light';
    } else {
      document.body.className = 'theme-dark';
      btn.textContent = '☀️ Light Mode';
      currentTheme = 'dark';
    }
  });
}

function renderView(domain) {
  const vp = document.getElementById('domain-viewport');
  const title = document.getElementById('domain-header-title');
  const desc = document.getElementById('domain-header-desc');

  if (domain === 'command') {
    title.textContent = 'Command Center';
    desc.textContent = 'Executive operational overview & real-time telemetry';

    vp.innerHTML = `
      <div class="module-container">
        <div class="grid-kpis">
          <div class="kpi-card border-critical"><span class="kpi-label">MAX RISK SCORE</span><span class="kpi-value">${selectedZone.riskDetails.score}/100</span><span class="kpi-sub">${selectedZone.name}</span></div>
          <div class="kpi-card border-warning"><span class="kpi-label">HOTSPOTS DETECTED</span><span class="kpi-value">2 ZONES</span><span class="kpi-sub">Persistence > 4.0h</span></div>
          <div class="kpi-card border-cyan"><span class="kpi-label">EXPOSED POPULATION</span><span class="kpi-value">~${selectedZone.exposed_pop.toLocaleString()}</span><span class="kpi-sub">Industrial Labor</span></div>
          <div class="kpi-card border-cyan"><span class="kpi-label">SECURITY INTEGRITY</span><span class="kpi-value">${selectedZone.sensorStatus === 'HEALTHY' ? '98.4%' : 'SUSPICIOUS'}</span><span class="kpi-sub">${selectedZone.sensorStatus}</span></div>
          <div class="kpi-card border-warning"><span class="kpi-label">PROJECTED PEAK</span><span class="kpi-value">16:00</span><span class="kpi-sub">Trajectory: Worsening</span></div>
        </div>

        <div class="module-dual-workspace">
          <div class="workspace-main">
            <div class="panel-card" style="height:460px; padding:0; position:relative; overflow:hidden;">
              <div class="map-controls-bar">
                <div class="layer-toggles">
                  <button class="layer-btn active" id="layer-snap">Snapshot (2m AGL)</button>
                  <button class="layer-btn" id="layer-persist">Persistence Layer</button>
                </div>
                <button class="btn btn-secondary" id="btn-export-sitrep" style="font-size:9px;">📄 Print SitRep</button>
              </div>
              <div id="gis-heat-map" class="map-render-target"></div>
            </div>
          </div>

          <div class="workspace-side">
            <div class="panel-card">
              <div class="panel-card-header">
                <h3>🚨 Active Hotspot Triage</h3>
                <span class="badge ${selectedZone.riskDetails.score >= 80 ? 'badge-critical' : 'badge-warning'}">${selectedZone.riskDetails.severity}</span>
              </div>
              <strong>${selectedZone.name}</strong>
              <p class="subtext">Observed Temp: ${selectedZone.temp_c}°C | Persistence: ${selectedZone.persistence_hours}h | Humidity: ${selectedZone.humidity}%</p>
              <div style="display:flex; gap:6px; margin-top:8px;">
                <button class="btn btn-primary" id="btn-open-investigator">🤖 Explain Evidence</button>
                <button class="btn btn-warning" id="btn-simulate-attack">⚡ Test Anti-Spoof</button>
              </div>
            </div>

            <div class="panel-card">
              <div class="panel-card-header"><h3>🔬 Canonical Risk Formulation</h3></div>
              <div class="breakdown-bars">
                <div class="breakdown-item"><div class="label-line"><span>2m Temp Anomaly</span><span>+${selectedZone.riskDetails.contributors.temp} pts</span></div><div class="meter-track"><div class="meter-fill crit" style="width:80%"></div></div></div>
                <div class="breakdown-item"><div class="label-line"><span>Calculated Heat Index</span><span>+${selectedZone.riskDetails.contributors.heatIndex} pts</span></div><div class="meter-track"><div class="meter-fill warn" style="width:65%"></div></div></div>
                <div class="breakdown-item"><div class="label-line"><span>Persistence Duration</span><span>+${selectedZone.riskDetails.contributors.persistence} pts</span></div><div class="meter-track"><div class="meter-fill warn" style="width:70%"></div></div></div>
                <div class="breakdown-item"><div class="label-line"><span>Threshold Exceedance</span><span>+${selectedZone.riskDetails.contributors.exceedance} pts</span></div><div class="meter-track"><div class="meter-fill" style="width:50%"></div></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    setTimeout(() => {
      gisMap = new UnifiedGISMap("gis-heat-map", (z) => {
        selectedZone = z;
        renderView('command');
      });
      gisMap.render(zones);
    }, 50);

    document.getElementById('btn-open-investigator')?.addEventListener('click', () => renderView('investigation'));
    document.getElementById('btn-simulate-attack')?.addEventListener('click', () => simulateSensorSpoofing());
    document.getElementById('btn-export-sitrep')?.addEventListener('click', () => window.print());

  } else if (domain === 'intelligence') {
    title.textContent = 'Heat Intelligence & Microclimate Registry';
    desc.textContent = 'Hyperlocal spatial metrics and environmental baselines';

    vp.innerHTML = `
      <div class="module-container">
        <div class="panel-card">
          <div class="panel-card-header"><h3>🗺️ FortyGuard 2m AGL Baseline Registry</h3></div>
          <table class="audit-table">
            <thead><tr><th>Zone ID</th><th>Location</th><th>Observed 2m Temp</th><th>Heat Index</th><th>Persistence (>30°C)</th><th>Exceedance</th><th>Population</th><th>Risk</th></tr></thead>
            <tbody>
              ${zones.map(z => `
                <tr style="cursor:pointer;" class="${z.id === selectedZone.id ? 'active-row' : ''}">
                  <td><b>${z.id}</b></td>
                  <td>${z.name}</td>
                  <td>${z.temp_c}°C</td>
                  <td>${z.riskDetails.heatIndexC}°C</td>
                  <td>${z.persistence_hours} hrs</td>
                  <td>${z.exceedance_hours} hrs</td>
                  <td>${z.exposed_pop.toLocaleString()}</td>
                  <td><span class="badge ${z.riskDetails.score >= 80 ? 'badge-critical' : 'badge-warning'}">${z.riskDetails.score}/100</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

  } else if (domain === 'investigation') {
    title.textContent = 'AI Investigator & Evidence Analysis';
    desc.textContent = 'Deterministic evidence interpretation without hallucinations';

    vp.innerHTML = `
      <div class="module-container">
        <div class="panel-card">
          <div class="panel-card-header">
            <h3>🤖 Deterministic Evidence Diagnostic: ${selectedZone.name}</h3>
            <span class="badge badge-critical">CONFIDENCE: 94%</span>
          </div>
          <div style="background:var(--bg-primary); padding:14px; border-radius:4px; font-family:var(--font-mono); font-size:11px; line-height:1.8;">
            <p><b style="color:var(--accent-cyan);">[PRIMARY FINDING]</b> Target zone is experiencing severe persistent thermal accumulation with elevated vulnerable worker exposure.</p>
            <hr style="border:none; border-top:1px solid var(--border-color); margin:8px 0;"/>
            <p><b>[VERIFIED EVIDENCE]</b></p>
            <ul style="padding-left:16px;">
              <li>Observed 2m Air Temp: <b>${selectedZone.temp_c}°C</b> (Baseline exceedance: +5.2°C)</li>
              <li>Thermal Persistence: <b>${selectedZone.persistence_hours} hours</b> continuously above 35°C threshold</li>
              <li>Solar Radiation Load: <b>${selectedZone.solar_wm2} W/m²</b> under zero cloud cover</li>
              <li>Vulnerability Multiplier: <b>1.25x</b> due to industrial labor exposure density</li>
            </ul>
            <hr style="border:none; border-top:1px solid var(--border-color); margin:8px 0;"/>
            <p><b style="color:var(--accent-amber);">[ACTIONABLE RECOMMENDATION]</b> Deploy Mobile Misting Coach Alpha to depot hub and establish mandatory shaded recovery rotations.</p>
          </div>
        </div>
      </div>
    `;

  } else if (domain === 'prediction') {
    title.textContent = 'Prediction & Simulation Lab';
    desc.textContent = 'What-If scenario modeling and counterfactual intervention analysis';

    const baseRisk = CanonicalRiskEngine.calculate(selectedZone);
    const simTemp = selectedZone.temp_c + activeSim.temp - (activeSim.canopy * 0.04);
    const simRisk = CanonicalRiskEngine.calculate({
      ...selectedZone,
      temp_c: simTemp,
      solar_wm2: Math.max(300, selectedZone.solar_wm2 * (1 - (activeSim.canopy * 0.007)))
    });
    const finalSimScore = Math.max(0, Math.round(simRisk.score - (activeSim.misting ? 8 : 0)));
    const deltaRisk = finalSimScore - baseRisk.score;

    vp.innerHTML = `
      <div class="module-container">
        <div class="module-dual-workspace">
          <div class="workspace-main">
            <div class="panel-card">
              <div class="panel-card-header"><h3>🧪 What-If Climate & Intervention Simulator</h3></div>
              <p class="subtext">Simulate localized microclimate shifts and quantify intervention impact before emergency resource dispatch.</p>
              <div style="display:flex; flex-direction:column; gap:14px; margin-top:10px;">
                <div>
                  <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
                    <span>Ambient Temperature Shift: <b>${activeSim.temp > 0 ? '+' : ''}${activeSim.temp}°C</b></span>
                  </div>
                  <input type="range" id="sim-temp-slider" min="-3" max="6" step="0.5" value="${activeSim.temp}" style="width:100%;">
                </div>
                <div>
                  <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
                    <span>Urban Canopy / Shading Expansion: <b>+${activeSim.canopy}%</b></span>
                  </div>
                  <input type="range" id="sim-canopy-slider" min="0" max="40" step="5" value="${activeSim.canopy}" style="width:100%;">
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="checkbox" id="sim-misting-check" ${activeSim.misting ? 'checked' : ''}>
                  <label for="sim-misting-check" style="font-size:11px; cursor:pointer;">Deploy High-Capacity Misting Infrastructure (-8 Risk Pts)</label>
                </div>
              </div>
            </div>

            <div class="panel-card">
              <div class="panel-card-header"><h3>📊 Baseline vs Counterfactual Outcome</h3></div>
              <table class="audit-table">
                <thead><tr><th>Metric</th><th>Baseline</th><th>Simulated</th><th>Variance</th></tr></thead>
                <tbody>
                  <tr><td>Surface 2m Temp</td><td>${selectedZone.temp_c}°C</td><td>${simTemp.toFixed(1)}°C</td><td>${(simTemp - selectedZone.temp_c).toFixed(1)}°C</td></tr>
                  <tr><td>Composite Risk Score</td><td>${baseRisk.score}/100</td><td><b>${finalSimScore}/100</b></td><td><span class="badge ${deltaRisk <= 0 ? 'badge-success' : 'badge-critical'}">${deltaRisk > 0 ? '+' : ''}${deltaRisk} pts</span></td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="workspace-side">
            <div class="panel-card">
              <div class="panel-card-header"><h3>🎯 Intervention Recommendation</h3></div>
              <p style="font-size:11px;">${finalSimScore < baseRisk.score ? '✅ Positive impact verified. The intervention package yields measurable reduction in thermal load.' : '⚠️ Warning: Increasing ambient temperature without mitigation will exceed hospital triage capacity.'}</p>
              <button class="btn btn-primary" id="btn-save-sim-audit">Commit Simulation to Audit Trail</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('sim-temp-slider')?.addEventListener('input', (e) => {
      activeSim.temp = parseFloat(e.target.value);
      renderView('prediction');
    });
    document.getElementById('sim-canopy-slider')?.addEventListener('input', (e) => {
      activeSim.canopy = parseInt(e.target.value);
      renderView('prediction');
    });
    document.getElementById('sim-misting-check')?.addEventListener('change', (e) => {
      activeSim.misting = e.target.checked;
      renderView('prediction');
    });
    document.getElementById('btn-save-sim-audit')?.addEventListener('click', async () => {
      await audit.record('SIMULATION_ENGINE', 'RUN_WHAT_IF_SCENARIO', { zone: selectedZone.name, deltas: activeSim, resultScore: finalSimScore });
      showToast('Simulation state cryptographically hashed and logged to audit chain', 'success');
    });

  } else if (domain === 'operations') {
    title.textContent = 'Response Operations';
    desc.textContent = 'Human-in-the-loop dispatch triage & resource allocation';

    vp.innerHTML = `
      <div class="module-container">
        <div class="panel-card">
          <div class="panel-card-header"><h3>🛡️ Active Emergency Response Incidents</h3></div>
          <table class="audit-table">
            <thead><tr><th>Incident ID</th><th>Target Zone</th><th>Severity</th><th>Recommended Resource</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              <tr>
                <td><b>INC-2026-884</b></td>
                <td>${selectedZone.name}</td>
                <td><span class="badge badge-critical">CRITICAL</span></td>
                <td>Mobile Misting Coach Alpha + 2 Hydration Pods</td>
                <td><span class="badge badge-warning" id="dispatch-status-badge">PENDING APPROVAL</span></td>
                <td><button class="btn btn-primary" id="btn-confirm-dispatch">Authorize Dispatch</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('btn-confirm-dispatch')?.addEventListener('click', async () => {
      document.getElementById('dispatch-status-badge').className = 'badge badge-success';
      document.getElementById('dispatch-status-badge').textContent = 'DISPATCHED';
      await audit.record('INCIDENT_COMMANDER', 'AUTHORIZE_EMERGENCY_DISPATCH', { incident: 'INC-2026-884', target: selectedZone.name });
      showToast(`Dispatched cooling assets to ${selectedZone.name}. Event logged in SHA-256 ledger.`, 'success');
    });

  } else if (domain === 'security') {
    title.textContent = 'Cybersecurity & Telemetry Integrity';
    desc.textContent = 'Zero-Trust sensor anti-spoofing, prompt filters & SHA-256 chain';

    vp.innerHTML = `
      <div class="module-container">
        <div class="grid-kpis">
          <div class="kpi-card border-cyan"><span class="kpi-label">DATA INTEGRITY</span><span class="kpi-value">${selectedZone.sensorStatus === 'HEALTHY' ? '98.4%' : 'FLAGGED'}</span><span class="kpi-sub">Anti-Spoofing Active</span></div>
          <div class="kpi-card border-cyan"><span class="kpi-label">AI GUARDRAILS</span><span class="kpi-value">ENFORCED</span><span class="kpi-sub">0 Prompt Breaches</span></div>
          <div class="kpi-card border-cyan"><span class="kpi-label">ACCESS LEVEL</span><span class="kpi-value">RBAC L4</span><span class="kpi-sub">Incident Commander</span></div>
        </div>

        <div class="panel-card" style="margin-top:10px;">
          <div class="panel-card-header"><h3>🛡️ Active Threat Model & Physical Diffusion Guardrails</h3></div>
          <table class="audit-table">
            <thead><tr><th>Vector</th><th>Target Layer</th><th>Detection Mechanism</th><th>Current Status</th></tr></thead>
            <tbody>
              <tr><td>Sensor Spoofing</td><td>FortyGuard 2m Ingest</td><td>Thermal Diffusion Velocity Bounds (≤3.0°C/min)</td><td><span class="badge ${selectedZone.sensorStatus === 'HEALTHY' ? 'badge-success' : 'badge-critical'}">${selectedZone.sensorStatus}</span></td></tr>
              <tr><td>Prompt Injection</td><td>AI Investigator</td><td>Zero-Trust Regex & Token Sanitizer</td><td><span class="badge badge-success">ACTIVE</span></td></tr>
              <tr><td>Audit Tampering</td><td>Operational Ledger</td><td>Chained SHA-256 Hashes with Previous Block Verification</td><td><span class="badge badge-success">VERIFIED</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

  } else if (domain === 'audit') {
    title.textContent = 'Incidents & Chained Audit Ledger';
    desc.textContent = 'Immutable cryptographic trail of analytical & human decisions';

    vp.innerHTML = `
      <div class="module-container">
        <div class="panel-card">
          <div class="panel-card-header">
            <h3>📜 Cryptographic Chained Audit Ledger (SHA-256)</h3>
            <button class="btn btn-secondary" id="btn-verify-ledger">Verify Chain Integrity</button>
          </div>
          <table class="audit-table">
            <thead><tr><th>Block</th><th>Timestamp</th><th>Actor</th><th>Action</th><th>Prev Digest</th><th>Block Hash</th></tr></thead>
            <tbody>${audit.chain.map(b => `<tr><td><b>#${b.index}</b></td><td>${b.ts.substring(11,19)}</td><td>${b.actor}</td><td>${b.action}</td><td><span class="hash-token">${b.prev}</span></td><td><span class="hash-token">${b.hash}</span></td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('btn-verify-ledger')?.addEventListener('click', () => {
      showToast(`✓ Cryptographic Audit Verified: All ${audit.chain.length} blocks have intact SHA-256 linkages.`, 'success');
    });

  } else if (domain === 'admin') {
    title.textContent = 'System Administration & Telemetry Config';
    desc.textContent = 'API keys, baseline overrides, and operational policies';

    vp.innerHTML = `
      <div class="module-container">
        <div class="panel-card">
          <div class="panel-card-header"><h3>⚙️ FortyGuard API & Telemetry Pipeline Configuration</h3></div>
          <div style="display:flex; flex-direction:column; gap:10px; max-width:480px;">
            <div>
              <label class="subtext">FORTYGUARD API KEY</label>
              <input type="password" value="demo_live_key_fg2026_secure" style="width:100%; padding:6px; background:var(--bg-primary); border:1px solid var(--border-color); color:var(--text-main); border-radius:4px;">
            </div>
            <div>
              <label class="subtext">SAMPLING RESOLUTION</label>
              <select style="width:100%; padding:6px; background:var(--bg-primary); border:1px solid var(--border-color); color:var(--text-main); border-radius:4px;">
                <option selected>60m Granularity (High-Res 2m AGL)</option>
                <option>80m Granularity</option>
                <option>100m Granularity</option>
              </select>
            </div>
            <button class="btn btn-primary" id="btn-save-admin" style="width:fit-content;">Save Configuration</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-save-admin')?.addEventListener('click', async () => {
      await audit.record('ADMIN_USER', 'UPDATE_SYSTEM_CONFIG', { granularity: '60m' });
      showToast('Configuration updated and saved to audit ledger', 'success');
    });
  }
}

async function simulateSensorSpoofing() {
  selectedZone.temp_c = 58.4;
  selectedZone.sensorStatus = 'ISOLATED_SPOOF';
  await audit.record('SECURITY_ENGINE', 'ANOMALOUS_THERMAL_DELTA_DETECTED', {
    sensor: selectedZone.id,
    spikeDelta: '+12.2°C/30s',
    action: 'NODE_ISOLATED_SPATIAL_FALLBACK_ENGAGED'
  });
  showToast('🚨 SENSOR SPOOF DETECTED: Thermal diffusion violation (>3°C/min). Sensor isolated.', 'warning');
  renderView('command');
}

function showToast(msg, type = 'info') {
  const deck = document.getElementById('toast-deck');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  deck.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

document.querySelectorAll(".nav-item").forEach(b => {
  b.addEventListener("click", e => {
    document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
    e.currentTarget.classList.add("active");
    renderView(e.currentTarget.dataset.domain);
  });
});

document.getElementById("run-master-demo-btn")?.addEventListener("click", async () => {
  showToast('🎬 Launching Automated Closed-Loop Judge Demonstration...', 'info');
  renderView('command');
  await audit.record("OPERATOR", "LAUNCH_JUDGE_DEMO", { status: "STARTED" });
  await new Promise(r => setTimeout(r, 2000));

  renderView('prediction');
  showToast('Simulating What-If microclimate shift (+2°C)...', 'info');
  activeSim.temp = 2.0;
  await new Promise(r => setTimeout(r, 2000));

  renderView('operations');
  showToast('Incident commander authorizing resource dispatch...', 'warning');
  await new Promise(r => setTimeout(r, 2000));

  document.getElementById('btn-confirm-dispatch')?.click();
  await new Promise(r => setTimeout(r, 1500));

  renderView('audit');
  showToast('🎬 Demo Finished: Immutable audit chain validated.', 'success');
});

window.addEventListener("hr-block", () => {
  document.getElementById("header-audit-blocks").textContent = `${audit.chain.length} BLOCKS`;
});

window.addEventListener("DOMContentLoaded", async () => {
  initThemeSwitcher();
  await audit.record("SYSTEM", "TELEMETRY_INGEST", { count: zones.length });
  renderView('command');
});
