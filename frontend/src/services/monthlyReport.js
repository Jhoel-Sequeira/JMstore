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
const table = (headers, rows) => `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}" class="empty">Sin movimientos en este período</td></tr>`}</tbody></table></div>`;
const barChart = (title, items) => {
  const max = Math.max(1, ...items.map((item) => Number(item.value || 0)));
  const rows = items.map((item) => `<div class="chart-row"><div class="chart-label"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(money(item.value))}</strong></div><div class="track"><i style="width:${Math.max(item.value ? 2 : 0, Number(item.value || 0) / max * 100)}%;background:${item.color}"></i></div></div>`).join('');
  return `<article class="chart"><h2>${escapeHtml(title)}</h2>${rows || '<p class="chart-empty">No hay datos para mostrar.</p>'}</article>`;
};

export function openMonthlyReport(report, win = window.open('', '_blank')) {
  if (!win) throw new Error('Permite las ventanas emergentes para abrir el reporte.');

  const summary = report.resumen;
  const salesRows = report.ventas.map((sale) => `<tr class="group"><td colspan="7">Factura #${escapeHtml(sale.id)} · ${escapeHtml(date(sale.fecha))} · ${escapeHtml(sale.cliente)}</td></tr><tr>${cell('Total')}${cell(money(sale.total_nio), 'num')}${cell('Abonado a la fecha')}${cell(money(sale.abonado_nio), 'num')}${cell('Saldo')}${cell(money(sale.saldo_nio), 'num')}${cell(`Comisión POS ${money(sale.comision_pos_nio)}`)}</tr>${sale.items.map((item) => `<tr class="detail">${cell(item.producto)}${cell(item.sku || '—')}${cell(item.cantidad, 'num')}${cell(money(item.precio_unitario_nio), 'num')}${cell(money(item.descuento_nio), 'num')}${cell(money(item.subtotal_nio), 'num')}<td colspan="1"></td></tr>`).join('')}${sale.pagos.map((payment) => `<tr class="detail payment">${cell(`Abono ${date(payment.fecha)}`)}${cell(payment.metodo)}${cell(money(payment.monto_nio), 'num')}${cell(`Comisión ${money(payment.comision_nio)}`)}<td colspan="3"></td></tr>`).join('')}`).join('');
  const purchaseRows = report.compras.map((purchase) => `<tr class="group"><td colspan="7">Compra #${escapeHtml(purchase.id)} · ${escapeHtml(date(purchase.fecha))} · ${escapeHtml(purchase.proveedor)} · ${escapeHtml(purchase.referencia || '')}</td></tr><tr>${cell('Total')}${cell(money(purchase.total_nio), 'num')}${cell('Pagado')}${cell(money(purchase.abonado_nio), 'num')}${cell('Saldo')}${cell(money(purchase.saldo_nio), 'num')}${cell(`Efectivo ${money(purchase.pago_efectivo_nio)} · Cuenta ${money(purchase.pago_cuenta_nio)}`)}</tr>${purchase.items.map((item) => `<tr class="detail">${cell(item.producto)}${cell(item.sku || '—')}${cell(item.cantidad, 'num')}${cell(money(item.costo_unitario_nio), 'num')}${cell(money(item.costo_envio_unitario_nio), 'num')}${cell(money(item.subtotal_nio), 'num')}<td></td></tr>`).join('')}`).join('');
  const paymentRows = report.abonos_mes.map((payment) => `<tr>${cell(date(payment.fecha))}${cell(`Factura #${payment.factura_id}`)}${cell(payment.cliente)}${cell(payment.metodo)}${cell(money(payment.monto_nio), 'num')}${cell(money(payment.comision_nio), 'num')}</tr>`).join('');
  const inventoryRows = report.inventario.map((item) => `<tr>${cell(item.producto)}${cell(item.sku || '—')}${cell(item.marca || '—')}${cell(item.stock, 'num')}${cell(item.stock_minimo, 'num')}${cell(item.costo_unitario_nio == null ? 'Sin costo' : money(item.costo_unitario_nio), 'num')}${cell(money(item.precio_unitario_nio), 'num')}${cell(item.valor_costo_nio == null ? '—' : money(item.valor_costo_nio), 'num')}${cell(money(item.valor_venta_nio), 'num')}</tr>`).join('');
  const profitability = summary.utilidad_estimada_nio == null
    ? `No disponible: ${summary.lineas_sin_costo} líneas vendidas sin costo registrado.`
    : money(summary.utilidad_estimada_nio);
  const businessBars = barChart('Movimiento del mes', [
    { label: 'Ventas facturadas', value: summary.ventas_nio, color: '#5850ec' },
    { label: 'Compras registradas', value: summary.compras_nio, color: '#f59e0b' },
    { label: 'Cobros recibidos', value: summary.cobros_mes_nio, color: '#0ea5e9' },
    { label: 'Saldo de facturas del mes', value: summary.saldo_facturas_mes_nio, color: '#f97373' },
  ]);
  const inventoryBars = barChart('Valor del inventario actual', [
    { label: 'Al costo conocido', value: summary.valor_inventario_costo_nio, color: '#0f9f79' },
    { label: 'A precio de venta', value: summary.valor_inventario_venta_nio, color: '#14b8a6' },
  ]);
  const methodsChart = barChart('Cobros por método', summary.cobros_por_metodo.map((item, index) => ({
    label: item.metodo, value: item.monto_nio, color: ['#5850ec', '#0ea5e9', '#14b8a6', '#f59e0b'][index % 4],
  })));

  win.document.open();
  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Corte mensual ${report.year}-${String(report.month).padStart(2, '0')}</title><style>
    *{box-sizing:border-box}body{font:12px Arial,sans-serif;color:#172033;background:#eef2f8;margin:24px}.report{max-width:1180px;margin:auto;background:#fff;padding:26px;border-radius:16px;box-shadow:0 12px 40px #18264a18}.hero{position:relative;overflow:hidden;padding:28px 32px;border-radius:14px;background:linear-gradient(120deg,#161a45,#3730a3 62%,#675ff2);color:#fff}.hero:after{content:'';position:absolute;width:210px;height:210px;right:8%;top:-100px;border:1px solid #ffffff35;border-radius:50%;box-shadow:0 0 0 26px #ffffff0b,0 0 0 54px #ffffff08}.brand{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#c7d2fe;font-weight:700}.hero h1{font-size:30px;margin:12px 0 6px}.hero p{color:#dbe2ff;margin:0}.period{display:inline-block;margin-top:16px;padding:7px 11px;border:1px solid #ffffff45;border-radius:999px;font-size:11px}.actions{display:flex;justify-content:flex-end;margin:0 auto 12px;max-width:1180px}.actions button{border:0;border-radius:8px;padding:11px 16px;background:#3730a3;color:#fff;font-weight:700;cursor:pointer}.section-title{display:flex;align-items:center;gap:9px;margin:22px 0 10px;font-size:15px}.section-title:before{content:'';width:4px;height:17px;border-radius:4px;background:#5b55e7}.cards{display:grid;grid-template-columns:repeat(5,1fr);gap:9px;margin-top:14px}.card{min-height:76px;padding:12px;border:1px solid #e1e6f0;border-top:3px solid #5b55e7;border-radius:9px;background:#fff}.card:nth-child(5n+2){border-top-color:#f59e0b}.card:nth-child(5n+3){border-top-color:#0ea5e9}.card:nth-child(5n+4){border-top-color:#14b8a6}.card:nth-child(5n){border-top-color:#f97373}.card small{display:block;color:#667085;margin-bottom:8px;line-height:1.35}.card strong{font-size:14px;color:#1c2340}.graphics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}.chart{padding:14px 16px;border:1px solid #e1e6f0;border-radius:11px;background:linear-gradient(145deg,#fff,#fafbff);break-inside:avoid}.chart h2{font-size:13px;margin:0 0 13px;color:#28314d}.chart-row{margin:9px 0}.chart-label{display:flex;justify-content:space-between;gap:14px;margin-bottom:5px;font-size:10px;color:#586174}.chart-label strong{color:#242c48;white-space:nowrap}.track{height:8px;border-radius:99px;background:#edf0f7;overflow:hidden}.track i{display:block;height:100%;border-radius:99px}.chart-empty{font-size:11px;color:#7b8496}.note{font-size:10px;line-height:1.55;color:#596176;background:#f5f6fb;border:1px solid #e7e9f2;padding:11px 13px;border-radius:9px;margin-top:14px}h2{font-size:16px;margin:24px 0 8px}p{color:#586174}.table-wrap{overflow:visible}section{break-inside:auto}tr{break-inside:avoid}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #dbe1eb;padding:5px;text-align:left;vertical-align:top}th{background:#f3f5fa}.num{text-align:right;white-space:nowrap}.group td{background:#e9edfb;font-weight:700;padding:7px}.detail td{color:#586174}.payment td{background:#f8f9fc}.empty{text-align:center;color:#7b8496;padding:14px}footer{margin-top:22px;color:#7b8496;font-size:10px}
    @media print{body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.report{max-width:none;padding:0;border-radius:0;box-shadow:none}.actions{display:none}.hero{border-radius:0;padding:22px 26px}.cards{grid-template-columns:repeat(5,1fr)}.graphics{grid-template-columns:repeat(2,minmax(0,1fr))}.details-page{break-before:page}.chart{break-inside:avoid}}@page{size:landscape;margin:10mm}
  </style></head><body><div class="actions"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div><main class="report">
    <header class="hero"><div class="brand">JMstore · Reporte de gestión</div><h1>Corte mensual del negocio</h1><p>Resumen de ventas, compras, cobros e inventario</p><span class="period">Período ${escapeHtml(report.desde)} — ${escapeHtml(report.hasta)}</span></header>
    <h2 class="section-title">Indicadores del período</h2>
    <div class="cards"><div class="card"><small>Ventas facturadas</small><strong>${escapeHtml(money(summary.ventas_nio))}</strong></div><div class="card"><small>Compras registradas</small><strong>${escapeHtml(money(summary.compras_nio))}</strong></div><div class="card"><small>Cobros recibidos en el mes</small><strong>${escapeHtml(money(summary.cobros_mes_nio))}</strong></div><div class="card"><small>Abonado a facturas del mes (a la fecha)</small><strong>${escapeHtml(money(summary.abonado_facturas_mes_nio))}</strong></div><div class="card"><small>Cobros menos pagos de compras*</small><strong>${escapeHtml(money(summary.movimiento_neto_mes_nio))}</strong></div><div class="card"><small>Ventas menos compras**</small><strong>${escapeHtml(money(summary.ventas_menos_compras_nio))}</strong></div><div class="card"><small>Saldo de facturas del mes</small><strong>${escapeHtml(money(summary.saldo_facturas_mes_nio))}</strong></div><div class="card"><small>Saldo de compras del mes</small><strong>${escapeHtml(money(summary.saldo_compras_mes_nio))}</strong></div><div class="card"><small>Utilidad estimada de ventas</small><strong>${escapeHtml(profitability)}</strong></div><div class="card"><small>Inventario al costo conocido</small><strong>${escapeHtml(money(summary.valor_inventario_costo_nio))}</strong></div></div>
    <p class="note">*Compara cobros recibidos durante el mes menos los pagos actualmente registrados en compras creadas ese mes; el sistema no conserva la fecha de cada pago a proveedor. **Ventas menos compras es solo una comparación de actividad e inversión; no equivale a utilidad contable. La utilidad estimada descuenta el costo actual registrado de los productos vendidos y comisiones POS; no es utilidad contable histórica. Los saldos de facturas reflejan abonos acumulados a la fecha. Los cobros del mes incluyen abonos de facturas de meses anteriores.</p>
    <div class="graphics">${businessBars}${inventoryBars}${methodsChart}</div>
    <div class="details-page">
    <section><h2>Abonos recibidos durante el mes</h2><p>Incluye pagos de facturas emitidas en meses anteriores.</p>${table(['Fecha','Factura','Cliente','Método','Monto','Comisión'], paymentRows)}</section>
    <section><h2>Ventas y cuentas por cobrar</h2>${table(['Detalle / producto','SKU / método','Unidades / monto','Precio unitario','Descuento','Subtotal',''], salesRows)}</section>
    <section><h2>Compras e inversión a proveedores</h2>${table(['Detalle / producto','SKU','Unidades','Costo unitario','Envío unitario','Subtotal',''], purchaseRows)}</section>
    <section><h2>Inventario actual</h2>${table(['Producto','SKU','Marca','Stock','Mínimo','Costo unitario','Precio venta','Valor al costo','Valor de venta'], inventoryRows)}</section>
    <footer>Valores en córdobas (NIO). Inventario mostrado al momento de generar el reporte. Productos sin costo registrado no se incluyen en el valor al costo.</footer>
    </div></main></body></html>`);
  win.document.close();
}
