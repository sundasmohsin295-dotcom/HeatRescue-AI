export class DashboardUI {
  static updateMetrics(summary) {
    document.getElementById('max-risk-val').textContent = `${summary.maxRisk}/100`;
    document.getElementById('max-risk-loc').textContent = summary.maxRiskLocation;
    document.getElementById('critical-hotspot-count').textContent = summary.criticalCount;
    document.getElementById('active-incidents-count').textContent = summary.activeIncidents;
  }

  static updateHealthStatus(fgStatus, n8nConfigured) {
    const indicator = document.getElementById('system-mode-indicator');
    const pill = document.getElementById('live-telemetry-pill');
    const pulseDot = pill.querySelector('.pulse-dot');

    if (fgStatus.isLive) {
      indicator.textContent = '40GUARD: LIVE (2m AGL)';
      pulseDot.className = 'pulse-dot green';
      pill.style.borderColor = 'var(--accent-green)';
    } else if (n8nConfigured) {
      indicator.textContent = 'AGENT: N8N LIVE | DATA: DEMO';
      pulseDot.className = 'pulse-dot blue';
      pill.style.borderColor = 'var(--accent-cyan)';
    } else {
      indicator.textContent = 'STANDALONE DEMO MODE';
      pulseDot.className = 'pulse-dot amber';
      pill.style.borderColor = 'var(--accent-amber)';
    }
  }

  static setInvestigatingState(isInvestigating) {
    const btn = document.getElementById('run-investigation-btn');
    const input = document.getElementById('agent-query-input');
    const outBox = document.getElementById('investigation-output-box');

    if (isInvestigating) {
      btn.disabled = true;
      btn.textContent = 'Investigating...';
      input.disabled = true;
      outBox.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; color:var(--text-muted); padding: 12px 0;">
          <span class="spinner"></span> 
          <span>Executing multi-agent evaluation pipeline...</span>
        </div>
      `;
    } else {
      btn.disabled = false;
      btn.textContent = 'Investigate';
      input.disabled = false;
    }
  }

  static renderInvestigationOutput(result) {
    const outBox = document.getElementById('investigation-output-box');
    const badgeColor = result.source === 'LIVE_N8N_AGENT' ? 'var(--accent-green)' : 'var(--accent-cyan)';
    
    outBox.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span style="color: ${badgeColor}; font-weight:700;">[EXPLAINABLE REASONING]</span>
        <span style="font-size:9px; color:var(--text-muted);">${result.source}</span>
      </div>
      <div style="color:var(--text-main); margin-bottom:6px;">${result.rationale}</div>
      <div style="color: var(--accent-amber); font-weight:600; border-top:1px solid rgba(255,255,255,0.08); padding-top:4px;">
        🚨 ${result.recommendation}
      </div>
    `;
  }

  static showToast(message, type = 'info') {
    const deck = document.getElementById('toast-deck');
    if (!deck) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    deck.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  static renderRiskBreakdown(zone) {
    if (!zone || !zone.riskDetails) return;
    document.getElementById('selected-zone-name').textContent = zone.name;
    document.getElementById('selected-composite-score').textContent = `Risk: ${zone.riskDetails.compositeRisk} / 100`;

    const b = zone.riskDetails.breakdown;
    const container = document.getElementById('risk-components-bar-container');
    container.innerHTML = `
      ${this._renderMeter('Temp (2m)', b.tempScore)}
      ${this._renderMeter('Heat Index', b.heatIndexScore)}
      ${this._renderMeter('Persistence', b.persistenceScore)}
      ${this._renderMeter('Exceedance', b.exceedanceScore)}
      ${this._renderMeter('Solar Ex.', b.solarScore)}
      ${this._renderMeter('Vulnerability', b.vulnerabilityScore)}
    `;
  }

  static _renderMeter(label, val) {
    const colorClass = val > 75 ? 'crit' : val > 50 ? 'warn' : '';
    return `
      <div class="breakdown-item">
        <div class="label-line"><span>${label}</span><span>${val}%</span></div>
        <div class="meter-track"><div class="meter-fill ${colorClass}" style="width: ${val}%;"></div></div>
      </div>
    `;
  }

  static renderIncidents(incidents, onAction) {
    const container = document.getElementById('incidents-container');
    if (!incidents || !incidents.length) {
      container.innerHTML = '<span class="subtext">No active incidents pending dispatch.</span>';
      return;
    }

    container.innerHTML = incidents.map(inc => `
      <div class="incident-card ${inc.severity.includes('CRITICAL') ? 'critical' : ''}">
        <div class="incident-card-top">
          <span>${inc.incidentId}</span>
          <span class="badge ${inc.severity.includes('CRITICAL') ? 'badge-pulse' : ''}">${inc.status}</span>
        </div>
        <div style="font-size:11px; font-weight:600;">${inc.targetZone}</div>
        <div class="incident-actions">
          ${inc.status !== 'DISPATCHED' ? `
            <button class="btn btn-primary" data-action="approve" data-id="${inc.incidentId}">Approve Dispatch</button>
          ` : `<span style="color:var(--accent-green); font-size:10px; font-weight:700;">✓ Dispatched to Field</span>`}
          <button class="btn btn-secondary" data-action="review" data-id="${inc.incidentId}">Review Plan</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const act = e.currentTarget.dataset.action;
        onAction(id, act);
      });
    });
  }
}
