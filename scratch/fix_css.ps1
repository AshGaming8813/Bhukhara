$lines = Get-Content 'c:\Users\ashga\OneDrive\Desktop\Bhukahra\src\styles\table.css'
$lines[0..2446] | Set-Content 'c:\Users\ashga\OneDrive\Desktop\Bhukahra\src\styles\table.css'

$css = @"
/* ── ROW 3: Actions ── */
.table-actions-row {
  flex-shrink: 0 !important;
}

/* ── Pure Series Toast ── */
.pure-series-toast {
  position: fixed;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #e67e22, #d35400);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 900;
  padding: 8px 20px;
  border-radius: 24px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 12px rgba(230,126,34,0.5);
  z-index: 9999;
  animation: toast-slide-up 0.3s ease-out, toast-fade-out 0.4s ease-in 2.4s forwards;
  white-space: nowrap;
  pointer-events: none;
  letter-spacing: 0.5px;
}

@keyframes toast-slide-up {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes toast-fade-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}

/* ── Compact hand count pill ── */
.hand-count-pill {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--gold-light);
  background: rgba(212,175,55,0.15);
  border: 1px solid rgba(212,175,55,0.4);
  border-radius: 10px;
  padding: 2px 8px;
}

.pure-needed-mini {
  font-size: 0.65rem;
  font-weight: 700;
  color: #e74c3c;
  background: rgba(231,76,60,0.12);
  border: 1px solid rgba(231,76,60,0.3);
  border-radius: 8px;
  padding: 1px 6px;
}

/* ── Compact action buttons ── */
.btn-mockup-action {
  height: 34px !important;
  padding: 0 8px !important;
  gap: 4px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 0.72rem !important;
  border-radius: 8px !important;
  min-width: 56px !important;
  flex-shrink: 0 !important;
}

.btn-icon-circle {
  width: 20px !important;
  height: 20px !important;
  min-width: 20px !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.mockup-action-buttons-group {
  display: flex !important;
  flex-wrap: nowrap !important;
  gap: 4px !important;
  justify-content: center !important;
  padding: 3px 4px !important;
}

.action-panel-compact-container {
  padding: 2px 4px !important;
}

/* ── Responsive: narrow screens ── */
@media (max-width: 640px) {
  .table-combo-workspace {
    gap: 4px !important;
  }

  .btn-mockup-action {
    height: 30px !important;
    padding: 0 5px !important;
    min-width: 46px !important;
    font-size: 0.65rem !important;
  }
}

/* ── UNIFIED ACTION BAR ── */
.unified-action-bar {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  width: 100% !important;
  gap: 8px !important;
}

.hand-title-compact {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  flex-shrink: 0 !important;
}

.hand-sort-controls-compact {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  flex-shrink: 0 !important;
}

.btn-tiny-compact {
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  font-size: 0.65rem !important;
  padding: 2px 6px !important;
  height: 24px !important;
  border-radius: 4px !important;
  background: rgba(255,255,255,0.1) !important;
  color: #fff !important;
  border: 1px solid rgba(255,255,255,0.2) !important;
  cursor: pointer !important;
}

.btn-tiny-compact:hover {
  background: rgba(255,255,255,0.2) !important;
}

@media (max-width: 768px) {
  .unified-action-bar {
    justify-content: space-between !important;
    flex-wrap: nowrap !important;
    overflow-x: auto !important;
  }
}
"@

Add-Content -Path 'c:\Users\ashga\OneDrive\Desktop\Bhukahra\src\styles\table.css' -Value $css
