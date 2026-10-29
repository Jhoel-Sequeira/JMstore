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
const salesTrendChart = (rows) => {
  const width = 760;
  const height = 190;
  const left = 30;
  const top = 14;
  const bottom = 28;
  const plotWidth = width - left - 8;
  const plotHeight = height - top - bottom;
  const max = Math.max(1, ...rows.map((item) => Number(item.ventas_nio || 0)));
  const step = rows.length ? plotWidth / rows.length : plotWidth;
  const bars = rows.map((item, index) => {
    const value = Number(item.ventas_nio || 0);
    const barHeight = value ? Math.max(2, value / max * plotHeight) : 1;
    const x = left + index * step + step * 0.18;
    const y = top + plotHeight - barHeight;
    const day = item.fecha.slice(8, 10);
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(2, step * 0.64).toFixed(1)}" height="${barHeight.toFixed(1)}" rx="3" fill="${value ? '#5b55e7' : '#e8eaf2'}"><title>${escapeHtml(day)}: ${escapeHtml(money(value))}</title></rect>${index % 5 === 0 || index === rows.length - 1 ? `<text x="${(x + step * 0.32).toFixed(1)}" y="${height - 7}" text-anchor="middle" fill="#798199" font-size="10">${escapeHtml(day)}</text>` : ''}`;
  }).join('');
  return `<article class="chart sales-chart"><div class="chart-heading"><h2>Ventas por día</h2><span>Montos facturados en el corte</span></div><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Gráfico de ventas diarias">${[0, .5, 1].map((level) => { const y = top + plotHeight * (1 - level); return `<line x1="${left}" y1="${y}" x2="${width - 8}" y2="${y}" stroke="#e8eaf2" stroke-width="1"/>`; }).join('')}${bars}</svg></article>`;
};

