import { state } from '../state.js';
import { AgentToolRegistry } from '../agents/registry.js';
import { Validation } from '../utils/validation.js';

export class InvestigatorModuleUI {
  static render(container, onExecute) {
    container.innerHTML = `
      <div class="module-container">
        <div class="module-dual-workspace">
          
          <!-- Left: Query & Agent Reasoning Trace -->
          <div class="workspace-main">
            <div class="panel-card">
              <div class="panel-card-header">
                <h3>🤖 Autonomous Multi-Agent Reasoning Loop</h3>
                <span class="badge badge-success">3 AGENTS READY</span>
              </div>

              <div style="display:flex; gap:6px;">
                <input type="text" id="module-query-input" style="flex:1; background:var(--bg-primary); border:1px solid var(--border-color); color:var(--text-main); padding:8px; border-radius:4px; font-size:12px;" value="Identify highest thermal vulnerability zone and calculate optimal response">
                <button id="module-run-query-btn" class="btn btn-primary">Execute Agent Pipeline</button>
              </div>

              <div class="investigator-chat-pane" id="agent-chat-pane">
                <span class="subtext">Pipeline ready. Click 'Execute Agent Pipeline' to initiate Analyst, Optimizer, and Dispatcher tool invocation.</span>
              </div>
            </div>
          </div>

          <!-- Right: Tool Registry Execution Status -->
          <div class="workspace-side">
            <div class="panel-card">
              <div class="panel-card-header">
                <h3>🧩 Tool Registry Execution Traces</h3>
              </div>
              <div id="tool-registry-view" style="display:flex; flex-direction:column; gap:6px;">
                ${AgentToolRegistry.tools.map(t => `
                  <div style="background:var(--bg-primary); border:1px solid var(--border-color); padding:6px; border-radius:4px; font-family:var(--font-mono); font-size:9px;">
                    <div style="display:flex; justify-content:space-between;">
                      <strong style="color:var(--accent-cyan);">${t.name}</strong>
                      <span class="badge">${t.agent}</span>
                    </div>
                    <div class="subtext">${t.desc}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

        </div>
      </div>
    `;

    document.getElementById('module-run-query-btn')?.addEventListener('click', () => {
      const q = Validation.sanitizeText(document.getElementById('module-query-input').value);
      onExecute(q);
    });
  }
}
