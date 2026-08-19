import { audit } from '../utils/logger.js';

export class AuditModuleUI {
  static render(container) {
    container.innerHTML = `
      <div class="module-container">
        <div class="panel-card">
          <div class="panel-card-header">
            <h3>🔐 SOC-Grade Cryptographic Chained Audit Ledger</h3>
            <button id="audit-export-json" class="btn btn-secondary">📥 Export Ledger JSON</button>
          </div>
          <p class="subtext" style="margin-bottom:8px;">Every tool call, optimizer calculation, and human approval is cryptographically back-linked using SHA-256 hashes.</p>
          
          <table class="audit-table">
            <thead>
              <tr>
                <th>Timestamp (UTC)</th>
                <th>Agent / Entity</th>
                <th>Action ID</th>
                <th>Details</th>
                <th>Cryptographic SHA-256 Hash</th>
              </tr>
            </thead>
            <tbody id="audit-table-body">
              ${audit.logs.map(log => `
                <tr>
                  <td>${log.timestamp.substring(11, 19)}</td>
                  <td><b>${log.agent}</b></td>
                  <td>${log.action}</td>
                  <td>${JSON.stringify(log.details)}</td>
                  <td><span class="hash-token">${log.hash}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('audit-export-json')?.addEventListener('click', () => {
      const blob = new Blob([audit.exportJSON()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HeatRescue-Audit-${Date.now()}.json`;
      a.click();
    });
  }
}
