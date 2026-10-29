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
const table = (headers, rows) => `<div class="table-wrap"><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}" class="empty">Sin registros en este período</td></tr>`}</tbody></table></div>`;

export function openMonthlyReport(report, win = window.open('', '_blank')) {
  if (!win) throw new Error('Permite las ventanas emergentes para abrir el reporte.');

  const summary = report.resumen;
  const pendingReceivables = report.pendientes_abono || [];
  const grossProfit = summary.costo_ventas_estimado_nio == null
    ? 'No disponible'
    : money(summary.ventas_nio - summary.costo_ventas_estimado_nio);
  const missingCostProducts = new Map();
  for (const sale of report.ventas) {
    for (const item of sale.items) {
      if (item.costo_unitario_nio != null) continue;
      const product = missingCostProducts.get(item.producto_id) || { nombre: item.producto, sku: item.sku, unidades: 0 };
      product.unidades += Number(item.cantidad || 0);
      missingCostProducts.set(item.producto_id, product);
    }
  }
  const missingCostLabel = [...missingCostProducts.values()]
    .map((item) => `${item.nombre}${item.sku ? ` (${item.sku})` : ''}, ${item.unidades} unidades`)
    .join('; ');
  const purchaseCount = report.compras.length;
  const averagePurchase = purchaseCount ? money(summary.compras_nio / purchaseCount) : '—';
  const salesRows = report.ventas.map((sale) => `<tr>${cell(date(sale.fecha))}${cell(`Factura #${sale.id}`)}${cell(sale.cliente)}${cell(money(sale.total_nio), 'num')}${cell(money(sale.abonado_nio), 'num')}${cell(money(sale.saldo_nio), 'num')}</tr>`).join('');
  const purchaseRows = report.compras.map((purchase) => `<tr>${cell(date(purchase.fecha))}${cell(`Compra #${purchase.id}`)}${cell(purchase.proveedor)}${cell(purchase.referencia || '—')}${cell(money(purchase.total_nio), 'num')}${cell(money(purchase.abonado_nio), 'num')}${cell(money(purchase.saldo_nio), 'num')}</tr>`).join('');
  const pendingRows = pendingReceivables.map((pending) => `<tr>${cell(date(pending.fecha))}${cell(`Factura #${pending.factura_id}`)}${cell(pending.cliente)}${cell(money(pending.total_nio), 'num')}${cell(money(pending.abonado_nio), 'num')}${cell(money(pending.saldo_nio), 'num')}</tr>`).join('');

  win.document.open();
  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Reporte mensual ${report.year}-${String(report.month).padStart(2, '0')}</title><style>
    *{box-sizing:border-box}body{font:12px Arial,sans-serif;color:#172033;background:#eef2f8;margin:24px}.report{max-width:1180px;margin:auto;background:#fff;padding:28px;border-radius:16px;box-shadow:0 12px 40px #18264a18}.hero{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:26px 30px;border-radius:14px;background:linear-gradient(120deg,#161a45,#3730a3 62%,#675ff2);color:#fff}.brand{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#c7d2fe;font-weight:700}.hero h1{font-size:28px;margin:10px 0 6px}.hero p{margin:0;color:#dbe2ff}.period{display:inline-block;margin-top:14px;padding:7px 11px;border:1px solid #ffffff45;border-radius:999px;font-size:11px}.hero-profit{min-width:230px;padding:15px 18px;border:1px solid #ffffff42;border-radius:12px;background:#ffffff12}.hero-profit span,.hero-profit small{display:block;color:#dbe2ff;font-size:10px}.hero-profit strong{display:block;margin:7px 0;font-size:22px;overflow-wrap:anywhere}.actions{display:flex;justify-content:flex-end;margin:0 auto 12px;max-width:1180px}.actions button{border:0;border-radius:8px;padding:11px 16px;background:#3730a3;color:#fff;font-weight:700;cursor:pointer}.section-title{display:flex;align-items:center;gap:9px;margin:22px 0 10px;font-size:15px}.section-title:before{content:'';width:4px;height:17px;border-radius:4px;background:#5b55e7}.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}.card{min-height:76px;padding:13px;border:1px solid #e1e6f0;border-top:3px solid #5b55e7;border-radius:9px;background:#fff}.card:nth-child(4n+2){border-top-color:#f59e0b}.card:nth-child(4n+3){border-top-color:#0ea5e9}.card:nth-child(4n){border-top-color:#14b8a6}.card small{display:block;color:#667085;margin-bottom:8px;line-height:1.35}.card strong{font-size:15px;color:#1c2340}.note{font-size:10px;line-height:1.55;color:#596176;background:#f5f6fb;border:1px solid #e7e9f2;padding:11px 13px;border-radius:9px;margin-top:12px}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #dbe1eb;padding:8px;text-align:left;vertical-align:top}th{background:#f3f5fa;color:#46516a}.num{text-align:right;white-space:nowrap}.empty{text-align:center;color:#7b8496;padding:14px}.receivable{background:#fffaf0}.receivable th{background:#fff2d6}footer{margin-top:22px;color:#7b8496;font-size:10px}
    @media(max-width:760px){body{margin:10px}.report{padding:16px}.hero{align-items:stretch;flex-direction:column}.hero-profit{min-width:0}.cards{grid-template-columns:repeat(2,minmax(0,1fr))}}@media print{body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.report{max-width:none;padding:0;border-radius:0;box-shadow:none}.actions{display:none}.hero{border-radius:0}.section-title,table,.card{break-inside:avoid}}@page{size:landscape;margin:10mm}
  </style></head><body><div class="actions"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div><main class="report">
    <header class="hero"><div><div class="brand">JMstore · Reporte de gestión</div><h1>Resumen ejecutivo mensual</h1><p>Ventas, compras y cartera pendiente</p><span class="period">Desde ${escapeHtml(report.desde)} · Hasta ${escapeHtml(report.hasta)}</span></div><aside class="hero-profit"><span>Utilidad bruta estimada</span><strong>${escapeHtml(grossProfit)}</strong><small>Comisiones POS: ${escapeHtml(money(summary.comisiones_pos_nio))}</small></aside></header>
    <h2 class="section-title">Indicadores</h2>
    <div class="cards"><div class="card"><small>Ventas netas</small><strong>${escapeHtml(money(summary.ventas_nio))}</strong></div><div class="card"><small>Unidades vendidas</small><strong>${escapeHtml(summary.unidades_vendidas)}</strong></div><div class="card"><small>Ticket promedio</small><strong>${escapeHtml(money(summary.ticket_promedio_nio))}</strong></div><div class="card"><small>Utilidad bruta estimada</small><strong>${escapeHtml(grossProfit)}</strong></div><div class="card"><small>Compras netas</small><strong>${escapeHtml(money(summary.compras_nio))}</strong></div><div class="card"><small>Número de compras</small><strong>${escapeHtml(purchaseCount)}</strong></div><div class="card"><small>Inversión promedio</small><strong>${escapeHtml(averagePurchase)}</strong></div><div class="card"><small>Monto por cobrar</small><strong>${escapeHtml(summary.cuentas_por_cobrar_nio == null ? 'No disponible' : money(summary.cuentas_por_cobrar_nio))}</strong></div></div>
    <p class="note">La utilidad bruta estimada descuenta el costo actual de los productos vendidos; las comisiones POS aparecen por separado. ${missingCostLabel ? `Sin costo registrado: ${escapeHtml(missingCostLabel)}.` : ''} El monto por cobrar suma los saldos pendientes de todas las facturas, incluidas las de meses anteriores. Compras netas incluye el envío registrado.</p>
    <h2 class="section-title">Ventas del período</h2>
    ${table(['Fecha','Factura','Cliente','Total','Abonado','Saldo'], salesRows)}
    <h2 class="section-title">Compras del período</h2>
    ${table(['Fecha','Compra','Proveedor','Referencia','Total','Pagado','Saldo'], purchaseRows)}
    <h2 class="section-title">Pendientes de abono</h2>
    <div class="receivable">${table(['Fecha','Factura','Cliente','Total','Abonado','Pendiente'], pendingRows)}</div>
    <footer>Valores en córdobas (NIO). El monto por cobrar refleja saldos vigentes al generar el reporte.</footer>
    </main></body></html>`);
  win.document.close();
}
