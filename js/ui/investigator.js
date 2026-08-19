export class InvestigatorUI {
  static renderToolExecutionProgress(containerId, activeToolIndex) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const tools = [
      'get_heatmap',
      'get_environment',
      'calculate_risk',
      'analyze_trend',
      'forecast_trajectory',
      'generate_action_plan'
    ];

    container.innerHTML = `
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px; margin: 6px 0; font-family:var(--font-mono); font-size:9px;">
        ${tools.map((t, idx) => `
          <div style="padding:2px 6px; border-radius:2px; background: ${idx <= activeToolIndex ? 'rgba(6,182,212,0.15)' : 'var(--bg-primary)'}; color: ${idx <= activeToolIndex ? 'var(--accent-cyan)' : 'var(--text-muted)'}; border: 1px solid ${idx <= activeToolIndex ? 'var(--accent-cyan)' : 'var(--border-color)'};">
            ${idx <= activeToolIndex ? '✓' : '○'} ${t}
          </div>
        `).join('')}
      </div>
    `;
  }

  static renderInvestigation2(targetZone, triageRationale, dispatchPlan, trajectory) {
    const outBox = document.getElementById('investigation-output-box');
    if (!outBox) return;

    const b = targetZone.riskDetails.breakdown;

    outBox.innerHTML = `
      <div style="font-family:var(--font-mono); font-size:10px;">
        <div style="color:var(--accent-cyan); font-weight:700; border-bottom:1px solid var(--border-color); padding-bottom:4px; margin-bottom:6px;">
          INVESTIGATION VERDICT: ${targetZone.name}
        </div>

        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <span>RISK: <b style="color:var(--accent-red); font-size:13px;">${targetZone.risk}/100</b></span>
          <span>PERSISTENCE: <b>${targetZone.persistence_hours}h</b></span>
          <span>TREND: <b>${targetZone.trend.trend} (${targetZone.trend.ratePerHour}°C/h)</b></span>
        </div>

        <div style="background:var(--bg-secondary); padding:6px; border-radius:4px; border-left:2px solid var(--accent-cyan); margin-bottom:6px;">
          <b>PRIMARY RISK FORCING:</b><br/>
          • Ground Level Temp (2m): ${targetZone.temp_c}°C (${b.tempScore}% score)<br/>
          • Heat Retention Exceedance: ${targetZone.exceedance_hours}h (${b.exceedanceScore}% score)<br/>
          • Solar Radiation Load: ${targetZone.solar_wm2} W/m²
        </div>

        <div style="color:var(--accent-amber); font-weight:600; margin-bottom:6px;">
          🔮 <b>TRAJECTORY:</b> ${trajectory.advisory}
        </div>

        <div style="background:rgba(239, 68, 68, 0.1); border:1px solid var(--accent-red); padding:6px; border-radius:4px;">
          <b style="color:var(--accent-red);">RECOMMENDED ACTION (DISPATCHER):</b><br/>
          ${dispatchPlan.recommendedActions[0]}
        </div>
      </div>
    `;
  }
}
