const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const money = (value) => new Intl.NumberFormat('es-NI', {
  style: 'currency', currency: 'NIO', maximumFractionDigits: 2,
}).format(Number(value || 0));

const date = (value) => {
  if (!value) return '—';
  const raw = String(value);
  const localTimestamp = raw.includes('T') ? `${raw}-06:00` : `${raw}T00:00:00-06:00`;
  return new Date(localTimestamp).toLocaleString('es-NI', {
    dateStyle: 'short', timeStyle: raw.includes('T') ? 'short' : undefined, timeZone: 'America/Managua',
  });
};

const cell = (value, className = '') => `<td class="${className}">${escapeHtml(value)}</td>`;
const total = (rows, field) => rows.reduce((sum, row) => sum + Number(row[field] || 0), 0);
const table = (headers, rows, totals) => `<div class="table-wrap"><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}" class="empty">Sin registros en este per\u00edodo</td></tr>`}</tbody>${totals ? `<tfoot><tr class="total-row">${totals.map((value, index) => cell(value, index ? 'num' : '')).join('')}</tr></tfoot>` : ''}</table></div>`;

export function openMonthlyReport(report, win = window.open('', '_blank')) {
  if (!win) throw new Error('Permite las ventanas emergentes para abrir el reporte.');

  const summary = report.resumen;
  const pendingReceivables = report.pendientes_abono || [];
  const grossProfit = summary.costo_ventas_estimado_nio == null
    ? 'No disponible'
    : money(summary.ventas_nio - summary.costo_ventas_estimado_nio);
  const purchaseCount = report.compras.length;
  const salesRows = report.ventas.map((sale) => `<tr>${cell(date(sale.fecha))}${cell(`Factura #${sale.id}`)}${cell(sale.cliente)}${cell(money(sale.total_nio), 'num')}${cell(money(sale.abonado_nio), 'num')}${cell(money(sale.saldo_nio), 'num')}</tr>`).join('');
  const purchaseRows = report.compras.map((purchase) => `<tr>${cell(date(purchase.fecha))}${cell(`Compra #${purchase.id}`)}${cell(purchase.proveedor)}${cell(purchase.referencia || '—')}${cell(money(purchase.total_nio), 'num')}${cell(money(purchase.abonado_nio), 'num')}${cell(money(purchase.saldo_nio), 'num')}</tr>`).join('');
  const pendingRows = pendingReceivables.map((pending) => `<tr>${cell(date(pending.fecha))}${cell(`Factura #${pending.factura_id}`)}${cell(pending.cliente)}${cell(money(pending.total_nio), 'num')}${cell(money(pending.abonado_nio), 'num')}${cell(money(pending.saldo_nio), 'num')}</tr>`).join('');
  const salesTotals = ['TOTAL', '', '', money(total(report.ventas, 'total_nio')), money(total(report.ventas, 'abonado_nio')), money(total(report.ventas, 'saldo_nio'))];
  const purchaseTotals = ['TOTAL', '', '', '', money(total(report.compras, 'total_nio')), money(total(report.compras, 'abonado_nio')), money(total(report.compras, 'saldo_nio'))];
  const pendingTotals = ['TOTAL', '', '', money(total(pendingReceivables, 'total_nio')), money(total(pendingReceivables, 'abonado_nio')), money(total(pendingReceivables, 'saldo_nio'))];

  win.document.open();
  const logoUrl = new URL('/logo.png', window.location.href).href;
  const periodLabel = new Intl.DateTimeFormat('es-NI', { month: 'long', year: 'numeric', timeZone: 'America/Managua' })
    .format(new Date(report.year, report.month - 1, 1));
  const generatedAt = new Intl.DateTimeFormat('es-NI', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Managua',
  }).format(new Date());

  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>REPORTE MENSUAL - ${escapeHtml(periodLabel)}</title><style>
    :root{--navy:#10264b;--blue:#2463a6;--ink:#17243a;--muted:#68778c;--line:#dce4ee;--pale:#f3f7fb;--gold:#b88b46}*{box-sizing:border-box}body{margin:0;background:#e9eef5;color:var(--ink);font:12px/1.45 Arial,Helvetica,sans-serif}.actions{display:flex;justify-content:flex-end;max-width:8.5in;margin:18px auto 10px}.actions button{border:0;border-radius:6px;padding:11px 18px;background:var(--navy);color:#fff;font-weight:700;cursor:pointer}.report{width:8.5in;min-height:11in;margin:0 auto 24px;padding:.55in .58in;background:#fff;box-shadow:0 8px 28px #10264b20}.masthead{display:flex;align-items:center;gap:18px;padding-bottom:18px;border-bottom:2px solid var(--navy)}.logo{width:88px;height:88px;object-fit:contain}.brand{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--blue)}.masthead h1{margin:4px 0 2px;color:var(--navy);font-size:25px;letter-spacing:-.03em}.subtitle{margin:0;color:var(--muted);font-size:11px}.period-box{margin-left:auto;min-width:150px;padding:10px 13px;border-left:3px solid var(--gold);background:var(--pale)}.period-box small,.period-box strong{display:block}.period-box small{color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.1em}.period-box strong{margin-top:4px;color:var(--navy);font-size:13px;text-transform:capitalize}.date-range{margin-top:3px;color:var(--muted);font-size:9px}.executive{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:17px;padding:13px 16px;background:var(--navy);color:#fff}.executive-label{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#d9e5f3}.executive strong{display:block;margin-top:3px;font-size:20px}.executive-meta{text-align:right;color:#d9e5f3;font-size:10px}.section-title{display:flex;align-items:center;gap:9px;margin:20px 0 9px;color:var(--navy);font-size:13px}.section-title:before{content:'';width:4px;height:16px;background:var(--gold)}.section-kicker{margin-left:auto;color:#8290a3;font-size:9px;font-weight:400;letter-spacing:.04em}.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.card{min-height:68px;padding:10px 11px;border:1px solid var(--line);border-top:2px solid var(--blue);background:#fff;break-inside:avoid}.card:nth-child(4n+2){border-top-color:var(--gold)}.card:nth-child(4n+3){border-top-color:#318b85}.card:nth-child(4n){border-top-color:#7486a0}.card small{display:block;min-height:26px;color:var(--muted);font-size:9px;line-height:1.35}.card strong{display:block;margin-top:4px;color:var(--navy);font-size:14px;overflow-wrap:anywhere}.note{margin-top:9px;padding:9px 11px;border-left:3px solid #d7a449;background:#fbf8f1;color:#5c574c;font-size:9px;line-height:1.5}.table-wrap{width:100%}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.5px}thead{display:table-header-group}th,td{padding:6px 5px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:var(--pale);color:#42516a;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}tbody tr:nth-child(even){background:#fafbfd}tbody tr{break-inside:avoid}tfoot td{font-weight:700;color:var(--navy);background:var(--pale);border-top:2px solid var(--navy)}.num{text-align:right;white-space:nowrap}.empty{text-align:center;color:#8290a3;padding:13px}.receivable{padding:7px 9px;border:1px solid #ecdfc3;background:#fffdf8}.receivable th{background:#faf2e2}footer{display:flex;justify-content:space-between;gap:15px;margin-top:20px;padding-top:8px;border-top:1px solid var(--line);color:#7c8999;font-size:8px}.footer-brand{font-weight:700;letter-spacing:.08em;text-transform:uppercase}.footer-note{text-align:right}
    @media(max-width:700px){body{background:#fff}.actions{margin:10px}.report{width:100%;min-height:0;margin:0;padding:20px 16px;box-shadow:none}.masthead{gap:10px}.logo{width:64px;height:64px}.masthead h1{font-size:20px}.period-box{min-width:112px;padding:7px}.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.executive{align-items:flex-start;flex-direction:column}.executive-meta{text-align:left}.table-wrap{overflow-x:auto}table{min-width:620px}}
    @media print{body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.actions{display:none}.report{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}.masthead,.executive,.card,.note,.section-title,table,.receivable,footer{break-inside:avoid}.section-title{break-after:avoid}.table-wrap{overflow:visible}table{font-size:8px}th,td{padding:5px 4px}a{color:inherit;text-decoration:none}}
    @page{size:letter portrait;margin:.48in .52in .52in;@bottom-left{content:"JM Scents | Reporte ejecutivo";font:8px Arial,sans-serif;color:#7c8999}@bottom-right{content:"Pagina " counter(page) " de " counter(pages);font:8px Arial,sans-serif;color:#7c8999}}
  </style></head><body><div class="actions"><button onclick="window.print()">Exportar / Guardar como PDF</button></div><main class="report">
    <header class="masthead"><img class="logo" src="${escapeHtml(logoUrl)}" alt="Logo JM Scents"><div><div class="brand">JM Scents | Fragrance House</div><h1>REPORTE MENSUAL</h1><p class="subtitle">Resumen de ventas, compras y cartera</p></div><div class="period-box"><small>Periodo del reporte</small><strong>${escapeHtml(periodLabel)}</strong><div class="date-range">${escapeHtml(report.desde)} al ${escapeHtml(report.hasta)}</div></div></header>
    <div class="executive"><div><div class="executive-label">Rentabilidad del período</div><strong>${escapeHtml(grossProfit)}</strong></div></div>
    <h2 class="section-title">Indicadores clave <span class="section-kicker">Montos expresados en c?rdobas</span></h2>
    <div class="cards"><div class="card"><small>Ventas netas</small><strong>${escapeHtml(money(summary.ventas_nio))}</strong></div><div class="card"><small>Unidades vendidas</small><strong>${escapeHtml(summary.unidades_vendidas)}</strong></div><div class="card"><small>Ticket promedio</small><strong>${escapeHtml(money(summary.ticket_promedio_nio))}</strong></div><div class="card"><small>Utilidad bruta</small><strong>${escapeHtml(grossProfit)}</strong></div><div class="card"><small>Compras netas</small><strong>${escapeHtml(money(summary.compras_nio))}</strong></div><div class="card"><small>Numero de compras</small><strong>${escapeHtml(purchaseCount)}</strong></div><div class="card"><small>Monto total cobrado</small><strong>${escapeHtml(money(summary.cobros_mes_nio))}</strong></div><div class="card"><small>Monto por cobrar</small><strong>${escapeHtml(summary.cuentas_por_cobrar_nio == null ? 'No disponible' : money(summary.cuentas_por_cobrar_nio))}</strong></div></div>
    <h2 class="section-title">Detalle de ventas <span class="section-kicker">${report.ventas.length} registros</span></h2>
    ${table(['Fecha','Factura','Cliente','Total','Abonado','Saldo'], salesRows, salesTotals)}
    <h2 class="section-title">Detalle de compras <span class="section-kicker">${purchaseCount} registros</span></h2>
    ${table(['Fecha','Compra','Proveedor','Referencia','Total','Pagado','Saldo'], purchaseRows, purchaseTotals)}
    <h2 class="section-title">Cartera pendiente de abono <span class="section-kicker">${pendingReceivables.length} facturas</span></h2>
    <div class="receivable">${table(['Fecha','Factura','Cliente','Total','Abonado','Pendiente'], pendingRows, pendingTotals)}</div>
    <footer><span class="footer-brand">JM Scents ? Reporte de gesti?n</span><span class="footer-note">Generado ${escapeHtml(generatedAt)} ? Cartera al momento de generar el reporte</span></footer>
    </main></body></html>`);
  win.document.close();
}
