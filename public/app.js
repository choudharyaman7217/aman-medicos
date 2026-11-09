* {
  box-sizing: border-box;
}

:root {
  --bg: #f4f7fb;
  --panel: #ffffff;
  --panel-alt: #eef6ff;
  --primary: #0f6fff;
  --primary-dark: #0d57cc;
  --secondary: #e9f7ef;
  --text: #11213d;
  --muted: #58677d;
  --border: #dfe8f5;
  --success: #1a9c6b;
  --warning: #f59e0b;
  --danger: #e05252;
  --shadow: 0 12px 30px rgba(17, 33, 61, 0.08);
}

body {
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
  background: var(--bg);
  color: var(--text);
}

button,
input,
select,
textarea {
  font: inherit;
}

.app-shell {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.eyebrow {
  text-transform: uppercase;
  color: var(--primary);
  font-size: 12px;
  letter-spacing: 0.12em;
  margin: 0 0 6px;
  font-weight: 700;
}

h1, h2, h3, p {
  margin-top: 0;
}

h1 {
  margin-bottom: 0;
  font-size: clamp(2rem, 3vw, 2.5rem);
}

.primary-btn,
.secondary-btn {
  border: none;
  border-radius: 10px;
  padding: 10px 16px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s ease;
}

.primary-btn {
  background: var(--primary);
  color: white;
}

.primary-btn:hover {
  background: var(--primary-dark);
}

.secondary-btn {
  background: var(--secondary);
  color: var(--success);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.summary-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 120px;
}

.summary-card span {
  color: var(--muted);
  font-size: 14px;
}

.summary-card strong {
  font-size: 2rem;
}

.accent-blue { border-top: 4px solid #4a90e2; }
.accent-green { border-top: 4px solid var(--success); }
.accent-gold { border-top: 4px solid var(--warning); }
.accent-red { border-top: 4px solid var(--danger); }

.main-grid {
  display: grid;
  grid-template-columns: 1.2fr 1.4fr 0.9fr;
  gap: 20px;
}

.panel {
  background: var(--panel);
  border-radius: 18px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
  padding: 20px;
}

.billing-panel {
  grid-column: 2 / span 2;
}

.full-width-panel {
  grid-column: 1 / -1;
}

.section-heading {
  margin-bottom: 18px;
}

.stack-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-row {
  display: grid;
  gap: 12px;
}

.two-col {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.three-col {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--muted);
  font-size: 14px;
}

input,
select,
textarea {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  background: #fbfcfe;
  color: var(--text);
}

textarea {
  resize: vertical;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 12px 10px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  vertical-align: middle;
}

th {
  color: var(--muted);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

tbody tr:hover {
  background: #f9fbff;
}

.action-btn {
  background: var(--panel-alt);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 7px 10px;
  color: var(--primary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

.action-btn.delete {
  color: var(--danger);
}

.customer-list-wrap {
  margin-top: 18px;
}

.customer-list {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.customer-list li {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  background: #fafcff;
}

.billing-top,
.sale-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.sale-controls {
  grid-template-columns: 2fr 1fr auto;
  align-items: end;
}

.mini-table td,
.mini-table th {
  font-size: 13px;
}

.totals-box {
  margin: 18px 0;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fafcff;
  padding: 12px 14px;
}

.totals-box > div {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #edf2f8;
}

.totals-box > div:last-child {
  border-bottom: none;
}

.grand-total {
  font-size: 1.1rem;
}

.full-width {
  width: 100%;
}

@media (max-width: 1100px) {
  .main-grid {
    grid-template-columns: 1fr;
  }

  .billing-panel,
  .full-width-panel {
    grid-column: auto;
  }
}

@media (max-width: 700px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }

  .topbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }

  .two-col,
  .three-col,
  .sale-controls,
  .billing-top {
    grid-template-columns: 1fr;
  }
}
