/**
 * UI Renderer for dynamic command components, metrics, and risk bars.
 */
export class DashboardUI {
  static updateMetrics(summary) {
    document.getElementById('max-risk-val').textContent = `${summary.maxRisk}/100`;
    document.getElementById('max-risk-loc').textContent = summary.maxRiskLocation;
    document.getElementById('critical-hotspot-count').textContent = summary.criticalCount;
    document.getElementById('active-incidents-count').textContent = summary.activeIncidents;
  }

  static renderRiskBreakdown(zone) {
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

  static renderIncidents(incidents, onApprove) {
    const container = document.getElementById('incidents-container');
    if (!incidents.length) {
      container.innerHTML = '<span class="subtext">No active incidents pending dispatch.</span>';
      return;
    }

    container.innerHTML = incidents.map(inc => `
      <div class="incident-card ${inc.severity.includes('CRITICAL') ? 'critical' : ''}">
        <div class="incident-card-top">
          <span>${inc.incidentId}</span>
          <span class="badge ${inc.severity.includes('CRITICAL') ? 'badge-pulse' : ''}">${inc.severity}</span>
        </div>
        <div style="font-size:11px; font-weight:600;">${inc.targetZone}</div>
        <div class="incident-actions">
          <button class="btn btn-primary" data-action="approve" data-id="${inc.incidentId}">Approve Dispatch</button>
          <button class="btn btn-secondary" data-action="review" data-id="${inc.incidentId}">Audit Report</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const act = e.target.dataset.action;
        onApprove(id, act);
      });
    });
  }
}