export function openMonthlyReport(report, win = window.open('', '_blank')) {
  if (!win) throw new Error('Permite las ventanas emergentes para abrir el reporte.');

  const summary = report.resumen;
  const productTotals = new Map();
  for (const sale of report.ventas) {
    for (const item of sale.items) {
      const current = productTotals.get(item.producto_id) || {
        producto: item.producto, sku: item.sku, unidades: 0, ventas_nio: 0, utilidad_nio: 0, costo_completo: true,
      };
      current.unidades += Number(item.cantidad || 0);
      current.ventas_nio += Number(item.subtotal_nio || 0);
      if (item.costo_unitario_nio == null) current.costo_completo = false;
      else current.utilidad_nio += Number(item.subtotal_nio || 0) - Number(item.costo_unitario_nio) * Number(item.cantidad || 0);
      productTotals.set(item.producto_id, current);
    }
  }
  const products = [...productTotals.values()];
  const topProducts = [...products].sort((a, b) => b.unidades - a.unidades).slice(0, 5);
  const profitableProducts = [...products].filter((item) => item.costo_completo).sort((a, b) => b.utilidad_nio - a.utilidad_nio).slice(0, 5);
  const soldProductIds = new Set(productTotals.keys());
  const noDemand = report.inventario.filter((item) => !soldProductIds.has(item.producto_id));
  const soldRows = (items, metric) => items.map((item) => `<tr>${cell(item.producto)}${cell(item.sku || '—')}${cell(item.unidades, 'num')}${cell(metric === 'profit' ? (item.costo_completo ? money(item.utilidad_nio) : 'Sin costo') : money(item.ventas_nio), 'num')}</tr>`).join('');
  const salesRows = report.ventas.map((sale) => `<tr class="group"><td colspan="7">Factura #${escapeHtml(sale.id)} · ${escapeHtml(date(sale.fecha))} · ${escapeHtml(sale.cliente)}</td></tr><tr>${cell('Total')}${cell(money(sale.total_nio), 'num')}${cell('Abonado a la fecha')}${cell(money(sale.abonado_nio), 'num')}${cell('Saldo')}${cell(money(sale.saldo_nio), 'num')}${cell(`Comisión POS ${money(sale.comision_pos_nio)}`)}</tr>${sale.items.map((item) => `<tr class="detail">${cell(item.producto)}${cell(item.sku || '—')}${cell(item.cantidad, 'num')}${cell(money(item.precio_unitario_nio), 'num')}${cell(money(item.descuento_nio), 'num')}${cell(money(item.subtotal_nio), 'num')}<td colspan="1"></td></tr>`).join('')}${sale.pagos.map((payment) => `<tr class="detail payment">${cell(`Abono ${date(payment.fecha)}`)}${cell(payment.metodo)}${cell(money(payment.monto_nio), 'num')}${cell(`Comisión ${money(payment.comision_nio)}`)}<td colspan="3"></td></tr>`).join('')}`).join('');
  const purchaseRows = report.compras.map((purchase) => `<tr class="group"><td colspan="7">Compra #${escapeHtml(purchase.id)} · ${escapeHtml(date(purchase.fecha))} · ${escapeHtml(purchase.proveedor)} · ${escapeHtml(purchase.referencia || '')}</td></tr><tr>${cell('Total')}${cell(money(purchase.total_nio), 'num')}${cell('Pagado')}${cell(money(purchase.abonado_nio), 'num')}${cell('Saldo')}${cell(money(purchase.saldo_nio), 'num')}${cell(`Efectivo ${money(purchase.pago_efectivo_nio)} · Cuenta ${money(purchase.pago_cuenta_nio)}`)}</tr>${purchase.items.map((item) => `<tr class="detail">${cell(item.producto)}${cell(item.sku || '—')}${cell(item.cantidad, 'num')}${cell(money(item.costo_unitario_nio), 'num')}${cell(money(item.costo_envio_unitario_nio), 'num')}${cell(money(item.subtotal_nio), 'num')}<td></td></tr>`).join('')}`).join('');
  const paymentRows = report.abonos_mes.map((payment) => `<tr>${cell(date(payment.fecha))}${cell(`Factura #${payment.factura_id}`)}${cell(payment.cliente)}${cell(payment.metodo)}${cell(money(payment.monto_nio), 'num')}${cell(money(payment.comision_nio), 'num')}</tr>`).join('');
  const profitability = summary.utilidad_estimada_nio == null
    ? `No disponible: ${summary.lineas_sin_costo} líneas vendidas sin costo registrado.`
    : money(summary.utilidad_estimada_nio);
  const marginLabel = summary.margen_estimado_pct == null
    ? 'Margen no disponible'
    : `Margen estimado ${Number(summary.margen_estimado_pct).toFixed(1)}%`;
  const bestSalesDay = summary.mejor_dia_ventas?.ventas_nio > 0
    ? `Mejor día: ${summary.mejor_dia_ventas.fecha} · ${money(summary.mejor_dia_ventas.ventas_nio)}`
    : 'Sin ventas en el período';
  const growthLabel = summary.crecimiento_ventas_pct == null
    ? 'Sin comparación (mes anterior sin ventas)'
    : `${summary.crecimiento_ventas_pct >= 0 ? '+' : ''}${Number(summary.crecimiento_ventas_pct).toFixed(1)}% frente al período comparable del mes anterior`;
  const grossProfit = summary.costo_ventas_estimado_nio == null
    ? 'No disponible: hay productos vendidos sin costo registrado.'
    : money(summary.ventas_nio - summary.costo_ventas_estimado_nio);
  const purchaseCount = report.compras.length;
  const averagePurchase = purchaseCount ? money(summary.compras_nio / purchaseCount) : '—';
  const inventoryRows = report.inventario.map((item) => `<tr>${cell(item.producto)}${cell(item.sku || '—')}${cell(item.stock, 'num')}${cell(item.stock_minimo, 'num')}${cell(item.stock === 0 ? 'Agotado' : item.stock <= item.stock_minimo ? 'Poca existencia' : 'Disponible')}</tr>`).join('');
  const noDemandRows = noDemand.map((item) => `<tr>${cell(item.producto)}${cell(item.sku || '—')}${cell(item.stock, 'num')}${cell('0', 'num')}</tr>`).join('');
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
  const dailySalesChart = salesTrendChart(report.ventas_diarias);

  win.document.open();
  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Corte mensual ${report.year}-${String(report.month).padStart(2, '0')}</title><style>
    *{box-sizing:border-box}body{font:12px Arial,sans-serif;color:#172033;background:#eef2f8;margin:24px}.report{max-width:1180px;margin:auto;background:#fff;padding:26px;border-radius:16px;box-shadow:0 12px 40px #18264a18}.hero{position:relative;display:flex;align-items:center;justify-content:space-between;gap:26px;overflow:hidden;padding:28px 32px;border-radius:14px;background:linear-gradient(120deg,#161a45,#3730a3 62%,#675ff2);color:#fff}.hero:after{content:'';position:absolute;width:210px;height:210px;right:8%;top:-100px;border:1px solid #ffffff35;border-radius:50%;box-shadow:0 0 0 26px #ffffff0b,0 0 0 54px #ffffff08}.hero-copy,.hero-profit{position:relative;z-index:1}.hero-profit{display:flex;flex-direction:column;gap:7px;min-width:260px;padding:16px 20px;border:1px solid #ffffff42;border-radius:12px;background:#ffffff12}.hero-profit span,.hero-profit small{font-size:10px;color:#dbe2ff}.hero-profit strong{font-size:23px;line-height:1.2;color:#fff;overflow-wrap:anywhere}.brand{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#c7d2fe;font-weight:700}.hero h1{font-size:30px;margin:12px 0 6px}.hero p{color:#dbe2ff;margin:0}.period{display:inline-block;margin-top:16px;padding:7px 11px;border:1px solid #ffffff45;border-radius:999px;font-size:11px}.actions{display:flex;justify-content:flex-end;margin:0 auto 12px;max-width:1180px}.actions button{border:0;border-radius:8px;padding:11px 16px;background:#3730a3;color:#fff;font-weight:700;cursor:pointer}.section-title{display:flex;align-items:center;gap:9px;margin:22px 0 10px;font-size:15px}.section-title:before{content:'';width:4px;height:17px;border-radius:4px;background:#5b55e7}.cards{display:grid;grid-template-columns:repeat(5,1fr);gap:9px;margin-top:14px}.card{min-height:76px;padding:12px;border:1px solid #e1e6f0;border-top:3px solid #5b55e7;border-radius:9px;background:#fff}.card:nth-child(5n+2){border-top-color:#f59e0b}.card:nth-child(5n+3){border-top-color:#0ea5e9}.card:nth-child(5n+4){border-top-color:#14b8a6}.card:nth-child(5n){border-top-color:#f97373}.card small{display:block;color:#667085;margin-bottom:8px;line-height:1.35}.card strong{font-size:14px;color:#1c2340}.sales-snapshot{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:12px;padding:12px;border:1px solid #dfe5f0;border-radius:10px;background:#f7f8fc}.sales-snapshot div{display:flex;flex-direction:column;gap:5px}.sales-snapshot span{font-size:10px;color:#6b7280}.sales-snapshot strong{font-size:15px;color:#272b55}.sales-snapshot p{grid-column:1/-1;margin:2px 0 0;color:#4d4b9e;font-weight:700}.profit-breakdown{margin-top:12px;padding:13px 15px;border:1px solid #dceee7;border-radius:10px;background:#f3fbf7}.profit-breakdown>strong{font-size:11px;color:#23694e}.profit-breakdown div{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;flex-wrap:wrap}.profit-breakdown span{font-size:11px;color:#4b5563}.profit-breakdown b{color:#8992a5}.profit-breakdown .profit-result{font-weight:800;color:#08764c}.graphics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}.chart{padding:14px 16px;border:1px solid #e1e6f0;border-radius:11px;background:linear-gradient(145deg,#fff,#fafbff);break-inside:avoid}.chart h2{font-size:13px;margin:0 0 13px;color:#28314d}.chart-row{margin:9px 0}.chart-label{display:flex;justify-content:space-between;gap:14px;margin-bottom:5px;font-size:10px;color:#586174}.chart-label strong{color:#242c48;white-space:nowrap}.track{height:8px;border-radius:99px;background:#edf0f7;overflow:hidden}.track i{display:block;height:100%;border-radius:99px}.chart-empty{font-size:11px;color:#7b8496}.sales-chart{grid-column:1/-1}.sales-chart svg{display:block;width:100%;height:auto}.chart-heading{display:flex;align-items:baseline;justify-content:space-between;gap:10px}.chart-heading span{font-size:10px;color:#7b8496}.note{font-size:10px;line-height:1.55;color:#596176;background:#f5f6fb;border:1px solid #e7e9f2;padding:11px 13px;border-radius:9px;margin-top:14px}h2{font-size:16px;margin:24px 0 8px}p{color:#586174}.table-wrap{overflow:visible}section{break-inside:auto}tr{break-inside:avoid}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #dbe1eb;padding:5px;text-align:left;vertical-align:top}th{background:#f3f5fa}.num{text-align:right;white-space:nowrap}.group td{background:#e9edfb;font-weight:700;padding:7px}.detail td{color:#586174}.payment td{background:#f8f9fc}.empty{text-align:center;color:#7b8496;padding:14px}footer{margin-top:22px;color:#7b8496;font-size:10px}
    @media(max-width:760px){.hero{align-items:stretch;flex-direction:column}.hero-profit{min-width:0}.cards{grid-template-columns:repeat(2,1fr)}.sales-snapshot{grid-template-columns:repeat(2,1fr)}.graphics{grid-template-columns:1fr}.sales-chart{grid-column:auto}}@media print{body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.report{max-width:none;padding:0;border-radius:0;box-shadow:none}.actions{display:none}.hero{border-radius:0;padding:22px 26px}.cards{grid-template-columns:repeat(5,1fr)}.graphics{grid-template-columns:repeat(2,minmax(0,1fr))}.sales-chart{grid-column:1/-1}.details-page{break-before:page}.chart{break-inside:avoid}}@page{size:landscape;margin:10mm}
  </style></head><body><div class="actions"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div><main class="report">
    <header class="hero"><div class="hero-copy"><div class="brand">JMstore · Reporte de gestión</div><h1>Corte mensual del negocio</h1><p>Resumen de ventas, compras, cobros e inventario</p><span class="period">Corte al ${escapeHtml(report.hasta)} · Desde ${escapeHtml(report.desde)}</span></div><aside class="hero-profit"><span>Utilidad estimada</span><strong>${escapeHtml(profitability)}</strong><small>${escapeHtml(marginLabel)}</small></aside></header>
    <h2 class="section-title">Sección de indicadores</h2>
    <div class="cards"><div class="card"><small>Ventas netas</small><strong>${escapeHtml(money(summary.ventas_nio))}</strong></div><div class="card"><small>Unidades vendidas</small><strong>${escapeHtml(summary.unidades_vendidas)}</strong></div><div class="card"><small>Ticket promedio</small><strong>${escapeHtml(money(summary.ticket_promedio_nio))}</strong></div><div class="card"><small>Utilidad bruta estimada</small><strong>${escapeHtml(grossProfit)}</strong></div><div class="card"><small>Compras netas</small><strong>${escapeHtml(money(summary.compras_nio))}</strong></div><div class="card"><small>Número de compras</small><strong>${escapeHtml(purchaseCount)}</strong></div><div class="card"><small>Inversión promedio</small><strong>${escapeHtml(averagePurchase)}</strong></div></div>
    <p class="note">*Compara cobros recibidos durante el mes menos los pagos actualmente registrados en compras creadas ese mes; el sistema no conserva la fecha de cada pago a proveedor. **Ventas menos compras es solo una comparación de actividad e inversión; no equivale a utilidad contable. La utilidad estimada descuenta el costo actual registrado de los productos vendidos y comisiones POS; no es utilidad contable histórica. Los saldos de facturas reflejan abonos acumulados a la fecha. Los cobros del mes incluyen abonos de facturas de meses anteriores.</p>
    <div class="sales-snapshot"><div><span>Ventas netas facturadas</span><strong>${escapeHtml(money(summary.ventas_nio))}</strong></div><div><span>Pedidos</span><strong>${escapeHtml(summary.facturas)}</strong></div><div><span>Unidades vendidas</span><strong>${escapeHtml(summary.unidades_vendidas)}</strong></div><div><span>Ticket promedio</span><strong>${escapeHtml(money(summary.ticket_promedio_nio))}</strong></div><p>${escapeHtml(growthLabel)} · ${escapeHtml(bestSalesDay)}</p></div>
    <h2 class="section-title">2. Rentabilidad</h2>
    <div class="sales-snapshot"><div><span>Costo de ventas estimado</span><strong>${summary.costo_ventas_estimado_nio == null ? 'No disponible' : escapeHtml(money(summary.costo_ventas_estimado_nio))}</strong></div><div><span>Utilidad bruta estimada</span><strong>${escapeHtml(grossProfit)}</strong></div><div><span>Margen bruto estimado</span><strong>${summary.costo_ventas_estimado_nio == null || !summary.ventas_nio ? 'No disponible' : `${((summary.ventas_nio - summary.costo_ventas_estimado_nio) / summary.ventas_nio * 100).toFixed(1)}%`}</strong></div><div><span>Comisiones POS</span><strong>${escapeHtml(money(summary.comisiones_pos_nio))}</strong></div></div>
    <p class="note">Gastos operativos no registrados; por eso no se puede calcular utilidad neta. La utilidad estimada descuenta costos actuales de producto y comisiones POS, no representa utilidad contable histórica.</p>
    <h2 class="section-title">3. Inventario</h2>
    <div class="sales-snapshot"><div><span>Stock inicial</span><strong>No hay historial</strong></div><div><span>Entradas registradas</span><strong>${escapeHtml(summary.unidades_compradas)} unidades</strong></div><div><span>Salidas por ventas</span><strong>${escapeHtml(summary.unidades_vendidas)} unidades</strong></div><div><span>Agotados al corte</span><strong>${escapeHtml(report.inventario.filter((item) => item.stock === 0).length)}</strong></div></div>
    <p class="note">El stock final es la existencia actual al generar el reporte. La base no conserva el stock histórico al inicio del período.</p>
    <section><h2>Existencias al corte</h2>${table(['Producto','SKU','Stock actual','Mínimo','Estado'], inventoryRows)}</section>
    <h2 class="section-title">4. Desempeño de productos</h2>
    <section><h2>Productos más vendidos</h2>${table(['Perfume','SKU','Unidades','Ventas'], soldRows(topProducts, 'sales'))}</section>
    <section><h2>Productos con mayor utilidad estimada</h2>${table(['Perfume','SKU','Unidades','Utilidad estimada'], soldRows(profitableProducts, 'profit'))}<p>Estimación basada en el costo actual guardado para cada producto.</p></section>
    <section><h2>Sin ventas durante el período</h2>${table(['Perfume','SKU','Stock actual','Unidades vendidas'], noDemandRows)}</section>
    <h2 class="section-title">5. Clientes y canales</h2>
    <div class="sales-snapshot"><div><span>Clientes nuevos*</span><strong>${escapeHtml(summary.clientes_nuevos)}</strong></div><div><span>Clientes recurrentes*</span><strong>${escapeHtml(summary.clientes_recurrentes)}</strong></div><div><span>Canales digitales</span><strong>Sin registro</strong></div></div>
    <p class="note">*Nuevo significa primera compra registrada en el sistema; recurrente significa que ya tenía una compra antes del período. Ventas por WhatsApp, Instagram, TikTok u otros canales: sin datos porque no se guarda canal de origen.</p>
    <h2 class="section-title">6. Conclusiones y acciones</h2>
    <ul><li>${escapeHtml(growthLabel)}.</li><li>${escapeHtml(noDemand.length ? `${noDemand.length} productos en inventario no registraron ventas en el período.` : 'Todos los productos con inventario registraron ventas en el período.')}</li><li>Revisar costos faltantes, gastos operativos y canales de venta para completar el análisis de rentabilidad y clientes.</li></ul>
    <div class="profit-breakdown"><strong>Cómo se calcula la utilidad estimada</strong><div><span>Ventas ${escapeHtml(money(summary.ventas_nio))}</span><b>−</b><span>Costo vendido ${summary.costo_ventas_estimado_nio == null ? 'Sin costo completo' : escapeHtml(money(summary.costo_ventas_estimado_nio))}</span><b>−</b><span>Comisiones POS ${escapeHtml(money(summary.comisiones_pos_nio))}</span><b>=</b><span class="profit-result">${escapeHtml(profitability)}</span></div></div>
    <div class="graphics">${dailySalesChart}${businessBars}${inventoryBars}${methodsChart}</div>
    <div class="details-page">
    <section><h2>Abonos recibidos durante el mes</h2><p>Incluye pagos de facturas emitidas en meses anteriores.</p>${table(['Fecha','Factura','Cliente','Método','Monto','Comisión'], paymentRows)}</section>
    <section><h2>Detalle de ventas</h2>${table(['Detalle / producto','SKU / método','Unidades / monto','Precio unitario','Descuento','Subtotal',''], salesRows)}</section>
    <section><h2>Detalle de compras</h2>${table(['Detalle / producto','SKU','Unidades','Costo unitario','Envío unitario','Subtotal',''], purchaseRows)}</section>
    <footer>Valores en córdobas (NIO). Inventario mostrado al momento de generar el reporte. Productos sin costo registrado no se incluyen en el valor al costo.</footer>
    </div></main></body></html>`);
  win.document.close();
}
